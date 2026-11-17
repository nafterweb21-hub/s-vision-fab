import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { error: authError } = await requirePermission("PO_APPROVAL", "v");
  if (authError) return authError;

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    // Only fetch POs that are pending approval
    const status = url.searchParams.get("status") || "All";
    const type = url.searchParams.get("type");

    const PENDING_STATUSES = [
      "Pending For Approval",
      "Pending First Tier Approval",
      "Pending Second Tier Approval",
    ];

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status === "All") {
      where.status = { in: PENDING_STATUSES };
    } else {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { poNo: { contains: search, mode: "insensitive" } },
        { remark: { contains: search, mode: "insensitive" } },
        { workOrderNo: { contains: search, mode: "insensitive" } },
        { purchaseRequisition: { prNo: { contains: search, mode: "insensitive" } } },
        { purchaser: { name: { contains: search, mode: "insensitive" } } },
        { supplier: { supplierName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const items = await prisma.purchaseOrder.findMany({
      where,
      orderBy: [{ poNo: "desc" }, { revision: "desc" }],
      include: {
        company: { select: { companyName: true } },
        supplier: { select: { supplierName: true } },
        purchaser: { select: { name: true } },
        workOrder: { select: { jobDescription: true } },
        purchaseRequisition: { select: { prNo: true } },
      },
    });

    return NextResponse.json(items);
  } catch (e: any) {
    console.error("GET PO Approval list error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
