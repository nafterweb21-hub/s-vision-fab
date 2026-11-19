import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toUserMessage } from "@/lib/api-error";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rtn = await prisma.goodsReturn.findUnique({
      where: { id },
      include: {
        company: true,
        supplier: true,
        purchaseOrder: {
          include: {
            items: {
              include: {
                poUom: true,
                internalUom: true,
                materialProfile: true,
              },
            },
          },
        },
        goodsReceive: {
          include: {
            items: {
              include: {
                purchaseOrderItem: {
                  include: {
                    poUom: true,
                    internalUom: true,
                  },
                },
              },
            },
          },
        },
        currency: true,
        taxType: true,
        creator: true,
        items: {
          include: {
            goodsReceiveItem: {
              include: {
                purchaseOrderItem: {
                  include: {
                    poUom: true,
                    internalUom: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!rtn) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rtn);
  } catch (e: any) {
    console.error("GET GoodsReturn error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    return await prisma.$transaction(async (tx) => {
      const exist = await tx.goodsReturn.findUnique({ where: { id } });
      if (!exist) throw new Error("Goods Return not found");
      if (exist.status !== "Draft") throw new Error("Only Draft Goods Returns can be edited.");

      // Status is not editable here: Submit / Void go through the actions, which
      // validate the return and update the PO Receive Status.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { items, status: _status, ...rtnData } = body;

      // Delete existing items and recreate
      await tx.goodsReturnItem.deleteMany({ where: { goodsReturnId: id } });

      const updated = await tx.goodsReturn.update({
        where: { id },
        data: {
          ...rtnData,
          // The GR may carry no tax type; store none rather than an invalid "".
          taxTypeId: rtnData.taxTypeId || null,
          rtnDate: new Date(rtnData.rtnDate),
          status: exist.status,
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

      return NextResponse.json(updated);
    });
  } catch (e: any) {
    console.error("PUT GoodsReturn error:", e);
    return NextResponse.json(
      { error: toUserMessage(e, "Failed to save Goods Return. Please check the form and try again.") },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exist = await prisma.goodsReturn.findUnique({ where: { id } });
    if (!exist) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (exist.status !== "Draft") {
      return NextResponse.json({ error: "Only Draft Goods Returns can be deleted." }, { status: 400 });
    }

    await prisma.goodsReturn.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("DELETE GoodsReturn error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
