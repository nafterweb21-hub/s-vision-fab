/**
 * Delivery Order quantity cap (docs/spec/delivery-and-coc.md, Item #2:
 * "Quantity … total ≤ WO Qty"). The total delivered for a work order, across
 * every non-void DO (Draft and Submitted), must not exceed the WO quantity.
 * The spec allows no tolerance or approval for over-delivery.
 */
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';

/** DO statuses that do not count towards delivered quantity (see do-status.ts). */
export const NON_COUNTING_DO_STATUSES = ['Void', 'Voided', 'Cancelled', 'Canceled', 'void', 'VOID'];

type Db = Prisma.TransactionClient | typeof prisma;

/** Thrown when a DO breaks a business rule (quantity cap, not Draft); routes answer 400. */
export class DeliveryOrderRuleError extends Error {}

/**
 * Quantity already on other non-void DOs, per work order.
 * `excludeDeliveryOrderId` leaves out the DO being edited/submitted.
 */
export async function deliveredQtyByWorkOrder(
  db: Db,
  workOrderNos: string[] | null,
  excludeDeliveryOrderId?: string | null,
): Promise<Map<string, { qty: number; doNos: string[] }>> {
  const rows = await db.deliveryOrderItem.findMany({
    where: {
      ...(workOrderNos ? { workOrderNo: { in: workOrderNos } } : {}),
      deliveryOrder: {
        status: { notIn: NON_COUNTING_DO_STATUSES },
        ...(excludeDeliveryOrderId ? { id: { not: excludeDeliveryOrderId } } : {}),
      },
    },
    select: { workOrderNo: true, quantity: true, deliveryOrder: { select: { doNo: true } } },
  });
  const out = new Map<string, { qty: number; doNos: string[] }>();
  for (const r of rows) {
    const entry = out.get(r.workOrderNo) ?? { qty: 0, doNos: [] };
    entry.qty += Number(r.quantity) || 0;
    if (!entry.doNos.includes(r.deliveryOrder.doNo)) entry.doNos.push(r.deliveryOrder.doNo);
    out.set(r.workOrderNo, entry);
  }
  return out;
}

/**
 * Locks the DO row for the rest of `tx` and throws DeliveryOrderRuleError unless it is
 * still Draft, so update/submit cannot race each other past the cap check.
 */
export async function lockDraftDeliveryOrder(
  tx: Prisma.TransactionClient,
  id: string,
  notDraftMessage: string,
): Promise<void> {
  const rows = await tx.$queryRaw<{ status: string }[]>`
    SELECT "status" FROM "DeliveryOrder" WHERE "id" = ${id} FOR UPDATE
  `;
  if (!rows[0]) throw new DeliveryOrderRuleError('Delivery Order not found.');
  if (rows[0].status !== 'Draft') throw new DeliveryOrderRuleError(notDraftMessage);
}

/**
 * Checks the DO's lines against the cap inside `tx`. The work order rows are
 * locked first so two DOs saved at once for the same WO cannot both pass.
 * Throws DeliveryOrderRuleError with a user-facing message on violation.
 */
export async function assertWithinWorkOrderQty(
  tx: Prisma.TransactionClient,
  items: { workOrderNo?: string | null; quantity?: unknown }[],
  excludeDeliveryOrderId?: string | null,
): Promise<void> {
  const thisDo = new Map<string, number>();
  for (const it of items ?? []) {
    if (!it.workOrderNo) continue;
    const q = Number(it.quantity);
    if (!Number.isFinite(q) || q < 0) {
      throw new DeliveryOrderRuleError(`${it.workOrderNo}: quantity must be zero or more.`);
    }
    thisDo.set(it.workOrderNo, (thisDo.get(it.workOrderNo) ?? 0) + q);
  }
  const woNos = [...thisDo.keys()];
  if (woNos.length === 0) return;

  const wos = await tx.$queryRaw<{ workOrderNo: string; quantity: Prisma.Decimal | null }[]>`
    SELECT "workOrderNo", "quantity" FROM "WorkOrder"
    WHERE "workOrderNo" IN (${Prisma.join(woNos)})
    ORDER BY "workOrderNo"
    FOR UPDATE
  `;
  const delivered = await deliveredQtyByWorkOrder(tx, woNos, excludeDeliveryOrderId);

  const problems: string[] = [];
  for (const wo of wos) {
    if (wo.quantity == null) continue; // no ordered qty recorded: nothing to cap against
    const ordered = Number(wo.quantity);
    const prev = delivered.get(wo.workOrderNo);
    const already = prev?.qty ?? 0;
    const delivering = thisDo.get(wo.workOrderNo) ?? 0;
    const remaining = Math.max(ordered - already, 0);
    if (delivering > remaining + 1e-9) {
      const on = prev?.doNos.length ? ` on ${prev.doNos.join(', ')}` : '';
      problems.push(
        `${wo.workOrderNo}: delivering ${delivering} but only ${remaining} remain (${ordered} ordered, ${already} already delivered${on})`,
      );
    }
  }
  if (problems.length) throw new DeliveryOrderRuleError(`${problems.join('; ')}.`);
}
