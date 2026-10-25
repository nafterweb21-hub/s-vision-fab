/**
 * High-level e-invoice orchestration: validate an invoice for the IRP, compute
 * its GST breakup, and build the IRP payload. The actual network calls live in
 * ./nic-client. Server actions (invoice.actions.ts) wire these to the database.
 */
import { computeGstBreakup, isValidGstin, resolvePosStateCode, stateCodeFromGstin } from "@/lib/gst";
import type { GstBreakup } from "@/lib/gst";
import { buildEInvoicePayload, extractPin } from "./build-payload";

export { generateIrn, cancelIrn, IrpError } from "./nic-client";
export type { GenerateIrnResult } from "./nic-client";
export { getEInvoiceConfig, missingEInvoiceConfig } from "./config";

/**
 * Data-completeness checks that must pass before an invoice can be reported to
 * the IRP. Returns a list of human-readable blockers (empty => ready).
 */
export function collectEInvoiceIssues(input: {
  invoice: any;
  company: any;
  customer: any;
  billToAddress?: any;
}): string[] {
  const { invoice, company, customer, billToAddress } = input;
  const issues: string[] = [];

  if (!isValidGstin(company?.gstRegistrationNo)) {
    issues.push("Seller (company) GSTIN is missing or invalid.");
  }
  if (!isValidGstin(customer?.gstin)) {
    issues.push("Buyer (customer) GSTIN is missing or invalid — a B2B e-invoice requires it.");
  }

  const custAddr = billToAddress?.address || customer?.addresses?.[0]?.address || "";
  if (extractPin(company?.address) == null) {
    issues.push("Seller address has no 6-digit pincode (required by the IRP).");
  }
  if (extractPin(custAddr) == null) {
    issues.push("Buyer address has no 6-digit pincode (required by the IRP).");
  }

  const pos = resolvePosStateCode(customer?.placeOfSupply, customer?.gstin);
  if (!pos) {
    issues.push("Cannot determine the buyer's place-of-supply state code.");
  }
  if (!stateCodeFromGstin(company?.gstRegistrationNo)) {
    issues.push("Cannot determine the seller's state code from the company GSTIN.");
  }

  if (!invoice?.items?.length) {
    issues.push("Invoice has no line items.");
  } else {
    invoice.items.forEach((it: any, i: number) => {
      if (!it.hsnCode || !String(it.hsnCode).trim()) {
        issues.push(`Line ${i + 1} is missing an HSN/SAC code.`);
      }
    });
  }

  return issues;
}

/** Compute the GST breakup for a loaded invoice using its flat tax rate. */
export function breakupForInvoice(invoice: any, company: any, customer: any): GstBreakup {
  const posStateCode = resolvePosStateCode(customer?.placeOfSupply, customer?.gstin);
  const invoiceTaxRate = Number(invoice.taxRate) || Number(invoice.taxType?.taxRate) || 0;
  return computeGstBreakup({
    lines: (invoice.items || []).map((it: any) => ({
      amount: Number(it.amount) || 0,
      taxRate: Number(it.gstRate || it.taxRate) || (invoiceTaxRate > 0 ? invoiceTaxRate : undefined),
    })),
    taxRatePercent: invoiceTaxRate,
    sellerGstin: company?.gstRegistrationNo,
    posStateCode,
    isSez: customer?.isSez,
    sezTaxRate: Number(company?.sezTaxRate) || 0,
  });
}

/** Build the IRP payload for a loaded invoice (assumes issues already checked). */
export function prepareEInvoicePayload(input: {
  invoice: any;
  company: any;
  customer: any;
  billToAddress?: any;
}): { payload: any; breakup: GstBreakup } {
  const breakup = breakupForInvoice(input.invoice, input.company, input.customer);
  const payload = buildEInvoicePayload({
    invoice: input.invoice,
    company: input.company,
    customer: input.customer,
    billToAddress: input.billToAddress,
    breakup,
  });
  return { payload, breakup };
}
