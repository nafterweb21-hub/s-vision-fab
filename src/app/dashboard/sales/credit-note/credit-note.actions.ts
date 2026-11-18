"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { nextDocumentNo } from "@/lib/document-numbering";
import { withRevision } from "@/lib/document-numbering.config";
import { computeGstBreakup, invoiceGstContext, invoiceGrandTotal, noteLineGstRate } from "@/lib/gst";
import { balanceDueAfterRecalc, invoicePaymentStatus } from "@/lib/invoice-payment";
import { invoiceDocLabel, invoiceReviseBlockReason, invoiceVoidBlockReason } from "../invoice/inv-status";
import type { GstBreakup } from "@/lib/gst";
import { RecordStatus } from "@/lib/status";
import {
  collectEInvoiceIssues,
  prepareEInvoicePayload,
  generateIrn,
  cancelIrn,
  IrpError,
} from "@/lib/einvoice";

/**
 * Compute the CGST/SGST/IGST breakup for an invoice being saved, from its flat
 * tax rate and the seller/buyer state codes. Fetches the company + customer so
 * the supply type (intra vs inter) can be derived.
 */
async function computeBreakupForData(data: any): Promise<GstBreakup> {
  const [company, customer] = await Promise.all([
    prisma.companyProfile.findUnique({
      where: { id: data.companyId },
      select: { gstRegistrationNo: true, sezTaxRate: true, address: true },
    }),
    prisma.customerProfile.findUnique({
      where: { id: data.customerId },
      select: { gstin: true, placeOfSupply: true, isSez: true },
    }),
  ]);
  return computeGstBreakup({
    // Same per-line rate rule as the credit note form (noteLineGstRate), so its line tax matches.
    lines: (data.items || []).map((it: any) => ({
      amount: Number(it.amount) || 0,
      taxRate: noteLineGstRate(it, data.taxRate),
    })),
    taxRatePercent: Number(data.taxRate) || 0,
    // Same seller/POS/SEZ inputs the invoice and credit note forms use for CGST+SGST vs IGST.
    ...invoiceGstContext(company, customer),
  });
}

/**
 * Header totals stored on save, from the server-side breakup (the client's totals
 * are display only). Same rule as the invoice actions: no currency roundingMode,
 * only the user's manual round-off (see invoiceGrandTotal).
 */
function totalsFromBreakup(data: { roundOff?: unknown; taxRate?: unknown }, breakup: GstBreakup) {
  const amountBeforeTax = breakup.totals.taxable;
  const taxAmount = breakup.totals.tax;
  const roundOff = Number(data.roundOff || 0);
  const taxRate = Number(data.taxRate) > 0
    ? Number(data.taxRate)
    : (amountBeforeTax > 0 && taxAmount > 0 ? Math.round((taxAmount / amountBeforeTax) * 10000) / 100 : 0);
  return { amountBeforeTax, taxRate, taxAmount, roundOff, amountAfterTax: invoiceGrandTotal(amountBeforeTax, taxAmount, roundOff) };
}

const LIST_PATH = "/dashboard/sales/credit-note";
const DOC_TYPE = "Credit Note";

/** Merge a computed line breakup into an invoice item's create payload. */
function itemWithGst(item: any, line: { gstRate: number; cgstAmount: number; sgstAmount: number; igstAmount: number } | undefined) {
  const lineTax = Math.round(((line?.cgstAmount ?? 0) + (line?.sgstAmount ?? 0) + (line?.igstAmount ?? 0) + Number.EPSILON) * 100) / 100;
  return {
    lineNo: item.lineNo,
    // Trim before the null-coalesce: a whitespace-only workOrderNo is not a
    // real reference and would fail the foreign key.
    workOrderNo: item.workOrderNo?.trim() || null,
    partId: item.partId?.trim() || null,
    description: item.description?.trim() || null,
    quantity: item.quantity,
    uomId: item.uomId?.trim() || null,
    unitPrice: item.unitPrice,
    amount: item.amount,
    remark: item.remark?.trim() || null,
    hsnCode: item.hsnCode?.trim() || null,
    taxTypeId: item.taxTypeId || null,
    taxAmount: lineTax,
    gstRate: line?.gstRate ?? 0,
    cgstAmount: line?.cgstAmount ?? 0,
    sgstAmount: line?.sgstAmount ?? 0,
    igstAmount: line?.igstAmount ?? 0,
  };
}

export async function getInvoices() {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { invoiceType: "Credit Note" }, orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { customerName: true } },
        currency: { select: { code: true } },
        _count: { select: { receipts: { where: { status: { not: "Void" } } } } },
      },
    });
    return { success: true, data: JSON.parse(JSON.stringify(invoices)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getInvoice(id: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        customer: true,
        contactPerson: true,
        billTo: true,
        shipTo: true,
        paymentTerm: true,
        currency: true,
        taxType: true,
        preparedBy: true,
        _count: { select: { receipts: { where: { status: { not: "Void" } } } } },
        items: true,
        deliveryOrders: {
          include: {
            deliveryOrder: {
              include: {
                salesOrder: { select: { orderNo: true } },
              },
            },
          },
        },
      },
    });
    if (!invoice) throw new Error("Invoice not found");
    return { success: true, data: JSON.parse(JSON.stringify(invoice)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getInvoiceFormData() {
  try {
    const [companies, customers, paymentTerms, currencies, taxes, employees, uoms, parts, banks] = await Promise.all([
      prisma.companyProfile.findMany({ where: { status: "Active" } }),
      prisma.customerProfile.findMany({ where: { status: "Active" }, include: { addresses: true, contactPersons: true } }),
      prisma.paymentTermProfile.findMany({ where: { status: "Active" } }),
      prisma.currency.findMany({ where: { status: "Active" } }),
      prisma.taxProfile.findMany({ where: { status: "Active" } }),
      prisma.employee.findMany({ where: { status: RecordStatus.Active }, include: { user: true } }),
      prisma.uomProfile.findMany({ where: { status: "Active" } }),
      prisma.finishedGoodProfile.findMany({ where: { status: "Active" } }),
      prisma.bankProfile.findMany({ where: { status: "Active" } })
    ]);
    
    return { 
      success: true, 
      data: JSON.parse(JSON.stringify({ companies, customers, paymentTerms, currencies, taxes, employees, uoms, parts, banks }))
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPendingDOs(customerId: string, currentInvoiceId?: string) {
  try {
    // Fetch DOs for this customer that are 'Submitted' and not yet linked to another active Invoice
    const dos = await prisma.deliveryOrder.findMany({
      where: {
        customerId,
        status: "Submitted",
        OR: [
          {
            invoiceLinks: {
              none: {
                invoice: {
                  status: { notIn: ["Void", "Old Version"] },
                },
              },
            },
          },
          ...(currentInvoiceId ? [{
            invoiceLinks: {
              some: {
                invoiceId: currentInvoiceId,
              },
            },
          }] : []),
        ],
      },
      include: {
        items: true,
        salesOrder: { select: { orderNo: true } },
      },
    });
    return { success: true, data: JSON.parse(JSON.stringify(dos)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDOItemsForInvoice(doIds: string[]) {
  try {
    // Fetch items from the selected DOs and calculate pricing based on Sales Order
    const doItems = await prisma.deliveryOrderItem.findMany({
      where: {
        deliveryOrderId: { in: doIds },
      },
      include: {
        workOrder: {
          include: {
            customer: true,
          },
        },
        deliveryOrder: {
          include: {
            salesOrder: {
              include: {
                items: {
                  include: {
                    batches: true,
                  },
                },
              },
            },
          },
        },
        uom: true,
      },
    });

    const processedItems = doItems.map((item, index) => {
      // Find matching SO item based on Work Order
      // Work Order usually links to SalesOrderItemBatch which links to SalesOrderItem
      let soUnitPrice = 0;
      let partId = null;
      let description = item.workOrder.jobDescription || "";

      const soItems = item.deliveryOrder.salesOrder.items;
      for (const soItem of soItems) {
        const batch = soItem.batches.find((b) => b.workOrderNo === item.workOrderNo);
        if (batch) {
          soUnitPrice = Number(soItem.unitPrice || 0);
          partId = soItem.partId;
          break;
        }
      }

      const quantity = Number(item.quantity || 0);
      const amount = quantity * soUnitPrice;

      return {
        lineNo: index + 1,
        workOrderNo: item.workOrderNo,
        partId,
        description,
        quantity,
        uomId: item.uomId,
        unitPrice: soUnitPrice,
        amount,
        remark: "",
        hsnCode: "",
      };
    });

    return { success: true, data: processedItems };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createInvoice(data: any) {
  try {
    // Calculate Due Date based on Payment Term
    const paymentTerm = await prisma.paymentTermProfile.findUnique({
      where: { id: data.paymentTermId },
    });

    const invoiceDate = new Date(data.invoiceDate);
    const dueDate = new Date(invoiceDate);
    if (paymentTerm) {
      dueDate.setDate(dueDate.getDate() + paymentTerm.days);
    }

    const breakup = await computeBreakupForData(data);
    const totals = totalsFromBreakup(data, breakup);

    // The number is taken and the invoice written in one transaction: the
    // counter's row lock only holds for as long as the transaction does.
    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNo = await nextDocumentNo(tx, "INVOICE", {
        companyId: data.companyId,
        isTaken: async (no) => (await tx.invoice.count({ where: { invoiceNo: no } })) > 0,
      });

      return tx.invoice.create({
        data: {
          invoiceNo,
          revision: 0,
          invoiceDate,
          companyId: data.companyId,
          invoiceType: data.invoiceType,
          customerId: data.customerId,
          contactPersonId: data.contactPersonId,
          tel: data.tel || null,
          fax: data.fax || null,
          email: data.email || null,
          billToId: data.billToId || null,
          shipToId: data.shipToId || null,
          consigneeName: data.consigneeName || null,
          consigneeGstin: data.consigneeGstin || null,
          consigneePhone: data.consigneePhone || null,
          consigneeState: data.consigneeState || null,
          consigneeCountry: data.consigneeCountry || "India",
          paymentTermId: data.paymentTermId,
          dueDate,
          currencyId: data.currencyId,
          exchangeRate: data.exchangeRate,
          amountBeforeTax: totals.amountBeforeTax,
          taxTypeId: data.taxTypeId || null,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          amountAfterTax: totals.amountAfterTax,
          balanceDue: totals.amountAfterTax,
          roundOff: totals.roundOff,
          bankDetails: data.bankDetails || null,
          remark: data.remark || null,
          preparedById: data.preparedById,
          poNo: data.poNo || null,
          vehicleNumber: data.vehicleNumber || null,
          status: "Draft",
          supplyType: breakup.supplyType,
          cgstAmount: breakup.totals.cgst,
          sgstAmount: breakup.totals.sgst,
          igstAmount: breakup.totals.igst,
          items: {
            create: data.items.map((item: any, i: number) => itemWithGst(item, breakup.lines[i])),
          },
          deliveryOrders: {
            create: data.doIds.map((doId: string) => ({
              deliveryOrderId: doId,
            })),
          },
        },
      });
    });

    revalidatePath(LIST_PATH);
    return { success: true, data: JSON.parse(JSON.stringify(invoice)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateInvoice(id: string, data: any) {
  try {
    const paymentTerm = await prisma.paymentTermProfile.findUnique({
      where: { id: data.paymentTermId },
    });
    
    const invoiceDate = new Date(data.invoiceDate);
    const dueDate = new Date(invoiceDate);
    if (paymentTerm) {
      dueDate.setDate(dueDate.getDate() + paymentTerm.days);
    }

    const breakup = await computeBreakupForData(data);
    const totals = totalsFromBreakup(data, breakup);

    // Keep what was already received (a revised draft carries its predecessor's
    // payments): balance = new total - amount paid.
    const existing = await prisma.invoice.findUnique({ where: { id }, select: { amountPaid: true } });
    if (!existing) throw new Error("Credit note not found");
    const balance = balanceDueAfterRecalc(totals.amountAfterTax, existing.amountPaid, invoiceDocLabel(DOC_TYPE));
    if (!balance.ok) throw new Error(balance.error);

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        invoiceDate,
        companyId: data.companyId,
        invoiceType: data.invoiceType,
        customerId: data.customerId,
        contactPersonId: data.contactPersonId,
        tel: data.tel || null,
        fax: data.fax || null,
        email: data.email || null,
        billToId: data.billToId || null,
        shipToId: data.shipToId || null,
        consigneeName: data.consigneeName || null,
        consigneeGstin: data.consigneeGstin || null,
        consigneePhone: data.consigneePhone || null,
        consigneeState: data.consigneeState || null,
        consigneeCountry: data.consigneeCountry || "India",
        paymentTermId: data.paymentTermId,
        dueDate,
        currencyId: data.currencyId,
        exchangeRate: data.exchangeRate,
        amountBeforeTax: totals.amountBeforeTax,
        taxTypeId: data.taxTypeId || null,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        amountAfterTax: totals.amountAfterTax,
        balanceDue: balance.balanceDue,
        roundOff: totals.roundOff,
        bankDetails: data.bankDetails || null,
        remark: data.remark || null,
        preparedById: data.preparedById,
        poNo: data.poNo || null,
        vehicleNumber: data.vehicleNumber || null,
        supplyType: breakup.supplyType,
        cgstAmount: breakup.totals.cgst,
        sgstAmount: breakup.totals.sgst,
        igstAmount: breakup.totals.igst,
        items: {
          deleteMany: {},
          create: data.items.map((item: any, i: number) => itemWithGst(item, breakup.lines[i])),
        },
        deliveryOrders: {
          deleteMany: {},
          create: data.doIds.map((doId: string) => ({
            deliveryOrderId: doId,
          })),
        },
      },
    });

    revalidatePath(LIST_PATH);
    return { success: true, data: JSON.parse(JSON.stringify(invoice)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitInvoice(id: string) {
  try {
    const existing = await prisma.invoice.findUnique({
      where: { id },
      select: { amountPaid: true, balanceDue: true },
    });
    if (!existing) throw new Error("Credit note not found");
    // "Submitted" unless payments were carried over from a previous revision.
    const status = invoicePaymentStatus(existing.amountPaid, existing.balanceDue);
    await prisma.invoice.update({
      where: { id },
      data: { status },
    });
    revalidatePath(LIST_PATH);
    return { success: true, status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function voidInvoice(id: string) {
  try {
    // Same rule as invoices (invoiceVoidBlockReason): no void while an IRN is
    // active or any payment / non-void receipt is recorded against it.
    const note = await prisma.invoice.findUnique({
      where: { id },
      select: { status: true, amountPaid: true, einvoiceStatus: true, irn: true },
    });
    if (!note) throw new Error("Credit note not found");
    const activeReceipts = await prisma.receipt.count({
      where: { invoiceId: id, status: { not: "Void" } },
    });
    const blocked = invoiceVoidBlockReason(note, activeReceipts, DOC_TYPE);
    if (blocked) return { success: false, error: blocked };

    await prisma.invoice.update({
      where: { id },
      data: { status: "Void" },
    });
    revalidatePath(LIST_PATH);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reviseInvoice(id: string, data: any) {
  try {
    const paymentTerm = await prisma.paymentTermProfile.findUnique({
      where: { id: data.paymentTermId },
    });
    
    const invoiceDate = new Date(data.invoiceDate);
    const dueDate = new Date(invoiceDate);
    if (paymentTerm) {
      dueDate.setDate(dueDate.getDate() + paymentTerm.days);
    }

    const breakup = await computeBreakupForData(data);
    const totals = totalsFromBreakup(data, breakup);

    const invoice = await prisma.$transaction(async (tx) => {
    // Lock the row before reading it, exactly like receipt confirm / void
    // (src/lib/receipts.ts): lock order is invoice -> receipts everywhere, and
    // no receipt can be confirmed or voided between reading amountPaid here and
    // re-pointing the receipts below.
    await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${id} FOR UPDATE`;
    const oldInvoice = await tx.invoice.findUnique({
      where: { id },
      include: {
        deliveryOrders: true,
      },
    });
    if (!oldInvoice) throw new Error("Credit note not found");
    // Status / active IRN are checked on the locked row (see invoiceReviseBlockReason).
    const blocked = invoiceReviseBlockReason(oldInvoice, DOC_TYPE);
    if (blocked) throw new Error(blocked);

    // A revision keeps the original's number and only bumps the -R tail, so it
    // does not consume a new sequence from the counter.
    const newRevision = oldInvoice.revision + 1;
    const newInvoiceNo = withRevision(oldInvoice.invoiceNo, newRevision);

    // Payments carry over to the revision: receipts link by invoiceId, so they
    // are re-pointed to the new row below and amountPaid (read under the lock)
    // moves with them. The revision starts as a Draft; submitInvoice derives
    // its status from amountPaid / balanceDue (invoicePaymentStatus).
    const balance = balanceDueAfterRecalc(totals.amountAfterTax, oldInvoice.amountPaid, invoiceDocLabel(DOC_TYPE));
    if (!balance.ok) throw new Error(balance.error);

    // Mark old credit note as 'Old Version'
    await tx.invoice.update({
      where: { id },
      data: { status: "Old Version" },
    });

    const created = await tx.invoice.create({
      data: {
        invoiceNo: newInvoiceNo,
        revision: newRevision,
        invoiceDate,
        companyId: data.companyId,
        invoiceType: data.invoiceType,
        customerId: data.customerId,
        contactPersonId: data.contactPersonId,
        tel: data.tel || null,
        fax: data.fax || null,
        email: data.email || null,
        billToId: data.billToId || null,
        shipToId: data.shipToId || null,
        consigneeName: data.consigneeName || null,
        consigneeGstin: data.consigneeGstin || null,
        consigneePhone: data.consigneePhone || null,
        consigneeState: data.consigneeState || null,
        consigneeCountry: data.consigneeCountry || "India",
        paymentTermId: data.paymentTermId,
        dueDate,
        currencyId: data.currencyId,
        exchangeRate: data.exchangeRate,
        amountBeforeTax: totals.amountBeforeTax,
        taxTypeId: data.taxTypeId,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        amountAfterTax: totals.amountAfterTax,
        amountPaid: oldInvoice.amountPaid,
        balanceDue: balance.balanceDue,
        roundOff: totals.roundOff,
        bankDetails: data.bankDetails || null,
        remark: data.remark || null,
        preparedById: data.preparedById,
        poNo: data.poNo || null,
        vehicleNumber: data.vehicleNumber || null,
        status: "Draft",
        supplyType: breakup.supplyType,
        cgstAmount: breakup.totals.cgst,
        sgstAmount: breakup.totals.sgst,
        igstAmount: breakup.totals.igst,
        items: {
          create: data.items.map((item: any, i: number) => itemWithGst(item, breakup.lines[i])),
        },
        deliveryOrders: {
          create: oldInvoice.deliveryOrders.map((doLink) => ({
            deliveryOrderId: doLink.deliveryOrderId,
          })),
        },
      },
    });

    // Draft and Confirmed receipts follow the live revision, so confirming or
    // voiding them later updates this credit note, not the Old Version.
    await tx.receipt.updateMany({
      where: { invoiceId: id, status: { not: "Void" } },
      data: { invoiceId: created.id },
    });

    return created;
    });

    revalidatePath(LIST_PATH);
    return { success: true, data: JSON.parse(JSON.stringify(invoice)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Parse an IRP ack date ("YYYY-MM-DD HH:mm:ss") into a Date, else null. */
function parseAckDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Generate a GST e-invoice (IRN + signed QR) for a submitted invoice via the
 * NIC IRP. Validates data completeness first and records the IRP response.
 */
export async function generateEInvoice(id: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        customer: { include: { addresses: true } },
        billTo: true,
        items: { orderBy: { lineNo: "asc" }, include: { uom: true, part: true } },
      },
    });
    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.status !== "Submitted") {
      return { success: false, error: "Only Submitted invoices can be reported to the IRP." };
    }
    if (invoice.einvoiceStatus === "Generated" && invoice.irn) {
      return { success: false, error: "An IRN already exists for this invoice." };
    }

    const issues = collectEInvoiceIssues({
      invoice,
      company: invoice.company,
      customer: invoice.customer,
      billToAddress: invoice.billTo,
    });
    if (issues.length) {
      return { success: false, error: "Cannot generate e-invoice:\n- " + issues.join("\n- ") };
    }

    const { payload } = prepareEInvoicePayload({
      invoice,
      company: invoice.company,
      customer: invoice.customer,
      billToAddress: invoice.billTo,
    });

    let result;
    try {
      result = await generateIrn(payload);
    } catch (e: any) {
      const msg = e instanceof IrpError ? e.message : e?.message || String(e);
      await prisma.invoice.update({
        where: { id },
        data: { einvoiceStatus: "Failed", einvoiceError: msg.slice(0, 1000) },
      });
      revalidatePath(LIST_PATH);
      return { success: false, error: `IRP rejected the invoice: ${msg}` };
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        einvoiceStatus: "Generated",
        irn: result.irn,
        ackNo: result.ackNo || null,
        ackDate: parseAckDate(result.ackDate),
        signedInvoice: result.signedInvoice || null,
        signedQrCode: result.signedQrCode || null,
        ewbNo: result.ewbNo || null,
        einvoiceGeneratedAt: new Date(),
        einvoiceError: null,
      },
    });

    revalidatePath(LIST_PATH);
    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a previously generated IRN on the IRP. reasonCode: 1 Duplicate,
 * 2 Data entry mistake, 3 Order cancelled, 4 Others.
 */
export async function cancelEInvoice(id: string, reasonCode: string, remark: string) {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.einvoiceStatus !== "Generated" || !invoice.irn) {
      return { success: false, error: "This invoice has no active IRN to cancel." };
    }

    try {
      await cancelIrn({ irn: invoice.irn, reasonCode: reasonCode || "4", remark: remark || "Cancelled" });
    } catch (e: any) {
      const msg = e instanceof IrpError ? e.message : e?.message || String(e);
      return { success: false, error: `IRP cancel failed: ${msg}` };
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        einvoiceStatus: "Cancelled",
        einvoiceCancelledAt: new Date(),
        einvoiceCancelReason: remark || null,
      },
    });

    revalidatePath(LIST_PATH);
    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
