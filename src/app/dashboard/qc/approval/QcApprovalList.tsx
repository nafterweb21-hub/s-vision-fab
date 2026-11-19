"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, ExternalLink, SearchX, ShieldCheck } from "lucide-react";
import { Badge, EmptyState, InitialsAvatar, StatusBadge, TONES, buttonClass, type Tone } from "@/components/form-ui";
import { SearchBar } from "@/components/purchasing/DocListParts";
import { WO_STATUS_TONE } from "@/app/dashboard/production/work-order/components/wo-status";

export type QcRow = {
  workOrderNo: string;
  date: string;
  deliveryDate: string | null;
  customerName: string;
  jobDescription: string;
  uom: string;
  status: string;
  qcAcceptance: string | null;
  producedQty: number;
  totalQty: number;
  steps: number;
  stepsDone: number;
  /** Timesheets on this WO with no stage-QC decision yet. */
  awaitingStageQc: number;
  queue: "Final QC" | "Stage QC" | "Rejected" | "Approved";
};

const QUEUES: { key: "All" | QcRow["queue"]; label: string; tone: Tone; hint: string }[] = [
  { key: "All", label: "All in queue", tone: "indigo", hint: "" },
  { key: "Final QC", label: "Awaiting final QC", tone: "violet", hint: "All routing done; status Pending for QC" },
  { key: "Stage QC", label: "Stage QC (in WIP)", tone: "amber", hint: "WIP with completed timesheets to inspect" },
  { key: "Rejected", label: "QC rejected", tone: "rose", hint: "Rejected and not yet completed" },
  { key: "Approved", label: "Approved, open", tone: "emerald", hint: "Approved but WO not Completed" },
];

const fmtDate = (v: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

export default function QcApprovalList({ rows }: { rows: QcRow[] }) {
  const [search, setSearch] = useState("");
  const [queue, setQueue] = useState<(typeof QUEUES)[number]["key"]>("All");

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.workOrderNo, r.customerName, r.jobDescription].some((v) => v.toLowerCase().includes(q)));
  }, [rows, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: searched.length };
    for (const r of searched) c[r.queue] = (c[r.queue] ?? 0) + 1;
    return c;
  }, [searched]);

  const visible = queue === "All" ? searched : searched.filter((r) => r.queue === queue);
  const hasFilters = search.trim() !== "" || queue !== "All";
  const clearFilters = () => {
    setSearch("");
    setQueue("All");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-600/20 sm:inline-flex">
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span>QC</span>
              <span>/</span>
              <span className="text-slate-500">QC Approval</span>
            </nav>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">QC Approval</h1>
            <p className="text-xs text-slate-500">Work orders waiting on quality control. Inspect and decide in the QC Terminal.</p>
          </div>
        </div>
        <Link href="/qc" className={buttonClass("primary", "md")}>
          <ExternalLink size={14} /> Open QC Terminal
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="tablist" aria-label="Filter by QC queue">
        {QUEUES.map((qd) => {
          const active = queue === qd.key;
          const n = counts[qd.key] ?? 0;
          return (
            <button
              key={qd.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setQueue(qd.key)}
              title={qd.hint || undefined}
              className={`relative flex min-w-0 flex-col items-start overflow-hidden rounded-lg border px-3 py-2 pl-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                active ? "border-indigo-300 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500/15" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className={`absolute inset-y-0 left-0 w-[3px] ${TONES[qd.tone].bar}`} />
              <span className={`flex w-full items-center gap-1.5 truncate text-[11px] font-medium ${active ? "text-indigo-700" : "text-slate-500"}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONES[qd.tone].dot}`} />
                <span className="truncate">{qd.label}</span>
              </span>
              <span className={`text-base font-semibold leading-tight tabular-nums ${active ? "text-indigo-900" : "text-slate-900"} ${n === 0 ? "opacity-40" : ""}`}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by WO No, Customer or Job..." refreshing={false} hasFilters={hasFilters} onClear={clearFilters} />

        {visible.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No work orders match these filters"
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              tone="emerald"
              title="Nothing waiting on QC"
              description="Work orders appear here when timesheets complete, when all routing is done (Pending for QC), or after a QC rejection."
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-2 pl-4 pr-3 font-medium">WO No</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Job</th>
                  <th className="hidden w-44 px-3 py-2 font-medium sm:table-cell">Produced</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Routing</th>
                  <th className="px-3 py-2 font-medium">QC</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">WO Status</th>
                  <th className="px-4 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((wo) => {
                  const pct = wo.totalQty > 0 ? Math.min(100, (wo.producedQty / wo.totalQty) * 100) : 0;
                  const qc = wo.qcAcceptance || "Pending";
                  const href = `/dashboard/qc/approval/${wo.workOrderNo}`;
                  return (
                    <tr
                      key={wo.workOrderNo}
                      className={`group align-top transition-colors hover:bg-indigo-50/40 ${wo.queue === "Rejected" ? "bg-rose-50/40 shadow-[inset_3px_0_0_0_rgb(244_63_94)]" : ""}`}
                    >
                      <td className="py-2 pl-4 pr-3">
                        <Link href={href} className="whitespace-nowrap font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                          {wo.workOrderNo}
                        </Link>
                        <p className="text-[11px] text-slate-400">Due {fmtDate(wo.deliveryDate)}</p>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[200px] items-center gap-2" title={wo.customerName}>
                          <InitialsAvatar name={wo.customerName} />
                          <span className="truncate font-medium text-slate-800">{wo.customerName}</span>
                        </div>
                      </td>
                      <td className="hidden max-w-[240px] px-3 py-2 lg:table-cell">
                        <p className="truncate text-slate-600" title={wo.jobDescription}>{wo.jobDescription}</p>
                      </td>
                      <td className="hidden px-3 py-2 sm:table-cell">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-semibold tabular-nums text-slate-800">
                            {wo.producedQty}
                            <span className="ml-1 text-[10px] font-normal uppercase text-slate-400">{wo.uom}</span>
                          </span>
                          <span className="tabular-nums text-slate-400">/ {wo.totalQty}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2 text-xs md:table-cell">
                        <span className={wo.steps > 0 && wo.stepsDone === wo.steps ? "font-medium text-emerald-700" : "text-slate-600"}>
                          {wo.stepsDone}/{wo.steps} steps
                        </span>
                        {wo.awaitingStageQc > 0 && <p className="text-[11px] text-violet-700">{wo.awaitingStageQc} sheet{wo.awaitingStageQc === 1 ? "" : "s"} to inspect</p>}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={qc === "Approved" ? "emerald" : qc === "Rejected" ? "rose" : "violet"} dot>
                          {qc}
                        </Badge>
                        <p className="mt-0.5 text-[11px] text-slate-400">{wo.queue}</p>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <StatusBadge status={wo.status} tone={WO_STATUS_TONE[wo.status] ?? "slate"} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link href={href} className={buttonClass("secondary", "sm", "lg:opacity-75 lg:group-hover:opacity-100")}>
                          Review <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {visible.length > 0 && (
        <p className="px-1 text-[11px] text-slate-400">
          Showing <span className="font-medium tabular-nums text-slate-600">{visible.length}</span> of{" "}
          <span className="font-medium tabular-nums text-slate-600">{rows.length}</span> work orders in the QC queue
        </p>
      )}
    </div>
  );
}
