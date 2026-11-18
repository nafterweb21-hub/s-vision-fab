import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpeningStocks, outstandingInternalQty, poLineReceiptsSelect } from "@/lib/stock-balance";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const partNo = searchParams.get("partNo") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const shortfallOnly = searchParams.get("shortfallOnly") === "true";

    // 1. Fetch materials that match partNo
    const materials = await prisma.materialProfile.findMany({
      where: {
        OR: [
          { partNo: { contains: partNo, mode: 'insensitive' } },
          { description: { contains: partNo, mode: 'insensitive' } },
        ]
      },
      include: {
        category: true,
      }
    });

    const materialIds = materials.map(m => m.id);
    if (materialIds.length === 0) return NextResponse.json([]);

    // Optional filters for PO
    const poFilter: any = {
      status: "Issued",
      receiveStatus: { not: "Fully Received" }
    };
    if (companyId) poFilter.companyId = companyId;
    if (startDate && endDate) poFilter.date = { gte: new Date(startDate), lte: new Date(endDate) };

    const poItems = await prisma.purchaseOrderItem.findMany({
      where: {
        materialProfileId: { in: materialIds },
        purchaseOrder: poFilter
      },
      select: {
        ...poLineReceiptsSelect,
        materialProfileId: true,
        purchaseOrderId: true,
        internalUom: { select: { uomName: true } },
      }
    });

    // Optional filters for GR
    const grFilter: any = { status: "Submitted" };
    if (companyId) grFilter.purchaseOrder = { companyId };
    if (startDate && endDate) grFilter.date = { gte: new Date(startDate), lte: new Date(endDate) };

    const grItems = await prisma.goodsReceiveItem.findMany({
      where: {
        purchaseOrderItem: { materialProfileId: { in: materialIds } },
        goodsReceive: grFilter
      },
      select: {
        receiveQty: true,
        purchaseOrderItem: { select: { materialProfileId: true, conversion: true, internalUom: { select: { uomName: true } } } }
      }
    });

    // Optional filters for RTN
    const rtnFilter: any = { status: "Submitted" };
    if (startDate && endDate) rtnFilter.rtnDate = { gte: new Date(startDate), lte: new Date(endDate) };

    const rtnItems = await prisma.goodsReturnItem.findMany({
      where: {
        goodsReceiveItem: {
          purchaseOrderItem: { materialProfileId: { in: materialIds }, purchaseOrder: companyId ? { companyId } : undefined }
        },
        goodsReturn: rtnFilter
      },
      select: {
        returnQty: true,
        internalQty: true,
        goodsReceiveItem: {
          select: {
            purchaseOrderItem: { select: { materialProfileId: true, conversion: true } }
          }
        }
      }
    });

    // Reserved: requisitioned against a work order but not yet issued.
    const prFilter: any = { workOrderNo: { not: null }, status: { notIn: ["Void", "Old Version"] } };
    if (companyId) prFilter.companyId = companyId;
    if (startDate && endDate) prFilter.date = { gte: new Date(startDate), lte: new Date(endDate) };

    const prItems = await prisma.purchaseRequisitionItem.findMany({
      where: {
        materialProfileId: { in: materialIds },
        purchaseRequisition: prFilter
      },
      select: {
        materialProfileId: true,
        prQuantity: true,
      }
    });

    // Consumed: material actually issued to a work order. This, not the
    // requisition, is what moves the balance — see `src/lib/stock-balance.ts`.
    const mcFilter: any = { status: "Submitted" };
    if (startDate && endDate) mcFilter.date = { gte: new Date(startDate), lte: new Date(endDate) };

    const mcItems = await prisma.materialConsumptionItem.findMany({
      where: {
        stockItem: { materialProfileId: { in: materialIds } },
        materialConsumption: mcFilter
      },
      select: {
        quantity: true,
        stockItem: { select: { materialProfileId: true, uom: { select: { uomName: true } } } }
      }
    });

    // The balance starts from what the store already held. Opening stock is not
    // a document, so the date filter above does not scope it — it is the figure
    // the filtered movements are applied to.
    const openings = await getOpeningStocks(materialIds);

    // Aggregate
    const summaryMap = new Map();
    materials.forEach(m => {
      const opening = openings.get(m.id);
      summaryMap.set(m.id, {
        id: m.id,
        partNo: m.partNo || "",
        description: m.description || "",
        category: m.category?.name || "",
        internalUom: "",
        openingStock: opening?.openingStock ?? 0,
        onOrderQty: 0,
        receivedQty: 0,
        returnedQty: 0,
        consumedQty: 0,
        reservedQty: 0,
      });
    });

    poItems.forEach(item => {
      if (!item.materialProfileId) return;
      const data = summaryMap.get(item.materialProfileId);
      if (data) {
        data.onOrderQty += outstandingInternalQty(item);
        if (item.internalUom?.uomName && !data.internalUom) data.internalUom = item.internalUom.uomName;
      }
    });

    grItems.forEach(item => {
      const matId = item.purchaseOrderItem?.materialProfileId;
      if (!matId) return;
      const data = summaryMap.get(matId);
      if (data) {
        const conversion = Number(item.purchaseOrderItem?.conversion || 1);
        data.receivedQty += Number(item.receiveQty || 0) * conversion;
        if (item.purchaseOrderItem?.internalUom?.uomName && !data.internalUom) data.internalUom = item.purchaseOrderItem.internalUom.uomName;
      }
    });

    rtnItems.forEach(item => {
      const matId = item.goodsReceiveItem?.purchaseOrderItem?.materialProfileId;
      if (!matId) return;
      const data = summaryMap.get(matId);
      if (data) data.returnedQty += Number(item.internalQty || 0);
    });

    prItems.forEach(item => {
      if (!item.materialProfileId) return;
      const data = summaryMap.get(item.materialProfileId);
      if (data) data.reservedQty += Number(item.prQuantity || 0);
    });

    mcItems.forEach(item => {
      const matId = item.stockItem?.materialProfileId;
      if (!matId) return;
      const data = summaryMap.get(matId);
      if (data) {
        data.consumedQty += Number(item.quantity || 0);
        if (item.stockItem?.uom?.uomName && !data.internalUom) data.internalUom = item.stockItem.uom.uomName;
      }
    });

    let results = Array.from(summaryMap.values()).map(data => {
      const netReceivedQty = data.receivedQty - data.returnedQty;
      const balance = data.openingStock + netReceivedQty - data.consumedQty;
      return {
        ...data,
        // The trail names the UOM; a material with no trail still has one on
        // its stock item.
        internalUom: data.internalUom || openings.get(data.id)?.uomName || "",
        netReceivedQty,
        balance,
        available: balance - data.reservedQty,
      };
    });

    // A shortfall is "outstanding requisitions exceed what is left", which is
    // `available`, not `balance`. Before consumption existed the two were the
    // same number, so filtering on `balance` here would quietly narrow it.
    if (shortfallOnly) {
      results = results.filter(r => r.available < 0);
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
