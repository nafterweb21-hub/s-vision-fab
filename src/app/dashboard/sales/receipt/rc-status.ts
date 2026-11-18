// Receipt status + payment-method display rules shared by the receipt list, form and detail page.
// Lifecycle (src/lib/receipts.ts): Draft -> Confirmed -> Void (Draft can also be voided directly).
// Display only: the server still checks the raw status strings.
import { Banknote, CircleDollarSign, Landmark, ScrollText, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/form-ui";

export const RC_STATUSES = ["Draft", "Confirmed", "Void"] as const;
export type RcStatus = (typeof RC_STATUSES)[number];

/** Lifecycle status, tolerant of case / whitespace drift and the "Voided" / "Cancelled" spellings. */
export function normalizeReceiptStatus(status: string | null | undefined): string {
  const s = (status || "").trim().toLowerCase();
  if (!s) return "Draft";
  if (s === "draft") return "Draft";
  if (s === "confirmed") return "Confirmed";
  if (s === "void" || s === "voided" || s === "cancelled" || s === "canceled") return "Void";
  return (status || "").trim();
}

export const RC_STATUS_TONE: Record<RcStatus, Tone> = {
  Draft: "amber",
  Confirmed: "emerald",
  Void: "rose",
};

export function receiptStatusTone(status: string | null | undefined): Tone {
  return RC_STATUS_TONE[normalizeReceiptStatus(status) as RcStatus] ?? "slate";
}

export const PAYMENT_METHODS = ["Bank Transfer", "Cheque", "Cash", "Others"] as const;

const METHOD_META: Record<string, { tone: Tone; icon: LucideIcon }> = {
  "Bank Transfer": { tone: "sky", icon: Landmark },
  Cheque: { tone: "violet", icon: ScrollText },
  Cash: { tone: "emerald", icon: Banknote },
  Others: { tone: "slate", icon: CircleDollarSign },
};

export function paymentMethodMeta(method: string | null | undefined): { tone: Tone; icon: LucideIcon } {
  return (method && METHOD_META[method]) || METHOD_META.Others;
}

/** Label for the reference field, by payment method. */
export function referenceLabel(method: string | null | undefined): string {
  if (method === "Cheque") return "Cheque No";
  if (method === "Bank Transfer") return "UTR / Ref No";
  return "Ref No";
}

export function formatAmount(n: unknown): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dayDiff(d: Date): number {
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((a - b) / 86400000);
}

export function relativeDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = dayDiff(d);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff === -1) return "Tomorrow";
  if (diff > 1 && diff < 7) return `${diff}d ago`;
  if (diff < -1 && diff > -7) return `in ${-diff}d`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/** Solid emerald button (md), the money-side primary action. Literal so Tailwind can see it. */
export const emeraldButtonClass =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50";
