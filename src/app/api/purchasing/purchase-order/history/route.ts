import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

/** All revisions of one PO number, newest first (the PO list's "History" dialog). */
export async function GET(req: Request) {
  const { error: authError } = await requirePermission("PURCHASE_ORDER", "v");
  if (authError) return authError;

  try {
    const poNo = new URL(req.url).searchParams.get("poNo")?.trim();
    if (!poNo) return NextResponse.json({ error: "poNo is required" }, { status: 400 });

    const revisions = await prisma.purchaseOrder.findMany({
      where: { poNo },
      orderBy: { revision: "desc" },
      select: {
        id: true,
        poNo: true,
        revision: true,
        date: true,
        status: true,
        receiveStatus: true,
        type: true,
        purchaser: { select: { name: true } },
      },
    });
    return NextResponse.json(revisions);
  } catch (e: any) {
    console.error("PO history error:", e);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
