import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "All";

    const where: any = {};

    if (status !== "All") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { grNo: { contains: search, mode: "insensitive" } },
        { remark: { contains: search, mode: "insensitive" } },
        { supplier: { supplierName: { contains: search, mode: "insensitive" } } },
        { doNo: { contains: search, mode: "insensitive" } },
        { invoiceNo: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.goodsReceive.findMany({
      where,
      orderBy: { grNo: "desc" },
      include: {
        company: { select: { companyName: true } },
        supplier: { select: { supplierName: true } },
        purchaseOrder: {
          select: {
            poNo: true,
            receiveStatus: true,
            items: {
              select: {
                id: true,
                quantity: true,
                goodsReceiveItems: {
                  where: { goodsReceive: { status: "Submitted" } },
                  select: {
                    receiveQty: true,
                    goodsReturnItems: {
                      where: { goodsReturn: { status: "Submitted" } },
                      select: { returnQty: true },
                    },
                  },
                },
              },
            },
          },
        },
        creator: { select: { name: true } },
        items: { select: { purchaseOrderItemId: true, receiveQty: true } },
      },
    });

    // Per-row PO receipt progress. Lines are in different UOMs, so each line
    // counts equally: progress = mean over lines of min(nett received / ordered, 1).
    const rows = items.map(({ items: grItems, purchaseOrder, ...gr }) => {
      const lines = (purchaseOrder?.items || []).filter((l) => Number(l.quantity) > 0);
      const mine = new Map<string, number>();
      for (const gi of grItems) {
        mine.set(gi.purchaseOrderItemId, (mine.get(gi.purchaseOrderItemId) || 0) + Number(gi.receiveQty));
      }

      let received = 0;
      let thisGr = 0;
      let overReceived = false;
      for (const l of lines) {
        const ordered = Number(l.quantity);
        const nett = l.goodsReceiveItems.reduce(
          (s, g) => s + Number(g.receiveQty) - g.goodsReturnItems.reduce((r, x) => r + Number(x.returnQty), 0),
          0,
        );
        if (nett > ordered + 0.005) overReceived = true;
        received += Math.min(Math.max(nett, 0) / ordered, 1);
        thisGr += Math.min((mine.get(l.id) || 0) / ordered, 1);
      }
      const n = lines.length || 1;

      return {
        ...gr,
        purchaseOrder: { poNo: purchaseOrder?.poNo, receiveStatus: purchaseOrder?.receiveStatus },
        progress: {
          /** Share of the PO received by submitted GRs (net of returns), 0–100. */
          receivedPct: Math.round((received / n) * 100),
          /** Share of the PO this GR covers, 0–100. Not yet counted in receivedPct while Draft. */
          thisGrPct: Math.round((thisGr / n) * 100),
          overReceived,
        },
      };
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("GET GR list error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
