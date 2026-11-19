import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const goodsReceive = await prisma.goodsReceive.findUnique({
      where: { id },
      include: {
        purchaseOrder: { select: { poNo: true, revision: true, workOrderNo: true, receiveStatus: true } },
        items: {
          include: {
            purchaseOrderItem: { include: { poUom: true } },
          },
        },
      },
    });

    if (!goodsReceive) {
      return NextResponse.json(
        { error: "Goods Receive not found" },
        { status: 404 }
      );
    }

    const safeData = JSON.parse(
      JSON.stringify(goodsReceive, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json(safeData);
  } catch (error: any) {
    console.error("GET Goods Receive error:", error);
    return NextResponse.json(
      { 
        error: error.message, 
        name: error.name, 
        code: error.code, 
        meta: error.meta,
        clientVersion: error.clientVersion
      },
      { status: 500 }
    );
  }
}
