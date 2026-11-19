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
  const partNo = searchParams.get("partNo");
  const partDescription = searchParams.get("partDescription");

  try {
    const whereClause: any = {
      status: { not: "Void" },
      type: { not: "SUBCON" } // Exclude subcon purchasing
    };

    if (poNo) whereClause.poNo = { contains: poNo, mode: "insensitive" };
    if (poStatus) {
      // "Pending For Approval" covers both tier stages, same as the PO list's filter.
      whereClause.status =
        poStatus === "Pending For Approval"
          ? { in: ["Pending For Approval", "Pending First Tier Approval", "Pending Second Tier Approval"] }
          : poStatus;
    }
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
    
    if (partNo) {
      itemsWhere.material = { contains: partNo, mode: "insensitive" };
      filterByItems = true;
    }
    if (partDescription) {
      itemsWhere.description = { contains: partDescription, mode: "insensitive" };
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
            goodsReceiveItems: {
              include: {
                goodsReturnItems: true
              }
            }
          }
        }
      },
      orderBy: {
        poNo: 'asc'
      }
    });

    // Build the flat report data
    const reportData = [];

    for (const po of purchaseOrders) {
      // If we filtered by item fields, strictly filter the items array
      const filteredItems = po.items.filter(item => {
        if (partNo && !item.material?.toLowerCase().includes(partNo.toLowerCase())) return false;
        if (partDescription && !item.description?.toLowerCase().includes(partDescription.toLowerCase())) return false;
        return true;
      });

      // To handle PO level sums cleanly without repeating per item, we might just put PO amounts on the first row of each PO
      // But standard flat export often repeats it. We will repeat it. 
      for (const item of filteredItems) {
        let totalReceived = 0;
        let totalReturned = 0;

        for (const gri of item.goodsReceiveItems) {
          totalReceived += Number(gri.receiveQty || 0);
          for (const grti of gri.goodsReturnItems) {
            totalReturned += Number(grti.returnQty || 0);
          }
        }

        const nettReceived = totalReceived - totalReturned;
        const qty = Number(item.quantity || 0);
        const outstanding = Math.max(0, qty - nettReceived);

        reportData.push({
          company: po.company?.companyName || "",
          poNo: po.poNo + (po.revision > 0 ? `-R${po.revision}` : "-R0"),
          poDate: po.date,
          poStatus: po.receiveStatus !== "NA" ? po.receiveStatus : po.status, // use receive status if applicable
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
          partNo: item.material || "",
          description: item.description || "",
          uom: item.poUom?.uomName || "",
          qty: qty,
          unitPrice: Number(item.unitPrice || 0),
          amt: Number(item.amount || 0),
          totalReceived: totalReceived,
          totalReturned: totalReturned,
          nettReceived: nettReceived,
          outstandingNotDelivered: outstanding,
          deliverDate: item.deliveryDate
        });
      }
    }

    // No need to sort again since we sorted by poNo at DB level and maintained array push order

    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error("Purchasing Report Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
