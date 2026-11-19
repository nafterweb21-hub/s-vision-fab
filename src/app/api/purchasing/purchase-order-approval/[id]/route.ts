import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  PO_APPROVAL_PARTIES_INCLUDE,
  PoApprovalError,
  decidePoApproval,
  evaluatePoApprovalState,
  loadApproverIdentity,
} from "@/lib/po-approval-logic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error: authError } = await requirePermission("PO_APPROVAL", "v");
  if (authError) return authError;

  try {
    const { id } = await params;

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
        ...PO_APPROVAL_PARTIES_INCLUDE,
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    const user = await loadApproverIdentity(session.user.id, session.user.role);
    const evaluation = await evaluatePoApprovalState(po, user);

    return NextResponse.json({ po, evaluation });
  } catch (e: any) {
    console.error("GET PO Approval detail error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error: authError } = await requirePermission("PO_APPROVAL", "a");
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();
    const { action, remark, expectedUpdatedAt } = body;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: action ? "Invalid action" : "Action is required" }, { status: 400 });
    }

    const updatedPo = await decidePoApproval({
      poId: id,
      action,
      remark,
      userId: session.user.id,
      role: session.user.role,
      expectedUpdatedAt,
    });
    return NextResponse.json(updatedPo);
  } catch (e: any) {
    if (e instanceof PoApprovalError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("POST PO Approval error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
