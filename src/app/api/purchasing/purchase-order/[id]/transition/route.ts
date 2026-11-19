import { NextResponse } from "next/server";
import { copyPoShipTo } from "@/lib/po-ship-to";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { PoApprovalError, decidePoApproval, poApprovalRequirement } from "@/lib/po-approval-logic";
import { PO_EDITABLE_STATUSES } from "@/lib/po-approval-rules";
import { recomputePrPoStatus } from "@/lib/pr-po-status";

const REVISABLE_STATUSES = [
  "Pending For Approval",
  "Pending First Tier Approval",
  "Pending Second Tier Approval",
  "Approved",
  "Issued",
];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requirePermission("PURCHASE_ORDER", "e");
  if (authError) return authError;

  try {
    const { id } = await params;
    const { action, remark, expectedUpdatedAt } = await req.json();

    // Approve / reject share the PO Approval module's code path and permission,
    // so PURCHASE_ORDER edit rights alone can't approve.
    if (action === "approve1" || action === "reject") {
      const { session, error: approvalError } = await requirePermission("PO_APPROVAL", "a");
      if (approvalError) return approvalError;
      try {
        const updated = await decidePoApproval({
          poId: id,
          action: action === "approve1" ? "approve" : "reject",
          remark,
          userId: session.user.id,
          role: session.user.role,
          expectedUpdatedAt,
        });
        return NextResponse.json({ success: true, status: updated.status });
      } catch (e) {
        if (e instanceof PoApprovalError) return NextResponse.json({ error: e.message }, { status: e.status });
        throw e;
      }
    }

    return await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { supplier: true, contactPerson: true },
      });

      if (!po) throw new Error("Not found");

      if (action === "submit") {
        if (po.status !== "Draft" && po.status !== "Rejected") {
          throw new Error("Only Draft or Rejected PO can be submitted.");
        }
        // Supplier email is optional for every PO type.
        
        // Tier is decided on the base-currency amount (amount after tax × the PO's exchange rate).
        const approvalReq = await poApprovalRequirement(po, tx);

        // Conditional, so a concurrent submit / void can't be overwritten.
        const submitted = await tx.purchaseOrder.updateMany({
          where: { id: po.id, status: { in: [...PO_EDITABLE_STATUSES] } },
          data: {
            status: approvalReq.initialStatus,
            approvalTier: approvalReq.requiredTiers,
            firstApproverId: null,
            firstApproverName: null,
            firstApprovedAt: null,
            secondApproverId: null,
            secondApproverName: null,
            secondApprovedAt: null,
          },
        });
        if (submitted.count !== 1) throw new Error("This purchase order was changed by someone else. Reload it and try again.");
        return NextResponse.json({ success: true, status: approvalReq.initialStatus });
      }

      if (action === "void") {
        if (po.status === "Void" || po.status === "Issued") {
          throw new Error("Cannot void in this status.");
        }
        // Conditional, so a PO an approver issued meanwhile isn't voided.
        const voided = await tx.purchaseOrder.updateMany({
          where: { id: po.id, status: { notIn: ["Void", "Issued"] } },
          data: { status: "Void" },
        });
        if (voided.count !== 1) throw new Error("This purchase order was changed by someone else. Reload it and try again.");
        await recomputePrPoStatus(tx, po.purchaseRequisitionId);
        return NextResponse.json({ success: true, status: "Void" });
      }

      if (action === "revise") {
        if (!REVISABLE_STATUSES.includes(po.status)) {
          throw new Error("Only PO pending approval, Approved or Issued can be revised.");
        }

        // Mark current as Old Version. A PO still pending approval drops out of
        // the approval queue here, which cancels its in-flight approval; the new
        // revision starts as Draft and goes through approval afresh on submit.
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: "Old Version" },
        });

        // Create new revision
        const items = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });

        const newPo = await tx.purchaseOrder.create({
          data: {
            poNo: po.poNo,
            revision: po.revision + 1,
            date: new Date(),
            companyId: po.companyId,
            supplierId: po.supplierId,
            workOrderNo: po.workOrderNo,
            purchaseRequisitionId: po.purchaseRequisitionId,
            currencyId: po.currencyId,
            exchangeRate: po.exchangeRate,
            taxTypeId: po.taxTypeId,
            taxRate: po.taxRate,
            amountBeforeTax: po.amountBeforeTax,
            taxAmount: po.taxAmount,
            amountAfterTax: po.amountAfterTax,
            roundOff: po.roundOff,
            supplierGst: po.supplierGst,
            type: po.type,
            millCertificate: po.millCertificate,
            certOfConformance: po.certOfConformance,
            ...copyPoShipTo(po),
            contactPersonId: po.contactPersonId,
            telNo: po.telNo,
            faxNo: po.faxNo,
            mobileNo: po.mobileNo,
            email: po.email,
            purchaserId: po.purchaserId,
            receiveStatus: po.receiveStatus,
            remark: po.remark,
            status: "Draft",
          }
        });

        // Copy lines one by one so each old line id maps to its new copy.
        const itemIdMap = new Map<string, string>();
        for (const it of items) {
          const copy = await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: newPo.id,
              fromMaterialProfile: it.fromMaterialProfile,
              material: it.material,
              description: it.description,
              supplierMaterialNo: it.supplierMaterialNo,
              shape: it.shape,
              size: it.size,
              quantity: it.quantity,
              poUomId: it.poUomId,
              unitPrice: it.unitPrice,
              amount: it.amount,
              taxTypeId: it.taxTypeId,
              taxRate: it.taxRate,
              taxAmount: it.taxAmount,
              hsnCode: it.hsnCode,
              hsnDescription: it.hsnDescription,
              conversion: it.conversion,
              internalUomId: it.internalUomId,
              internalQuantity: it.internalQuantity,
              deliveryDate: it.deliveryDate,
              remark: it.remark,
              materialProfileId: it.materialProfileId,
              purchaseRequisitionItemId: it.purchaseRequisitionItemId,
              sortOrder: it.sortOrder,
              masterMainProcessId: it.masterMainProcessId,
              masterRoutingProcessId: it.masterRoutingProcessId,
              woRoutingProcessId: it.woRoutingProcessId,
              hardness: it.hardness,
              thickness: it.thickness,
            },
          });
          itemIdMap.set(it.id, copy.id);
        }

        // Move Subcon Request Forms (and their return/reject tracking) to the
        // new revision so they follow the live PO rather than the Old Version.
        for (const [oldItemId, newItemId] of itemIdMap) {
          await tx.subconRequestForm.updateMany({
            where: { purchaseOrderItemId: oldItemId },
            data: { purchaseOrderItemId: newItemId },
          });
        }
        await tx.subconReturnTracking.updateMany({
          where: { purchaseOrderId: po.id },
          data: { purchaseOrderId: newPo.id },
        });
        await tx.subconRejectTracking.updateMany({
          where: { purchaseOrderId: po.id },
          data: { purchaseOrderId: newPo.id },
        });

        // The new revision now carries the PR quantities in place of the Old Version.
        await recomputePrPoStatus(tx, po.purchaseRequisitionId);

        return NextResponse.json(newPo);
      }

      if (action === "issue") {
        if (po.status !== "Approved") throw new Error("Only Approved PO can be issued.");
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: "Issued" },
        });
        return NextResponse.json({ success: true, status: "Issued" });
      }

      throw new Error("Unknown action");
    });
  } catch (e: any) {
    console.error("PO transition error:", e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
