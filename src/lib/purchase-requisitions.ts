import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { nextDocumentNo } from "@/lib/document-numbering";
import { recomputePrPoStatus } from "@/lib/pr-po-status";
import {
  PR_PO_NOT_COUNTED,
  linkedPoNos,
  prLineRemoveBlockReason,
  prLineUomChangeBlockReason,
  prVoidBlockReason,
} from "@/app/dashboard/purchasing/purchase-requisition/pr-status";

const Prisma_Decimal = Prisma.Decimal;

export type PurchaseRequisitionStatus = "Draft" | "Submitted" | "Void" | "Old Version";

/** A PR number is shared across revisions, so only revision 0 consumes one. */
const prNoTaken = (tx: Prisma.TransactionClient) => async (no: string) =>
  (await tx.purchaseRequisition.count({ where: { prNo: no } })) > 0;

export type PRItemInput = {
  /** Existing line id when editing a Draft; lines keep their identity so PO lines stay linked. */
  id?: string | null;
  fromMaterialProfile: boolean;
  material?: string | null;
  description: string;
  shape?: string | null;
  size?: string | null;
  uomId: string;
  quantity: number | string;
  cancelQuantity?: number | string;
  deliveryDate: string | Date;
  remark?: string | null;
  materialProfileId?: string | null;
  sortOrder?: number;
};

export type PurchaseRequisitionInput = {
  companyId: string;
  date: string | Date;
  workOrderNo?: string | null;
  requestedById: string;
  remark?: string | null;
  items: PRItemInput[];
};

function isBackdated(dateStr: string | Date): boolean {
  const inputDate = new Date(dateStr);
  inputDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate < today;
}

const cleanId = (v: any) => (v === "" || v == null ? null : v);
const cleanStr = (v: any) => (v == null || v === "" ? null : String(v));

/** PO lines that still hold PR quantity (any PO except Void / Old Version). */
const countedPoLines = {
  where: { purchaseOrder: { status: { notIn: [...PR_PO_NOT_COUNTED] } } },
  select: { purchaseOrder: { select: { poNo: true, revision: true, status: true } } },
};

const byLineOrder = <T extends { sortOrder: number; createdAt: Date; id: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);

export async function createPurchaseRequisition(input: PurchaseRequisitionInput) {
  if (!input.companyId) throw new Error("Company is required");
  if (!input.requestedById) throw new Error("Requested By is required");
  if (!input.items?.length) throw new Error("At least one item is required");
  
  if (isBackdated(input.date)) {
    throw new Error("Backdate is not allowed for Purchase Requisition Date");
  }

  // The number is taken and the PR written in one transaction: the counter's
  // row lock only holds for as long as the transaction does.
  return prisma.$transaction(async (tx) => {
    const prNo = await nextDocumentNo(tx, "PURCHASE_REQUISITION", {
      companyId: input.companyId,
      isTaken: prNoTaken(tx),
    });

    return tx.purchaseRequisition.create({
    data: {
      prNo,
      revision: 0,
      status: "Draft",
      poStatus: "N/A",
      date: new Date(input.date),
      companyId: input.companyId,
      workOrderNo: cleanId(input.workOrderNo),
      requestedById: input.requestedById,
      remark: cleanStr(input.remark),
      items: {
        create: input.items.map((it, idx) => {
          const qty = new Prisma_Decimal(it.quantity || 0);
          const cancelQty = new Prisma_Decimal(it.cancelQuantity || 0);
          const prQty = qty.minus(cancelQty);

          return {
            fromMaterialProfile: it.fromMaterialProfile,
            material: cleanStr(it.material),
            description: it.description.trim(),
            shape: cleanStr(it.shape),
            size: cleanStr(it.size),
            uomId: it.uomId,
            quantity: qty,
            cancelQuantity: cancelQty,
            prQuantity: prQty,
            deliveryDate: new Date(it.deliveryDate),
            remark: cleanStr(it.remark),
            poQuantityIssued: new Prisma_Decimal(0),
            balanceRequirePurchase: prQty,
            materialProfileId: cleanId(it.materialProfileId),
            sortOrder: it.sortOrder ?? idx,
          };
        }),
      },
    },
    include: { items: true },
    });
  });
}

export async function updatePurchaseRequisition(id: string, input: PurchaseRequisitionInput) {
  const existing = await prisma.purchaseRequisition.findUnique({ where: { id } });
  if (!existing) throw new Error("Purchase Requisition not found");
  if (existing.status !== "Draft") {
    throw new Error("Only Draft purchase requisitions can be edited");
  }

  if (isBackdated(input.date)) {
    throw new Error("Backdate is not allowed for Purchase Requisition Date");
  }

  return prisma.$transaction(async (tx) => {
    // Lines are updated in place (not delete + recreate) so PO lines that reference them stay
    // linked: a Draft can carry POs after a revise.
    const existingItems = (
      await tx.purchaseRequisitionItem.findMany({
        where: { purchaseRequisitionId: id },
        include: { purchaseOrderItems: countedPoLines },
      })
    ).sort(byLineOrder);
    const existingById = new Map(existingItems.map((it) => [it.id, it]));
    const keptIds = new Set(input.items.map((it) => it.id).filter((x): x is string => !!x && existingById.has(x)));

    for (const [i, ex] of existingItems.entries()) {
      if (keptIds.has(ex.id)) continue;
      const reason = prLineRemoveBlockReason(i + 1, linkedPoNos(ex));
      if (reason) throw new Error(reason);
    }
    for (const [i, it] of input.items.entries()) {
      const ex = it.id ? existingById.get(it.id) : undefined;
      if (!ex || ex.uomId === it.uomId) continue;
      const reason = prLineUomChangeBlockReason(i + 1, linkedPoNos(ex));
      if (reason) throw new Error(reason);
    }

    const removedIds = existingItems.filter((it) => !keptIds.has(it.id)).map((it) => it.id);
    if (removedIds.length) {
      await tx.purchaseRequisitionItem.deleteMany({ where: { id: { in: removedIds } } });
    }

    await tx.purchaseRequisition.update({
      where: { id },
      data: {
        date: new Date(input.date),
        companyId: input.companyId,
        workOrderNo: cleanId(input.workOrderNo),
        requestedById: input.requestedById,
        remark: cleanStr(input.remark),
      },
    });

    for (const [idx, it] of input.items.entries()) {
      const qty = new Prisma_Decimal(it.quantity || 0);
      const cancelQty = new Prisma_Decimal(it.cancelQuantity || 0);
      const prQty = qty.minus(cancelQty);
      const data = {
        fromMaterialProfile: it.fromMaterialProfile,
        material: cleanStr(it.material),
        description: it.description.trim(),
        shape: cleanStr(it.shape),
        size: cleanStr(it.size),
        uomId: it.uomId,
        quantity: qty,
        cancelQuantity: cancelQty,
        prQuantity: prQty,
        deliveryDate: new Date(it.deliveryDate),
        remark: cleanStr(it.remark),
        materialProfileId: cleanId(it.materialProfileId),
        sortOrder: it.sortOrder ?? idx,
      };
      if (it.id && keptIds.has(it.id)) {
        // PO Qty Issued / Balance are re-derived by the recompute below.
        await tx.purchaseRequisitionItem.update({ where: { id: it.id }, data });
      } else {
        await tx.purchaseRequisitionItem.create({
          data: {
            ...data,
            purchaseRequisitionId: id,
            poQuantityIssued: new Prisma_Decimal(0),
            balanceRequirePurchase: prQty,
          },
        });
      }
    }

    await recomputePrPoStatus(tx, id);

    return tx.purchaseRequisition.findUniqueOrThrow({ where: { id }, include: { items: true } });
  });
}

export async function transitionPurchaseRequisition(id: string, action: "submit" | "void" | "revise") {
  const pr = await prisma.purchaseRequisition.findUnique({
    where: { id },
    include: { items: true, requestedBy: true },
  });
  if (!pr) throw new Error("Purchase Requisition not found");

  switch (action) {
    case "submit": {
      if (pr.status !== "Draft") throw new Error("Only Draft can be submitted");
      
      const updated = await prisma.purchaseRequisition.update({
        where: { id },
        data: { status: "Submitted" },
      });

      // Email log trigger
      console.log(`[EMAIL NOTIFICATION] PR ${pr.prNo}-R${pr.revision} submitted by ${pr.requestedBy.name}. Email sent to designated persons.`);
      return updated;
    }
    case "void": {
      return prisma.$transaction(async (tx) => {
        const items = await tx.purchaseRequisitionItem.findMany({
          where: { purchaseRequisitionId: id },
          select: { purchaseOrderItems: countedPoLines },
        });
        const issuedPoNos = [...new Set(items.flatMap((it) => linkedPoNos(it)))];
        const reason = prVoidBlockReason(pr, issuedPoNos);
        if (reason) throw new Error(reason);
        return tx.purchaseRequisition.update({
          where: { id },
          data: { status: "Void" },
        });
      });
    }
    case "revise": {
      if (pr.status !== "Submitted") {
        throw new Error("Only Submitted purchase requisitions can be revised");
      }

      return prisma.$transaction(async (tx) => {
        // Mark existing PR as Old Version
        await tx.purchaseRequisition.update({
          where: { id },
          data: { status: "Old Version" },
        });

        // Create new revision in Draft state (PO Status is re-derived below)
        const created = await tx.purchaseRequisition.create({
          data: {
            prNo: pr.prNo,
            revision: pr.revision + 1,
            status: "Draft",
            poStatus: pr.poStatus,
            date: new Date(),
            companyId: pr.companyId,
            workOrderNo: pr.workOrderNo,
            requestedById: pr.requestedById,
            remark: pr.remark,
          },
        });

        // Copy each line one at a time so every old line maps to exactly its copy, then move the
        // PO lines that still hold quantity (not Void / Old Version) onto the copy.
        for (const it of [...pr.items].sort(byLineOrder)) {
          const copy = await tx.purchaseRequisitionItem.create({
            data: {
              purchaseRequisitionId: created.id,
              fromMaterialProfile: it.fromMaterialProfile,
              material: it.material,
              description: it.description,
              shape: it.shape,
              size: it.size,
              uomId: it.uomId,
              quantity: it.quantity,
              cancelQuantity: it.cancelQuantity,
              prQuantity: it.prQuantity,
              deliveryDate: it.deliveryDate,
              remark: it.remark,
              poQuantityIssued: it.poQuantityIssued,
              balanceRequirePurchase: it.balanceRequirePurchase,
              materialProfileId: it.materialProfileId,
              sortOrder: it.sortOrder,
            },
          });
          await tx.purchaseOrderItem.updateMany({
            where: { purchaseRequisitionItemId: it.id, purchaseOrder: { status: { notIn: [...PR_PO_NOT_COUNTED] } } },
            data: { purchaseRequisitionItemId: copy.id },
          });
        }

        // The PO header link follows the lines, so later PO saves recompute the live revision.
        await tx.purchaseOrder.updateMany({
          where: { purchaseRequisitionId: id, status: { notIn: [...PR_PO_NOT_COUNTED] } },
          data: { purchaseRequisitionId: created.id },
        });

        await recomputePrPoStatus(tx, created.id);

        return tx.purchaseRequisition.findUniqueOrThrow({ where: { id: created.id } });
      });
    }
  }
}
