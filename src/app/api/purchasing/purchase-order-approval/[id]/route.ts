import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { evaluatePoApprovalState } from "@/lib/po-approval-logic";

async function sendEmailNotification(to: string, subject: string, body: string) {
  console.log("-----------------------------------------");
  console.log(`[EMAIL NOTIFICATION] To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log("-----------------------------------------");
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requirePermission("PO_APPROVAL", "v");
  if (authError) return authError;

  try {
    const { id } = await params;
    const session = await auth();
    const currentUserId = session?.user?.id || "";
    const currentUserRole = session?.user?.role || "";

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            poUom: true,
            internalUom: true,
            materialProfile: true,
            woRoutingProcess: {
              include: { mainProcess: true, routingProcess: true },
            },
            masterMainProcess: true,
            masterRoutingProcess: true,
          },
        },
        company: true,
        supplier: true,
        currency: true,
        taxType: true,
        contactPerson: true,
        purchaser: true,
        purchaseRequisition: true,
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    const moduleName = po.type === "SUBCON" ? "Purchase Order - Subcon" : "Purchase Order - Material";
    const evaluation = await evaluatePoApprovalState(po, currentUserId, currentUserRole, moduleName);

    return NextResponse.json({ po, evaluation });
  } catch (e: any) {
    console.error("GET PO Approval detail error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requirePermission("PO_APPROVAL", "a");
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const { action, remark } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const currentUserId = session.user.id;
    const currentUserRole = session.user.role;
    const approverName = session.user.name || session.user.email || "System Approver";

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        purchaser: true,
        supplier: true,
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    const PENDING_STATUSES = [
      "Pending For Approval",
      "Pending First Tier Approval",
      "Pending Second Tier Approval",
    ];

    if (!PENDING_STATUSES.includes(po.status)) {
      return NextResponse.json(
        { error: `Purchase Order is not pending approval (current status: ${po.status})` },
        { status: 400 }
      );
    }

    const moduleName = po.type === "SUBCON" ? "Purchase Order - Subcon" : "Purchase Order - Material";
    const evalState = await evaluatePoApprovalState(po, currentUserId, currentUserRole, moduleName);

    if (action === "reject") {
      if (!evalState.canReject) {
        return NextResponse.json(
          { error: evalState.cannotApproveReason || "You are not authorized to reject this Purchase Order." },
          { status: 403 }
        );
      }

      const updatedPo = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: "Rejected",
          remark: remark ? `${po.remark ? po.remark + "\n" : ""}Rejection remark: ${remark}` : po.remark,
        },
      });

      // Email purchaser asking for revision and amendment
      await sendEmailNotification(
        po.purchaser?.email || "purchaser@example.com",
        `Purchase Order ${po.poNo} Rejected`,
        `Your purchase order ${po.poNo} has been rejected by ${approverName}.\nRemark: ${remark}\nPlease revise and amend.`
      );

      return NextResponse.json(updatedPo);
    }

    if (action === "approve") {
      if (!evalState.canApprove) {
        return NextResponse.json(
          { error: evalState.cannotApproveReason || "You are not authorized to approve this Purchase Order." },
          { status: 403 }
        );
      }

      let updateData: any = {};
      let newStatus = po.status;

      if (evalState.isSecondTierPending) {
        // Second tier approved: PO is fully approved and issued
        newStatus = "Issued";
        updateData = {
          status: newStatus,
          secondApproverId: currentUserId,
          secondApproverName: approverName,
          secondApprovedAt: new Date(),
          approverName: approverName,
        };
        if (remark) updateData.remark = remark;

        // Send email to supplier
        await sendEmailNotification(
          po.supplier?.supplierName || "supplier@example.com",
          `Purchase Order ${po.poNo} Issued`,
          `Please find attached Purchase Order ${po.poNo} approved by ${approverName}.`
        );
      } else if (evalState.isFirstTierPending) {
        if (evalState.requiredTiers === 2) {
          // 2-tier approval: First tier approved, now awaits 2nd tier
          newStatus = "Pending Second Tier Approval";
          updateData = {
            status: newStatus,
            approvalTier: 2,
            firstApproverId: currentUserId,
            firstApproverName: approverName,
            firstApprovedAt: new Date(),
          };
          if (remark) updateData.remark = remark;

          // Notify 2nd tier approvers
          const secondTierEmails = evalState.secondTierApprovers.map((a) => a.email).join(", ");
          await sendEmailNotification(
            secondTierEmails || "manager@example.com",
            `Purchase Order ${po.poNo} Requires Second Tier Approval`,
            `PO ${po.poNo} (Amount: $${po.amountAfterTax}) has been approved by first tier (${approverName}) and now requires second tier sign-off.`
          );
        } else {
          // Single-tier approval: Immediately issued
          newStatus = "Issued";
          updateData = {
            status: newStatus,
            approvalTier: 1,
            firstApproverId: currentUserId,
            firstApproverName: approverName,
            firstApprovedAt: new Date(),
            approverName: approverName,
          };
          if (remark) updateData.remark = remark;

          // Send email to supplier
          await sendEmailNotification(
            po.supplier?.supplierName || "supplier@example.com",
            `Purchase Order ${po.poNo} Issued`,
            `Please find attached Purchase Order ${po.poNo}.`
          );
        }
      }

      const updatedPo = await prisma.purchaseOrder.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json(updatedPo);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    console.error("POST PO Approval error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
