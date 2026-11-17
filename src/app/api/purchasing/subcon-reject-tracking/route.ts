import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { nextDocumentNo } from "@/lib/document-numbering";
import { assertRejectWithinReturned, RejectQtyError } from "@/lib/subcon-reject";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: Prisma.SubconRejectTrackingWhereInput = {
      OR: [
        { srjNo: { contains: search, mode: "insensitive" } },
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

    const trackings = await prisma.subconRejectTracking.findMany({
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
      orderBy: { srjNo: "desc" },
    });

    const formattedTrackings = trackings.map((t) => ({
      id: t.id,
      srjNo: t.srjNo,
      srjDate: t.srjDate,
      companyName: t.company?.companyName || "—",
      supplierName: t.supplier?.supplierName || "—",
      poNo: t.purchaseOrder?.poNo || "—",
      srfNo: t.subconRequestForm?.srfNo || "—",
      workOrderNo: t.purchaseOrder?.workOrderNo || "—",
      description: t.subconRequestForm?.purchaseOrderItem?.description || "—",
      uom: t.subconRequestForm?.purchaseOrderItem?.poUom?.uomName || t.uom || "—",
      rejectedQty: t.rejectedQty,
      status: t.status,
      remark: t.remark,
    }));

    return NextResponse.json(formattedTrackings);
  } catch (error: any) {
    console.error("Error fetching Subcon Reject Trackings:", error);
    return NextResponse.json(
      { error: "Failed to fetch Subcon Reject Trackings", details: error?.message || String(error) },
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
      srjDate,
      rejectedQty,
      remark,
      status,
    } = data;

    const newSrt = await prisma.$transaction(async (tx) => {
      // Taken inside the transaction that writes the row — the counter's lock
      // is only held for the life of the transaction.
      const srjNo = await nextDocumentNo(tx, "SUBCON_REJECT_TRACKING", {
        companyId,
        isTaken: async (no) =>
          (await tx.subconRejectTracking.count({ where: { srjNo: no } })) > 0,
      });

      const srt = await tx.subconRejectTracking.create({
        data: {
          srjNo,
          srjDate: new Date(srjDate),
          companyId,
          supplierId,
          purchaseOrderId,
          subconRequestFormId,
          rejectedQty: new Prisma.Decimal(rejectedQty),
          remark,
          status: status || "Draft",
        },
      });

      if (srt.status === "Submitted") {
        await assertRejectWithinReturned(tx, srt.subconRequestFormId);
      }

      return srt;
    });

    return NextResponse.json(newSrt, { status: 201 });
  } catch (error: any) {
    if (error instanceof RejectQtyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error creating Subcon Reject Tracking:", error);
    return NextResponse.json(
      { error: "Failed to create Subcon Reject Tracking" },
      { status: 500 }
    );
  }
}
