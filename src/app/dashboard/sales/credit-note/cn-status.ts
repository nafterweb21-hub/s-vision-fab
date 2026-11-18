// Credit note status rules shared by the list and the create/edit form.
// Credit notes are Invoice rows with invoiceType "Credit Note" (see credit-note.actions.ts), so they share
// the invoice lifecycle: Draft → Submitted → (Old Version on revise) | Void.
// Receipts (src/lib/receipts.ts) work on any Invoice row and can overwrite `status` with
// "Partially Paid" / "Fully Paid". Those are payment states of a Submitted credit note, so read-only
// checks fold them into "Submitted" (otherwise the record drops out of every status tab and can't be printed).
import type { Tone } from "@/components/form-ui";

export const CN_STATUSES = ["Draft", "Submitted", "Old Version", "Void"] as const;
export type CnStatus = (typeof CN_STATUSES)[number];

export type CnPaymentState = "Partial" | "Paid";

const PAID_ALIASES = new Set(["Fully Paid", "Paid"]);
const PARTIAL_ALIASES = new Set(["Partially Paid", "Partial"]);

/** Lifecycle status, tolerant of the receipt-driven payment statuses and the legacy "Old Revise" spelling. */
export function normalizeCreditNoteStatus(status: string | null | undefined): string {
  if (!status) return "Draft";
  if (status === "Old Revise") return "Old Version";
  if (PAID_ALIASES.has(status) || PARTIAL_ALIASES.has(status)) return "Submitted";
  return status;
}

/** Payment side, only when a receipt has rewritten the status (null otherwise). */
export function creditNotePaymentState(status: string | null | undefined): CnPaymentState | null {
  if (status && PAID_ALIASES.has(status)) return "Paid";
  if (status && PARTIAL_ALIASES.has(status)) return "Partial";
  return null;
}

export const CN_STATUS_TONE: Record<CnStatus, Tone> = {
  Draft: "amber",
  Submitted: "emerald",
  "Old Version": "slate",
  Void: "rose",
};

export function creditNoteStatusTone(status: string | null | undefined): Tone {
  return CN_STATUS_TONE[normalizeCreditNoteStatus(status) as CnStatus] ?? "blue";
}

export const CN_PAYMENT_TONE: Record<CnPaymentState, Tone> = {
  Partial: "sky",
  Paid: "emerald",
};

/** Draft and submitted (including paid) credit notes can be printed. */
export function isCreditNotePrintable(status: string | null | undefined): boolean {
  const s = normalizeCreditNoteStatus(status);
  return s === "Draft" || s === "Submitted";
}

export function einvoiceTone(status: string | null | undefined): Tone {
  if (status === "Generated") return "emerald";
  if (status === "Failed") return "rose";
  if (status === "Cancelled") return "slate";
  return "blue";
}
