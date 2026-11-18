// Pure, client-safe rules for which invoice-table documents a customer receipt
// may be applied to, and which exchange rate a receipt carries. Used by
// src/lib/receipts.ts (server guards) and receipt.actions.ts (dropdown filter).

/** Documents a customer pays us against. A Credit Note is money we owe them. */
export const RECEIPT_PAYABLE_INVOICE_TYPES = ["Customer Invoice", "Debit Note"] as const;
/** Invoice statuses that still accept receipts. */
export const RECEIPT_PAYABLE_INVOICE_STATUSES = ["Submitted", "Partially Paid"] as const;

export type PayableInvoiceLike = {
  invoiceNo?: string | null;
  invoiceType?: string | null;
  status?: string | null;
  balanceDue?: unknown;
};

/**
 * Why a receipt cannot be applied to this document, or null when it can.
 * `requireBalance` (default true) also demands an outstanding balance due.
 */
export function receiptInvoiceBlockReason(
  inv: PayableInvoiceLike | null | undefined,
  opts: { requireBalance?: boolean } = {},
): string | null {
  if (!inv) return "Related invoice not found.";
  const no = inv.invoiceNo || "the invoice";
  const type = (inv.invoiceType || "").trim();
  if (!(RECEIPT_PAYABLE_INVOICE_TYPES as readonly string[]).includes(type)) {
    return `${no} is a ${type || "document of unknown type"}; receipts can only be applied to customer invoices and debit notes.`;
  }
  const status = (inv.status || "").trim();
  if (!(RECEIPT_PAYABLE_INVOICE_STATUSES as readonly string[]).includes(status)) {
    return `Invoice ${no} is ${status || "not submitted"}; receipts can only be applied to submitted invoices.`;
  }
  if (opts.requireBalance !== false && !(Number(inv.balanceDue) > 0)) {
    return `Invoice ${no} has no balance due.`;
  }
  return null;
}

export function isReceiptPayableInvoice(inv: PayableInvoiceLike | null | undefined): boolean {
  return receiptInvoiceBlockReason(inv) === null;
}

/**
 * Exchange rate a receipt should store. Per spec, the latest Currency Profile
 * rate is taken when the receipt is created and frozen after that; a Draft edit
 * re-takes the latest rate only when its invoice or currency changes.
 */
export function receiptExchangeRate(args: {
  latestRate: unknown;
  existing?: { invoiceId: string; currencyId: string; exchangeRate: unknown } | null;
  invoiceId: string;
  currencyId: string;
}): number {
  const { existing } = args;
  if (existing && existing.invoiceId === args.invoiceId && existing.currencyId === args.currencyId) {
    const kept = Number(existing.exchangeRate);
    if (kept > 0) return kept;
  }
  const latest = Number(args.latestRate);
  if (!(latest > 0)) throw new Error("The currency has no valid exchange rate in Currency Profile.");
  return latest;
}
