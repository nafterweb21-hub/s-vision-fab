"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { recomputePoReceiveStatus } from "@/lib/po-receive-status";

import { RecordStatus } from "@/lib/status";
/**
 * Fetch all data needed to render the Goods Return form:
 * companies, suppliers, employees, currencies, taxes, and
 * all Submitted GoodsReceives (with their items) for the GR dropdown.
 */
export async function getGoodsReturnFormData() {
  try {
    const [companies, suppliers, employees, currencies, taxes, goodsReceives] =
      await Promise.all([
        prisma.companyProfile.findMany({ where: { status: "Active" } }),
        prisma.supplierProfile.findMany({ where: { status: "Active" } }),
        prisma.employee.findMany({ where: { status: RecordStatus.Active } }),
        prisma.currency.findMany({ where: { status: "Active" } }),
        prisma.taxProfile.findMany({ where: { status: "Active" } }),
        prisma.goodsReceive.findMany({
          where: { status: "Submitted" },
          include: {
            purchaseOrder: true,
            items: {
              include: {
                purchaseOrderItem: {
                  include: {
                    poUom: true,
                    internalUom: true,
                  },
                },
              },
            },
          },
          orderBy: { grNo: "desc" },
        }),
      ]);

    const data = { companies, suppliers, employees, currencies, taxes, goodsReceives };
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error("Error fetching GoodsReturn form data:", error);
    throw new Error("Failed to load Goods Return form data");
  }
}

export async function submitGoodsReturn(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const rtn = await tx.goodsReturn.findUnique({
        where: { id },
        select: {
          status: true,
          purchaseOrderId: true,
          items: {
            select: {
              returnQty: true,
              goodsReceiveItem: {
                select: {
                  receiveQty: true,
                  purchaseOrderItem: { select: { material: true, description: true } },
                  goodsReturnItems: {
                    where: { goodsReturn: { status: "Submitted", id: { not: id } } },
                    select: { returnQty: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!rtn) throw new Error("Goods Return not found.");
      if (rtn.status !== "Draft") throw new Error(`Only a Draft Goods Return can be submitted (this one is ${rtn.status}).`);

      // Spec: Return Qty <= Receive Qty, counting returns already submitted against the same GR line.
      for (const it of rtn.items) {
        const gi = it.goodsReceiveItem;
        const alreadyReturned = gi.goodsReturnItems.reduce((s, r) => s + Number(r.returnQty), 0);
        const left = Number(gi.receiveQty) - alreadyReturned;
        if (Number(it.returnQty) > left + 0.005) {
          const label = gi.purchaseOrderItem.material || gi.purchaseOrderItem.description;
          throw new Error(`${label}: returning ${Number(it.returnQty).toFixed(2)} but only ${Math.max(0, left).toFixed(2)} received is left to return.`);
        }
      }

      await tx.goodsReturn.update({ where: { id }, data: { status: "Submitted" } });
      await recomputePoReceiveStatus(tx, rtn.purchaseOrderId);
    });
    revalidatePath("/dashboard/purchasing/purchase-order");
    revalidatePath("/dashboard/inventory", "layout");
    revalidatePath("/dashboard/purchasing/goods-return");
    revalidatePath(`/dashboard/purchasing/goods-return/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error submitting GoodsReturn:", error);
    return { success: false, error: error.message };
  }
}

export async function voidGoodsReturn(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const rtn = await tx.goodsReturn.update({
        where: { id },
        data: { status: "Void" },
        select: { purchaseOrderId: true },
      });
      await recomputePoReceiveStatus(tx, rtn.purchaseOrderId);
    });
    revalidatePath("/dashboard/purchasing/purchase-order");
    revalidatePath("/dashboard/inventory", "layout");
    revalidatePath("/dashboard/purchasing/goods-return");
    revalidatePath(`/dashboard/purchasing/goods-return/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error voiding GoodsReturn:", error);
    return { success: false, error: error.message };
  }
}
