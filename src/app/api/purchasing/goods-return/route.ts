import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toUserMessage } from "@/lib/api-error";
import { nextDocumentNo } from "@/lib/document-numbering";

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
        { rtnNo: { contains: search, mode: "insensitive" } },
        { remark: { contains: search, mode: "insensitive" } },
        { supplier: { supplierName: { contains: search, mode: "insensitive" } } },
        { purchaseOrder: { poNo: { contains: search, mode: "insensitive" } } },
        { goodsReceive: { grNo: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (!prisma.goodsReturn) {
      return NextResponse.json([]);
    }

    const items = await prisma.goodsReturn.findMany({
      where,
      orderBy: { rtnNo: "desc" },
      include: {
        company: { select: { companyName: true } },
        supplier: { select: { supplierName: true } },
        purchaseOrder: { select: { poNo: true } },
        goodsReceive: { select: { grNo: true } },
        creator: { select: { name: true } },
      },
    });

    return NextResponse.json(items);
  } catch (e: any) {
    console.error("GET GoodsReturn list error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { items, ...rtnData } = body;

    // The number is taken and the return written in one transaction: the
    // counter's row lock only holds for as long as the transaction does.
    const newRtn = await prisma.$transaction(async (tx) => {
      const rtnNo = await nextDocumentNo(tx, "GOODS_RETURN", {
        companyId: rtnData.companyId,
        isTaken: async (no) => (await tx.goodsReturn.count({ where: { rtnNo: no } })) > 0,
      });

      return tx.goodsReturn.create({
        data: {
          ...rtnData,
          // The GR may carry no tax type; store none rather than an invalid "".
          taxTypeId: rtnData.taxTypeId || null,
          rtnNo,
          rtnDate: new Date(rtnData.rtnDate),
          status: "Draft",
          items: {
            create: (items || []).map((item: any) => ({
              goodsReceiveItemId: item.goodsReceiveItemId,
              returnQty: Number(item.returnQty),
              amount: Number(item.amount),
              internalQty: Number(item.internalQty),
              remark: item.remark || null,
            })),
          },
        },
      });
    });

    return NextResponse.json({ success: true, id: newRtn.id }, { status: 201 });
  } catch (e: any) {
    console.error("POST GoodsReturn error:", e);
    return NextResponse.json(
      { error: toUserMessage(e, "Failed to save Goods Return. Please check the form and try again.") },
      { status: 500 },
    );
  }
}
