// Display-only panels shared by the receipt form and the receipt detail page.
// No data fetching or payment logic: callers pass the numbers they already hold.
import React from "react";
import { AlertTriangle, Banknote, CheckCircle2, Receipt as ReceiptIcon } from "lucide-react";
import { Badge } from "@/components/form-ui";
import { formatAmount } from "./rc-status";

/**
 * pending: receipt not yet applied (new / Draft) -> paid + this receipt = new balance.
 * applied: receipt is Confirmed, so `paid` already includes it.
 * void:    receipt is Void and not counted.
 */
export type BalanceMode = "pending" | "applied" | "void";

export function InvoiceBalanceCard({
  code,
  invoiceNo,
  invoiceType,
  invoiceStatus,
  total,
  paid,
  balance,
  amount,
  mode,
}: {
  code: string;
  invoiceNo?: string | null;
  invoiceType?: string | null;
  invoiceStatus?: string | null;
  total: number;
  paid: number;
  balance: number;
  amount: number;
  mode: BalanceMode;
}) {
  const over = mode === "pending" && amount > balance;
  const othersPaid = mode === "applied" ? Math.max(0, paid - amount) : paid;
  const thisAmt = mode === "void" ? 0 : amount;
  const balanceBefore = mode === "applied" ? balance + amount : balance;
  const balanceAfter = mode === "pending" ? balance - amount : balance;

  const pct = (v: number) => (total > 0 ? Math.max(0, Math.min(100, (v / total) * 100)) : 0);
  const paidPct = pct(othersPaid);
  const thisPct = Math.min(100 - paidPct, pct(thisAmt));
  const coveredPct = Math.round(Math.min(100, pct(othersPaid + thisAmt)));

  return (
    <div
      className={`rounded-lg border p-3 ${
        over ? "border-rose-200 bg-rose-50/40" : "border-emerald-200 bg-emerald-50/40"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Against</span>
        <span className="font-mono text-[13px] font-semibold text-slate-900">{invoiceNo || "—"}</span>
        {invoiceType && invoiceType !== "Customer Invoice" && <Badge tone="violet">{invoiceType}</Badge>}
        {invoiceStatus && <Badge tone="slate">{invoiceStatus}</Badge>}
        <span className={`ml-auto text-[11px] font-medium tabular-nums ${over ? "text-rose-600" : "text-emerald-700"}`}>
          {coveredPct}% covered
        </span>
      </div>

      {/* Paid vs total */}
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70"
        role="img"
        aria-label={`Paid ${formatAmount(othersPaid)} and this receipt ${formatAmount(thisAmt)} of ${formatAmount(total)}`}
      >
        <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${paidPct}%` }} />
        <div
          className={`h-full transition-[width] ${over ? "bg-rose-500" : "bg-emerald-300"}`}
          style={{ width: `${over ? 100 - paidPct : thisPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Already paid</span>
        <span className="inline-flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${over ? "bg-rose-500" : "bg-emerald-300"}`} /> This receipt
        </span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> Outstanding</span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-[11px] text-slate-500">Invoice Total</dt>
          <dd className="truncate font-semibold tabular-nums text-slate-900">
            <span className="mr-1 text-[11px] font-normal text-slate-400">{code}</span>{formatAmount(total)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-slate-500">{mode === "applied" ? "Paid by others" : "Already Paid"}</dt>
          <dd className="truncate font-semibold tabular-nums text-slate-900">{formatAmount(othersPaid)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-slate-500">{mode === "applied" ? "Balance before" : "Balance Due"}</dt>
          <dd className="truncate font-semibold tabular-nums text-slate-900">{formatAmount(balanceBefore)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-slate-500">This receipt → {mode === "pending" ? "new balance" : "balance"}</dt>
          <dd className={`truncate font-semibold tabular-nums ${over ? "text-rose-600" : "text-emerald-700"}`}>
            {mode === "void" ? (
              <span className="text-slate-400 line-through">{formatAmount(amount)}</span>
            ) : (
              formatAmount(thisAmt)
            )}
            <span className="mx-1 text-slate-400">→</span>
            {formatAmount(balanceAfter)}
          </dd>
        </div>
      </dl>

      {over && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
          <AlertTriangle size={12} className="shrink-0" />
          Exceeds the balance due by {code} {formatAmount(amount - balance)}. Saving is blocked.
        </p>
      )}
      {mode === "void" && (
        <p className="mt-2 text-[11px] text-slate-500">This receipt is void and is not counted against the invoice.</p>
      )}
    </div>
  );
}

/** Dark navy summary card for the right rail: receipt amount large, balance after below. */
export function ReceiptSummaryRail({
  code,
  amount,
  rows,
  balanceAfter,
  over,
  struck,
  footnote,
}: {
  code: string;
  amount: number;
  rows: { label: string; value: React.ReactNode; mono?: boolean }[];
  balanceAfter?: number | null;
  over?: boolean;
  struck?: boolean;
  footnote?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-[#111827] text-slate-300 shadow-lg shadow-slate-900/10 ring-1 ring-white/5">
      <header className="flex items-center gap-2.5 border-b border-white/10 px-4 py-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
          <ReceiptIcon size={15} />
        </span>
        <div>
          <h2 className="text-[13px] font-semibold leading-tight text-white">Summary</h2>
          <p className="text-[11px] leading-tight text-slate-400">Payment recorded by this receipt</p>
        </div>
      </header>
      <dl className="space-y-2 px-4 py-3 text-[13px]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-slate-400">{r.label}</dt>
            <dd className={`min-w-0 truncate text-right text-slate-200 ${r.mono ? "font-mono text-[12px]" : "tabular-nums"}`}>{r.value}</dd>
          </div>
        ))}
        {balanceAfter != null && (
          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2">
            <dt className="text-slate-400">Balance after</dt>
            <dd className={`tabular-nums font-medium ${over ? "text-rose-400" : balanceAfter <= 0 ? "text-emerald-300" : "text-slate-100"}`}>
              {formatAmount(balanceAfter)}
            </dd>
          </div>
        )}
      </dl>
      <div className="relative border-t border-white/10 bg-white/[0.03] px-4 py-3">
        <span className={`absolute inset-y-3 left-0 w-[3px] rounded-r ${over ? "bg-rose-500" : "bg-gradient-to-b from-emerald-400 to-teal-500"}`} />
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-300">
          <Banknote size={12} /> Amount Received
        </p>
        <p className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-xs font-medium text-emerald-300">{code}</span>
          <span className={`text-2xl font-semibold tabular-nums tracking-tight ${struck ? "text-slate-500 line-through" : "text-white"}`}>
            {formatAmount(amount)}
          </span>
        </p>
        {balanceAfter != null && !over && balanceAfter <= 0 && !struck && (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300">
            <CheckCircle2 size={12} /> Clears the invoice
          </p>
        )}
        {over && (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-rose-400">
            <AlertTriangle size={12} /> More than the balance due
          </p>
        )}
      </div>
      {footnote && <div className="border-t border-white/10 px-4 py-2 text-[11px] text-slate-400">{footnote}</div>}
    </section>
  );
}
