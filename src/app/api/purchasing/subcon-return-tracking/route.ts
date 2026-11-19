import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { nextDocumentNo } from "@/lib/document-numbering";
import { assertReturnWithinSrf, ReturnQtyError } from "@/lib/subcon-reject";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: Prisma.SubconReturnTrackingWhereInput = {
      OR: [
        { srtNo: { contains: search, mode: "insensitive" } },
        {
          purchaseOrder: {
            poNo: { contains: search, mode: "insensitive" },
          },
        },
        {
          subconRequestForm: {
            srfNo: { contains: search, mode: "insensitive" },
          },
        },
      ],
    };

    const trackings = await prisma.subconReturnTracking.findMany({
      where,
      include: {
        company: true,
        supplier: true,
        purchaseOrder: true,
        subconRequestForm: {
          include: {
            purchaseOrderItem: {
              include: {
                poUom: true,
                woRoutingProcess: {
                  include: {
                    inProcess: true,
                    mainProcess: true,
                    routingProcess: true,
                  }
                }
              }
            }
          }
        },
      },
      orderBy: { srtNo: "desc" },
    });

    const formattedTrackings = trackings.map((t) => ({
      id: t.id,
      srtNo: t.srtNo,
      srtDate: t.srtDate,
      companyName: t.company?.companyName || "—",
      supplierName: t.supplier?.supplierName || "—",
      poNo: t.purchaseOrder?.poNo || "—",
      srfNo: t.subconRequestForm?.srfNo || "—",
      workOrderNo: t.purchaseOrder?.workOrderNo || "—",
      description: t.subconRequestForm?.purchaseOrderItem?.description || "—",
      uom: t.subconRequestForm?.purchaseOrderItem?.poUom?.uomName || "—",
      returnedQty: t.returnedQty,
      status: t.status,
      remark: t.remark,
    }));

    return NextResponse.json(formattedTrackings);
  } catch (error: any) {
    console.error("Error fetching Subcon Return Trackings:", error);
    return NextResponse.json(
      { error: "Failed to fetch Subcon Return Trackings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const {
      companyId,
      supplierId,
      purchaseOrderId,
      subconRequestFormId,
      srtDate,
      returnedQty,
      remark,
      status,
    } = data;

    const newSrt = await prisma.$transaction(async (tx) => {
      // Taken inside the transaction that writes the row — the counter's lock
      // is only held for the life of the transaction.
      const srtNo = await nextDocumentNo(tx, "SUBCON_RETURN_TRACKING", {
        companyId,
        isTaken: async (no) =>
          (await tx.subconReturnTracking.count({ where: { srtNo: no } })) > 0,
      });

      const srt = await tx.subconReturnTracking.create({
        data: {
          srtNo,
          srtDate: new Date(srtDate),
          companyId,
          supplierId,
          purchaseOrderId,
          subconRequestFormId,
          returnedQty: new Prisma.Decimal(returnedQty),
          remark,
          status: status || "Draft",
        },
      });

      await assertReturnWithinSrf(tx, subconRequestFormId);

      // Update Subcon Request Form receiveStatus if status is Submitted
      if (srt.status === "Submitted") {
        const srf = await tx.subconRequestForm.findUnique({
          where: { id: subconRequestFormId },
          include: { subconReturnTrackings: true },
        });

        if (srf) {
          const totalReturned = srf.subconReturnTrackings
            .filter((t) => t.status === "Submitted")
            .reduce((sum, t) => sum + Number(t.returnedQty), 0);

          let receiveStatus = "N/A";
          if (totalReturned >= Number(srf.quantity)) {
            receiveStatus = "Fully Received";
          } else if (totalReturned > 0) {
            receiveStatus = "Partially Received";
          }

          await tx.subconRequestForm.update({
            where: { id: subconRequestFormId },
            data: { receiveStatus },
          });
          
          // Note: "The specific routing process in work order can start only when subcon PO quantity has been fully received."
          // So if fully received, we should probably update the Routing Process fullyReceived = true
          if (receiveStatus === "Fully Received") {
            const srfWithPOItem = await tx.subconRequestForm.findUnique({
              where: { id: subconRequestFormId },
              include: { purchaseOrderItem: true },
            });
            if (srfWithPOItem?.purchaseOrderItem?.woRoutingProcessId) {
               await tx.routingProcess.update({
                  where: { id: srfWithPOItem.purchaseOrderItem.woRoutingProcessId },
                  data: { fullyReceived: true }
               });
            }
          }
        }
      }

      return srt;
    });

    return NextResponse.json(newSrt, { status: 201 });
  } catch (error: any) {
    if (error instanceof ReturnQtyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error creating Subcon Return Tracking:", error);
    return NextResponse.json(
      { error: "Failed to create Subcon Return Tracking" },
      { status: 500 }
    );
  }
}
