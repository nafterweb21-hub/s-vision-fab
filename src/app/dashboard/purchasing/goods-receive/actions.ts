"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { nextDocumentNo } from "@/lib/document-numbering";
import { RecordStatus } from "@/lib/status";
import { assertWithinOpenQty, poLineBalances, recomputePoReceiveStatus } from "@/lib/po-receive-status";
import { ensureStockItemsForReceipt } from "@/lib/stock-items";

/** Pages whose numbers are derived from submitted GRs. */
function revalidateReceiptViews(id?: string) {
  revalidatePath("/dashboard/purchasing/goods-receive");
  if (id) revalidatePath(`/dashboard/purchasing/goods-receive/${id}`);
  revalidatePath("/dashboard/purchasing/purchase-order");
  revalidatePath("/dashboard/inventory", "layout");
}

function toUserFriendlyError(error: any, defaultMsg: string): string {
  if (!error) return defaultMsg;
  const msg = typeof error === "string" ? error : error.message || "";

  if (msg.includes("Argument `company` is missing")) {
    return "Company profile configuration is incomplete. Please re-select the Company.";
  }
  if (msg.includes("Argument `supplier` is missing")) {
    return "Supplier profile configuration is incomplete. Please re-select the Supplier.";
  }
  if (msg.includes("Argument `purchaseOrder` is missing")) {
    return "Purchase Order selection is required. Please select an issued Purchase Order.";
  }
  if (msg.includes("Argument `currency` is missing")) {
    return "Currency is required. Please ensure currency is set.";
  }
  if (msg.includes("Unique constraint failed") || msg.includes("grNo")) {
    return "A Goods Receive document with this number already exists. Please try saving again.";
  }
  if (msg.includes("Foreign key constraint failed")) {
    return "One of the referenced records (Company, Supplier, PO, or Creator) is invalid or no longer exists.";
  }
  if (msg.includes("Invalid `prisma.") || msg.includes("invocation:")) {
    return "Failed to save Goods Receive due to invalid data format. Please verify the form inputs and try again.";
  }
  return msg || defaultMsg;
}

export async function getGoodsReceiveFormData() {
  try {
    const [companies, suppliers, purchaseOrders, employees, currencies, taxes] = await Promise.all([
      prisma.companyProfile.findMany({ where: { status: "Active" } }),
      prisma.supplierProfile.findMany({ where: { status: "Active" } }),
      prisma.purchaseOrder.findMany({
        where: { status: "Issued" },
        include: { items: true },
      }),
      prisma.employee.findMany({ where: { status: RecordStatus.Active } }),
      prisma.currency.findMany({ where: { status: "Active" } }),
      prisma.taxProfile.findMany({ where: { status: "Active" } }),
    ]);

    const data = { companies, suppliers, purchaseOrders, employees, currencies, taxes };
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error("Error fetching GR form data:", error);
    throw new Error("Failed to load GR form data");
  }
}

/** Previously received / open quantity per PO line, excluding the GR being edited. */
export async function getPoLineBalances(purchaseOrderId: string, excludeGrId?: string) {
  if (!purchaseOrderId) return {};
  return poLineBalances(prisma, purchaseOrderId, excludeGrId || undefined);
}

export async function createGoodsReceive(data: any) {
  try {
    const { items, ...grData } = data;

    if (!grData.companyId) {
      return { success: false, error: "Company selection is mandatory." };
    }
    if (!grData.supplierId) {
      return { success: false, error: "Supplier selection is mandatory." };
    }
    if (!grData.purchaseOrderId) {
      return { success: false, error: "Purchase Order selection is mandatory." };
    }

    const cleanData: any = {
      date: new Date(grData.date || new Date()),
      companyId: grData.companyId,
      supplierId: grData.supplierId,
      purchaseOrderId: grData.purchaseOrderId,
      currencyId: grData.currencyId,
      exchangeRate: Number(grData.exchangeRate) || 1,
      taxRate: Number(grData.taxRate) || 0,
      taxTypeId: grData.taxTypeId || null,
      doNo: grData.doNo || null,
      doDate: grData.doDate ? new Date(grData.doDate) : null,
      invoiceNo: grData.invoiceNo || null,
      invoiceDate: grData.invoiceDate ? new Date(grData.invoiceDate) : null,
      remark: grData.remark || null,
      creatorId: grData.creatorId || "emp-1",
    };

    const newGr = await prisma.$transaction(async (tx) => {
      await assertWithinOpenQty(
        tx,
        cleanData.purchaseOrderId,
        (items || []).map((item: any) => ({
          purchaseOrderItemId: item.purchaseOrderItemId,
          receiveQty: Number(item.receiveQty) || 0,
        })),
      );

      const grNo = await nextDocumentNo(tx, "GOODS_RECEIVE", {
        companyId: cleanData.companyId,
        isTaken: async (no) => (await tx.goodsReceive.count({ where: { grNo: no } })) > 0,
      });

      return tx.goodsReceive.create({
        data: {
          ...cleanData,
          grNo,
          status: "Draft",
          items: {
            create: (items || []).map((item: any) => ({
              purchaseOrderItemId: item.purchaseOrderItemId,
              receiveQty: Number(item.receiveQty) || 0,
            })),
          },
        },
      });
    });

    revalidatePath("/dashboard/purchasing/goods-receive");
    return { success: true, id: newGr.id };
  } catch (error: any) {
    console.error("Error creating GR:", error);
    return { success: false, error: toUserFriendlyError(error, "Failed to create Goods Receive.") };
  }
}

export async function updateGoodsReceive(id: string, data: any) {
  try {
    const { items, ...grData } = data;

    const cleanData: any = {
      date: grData.date ? new Date(grData.date) : undefined,
      companyId: grData.companyId,
      supplierId: grData.supplierId,
      purchaseOrderId: grData.purchaseOrderId,
      currencyId: grData.currencyId,
      exchangeRate: grData.exchangeRate !== undefined ? Number(grData.exchangeRate) : undefined,
      taxRate: grData.taxRate !== undefined ? Number(grData.taxRate) : undefined,
      taxTypeId: grData.taxTypeId || null,
      doNo: grData.doNo || null,
      doDate: grData.doDate ? new Date(grData.doDate) : null,
      invoiceNo: grData.invoiceNo || null,
      invoiceDate: grData.invoiceDate ? new Date(grData.invoiceDate) : null,
      remark: grData.remark || null,
    };

    await prisma.$transaction(async (tx) => {
      const existing = await tx.goodsReceive.findUnique({
        where: { id },
        select: { status: true, purchaseOrderId: true, items: { select: { id: true, purchaseOrderItemId: true, receiveQty: true } } },
      });
      if (!existing) throw new Error("Goods Receive not found.");
      if (existing.status === "Void") throw new Error("A voided Goods Receive cannot be edited.");

      // Quantities after this save: edited lines take the new value, the rest keep theirs.
      const edits = new Map<string, number>(
        (items || []).filter((it: any) => it.id).map((it: any) => [it.id, Number(it.receiveQty) || 0]),
      );
      await assertWithinOpenQty(
        tx,
        cleanData.purchaseOrderId || existing.purchaseOrderId,
        existing.items.map((it) => ({
          purchaseOrderItemId: it.purchaseOrderItemId,
          receiveQty: edits.has(it.id) ? edits.get(it.id)! : Number(it.receiveQty),
        })),
        id,
      );

      await tx.goodsReceive.update({
        where: { id },
        data: cleanData,
      });

      if (items && items.length > 0) {
        for (const item of items) {
          if (item.id) {
            await tx.goodsReceiveItem.update({
              where: { id: item.id },
              data: { receiveQty: Number(item.receiveQty) || 0 },
            });
          }
        }
      }

      if (existing.status === "Submitted") {
        await recomputePoReceiveStatus(tx, existing.purchaseOrderId);
        if (cleanData.purchaseOrderId && cleanData.purchaseOrderId !== existing.purchaseOrderId) {
          await recomputePoReceiveStatus(tx, cleanData.purchaseOrderId);
        }
      }
    });

    revalidateReceiptViews(id);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating GR:", error);
    return { success: false, error: toUserFriendlyError(error, "Failed to update Goods Receive.") };
  }
}

export async function submitGoodsReceive(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const gr = await tx.goodsReceive.findUnique({
        where: { id },
        select: { status: true, purchaseOrderId: true, items: { select: { purchaseOrderItemId: true, receiveQty: true } } },
      });
      if (!gr) throw new Error("Goods Receive not found.");
      if (gr.status !== "Draft") throw new Error(`Only a Draft Goods Receive can be submitted (this one is ${gr.status}).`);

      // Re-check at submit: other GRs may have been saved since this draft was.
      await assertWithinOpenQty(
        tx,
        gr.purchaseOrderId,
        gr.items.map((it) => ({ purchaseOrderItemId: it.purchaseOrderItemId, receiveQty: Number(it.receiveQty) })),
        id,
      );

      await tx.goodsReceive.update({ where: { id }, data: { status: "Submitted" } });
      await recomputePoReceiveStatus(tx, gr.purchaseOrderId);
      // On-hand stock is derived from submitted GRs; make sure every received
      // material has a stock record so it shows on the inventory pages.
      await ensureStockItemsForReceipt(tx, id);
    });

    revalidateReceiptViews(id);
    return { success: true };
  } catch (error: any) {
    console.error("Error submitting GR:", error);
    return { success: false, error: toUserFriendlyError(error, "Failed to submit Goods Receive.") };
  }
}

export async function voidGoodsReceive(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const openReturns = await tx.goodsReturn.count({
        where: { goodsReceiveId: id, status: { not: "Void" } },
      });
      if (openReturns > 0) {
        throw new Error("This Goods Receive has Goods Returns against it. Void those returns first.");
      }
      const gr = await tx.goodsReceive.update({
        where: { id },
        data: { status: "Void" },
        select: { purchaseOrderId: true },
      });
      await recomputePoReceiveStatus(tx, gr.purchaseOrderId);
    });

    revalidateReceiptViews(id);
    return { success: true };
  } catch (error: any) {
    console.error("Error voiding GR:", error);
    return { success: false, error: toUserFriendlyError(error, "Failed to void Goods Receive.") };
  }
}
