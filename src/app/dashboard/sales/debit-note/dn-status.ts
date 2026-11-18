// Debit note status rules shared by the list and the create/edit form.
// Debit notes are Invoice rows with invoiceType "Debit Note" (see debit-note.actions.ts), so they share
// the invoice lifecycle: Draft → Submitted → (Old Version on revise) | Void.
// Receipts (src/lib/receipts.ts) work on any Invoice row and can overwrite `status` with
// "Partially Paid" / "Fully Paid". Those are payment states of a Submitted debit note, so read-only
// checks fold them into "Submitted" (otherwise the record drops out of every status tab and can't be printed).
import type { Tone } from "@/components/form-ui";

export const DN_STATUSES = ["Draft", "Submitted", "Old Version", "Void"] as const;
export type DnStatus = (typeof DN_STATUSES)[number];

export type DnPaymentState = "Partial" | "Paid";

const PAID_ALIASES = new Set(["Fully Paid", "Paid"]);
const PARTIAL_ALIASES = new Set(["Partially Paid", "Partial"]);

/** Lifecycle status, tolerant of the receipt-driven payment statuses and the legacy "Old Revise" spelling. */
export function normalizeDebitNoteStatus(status: string | null | undefined): string {
  if (!status) return "Draft";
  if (status === "Old Revise") return "Old Version";
  if (PAID_ALIASES.has(status) || PARTIAL_ALIASES.has(status)) return "Submitted";
  return status;
}

/** Payment side, only when a receipt has rewritten the status (null otherwise). */
export function debitNotePaymentState(status: string | null | undefined): DnPaymentState | null {
  if (status && PAID_ALIASES.has(status)) return "Paid";
  if (status && PARTIAL_ALIASES.has(status)) return "Partial";
  return null;
}

export const DN_STATUS_TONE: Record<DnStatus, Tone> = {
  Draft: "amber",
  Submitted: "emerald",
  "Old Version": "slate",
  Void: "rose",
};

export function debitNoteStatusTone(status: string | null | undefined): Tone {
  return DN_STATUS_TONE[normalizeDebitNoteStatus(status) as DnStatus] ?? "blue";
}

export const DN_PAYMENT_TONE: Record<DnPaymentState, Tone> = {
  Partial: "sky",
  Paid: "emerald",
};

/** Draft and submitted (including paid) debit notes can be printed. */
export function isDebitNotePrintable(status: string | null | undefined): boolean {
  const s = normalizeDebitNoteStatus(status);
  return s === "Draft" || s === "Submitted";
}

export function einvoiceTone(status: string | null | undefined): Tone {
  if (status === "Generated") return "emerald";
  if (status === "Failed") return "rose";
  if (status === "Cancelled") return "slate";
  return "blue";
}
