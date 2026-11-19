import type { prisma } from "@/lib/prisma";

/** Thrown for a quantity the user can fix; routes map it to a 400. */
export class SrfQuantityError extends Error {}

type Db = Pick<typeof prisma, "purchaseOrderItem" | "subconRequestForm">;

/**
 * Spec (docs/spec/subcon.md, SRF): quantity has 0 decimals, and the total SRF
 * quantity on a PO line (non-Void forms) may not exceed the PO line quantity.
 * `excludeSrfId` leaves out the form being edited. Returns the validated quantity.
 */
export async function assertSrfQuantity(
  db: Db,
  purchaseOrderItemId: string,
  rawQuantity: unknown,
  excludeSrfId?: string,
): Promise<number> {
  if (!purchaseOrderItemId) throw new SrfQuantityError("Select an outstanding PO item first.");
  const quantity = Number(rawQuantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new SrfQuantityError("Quantity must be a whole number greater than 0.");
  }

  const line = await db.purchaseOrderItem.findUnique({
    where: { id: purchaseOrderItemId },
    select: { quantity: true },
  });
  if (!line) throw new SrfQuantityError("The PO line for this Subcon Request Form no longer exists.");

  const others = await db.subconRequestForm.aggregate({
    where: {
      purchaseOrderItemId,
      status: { not: "Void" },
      ...(excludeSrfId ? { id: { not: excludeSrfId } } : {}),
    },
    _sum: { quantity: true },
  });
  const available = Number(line.quantity) - Number(others._sum.quantity ?? 0);
  if (quantity > available) {
    throw new SrfQuantityError(
      available > 0
        ? `Quantity can't exceed ${available}, the PO line quantity not yet on other Subcon Request Forms.`
        : "This PO line is already fully covered by other Subcon Request Forms.",
    );
  }
  return quantity;
}
