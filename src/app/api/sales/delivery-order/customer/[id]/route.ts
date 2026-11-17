import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toUserMessage } from "@/lib/api-error";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deliveryOrders = await prisma.deliveryOrder.findMany({
      where: {
        customerId: id,
        status: "Draft", // Adjust if needed: e.g., maybe "Submitted" DOs can't have new COCs if it's strictly before submission? The spec says "COC can only be created when DO has yet to be submitted". So DO must be Draft.
        cocRequired: true,
      },
      include: {
        items: {
          include: {
            workOrder: true,
          }
        }
      },
      orderBy: { doNo: "asc" },
    });

    return NextResponse.json(deliveryOrders);
  } catch (error: any) {
    console.error("Get DOs by Customer Error:", error);
    return NextResponse.json({ error: toUserMessage(error, "Could not load delivery orders for this customer. Please try again.") }, { status: 500 });
  }
}
