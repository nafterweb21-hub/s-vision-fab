// Payment-side status of a submitted invoice, driven by receipts. Pure and
// client-safe: used by src/lib/receipts.ts (confirm / void a receipt) and by the
// invoice server actions (submit, revise), so all of them agree.

export type InvoicePaymentStatus = "Submitted" | "Partially Paid" | "Fully Paid";

/**
 * Status a submitted invoice should carry for the given paid amount and balance:
 * nothing paid -> "Submitted", balance cleared -> "Fully Paid", else "Partially Paid".
 */
export function invoicePaymentStatus(amountPaid: unknown, balanceDue: unknown): InvoicePaymentStatus {
  const paid = Number(amountPaid) || 0;
  const balance = Number(balanceDue) || 0;
  if (paid <= 0) return "Submitted";
  if (balance <= 0) return "Fully Paid";
  return "Partially Paid";
}

/**
 * Balance due once an invoice's total is (re)computed while keeping what was
 * already received. Returns an error message instead when the new total would
 * fall below the amount already paid. `docLabel` is the noun used in that
 * message ("invoice", "credit note", "debit note").
 */
export function balanceDueAfterRecalc(
  total: number,
  amountPaid: unknown,
  docLabel = "invoice",
): { ok: true; balanceDue: number } | { ok: false; error: string } {
  const paid = Number(amountPaid) || 0;
  const t = Number(total) || 0;
  if (paid > 0 && t + 0.005 < paid) {
    return {
      ok: false,
      error: `The new ${docLabel} total (${t.toFixed(2)}) is less than the amount already received (${paid.toFixed(2)}). Void or reverse its receipts first.`,
    };
  }
  return { ok: true, balanceDue: Math.round((t - paid + Number.EPSILON) * 100) / 100 };
}
