import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

export async function GET(request: Request) {
  const { error: authError } = await requirePermission("PURCHASE_REQUISITION", "v");
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const prNo = searchParams.get("prNo") || "";

    if (!prNo) {
      return NextResponse.json({ error: "prNo parameter is required" }, { status: 400 });
    }

    const rows = await prisma.purchaseRequisition.findMany({
      where: { prNo },
      include: {
        requestedBy: { select: { name: true } },
      },
      orderBy: { revision: "desc" },
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("PR History error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
