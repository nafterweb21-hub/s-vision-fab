import React from "react";
import { Check, X } from "lucide-react";
import type { TierState } from "@/app/dashboard/purchasing/purchase-order/po-status";

// Approval-tier stepper and receive-status track shown on the PO and PO Subcon forms.

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STEP_DOT: Record<TierState, string> = {
  done: "bg-emerald-500 text-white",
  current: "bg-amber-500 text-white ring-4 ring-amber-100",
  waiting: "bg-slate-200 text-slate-500",
  rejected: "bg-rose-500 text-white",
  skipped: "bg-slate-100 text-slate-400",
  none: "bg-slate-100 text-slate-400",
};

const STEP_TEXT: Record<TierState, string> = {
  done: "Approved",
  current: "Awaiting approval",
  waiting: "Waiting",
  rejected: "Rejected",
  skipped: "Skipped",
  none: "Not started",
};

const STEP_TEXT_CLS: Record<TierState, string> = {
  done: "text-emerald-700",
  current: "text-amber-700",
  waiting: "text-slate-500",
  rejected: "text-rose-700",
  skipped: "text-slate-400",
  none: "text-slate-400",
};

export function ApprovalStep({
  n,
  title,
  state,
  who,
  when,
  last,
}: {
  n: number;
  title: string;
  state: TierState;
  who?: string | null;
  when?: string | null;
  last?: boolean;
}) {
  const stamp = fmtDateTime(when);
  return (
    <div className="relative flex gap-2.5">
      {!last && <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-slate-200" />}
      <span className={`relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${STEP_DOT[state]}`}>
        {state === "done" ? <Check size={13} /> : state === "rejected" ? <X size={13} /> : n}
      </span>
      <div className="min-w-0 pb-2">
        <p className="text-[13px] font-medium leading-tight text-slate-800">{title}</p>
        <p className={`text-[11px] leading-tight ${STEP_TEXT_CLS[state]}`}>{STEP_TEXT[state]}</p>
        {who && (
          <p className="mt-0.5 truncate text-[11px] text-slate-500" title={who}>
            by <span className="font-medium text-slate-700">{who}</span>
            {stamp && <span className="text-slate-400"> · {stamp}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

const RECEIVE_STEPS = ["Not Received", "Partially Received", "Fully Received"] as const;

export function ReceiveTrack({ status }: { status: string }) {
  const reached = RECEIVE_STEPS.indexOf(status as (typeof RECEIVE_STEPS)[number]);
  if (reached < 0) {
    return <p className="text-xs text-slate-500">Nothing to receive yet. Receiving opens once the PO is Issued.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1">
        {RECEIVE_STEPS.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 rounded-full ${
              i <= reached ? (reached === 2 ? "bg-emerald-500" : reached === 1 ? "bg-sky-500" : "bg-rose-400") : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500">
        <span>Not received</span>
        <span className="text-center">Partial</span>
        <span className="text-right">Full</span>
      </div>
    </div>
  );
}
