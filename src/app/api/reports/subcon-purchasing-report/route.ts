import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company");
  const poNo = searchParams.get("poNo");
  const poStatus = searchParams.get("poStatus");
  const poDateFrom = searchParams.get("poDateFrom");
  const poDateTo = searchParams.get("poDateTo");
  const supplier = searchParams.get("supplier");
  const itemDescription = searchParams.get("itemDescription");
  const mainProcess = searchParams.get("mainProcess");
  const routingProcess = searchParams.get("routingProcess");

  try {
    const whereClause: any = {
      status: { not: "Void" },
      type: "SUBCON" // Only subcon purchasing
    };

    if (poNo) whereClause.poNo = { contains: poNo, mode: "insensitive" };
    if (poStatus) whereClause.status = poStatus;
    if (poDateFrom || poDateTo) {
      whereClause.date = {};
      if (poDateFrom) whereClause.date.gte = new Date(poDateFrom);
      if (poDateTo) {
        const toDate = new Date(poDateTo);
        toDate.setHours(23, 59, 59, 999);
        whereClause.date.lte = toDate;
      }
    }
    
    if (company) {
      whereClause.company = {
        companyName: { contains: company, mode: "insensitive" }
      };
    }
    
    if (supplier) {
      whereClause.supplier = {
        supplierName: { contains: supplier, mode: "insensitive" }
      };
    }
    
    const itemsWhere: any = {};
    let filterByItems = false;
    
    if (itemDescription) {
      itemsWhere.description = { contains: itemDescription, mode: "insensitive" };
      filterByItems = true;
    }
    if (mainProcess) {
      itemsWhere.OR = [
        { masterMainProcess: { process: { contains: mainProcess, mode: "insensitive" } } },
        { woRoutingProcess: { routingProcess: { mainProcess: { process: { contains: mainProcess, mode: "insensitive" } } } } }
      ];
      filterByItems = true;
    }
    if (routingProcess) {
      itemsWhere.OR = [
        ...(itemsWhere.OR || []),
        { masterRoutingProcess: { routingProcess: { contains: routingProcess, mode: "insensitive" } } },
        { woRoutingProcess: { routingProcess: { routingProcess: { contains: routingProcess, mode: "insensitive" } } } }
      ];
      filterByItems = true;
    }
    
    if (filterByItems) {
      whereClause.items = { some: itemsWhere };
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: whereClause,
      include: {
        company: true,
        currency: true,
        taxType: true,
        purchaser: true,
        supplier: true,
        purchaseRequisition: true,
        workOrder: true,
        items: {
          include: {
            poUom: true,
            masterMainProcess: true,
            masterRoutingProcess: true,
            woRoutingProcess: {
              include: {
                routingProcess: {
                  include: {
                    mainProcess: true
                  }
                }
              }
            },
            subconRequestForms: {
              where: { status: "Submitted" },
              include: {
                subconReturnTrackings: { where: { status: "Submitted" } },
                subconRejectTrackings: { where: { status: "Submitted" } }
              }
            }
          }
        }
      },
      orderBy: {
        poNo: 'asc'
      }
    });

    const reportData = [];

    for (const po of purchaseOrders as any[]) {
      const filteredItems = po.items.filter((item: any) => {
        let keep = true;
        
        if (itemDescription && !item.description?.toLowerCase().includes(itemDescription.toLowerCase())) keep = false;
        
        const mp1 = item.masterMainProcess?.process || item.woRoutingProcess?.routingProcess?.mainProcess?.process || "";
        const rp1 = item.masterRoutingProcess?.routingProcess || item.woRoutingProcess?.routingProcess?.routingProcess || "";

        if (mainProcess && !mp1.toLowerCase().includes(mainProcess.toLowerCase())) keep = false;
        if (routingProcess && !rp1.toLowerCase().includes(routingProcess.toLowerCase())) keep = false;

        return keep;
      });

      for (const item of filteredItems) {
        // Only Submitted SRF / SRT / SRJ count — Draft and Void are excluded
        // by the include filters above.
        let totalAcknowledged = 0;
        let totalReturned = 0;
        let totalRejected = 0;

        for (const srf of item.subconRequestForms) {
          totalAcknowledged += Number(srf.quantity || 0);
          for (const srt of srf.subconReturnTrackings) {
            totalReturned += Number(srt.returnedQty || 0);
          }
          for (const srj of srf.subconRejectTrackings) {
            totalRejected += Number(srj.rejectedQty || 0);
          }
        }

        const qty = Number(item.quantity || 0);
        // Outstanding = Not Acknowledged + Not Returned, so the two buckets are
        // disjoint: not yet handed to the subcon vs. handed over but not back.
        // Rejected qty is a subset of returned qty and does not affect either.
        const notAcknowledged = Math.max(0, qty - totalAcknowledged);
        const notReturned = Math.max(0, totalAcknowledged - totalReturned);

        reportData.push({
          company: po.company?.companyName || "",
          poNo: po.poNo + (po.revision > 0 ? `-R${po.revision}` : "-R0"),
          poDate: po.date,
          poStatus: po.receiveStatus !== "NA" ? po.receiveStatus : po.status,
          purchaser: po.purchaser?.name || "",
          supplier: po.supplier?.supplierName || "",
          woNo: po.workOrderNo || "",
          prNo: po.purchaseRequisition?.prNo || "",
          currency: po.currency?.code || "",
          exchRate: Number(po.exchangeRate || 1),
          beforeTax: Number(po.amountBeforeTax || 0),
          taxType: po.taxType?.taxType || "",
          taxRate: Number(po.taxRate || 0),
          taxAmt: Number(po.taxAmount || 0),
          aftTax: Number(po.amountAfterTax || 0),
          
          inProcessDescription: item.description || "",
          mainProcess: item.masterMainProcess?.process || item.woRoutingProcess?.routingProcess?.mainProcess?.process || "",
          routingProcess: item.masterRoutingProcess?.routingProcess || item.woRoutingProcess?.routingProcess?.routingProcess || "",
          description: item.description || "",
          hardness: item.hardness || "",
          thickness: item.thickness || "",
          
          uom: item.poUom?.uomName || "",
          qty: qty,
          unitPrice: Number(item.unitPrice || 0),
          amt: Number(item.amount || 0),
          
          qtyAcknowledged: totalAcknowledged,
          qtyReturned: totalReturned,
          qtyRejected: totalRejected,
          qtyNotAcknowledged: notAcknowledged,
          qtyNotReturned: notReturned,
          
          deliverDate: item.deliveryDate
        });
      }
    }

    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error("Subcon Purchasing Report Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
