import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPurchaseRequisition } from "@/lib/purchase-requisitions";
import { requirePermission } from "@/lib/authz";
import { PR_PO_NOT_COUNTED } from "@/app/dashboard/purchasing/purchase-requisition/pr-status";

export async function GET(request: Request) {
  const { error: authError } = await requirePermission("PURCHASE_REQUISITION", "v");
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { prNo: { contains: search, mode: "insensitive" } },
        { workOrderNo: { contains: search, mode: "insensitive" } },
        { requestedBy: { name: { contains: search, mode: "insensitive" } } },
        { remark: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "All") {
      where.status = status;
    } else {
      where.status = { not: "Old Version" };
    }

    const rows = await prisma.purchaseRequisition.findMany({
      where,
      include: {
        company: { select: { companyName: true } },
        workOrder: { select: { jobDescription: true } },
        requestedBy: { select: { name: true } },
        // PO lines still holding quantity, so the list can tell why Void is unavailable.
        items: {
          select: {
            purchaseOrderItems: {
              where: { purchaseOrder: { status: { notIn: [...PR_PO_NOT_COUNTED] } } },
              select: { purchaseOrder: { select: { poNo: true, revision: true, status: true } } },
            },
          },
        },
      },
      orderBy: [{ prNo: "desc" }, { revision: "desc" }],
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("PR GET error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error: authError } = await requirePermission("PURCHASE_REQUISITION", "c");
  if (authError) return authError;

  try {
    const body = await request.json();
    const pr = await createPurchaseRequisition(body);
    return NextResponse.json(pr, { status: 201 });
  } catch (e: any) {
    console.error("PR POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
