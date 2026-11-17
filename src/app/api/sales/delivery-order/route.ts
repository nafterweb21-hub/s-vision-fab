import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextDocumentNo } from "@/lib/document-numbering";
import { toUserMessage } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const where = search
      ? {
          OR: [
            { doNo: { contains: search, mode: "insensitive" as const } },
            { poNo: { contains: search, mode: "insensitive" as const } },
            { vehicleNo: { contains: search, mode: "insensitive" as const } },
            { customer: { customerName: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const [total, data] = await Promise.all([
      prisma.deliveryOrder.count({ where }),
      prisma.deliveryOrder.findMany({
        where,
        include: {
          customer: { select: { customerName: true } },
          salesOrder: { select: { orderNo: true, customerPoRef: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ total, data, page, pageSize });
  } catch (error: any) {
    console.error("Delivery Order List Error:", error);
    return NextResponse.json({ error: toUserMessage(error, "Could not load delivery orders. Please try again.") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, customerId, salesOrderId, cocRequired, poNo, vehicleNo, modeOfTransport, isReturnable, returnableNote, items } = body;

    // ── QC Guard: Only allow Completed + QC Approved work orders ──
    if (items && items.length > 0) {
      const workOrderNos = items.map((i: any) => i.workOrderNo).filter(Boolean);
      const invalidWOs = await prisma.workOrder.findMany({
        where: {
          workOrderNo: { in: workOrderNos },
          OR: [
            { status: { not: "Completed" } },
            { qcAcceptance: { not: "Approved" } },
          ],
        },
        select: { workOrderNo: true, status: true, qcAcceptance: true },
      });

      if (invalidWOs.length > 0) {
        const list = invalidWOs.map((w: any) => `${w.workOrderNo} (Status: ${w.status}, QC: ${w.qcAcceptance || "Pending"})`).join(", ");
        return NextResponse.json(
          { error: `Cannot create Delivery Order. The following Work Orders are not QC Approved: ${list}` },
          { status: 400 }
        );
      }
    }

    // The number is taken and the DO written in one transaction: the counter's
    // row lock only holds for as long as the transaction does. It is generated
    // here, not sent by the client — see Admin → Document Numbering.
    const newDO = await prisma.$transaction(async (tx) => {
      const doNo = await nextDocumentNo(tx, "DELIVERY_ORDER", {
        isTaken: async (no) => (await tx.deliveryOrder.count({ where: { doNo: no } })) > 0,
      });

      return tx.deliveryOrder.create({
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
          status: "Draft",
          items: {
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

    return NextResponse.json({ success: true, id: newDO.id, doNo: newDO.doNo });
  } catch (error: any) {
    console.error("Create Delivery Order Error:", error);
    return NextResponse.json({ error: toUserMessage(error, "Could not save the delivery order. Please check the details and try again.") }, { status: 500 });
  }
}
