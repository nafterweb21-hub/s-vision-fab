import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [companies, suppliers, srfs] = await Promise.all([
      prisma.companyProfile.findMany({
        where: { status: "Active" },
        select: { id: true, companyName: true },
        orderBy: { companyName: "asc" },
      }),
      prisma.supplierProfile.findMany({
        where: { status: "Active" },
        select: { id: true, supplierName: true, supplierCode: true },
        orderBy: { supplierName: "asc" },
      }),
      prisma.subconRequestForm.findMany({
        // Items are only with the subcon once the SRF is Submitted.
        where: {
          status: "Submitted"
        },
        include: {
          // Running totals, so the form can show what's left to return / reject.
          subconReturnTrackings: { where: { status: { not: "Void" } }, select: { returnedQty: true, status: true } },
          subconRejectTrackings: { where: { status: { not: "Void" } }, select: { rejectedQty: true } },
          purchaseOrderItem: {
            include: {
              purchaseOrder: true,
              poUom: true,
              masterMainProcess: { select: { process: true } },
              masterRoutingProcess: { select: { routingProcess: true } },
              woRoutingProcess: {
                include: {
                  inProcess: true,
                  mainProcess: true,
                  routingProcess: true
                }
              }
            }
          }
        },
        orderBy: { srfNo: "asc" },
      }),
    ]);

    // Extract unique POs from the SRFs
    const posMap = new Map();
    srfs.forEach((srf) => {
      const po = srf.purchaseOrderItem.purchaseOrder;
      if (!posMap.has(po.id)) {
        posMap.set(po.id, {
          id: po.id,
          poNo: po.poNo,
          supplierId: po.supplierId,
          companyId: po.companyId,
        });
      }
    });

    return NextResponse.json({
      companies,
      suppliers,
      pos: Array.from(posMap.values()),
      srfs: srfs.map((srf) => ({
        id: srf.id,
        srfNo: srf.srfNo,
        purchaseOrderId: srf.purchaseOrderItem.purchaseOrder.id,
        purchaseOrderItemId: srf.purchaseOrderItemId,
        poNo: srf.purchaseOrderItem.purchaseOrder.poNo,
        woNo: srf.purchaseOrderItem.purchaseOrder.workOrderNo,
        inProcessDescription: srf.purchaseOrderItem.woRoutingProcess?.inProcess?.description || "",
        // A PO-Subcon line without a WO carries master processes instead.
        mainProcess:
          srf.purchaseOrderItem.woRoutingProcess?.mainProcess?.process ||
          srf.purchaseOrderItem.masterMainProcess?.process ||
          "",
        routingProcess:
          srf.purchaseOrderItem.woRoutingProcess?.routingProcess?.routingProcess ||
          srf.purchaseOrderItem.masterRoutingProcess?.routingProcess ||
          "",
        partDescription: srf.purchaseOrderItem.description || "",
        dateRequired: srf.dateRequired,
        acknowledgedQuantity: srf.quantity, // From SRF
        returnedQty: srf.subconReturnTrackings.reduce((s, t) => s + Number(t.returnedQty), 0),
        returnedSubmittedQty: srf.subconReturnTrackings
          .filter((t) => t.status === "Submitted")
          .reduce((s, t) => s + Number(t.returnedQty), 0),
        rejectedQty: srf.subconRejectTrackings.reduce((s, t) => s + Number(t.rejectedQty), 0),
        uom: srf.purchaseOrderItem.poUom.uomName,
        unitPrice: srf.purchaseOrderItem.unitPrice,
        amount: srf.purchaseOrderItem.amount,
        hardness: srf.purchaseOrderItem.hardness || "",
        thickness: srf.purchaseOrderItem.thickness || "",
      })),
    });
  } catch (error: any) {
    console.error("Error fetching Subcon Return Tracking form data:", error);
    return NextResponse.json(
      { error: "Failed to fetch form data" },
      { status: 500 }
    );
  }
}
