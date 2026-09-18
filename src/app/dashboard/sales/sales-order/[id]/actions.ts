"use server";

import { prisma } from "@/lib/prisma";
import { createWorkOrderFromBatch } from "@/app/dashboard/production/work-order/actions";

import { RecordStatus } from "@/lib/status";
export async function getFormData() {
  try {
    const [
      employees,
      customers,
      paymentTerms,
      currencies,
      taxes,
      finishedGoods,
      uoms,
      companies,
    ] = await Promise.all([
      prisma.employee.findMany({ where: { status: RecordStatus.Active }, select: { id: true, name: true, code: true } }),
      prisma.customerProfile.findMany({ where: { status: "Active" }, select: { id: true, customerName: true, customerCode: true, contactPersons: true, addresses: true, isSez: true } }),
      prisma.paymentTermProfile.findMany({ where: { status: "Active" }, select: { id: true, name: true, days: true } }),
      prisma.currency.findMany({ where: { status: "Active" }, select: { id: true, code: true, exchangeRate: true, isDefault: true } }),
      prisma.taxProfile.findMany({ where: { status: "Active" }, select: { id: true, taxType: true, taxRate: true } }),
      prisma.finishedGoodProfile.findMany({ where: { status: "Active" }, select: { id: true, partNo: true, description: true } }),
      prisma.uomProfile.findMany({ where: { status: "Active" }, select: { id: true, uomName: true } }),
      prisma.companyProfile.findMany({ where: { status: "Active" }, select: { id: true, companyName: true, sezTaxRate: true } }),
    ]);

    return {
      employees,
      customers,
      paymentTerms,
      currencies: currencies.map(c => ({ ...c, exchangeRate: Number(c.exchangeRate) })),
      taxes,
      finishedGoods,
      uoms,
      companies: companies.map(c => ({ ...c, sezTaxRate: Number(c.sezTaxRate) })),
    };
  } catch (error) {
    console.error("Error fetching form data:", error);
    throw new Error("Failed to load prerequisite data");
  }
}

export async function convertSalesOrder(salesOrderId: string) {
  try {
    const batches = await prisma.salesOrderItemBatch.findMany({
      where: {
        salesOrderItem: { salesOrderId: salesOrderId },
        workOrderNo: null,
        noRoutingProcess: false,
      }
    });

    let count = 0;
    for (const b of batches) {
      const res = await createWorkOrderFromBatch(b.id);
      if (res.success) count++;
    }

    return { success: true, count };
  } catch (error: any) {
    console.error("Error converting to Work Order:", error);
    return { success: false, error: error.message || "Conversion failed" };
  }
}
