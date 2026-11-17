import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toUserMessage } from "@/lib/api-error";

export async function GET() {
  try {
    const [customers, salesOrders, workOrders, uoms] = await Promise.all([
      prisma.customerProfile.findMany({
        where: { status: "Active" },
        select: {
          id: true,
          customerName: true,
          customerCode: true,
        },
        orderBy: { customerName: "asc" },
      }),
      prisma.salesOrder.findMany({
        where: {
          status: { not: "Void" },
        },
        select: {
          id: true,
          orderNo: true,
          customerId: true,
          customerPoRef: true,
          items: { select: { unitPrice: true, batches: { select: { workOrderNo: true } } } },
        },
        orderBy: { orderNo: "asc" },
      }),
      prisma.workOrder.findMany({
        where: {
          status: "Completed",
          qcAcceptance: "Approved",
        },
        select: {
          workOrderNo: true,
          customerId: true,
          partName: true,
          quantity: true,
          uom: true,
          deliveryDate: true,
        },
        orderBy: { workOrderNo: "asc" },
      }),
      prisma.uomProfile.findMany({
        where: { status: "Active" },
        select: { id: true, uomName: true },
        orderBy: { uomName: "asc" },
      }),
    ]);

    // Flatten each sales order's work order numbers so the form can filter WOs by SO.
    const salesOrdersOut = salesOrders.map(({ items, ...so }) => ({
      ...so,
      workOrderNos: items.flatMap((it) => it.batches.map((b) => b.workOrderNo)).filter((n): n is string => !!n),
      // SO line unit price per work order — the DO form uses it to pre-fill Total Value.
      woUnitPrices: Object.fromEntries(
        items.flatMap((it) =>
          it.batches.filter((b) => b.workOrderNo).map((b) => [b.workOrderNo as string, Number(it.unitPrice)]),
        ),
      ),
    }));

    return NextResponse.json({
      customers,
      salesOrders: salesOrdersOut,
      workOrders,
      uoms,
    });
  } catch (e: any) {
    console.error("Delivery Order form-data error:", e);
    return NextResponse.json({ error: toUserMessage(e, "Could not load the form data. Please refresh the page.") }, { status: 500 });
  }
}
