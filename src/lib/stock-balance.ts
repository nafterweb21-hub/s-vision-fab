import { prisma } from "@/lib/prisma";

/**
 * On-hand stock is never stored. It is reconstructed from the document trail so
 * that Inventory Summary, the Raw Materials page and the Consumables page can
 * never report different numbers for the same material.
 *
 *   netReceived = received - returned
 *   balance     = netReceived - consumed
 *
 * `consumed` is what a Material Consumption actually issued to a work order.
 * `reserved` is what purchase requisitions asked for — a forward-looking claim
 * on stock that has not left the store yet, so it never moves the balance. The
 * two are reported side by side; subtracting both would double-count every
 * material that was requisitioned and then issued.
 *
 * Quantities are normalised to the PO line's internal UOM via `conversion`.
 */
export interface StockAggregate {
  onOrderQty: number;
  receivedQty: number;
  returnedQty: number;
  /** Issued to work orders. Subtracted from the balance. */
  consumedQty: number;
  /** Requisitioned but not yet issued. Reported, never subtracted. */
  reservedQty: number;
  openPoCount: number;
  internalUom: string;
}

function emptyAggregate(): StockAggregate {
  return {
    onOrderQty: 0,
    receivedQty: 0,
    returnedQty: 0,
    consumedQty: 0,
    reservedQty: 0,
    openPoCount: 0,
    internalUom: "",
  };
}

export function netReceived(agg: StockAggregate): number {
  return agg.receivedQty - agg.returnedQty;
}

/** Derived on-hand quantity for a stock item that also carries an opening balance. */
export function onHand(agg: StockAggregate, openingStock = 0): number {
  return openingStock + netReceived(agg) - agg.consumedQty;
}

/** What is left once outstanding requisitions are honoured. May go negative. */
export function available(agg: StockAggregate, openingStock = 0): number {
  return onHand(agg, openingStock) - agg.reservedQty;
}

/**
 * Select fragment for a PO line's own receipts, so on-order can be the open
 * balance rather than the whole ordered quantity.
 */
export const poLineReceiptsSelect = {
  internalQuantity: true,
  conversion: true,
  goodsReceiveItems: {
    where: { goodsReceive: { status: "Submitted" } },
    select: {
      receiveQty: true,
      goodsReturnItems: { where: { goodsReturn: { status: "Submitted" } }, select: { internalQty: true } },
    },
  },
} as const;

/** Still to arrive on one PO line, in internal UOM: ordered − nett received, never negative. */
export function outstandingInternalQty(item: {
  internalQuantity: unknown;
  conversion: unknown;
  goodsReceiveItems: { receiveQty: unknown; goodsReturnItems: { internalQty: unknown }[] }[];
}): number {
  const conversion = Number(item.conversion || 1);
  let nett = 0;
  for (const gi of item.goodsReceiveItems) {
    nett += Number(gi.receiveQty || 0) * conversion;
    for (const ri of gi.goodsReturnItems) nett -= Number(ri.internalQty || 0);
  }
  return Math.max(0, Number(item.internalQuantity || 0) - nett);
}

/** The subset of the Prisma client this module needs, so a `$transaction` handle fits. */
type Db = Pick<
  typeof prisma,
  "purchaseOrderItem" | "goodsReceiveItem" | "goodsReturnItem" | "purchaseRequisitionItem" | "materialConsumptionItem"
>;

/** What the store held before any document was raised, per material profile. */
export interface OpeningStock {
  openingStock: number;
  /** The stock item's own UOM — the only UOM a material with no PO trail has. */
  uomName: string;
}

/**
 * Opening stock lives on the StockItem, not the MaterialProfile, so anything
 * reporting a balance per material has to join across. A material with no stock
 * item is simply absent from the map; callers treat that as zero.
 */
export async function getOpeningStocks(
  materialProfileIds: string[],
  db: Pick<typeof prisma, "stockItem"> = prisma,
): Promise<Map<string, OpeningStock>> {
  const result = new Map<string, OpeningStock>();
  if (materialProfileIds.length === 0) return result;

  const items = await db.stockItem.findMany({
    where: { materialProfileId: { in: materialProfileIds } },
    select: {
      materialProfileId: true,
      openingStock: true,
      uom: { select: { uomName: true } },
    },
  });

  for (const item of items) {
    result.set(item.materialProfileId, {
      openingStock: Number(item.openingStock || 0),
      uomName: item.uom?.uomName ?? "",
    });
  }
  return result;
}

/**
 * A `$transaction` handle wraps one connection and cannot run queries
 * concurrently, so only the pooled client gets to fan out.
 */
async function gather<T extends readonly unknown[]>(
  serial: boolean,
  thunks: { [K in keyof T]: () => Promise<T[K]> },
): Promise<T> {
  if (!serial) return (await Promise.all(thunks.map((t) => t()))) as unknown as T;
  const out: unknown[] = [];
  for (const thunk of thunks) out.push(await thunk());
  return out as unknown as T;
}

/**
 * Aggregates the PO / GR / GRN / PR / MC trail for the given materials.
 * Materials with no documents come back as a zeroed aggregate, never missing.
 *
 * Pass the transaction handle when calling from inside `$transaction`, so the
 * reads share that transaction's snapshot and its single connection instead of
 * checking out a second one from the pool.
 */
export async function getStockAggregates(
  materialProfileIds: string[],
  db: Db = prisma,
): Promise<Map<string, StockAggregate>> {
  const result = new Map<string, StockAggregate>();
  for (const id of materialProfileIds) result.set(id, emptyAggregate());
  if (materialProfileIds.length === 0) return result;

  const openPoIds = new Map<string, Set<string>>();

  const [poItems, grItems, rtnItems, prItems, mcItems] = await gather(db !== prisma, [
    // Issued POs not yet fully received == still on order.
    () => db.purchaseOrderItem.findMany({
      where: {
        materialProfileId: { in: materialProfileIds },
        purchaseOrder: { status: "Issued", receiveStatus: { not: "Fully Received" } },
      },
      select: {
        ...poLineReceiptsSelect,
        materialProfileId: true,
        purchaseOrderId: true,
        internalUom: { select: { uomName: true } },
      },
    }),
    () => db.goodsReceiveItem.findMany({
      where: {
        purchaseOrderItem: { materialProfileId: { in: materialProfileIds } },
        goodsReceive: { status: "Submitted" },
      },
      select: {
        receiveQty: true,
        purchaseOrderItem: {
          select: {
            materialProfileId: true,
            conversion: true,
            internalUom: { select: { uomName: true } },
          },
        },
      },
    }),
    () => db.goodsReturnItem.findMany({
      where: {
        goodsReceiveItem: { purchaseOrderItem: { materialProfileId: { in: materialProfileIds } } },
        goodsReturn: { status: "Submitted" },
      },
      select: {
        internalQty: true,
        goodsReceiveItem: {
          select: { purchaseOrderItem: { select: { materialProfileId: true } } },
        },
      },
    }),
    // A requisition reserves material; it does not remove it from the store.
    () => db.purchaseRequisitionItem.findMany({
      where: {
        materialProfileId: { in: materialProfileIds },
        purchaseRequisition: { workOrderNo: { not: null }, status: { notIn: ["Void", "Old Version"] } },
      },
      select: { materialProfileId: true, prQuantity: true },
    }),
    // Consumption is the only document that takes stock out. Draft is still
    // being typed and Void has been reversed, so neither counts.
    () => db.materialConsumptionItem.findMany({
      where: {
        stockItem: { materialProfileId: { in: materialProfileIds } },
        materialConsumption: { status: "Submitted" },
      },
      select: {
        quantity: true,
        stockItem: { select: { materialProfileId: true, uom: { select: { uomName: true } } } },
      },
    }),
  ] as const);

  for (const item of poItems) {
    const agg = item.materialProfileId && result.get(item.materialProfileId);
    if (!agg) continue;
    const outstanding = outstandingInternalQty(item);
    if (outstanding <= 0) continue; // over- or fully received: nothing on order
    agg.onOrderQty += outstanding;
    if (!openPoIds.has(item.materialProfileId!)) openPoIds.set(item.materialProfileId!, new Set());
    openPoIds.get(item.materialProfileId!)!.add(item.purchaseOrderId);
    if (item.internalUom?.uomName && !agg.internalUom) agg.internalUom = item.internalUom.uomName;
  }

  for (const item of grItems) {
    const matId = item.purchaseOrderItem?.materialProfileId;
    const agg = matId && result.get(matId);
    if (!agg) continue;
    const conversion = Number(item.purchaseOrderItem?.conversion || 1);
    agg.receivedQty += Number(item.receiveQty || 0) * conversion;
    if (item.purchaseOrderItem?.internalUom?.uomName && !agg.internalUom) {
      agg.internalUom = item.purchaseOrderItem.internalUom.uomName;
    }
  }

  for (const item of rtnItems) {
    const matId = item.goodsReceiveItem?.purchaseOrderItem?.materialProfileId;
    const agg = matId && result.get(matId);
    if (!agg) continue;
    agg.returnedQty += Number(item.internalQty || 0);
  }

  for (const item of prItems) {
    const agg = item.materialProfileId && result.get(item.materialProfileId);
    if (!agg) continue;
    agg.reservedQty += Number(item.prQuantity || 0);
  }

  for (const item of mcItems) {
    const matId = item.stockItem?.materialProfileId;
    const agg = matId && result.get(matId);
    if (!agg) continue;
    agg.consumedQty += Number(item.quantity || 0);
    // A material with no PO trail still has a UOM, via its stock record.
    if (item.stockItem?.uom?.uomName && !agg.internalUom) {
      agg.internalUom = item.stockItem.uom.uomName;
    }
  }

  for (const [matId, poIds] of openPoIds) {
    result.get(matId)!.openPoCount = poIds.size;
  }

  return result;
}
