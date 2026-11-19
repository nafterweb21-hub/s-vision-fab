import type { Prisma } from "@/generated/prisma";

// PO Receive Status (docs/spec/purchasing.md): NA / Not Received / Partially Received / Fully Received.
// Derived from the Goods Receive / Goods Return trail, in PO UOM:
//
//   nett received = Σ submitted GR receiveQty − Σ submitted RTN returnQty
//
// A return reopens the line ("If no replacement is coming, purchaser must revise
// the PO downward"), so the open quantity a new GR may take is ordered − nett received.

type Tx = Prisma.TransactionClient;

/** Rounding slack for 2-decimal quantities. */
const EPS = 0.005;

export const PoReceiveStatus = {
  NA: "NA",
  NotReceived: "Not Received",
  Partial: "Partially Received",
  Full: "Fully Received",
} as const;

export interface PoLineReceipt {
  purchaseOrderItemId: string;
  label: string;
  ordered: number;
  received: number;
  returned: number;
}

/**
 * Per-line receipt totals for one PO.
 * `grStatuses` picks which GRs count: Submitted only for the status, every
 * non-void GR for the over-receipt guard (so two drafts can't each take the
 * whole balance). `excludeGrId` leaves out the GR being saved.
 */
async function lineReceipts(
  tx: Tx,
  purchaseOrderId: string,
  grStatuses: string[],
  excludeGrId?: string,
): Promise<Map<string, PoLineReceipt>> {
  const lines = await tx.purchaseOrderItem.findMany({
    where: { purchaseOrderId },
    select: {
      id: true,
      material: true,
      description: true,
      quantity: true,
      goodsReceiveItems: {
        where: {
          goodsReceive: {
            status: { in: grStatuses },
            ...(excludeGrId ? { id: { not: excludeGrId } } : {}),
          },
        },
        select: {
          receiveQty: true,
          goodsReturnItems: {
            where: { goodsReturn: { status: "Submitted" } },
            select: { returnQty: true },
          },
        },
      },
    },
  });

  const out = new Map<string, PoLineReceipt>();
  for (const line of lines) {
    let received = 0;
    let returned = 0;
    for (const gi of line.goodsReceiveItems) {
      received += Number(gi.receiveQty || 0);
      for (const ri of gi.goodsReturnItems) returned += Number(ri.returnQty || 0);
    }
    out.set(line.id, {
      purchaseOrderItemId: line.id,
      label: line.material || line.description || line.id,
      ordered: Number(line.quantity || 0),
      received,
      returned,
    });
  }
  return out;
}

export interface PoLineBalance {
  ordered: number;
  /** Nett received on submitted GRs (received − returned). */
  received: number;
  /** Quantity sitting on other Draft GRs for this line. */
  inDraft: number;
  /** What a new GR may still take: ordered − received − inDraft. */
  open: number;
}

/** Per-line balances for one PO, keyed by PO item id. `excludeGrId` leaves out the GR being edited. */
export async function poLineBalances(
  tx: Tx,
  purchaseOrderId: string,
  excludeGrId?: string,
): Promise<Record<string, PoLineBalance>> {
  const [submitted, all] = await Promise.all([
    lineReceipts(tx, purchaseOrderId, ["Submitted"], excludeGrId),
    lineReceipts(tx, purchaseOrderId, ["Draft", "Submitted"], excludeGrId),
  ]);
  const out: Record<string, PoLineBalance> = {};
  for (const [id, line] of all) {
    const sub = submitted.get(id);
    const received = sub ? sub.received - sub.returned : 0;
    const inDraft = Math.max(0, line.received - (sub?.received || 0));
    out[id] = {
      ordered: line.ordered,
      received,
      inDraft,
      open: Math.max(0, line.ordered - received - inDraft),
    };
  }
  return out;
}

/**
 * Throws if receiving `items` would take any PO line past its ordered quantity.
 * Counts every other non-void GR on the PO (Draft included).
 */
export async function assertWithinOpenQty(
  tx: Tx,
  purchaseOrderId: string,
  items: { purchaseOrderItemId: string; receiveQty: number }[],
  excludeGrId?: string,
) {
  const receipts = await lineReceipts(tx, purchaseOrderId, ["Draft", "Submitted"], excludeGrId);
  const errors: string[] = [];

  const wanted = new Map<string, number>();
  for (const it of items) {
    const qty = Number(it.receiveQty) || 0;
    if (qty < 0) throw new Error("Receive Quantity cannot be negative.");
    wanted.set(it.purchaseOrderItemId, (wanted.get(it.purchaseOrderItemId) || 0) + qty);
  }

  for (const [poItemId, qty] of wanted) {
    if (qty === 0) continue;
    const line = receipts.get(poItemId);
    if (!line) throw new Error("A Goods Receive line does not belong to the selected Purchase Order.");
    const open = line.ordered - (line.received - line.returned);
    if (qty > open + EPS) {
      errors.push(
        `${line.label}: receiving ${qty.toFixed(2)} but only ${Math.max(0, open).toFixed(2)} of ${line.ordered.toFixed(2)} is still open`,
      );
    }
  }

  if (errors.length) {
    throw new Error(`Receive Quantity exceeds the PO balance. ${errors.join("; ")}.`);
  }
}

/** Re-derives and stores the PO's Receive Status from submitted GRs / returns. */
export async function recomputePoReceiveStatus(tx: Tx, purchaseOrderId: string | null | undefined) {
  if (!purchaseOrderId) return;
  const po = await tx.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { status: true, receiveStatus: true, type: true },
  });
  // Subcon POs are received through Subcon Return Tracking, which owns their status.
  if (!po || po.type === "SUBCON") return;

  const receipts = [...(await lineReceipts(tx, purchaseOrderId, ["Submitted"])).values()].filter(
    (l) => l.ordered > 0,
  );

  let status: string;
  const anyReceived = receipts.some((l) => l.received - l.returned > EPS);
  if (!anyReceived) {
    // Before issue nothing can be received, so the spec's NA stands.
    status = po.status === "Issued" ? PoReceiveStatus.NotReceived : PoReceiveStatus.NA;
  } else if (receipts.every((l) => l.received - l.returned >= l.ordered - EPS)) {
    status = PoReceiveStatus.Full;
  } else {
    status = PoReceiveStatus.Partial;
  }

  if (status !== po.receiveStatus) {
    await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { receiveStatus: status } });
  }
}
