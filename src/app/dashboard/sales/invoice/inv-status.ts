/* eslint-disable @typescript-eslint/no-explicit-any */
// Invoice status rules shared by the list and the create/edit form.
// Lifecycle (schema comment + invoice.actions.ts): Draft → Submitted → (Old Version on revise) | Void.
// Receipts (src/lib/receipts.ts) additionally overwrite `status` with "Partially Paid" / "Fully Paid"
// once money is received, and back to "Submitted" when every receipt is voided. Those are payment
// states of a Submitted invoice, so read-only checks fold them into "Submitted" and expose the
// payment side separately.
import type { Tone } from "@/components/form-ui";

export const INV_STATUSES = ["Draft", "Submitted", "Old Version", "Void"] as const;
export type InvStatus = (typeof INV_STATUSES)[number];

export type PaymentState = "Unpaid" | "Partial" | "Paid";
export const PAYMENT_STATES: readonly PaymentState[] = ["Unpaid", "Partial", "Paid"];

const PAID_ALIASES = new Set(["Fully Paid", "Paid"]);
const PARTIAL_ALIASES = new Set(["Partially Paid", "Partial"]);

/** Lifecycle status, tolerant of the receipt-driven payment statuses and the legacy "Old Revise" spelling. */
export function normalizeInvoiceStatus(status: string | null | undefined): string {
  if (!status) return "Draft";
  if (status === "Old Revise") return "Old Version";
  if (PAID_ALIASES.has(status) || PARTIAL_ALIASES.has(status)) return "Submitted";
  return status;
}

/** True when the raw status is one of the receipt-driven payment statuses. */
export function isPaymentStatus(status: string | null | undefined): boolean {
  return !!status && (PAID_ALIASES.has(status) || PARTIAL_ALIASES.has(status));
}

export const INV_STATUS_TONE: Record<InvStatus, Tone> = {
  Draft: "amber",
  Submitted: "emerald",
  "Old Version": "slate",
  Void: "rose",
};

export function invoiceStatusTone(status: string | null | undefined): Tone {
  return INV_STATUS_TONE[normalizeInvoiceStatus(status) as InvStatus] ?? "blue";
}

/**
 * Payment side of an invoice. Only meaningful for submitted invoices (null otherwise).
 * Uses the receipt-driven status when present, else amountPaid / balanceDue.
 */
export function invoicePaymentState(inv: any): PaymentState | null {
  if (normalizeInvoiceStatus(inv?.status) !== "Submitted") return null;
  if (PAID_ALIASES.has(inv?.status)) return "Paid";
  if (PARTIAL_ALIASES.has(inv?.status)) return "Partial";
  const paid = Number(inv?.amountPaid) || 0;
  const balance = Number(inv?.balanceDue);
  if (paid > 0 && Number.isFinite(balance) && balance <= 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Unpaid";
}

export const PAYMENT_TONE: Record<PaymentState, Tone> = {
  Unpaid: "amber",
  Partial: "sky",
  Paid: "emerald",
};

/** Draft and submitted (including paid) invoices can be printed. */
export function isInvoicePrintable(status: string | null | undefined): boolean {
  const s = normalizeInvoiceStatus(status);
  return s === "Draft" || s === "Submitted";
}

function startOfToday(): number {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
}

/** Submitted, not fully paid, and the due date is before today. */
export function isInvoiceOverdue(inv: any): boolean {
  if (!inv?.dueDate) return false;
  const pay = invoicePaymentState(inv);
  if (!pay || pay === "Paid") return false;
  const due = new Date(inv.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() < startOfToday();
}

export function einvoiceTone(status: string | null | undefined): Tone {
  if (status === "Generated") return "emerald";
  if (status === "Failed") return "rose";
  if (status === "Cancelled") return "slate";
  return "blue";
}

/** True while the invoice carries an IRN that has not been cancelled on the IRP. */
export function hasActiveIrn(inv: any): boolean {
  return inv?.einvoiceStatus === "Generated";
}

/**
 * Lower-case noun used in user-facing messages for an Invoice row:
 * "credit note" / "debit note" for notes, "invoice" for everything else.
 */
export function invoiceDocLabel(invoiceType: string | null | undefined): string {
  if (invoiceType === "Credit Note") return "credit note";
  if (invoiceType === "Debit Note") return "debit note";
  return "invoice";
}

/**
 * Why this invoice cannot be voided, or null when it can. Enforced by `voidInvoice`
 * on the server and mirrored by the Void buttons in the list and the form.
 * `activeReceiptCount` is the number of non-void receipts (Draft or Confirmed);
 * when omitted, `inv._count.receipts` is used if the row was loaded with it.
 * `docType` (an invoiceType such as "Credit Note") picks the wording; it defaults
 * to `inv.invoiceType`, and anything that is not a note reads "invoice".
 * Never auto-cancels the IRN or reverses receipts: the user does that first.
 */
export function invoiceVoidBlockReason(inv: any, activeReceiptCount?: number, docType?: string | null): string | null {
  const label = invoiceDocLabel(docType ?? inv?.invoiceType);
  if (!inv) return `No ${label} selected.`;
  const s = normalizeInvoiceStatus(inv.status);
  if (s === "Void") return `This ${label} is already void.`;
  if (s === "Old Version") return "An old version cannot be voided; void the latest revision instead.";
  if (hasActiveIrn(inv)) return "Cancel the e-invoice (IRN) first.";
  const receipts = activeReceiptCount ?? Number(inv?._count?.receipts ?? 0);
  if ((Number(inv.amountPaid) || 0) > 0 || isPaymentStatus(inv.status) || receipts > 0) {
    return `Payments are recorded against this ${label}. Void or reverse its receipts first.`;
  }
  return null;
}

/**
 * Why this invoice cannot be revised, or null when it can. Enforced by
 * `reviseInvoice` (inside its locked transaction) and mirrored by the Revise
 * buttons in the list and the form. Submitted, Partially Paid and Fully Paid
 * documents can be revised: payments carry over to the new revision. The new
 * total falling below the amount paid is checked separately at revise time
 * (balanceDueAfterRecalc). `docType` works as in invoiceVoidBlockReason.
 */
export function invoiceReviseBlockReason(inv: any, docType?: string | null): string | null {
  const label = invoiceDocLabel(docType ?? inv?.invoiceType);
  if (!inv) return `No ${label} selected.`;
  const s = normalizeInvoiceStatus(inv.status);
  if (s === "Void") return `This ${label} is void and cannot be revised.`;
  if (s === "Old Version") return "An old version cannot be revised; revise the latest revision instead.";
  if (s !== "Submitted") return `Only submitted ${label}s can be revised; edit the draft instead.`;
  if (hasActiveIrn(inv)) return "Cancel the e-invoice (IRN) first, then revise.";
  return null;
}
