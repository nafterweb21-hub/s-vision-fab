import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

import { COC_TYPES, type CocType } from "@/lib/coc-types";

export { COC_TYPES, type CocType };

export class CocRuleError extends Error {}

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Spec: a COC can only be created (or kept editable) while its DO has
 * "COC Required" ticked and is not yet Submitted, and the WO must be on that DO.
 */
export async function assertCocTarget(
  db: Db,
  { deliveryOrderId, workOrderNo, customerId }: { deliveryOrderId: string; workOrderNo: string; customerId: string },
) {
  const doc = await db.deliveryOrder.findUnique({
    where: { id: deliveryOrderId },
    select: { doNo: true, status: true, cocRequired: true, customerId: true, items: { where: { workOrderNo }, select: { id: true } } },
  });
  if (!doc) throw new CocRuleError("Delivery order not found.");
  if (doc.customerId !== customerId) throw new CocRuleError(`Delivery order ${doc.doNo} belongs to a different customer.`);
  if (!doc.cocRequired) throw new CocRuleError(`Delivery order ${doc.doNo} does not have "COC Required" ticked.`);
  if (doc.status !== "Draft") throw new CocRuleError(`Delivery order ${doc.doNo} is ${doc.status}; COCs can only be added before it is submitted.`);
  if (doc.items.length === 0) throw new CocRuleError(`Work order ${workOrderNo} is not on delivery order ${doc.doNo}.`);
}

/** Spec: for a Final COC the Drawing No is always the SO Part No. */
export async function soPartNoForWorkOrder(db: Db, workOrderNo: string): Promise<string | null> {
  const batch = await db.salesOrderItemBatch.findFirst({
    where: { workOrderNo },
    select: { salesOrderItem: { select: { part: { select: { partNo: true } } } } },
  });
  return batch?.salesOrderItem.part.partNo ?? null;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/**
 * Normalise a COC body: validate the mandatory fields and blank out the
 * section that doesn't apply to the type (welding fields only on Welding,
 * spray fields only on Spray Painting).
 */
export function cocFieldsFromBody(body: any) {
  const type = body.type as CocType;
  if (!COC_TYPES.includes(type)) throw new CocRuleError("Select a COC type.");
  const required = [
    ["date", "Date"],
    ["customerId", "Customer"],
    ["deliveryOrderId", "DO No"],
    ["workOrderNo", "WO No"],
    ["cocUomId", "COC UOM"],
  ] as const;
  for (const [k, label] of required) {
    if (!str(body[k])) throw new CocRuleError(`${label} is required.`);
  }
  const date = new Date(body.date);
  if (Number.isNaN(date.getTime())) throw new CocRuleError("Date is not valid.");
  const cocQuantity = Number(body.cocQuantity);
  if (!Number.isFinite(cocQuantity) || cocQuantity <= 0) throw new CocRuleError("COC Quantity must be greater than 0.");

  const welding = type === "Welding";
  const spray = type === "Spray Painting";
  return {
    date,
    type,
    customerId: str(body.customerId)!,
    deliveryOrderId: str(body.deliveryOrderId)!,
    workOrderNo: str(body.workOrderNo)!,
    drawingNo: str(body.drawingNo),
    cocQuantity,
    cocUomId: str(body.cocUomId)!,
    sanNo: welding ? str(body.sanNo) : null,
    welderId: welding ? str(body.welderId) : null,
    weldingProcess: welding ? str(body.weldingProcess) : null,
    weldingMachineId: welding ? str(body.weldingMachineId) : null,
    partName: spray ? str(body.partName) : null,
    partNumber: spray ? str(body.partNumber) : null,
    paintingSanNo: spray ? str(body.paintingSanNo) : null,
    painterId: spray ? str(body.painterId) : null,
    paintingMethodId: spray ? str(body.paintingMethodId) : null,
    paintingSpecification: spray ? str(body.paintingSpecification) : null,
    paintThicknessSpecification: spray ? str(body.paintThicknessSpecification) : null,
    measuredTotalPaintThickness: spray ? str(body.measuredTotalPaintThickness) : null,
    paintBatchNo: spray ? str(body.paintBatchNo) : null,
    inspectionEquipment: spray ? str(body.inspectionEquipment) : null,
  };
}

export type CocFields = ReturnType<typeof cocFieldsFromBody>;

/** Applies the DO / WO rules, the Final drawing-no rule and the uniqueness rule; returns the data to write. */
export async function prepareCocWrite(db: Db, body: any, excludeId?: string): Promise<CocFields> {
  const data = cocFieldsFromBody(body);
  await assertCocTarget(db, data);
  if (data.type === "Final") data.drawingNo = await soPartNoForWorkOrder(db, data.workOrderNo);

  const duplicate = await db.certificateOfConformity.findFirst({
    where: {
      deliveryOrderId: data.deliveryOrderId,
      type: data.type,
      workOrderNo: data.workOrderNo,
      welderId: data.welderId,
      painterId: data.painterId,
      partNumber: data.partNumber,
      weldingMachineId: data.weldingMachineId,
      weldingProcess: data.weldingProcess,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { cocNo: true },
  });
  if (duplicate) {
    throw new CocRuleError(
      `${duplicate.cocNo} already covers this DO, type and work order with the same welder / painter / machine / part number. Pick a different one, or edit ${duplicate.cocNo}.`,
    );
  }
  return data;
}
