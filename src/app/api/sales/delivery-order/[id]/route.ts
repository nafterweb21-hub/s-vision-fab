import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toUserMessage } from "@/lib/api-error";
import { assertWithinWorkOrderQty, DeliveryOrderRuleError, lockDraftDeliveryOrder } from "@/lib/delivery-order-qty";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const doItem = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            workOrder: true,
            uom: true,
          }
        },
        cocs: true,
      },
    });

    if (!doItem) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(doItem);
  } catch (error: any) {
    console.error("Get Delivery Order Error:", error);
    return NextResponse.json({ error: toUserMessage(error, "Could not load the delivery order. Please try again.") }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { doNo, date, customerId, salesOrderId, cocRequired, poNo, vehicleNo, modeOfTransport, isReturnable, returnableNote, items } = body;

    // Check if duplicate DO no
    const existing = await prisma.deliveryOrder.findUnique({ where: { doNo } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Delivery Order No already exists." }, { status: 400 });
    }

    const current = await prisma.deliveryOrder.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (current.status !== "Draft") {
      return NextResponse.json({ error: "Only draft Delivery Orders can be updated." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Lock this DO and re-check it is still Draft (a concurrent submit/void may have landed).
      await lockDraftDeliveryOrder(tx, id, "Only draft Delivery Orders can be updated.");
      // Spec: total delivered across non-void DOs ≤ WO Qty (this DO's old lines excluded).
      await assertWithinWorkOrderQty(tx, items ?? [], id);

      await tx.deliveryOrder.update({
        where: { id },
        data: {
          doNo,
          date: new Date(date),
          customerId,
          salesOrderId,
          cocRequired: !!cocRequired,
          poNo: poNo?.trim() || null,
          vehicleNo: vehicleNo?.trim() || null,
          modeOfTransport: modeOfTransport?.trim() || null,
          isReturnable: !!isReturnable,
          returnableNote: isReturnable ? (returnableNote?.trim() || null) : null,
          items: {
            deleteMany: {},
            create: items.map((item: any) => ({
              workOrderNo: item.workOrderNo,
              description: item.description?.trim() || null,
              quantity: Number(item.quantity),
              uomId: item.uomId || null,
              totalValue: item.totalValue === "" || item.totalValue == null ? null : Number(item.totalValue),
              deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
            })),
          },
        },
      });
    });

    return NextResponse.json({ success: true, id, doNo: doNo || current.doNo });
  } catch (error: any) {
    if (error instanceof DeliveryOrderRuleError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Update Delivery Order Error:", error);
    return NextResponse.json({ error: toUserMessage(error, "Could not save the delivery order. Please check the details and try again.") }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const current = await prisma.deliveryOrder.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (current.status !== "Draft") {
      return NextResponse.json({ error: "Only draft Delivery Orders can be deleted." }, { status: 400 });
    }

    await prisma.deliveryOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Delivery Order Error:", error);
    return NextResponse.json({ error: toUserMessage(error, "Could not delete the delivery order. Please try again.") }, { status: 500 });
  }
}
