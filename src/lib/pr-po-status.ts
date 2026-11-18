import type { Prisma } from "@/generated/prisma";
import {
  PR_PO_NOT_COUNTED,
  poQtyInPrUom,
  prLineBalance,
} from "@/app/dashboard/purchasing/purchase-requisition/pr-status";

// Recomputes a Purchase Requisition's per-line "PO Quantity Issued" / "Balance Require
// Purchase" and its header "PO Status" from the POs that reference its lines.
// Every PO except Void / Old Version counts, so a saved Draft PO already reserves the
// quantity and a PR can't be converted twice. Call inside the PO save / transition tx.
//
// PO Status (docs/spec/purchasing.md): N/A → Partially Issued → Fully Issued | Cancelled.

const NOT_COUNTED = [...PR_PO_NOT_COUNTED];

type Tx = Prisma.TransactionClient;

export async function recomputePrPoStatus(tx: Tx, prId: string | null | undefined) {
  if (!prId) return;
  const pr = await tx.purchaseRequisition.findUnique({
    where: { id: prId },
    include: {
      items: {
        include: {
          purchaseOrderItems: {
            where: { purchaseOrder: { status: { notIn: NOT_COUNTED } } },
            select: { quantity: true, poUomId: true, internalQuantity: true, internalUomId: true },
          },
        },
      },
    },
  });
  if (!pr) return;

  let anyIssued = false;
  let allFullyIssued = true;
  let allCancelled = pr.items.length > 0;

  for (const it of pr.items) {
    // PO lines count in the PR line's UOM (via their Internal UOM / conversion). A line in a
    // UOM that can't be converted is left out rather than added in its own unit.
    const issued = it.purchaseOrderItems.reduce((sum, po) => sum + (poQtyInPrUom(it.uomId, po) ?? 0), 0);
    const { prQty: required, balance } = prLineBalance(it.quantity, it.cancelQuantity, issued);
    if (issued > 0) anyIssued = true;
    if (required > 0) allCancelled = false;
    if (balance > 0) allFullyIssued = false;

    await tx.purchaseRequisitionItem.update({
      where: { id: it.id },
      data: { poQuantityIssued: issued, balanceRequirePurchase: balance },
    });
  }

  const poStatus = !anyIssued
    ? allCancelled ? "Cancelled" : "N/A"
    : allFullyIssued ? "Fully Issued" : "Partially Issued";

  await tx.purchaseRequisition.update({ where: { id: pr.id }, data: { poStatus } });
}

/** Recomputes the PR linked to a PO, plus the previous PR when the PO was re-pointed. */
export async function recomputePrPoStatusForPo(tx: Tx, prId: string | null | undefined, previousPrId?: string | null) {
  await recomputePrPoStatus(tx, prId);
  if (previousPrId && previousPrId !== prId) await recomputePrPoStatus(tx, previousPrId);
}
