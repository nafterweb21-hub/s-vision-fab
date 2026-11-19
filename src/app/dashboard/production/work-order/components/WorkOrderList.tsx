"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, CalendarClock, Factory, RotateCcw, SearchX, Wrench } from "lucide-react";
import { EmptyState, InitialsAvatar, StatusBadge, TONES, buttonClass, type Tone } from "@/components/form-ui";
import { SearchBar } from "@/components/purchasing/DocListParts";
import OutstandingWorkButton from "./OutstandingWorkButton";
import { WO_STATUS_TONE } from "./wo-status";

export type WorkOrderRow = {
  workOrderNo: string;
  date: string | null;
  deliveryDate: string | null;
  customerName: string;
  jobDescription: string;
  uom: string;
  status: string;
  qcAcceptance: string | null;
  producedQty: number;
  rejectedQty: number;
  totalQty: number;
};

const woTone = (s: string): Tone => WO_STATUS_TONE[s] ?? "slate";

/** Status tiles, in workflow order. Statuses outside this list still show under "All". */
const TILES = ["All", "Draft", "Proceed", "WIP", "Pending for QC", "Rejected", "Completed"] as const;
type Tile = (typeof TILES)[number];

const fmtDate = (v: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export default function WorkOrderList({
  rows,
  canCreate,
  errorMsg,
  truncatedAt,
}: {
  rows: WorkOrderRow[];
  canCreate: boolean;
  errorMsg: string | null;
  truncatedAt: number | null;
}) {
  const [search, setSearch] = useState("");
  const [tile, setTile] = useState<Tile>("All");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const today = startOfToday();
  const isOverdue = (r: WorkOrderRow) =>
    !!r.deliveryDate && new Date(r.deliveryDate).getTime() < today && r.status !== "Completed";

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.workOrderNo, r.customerName, r.jobDescription].some((v) => v?.toLowerCase().includes(q)));
  }, [rows, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: searched.length };
    for (const r of searched) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [searched]);
  const overdueCount = searched.filter(isOverdue).length;

  const visible = searched.filter((r) => (tile === "All" || r.status === tile) && (!overdueOnly || isOverdue(r)));
  const hasFilters = search.trim() !== "" || tile !== "All" || overdueOnly;
  const clearFilters = () => {
    setSearch("");
    setTile("All");
    setOverdueOnly(false);
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 sm:inline-flex">
            <Factory size={18} />
          </span>
          <div className="min-w-0">
            <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span>Production</span>
              <span>/</span>
              <span className="text-slate-500">Work Orders</span>
            </nav>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">Work Orders</h1>
            <p className="text-xs text-slate-500">Created from confirmed Sales Order batches via Outstanding Work.</p>
          </div>
        </div>
        {canCreate && (
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/production/rework" className={buttonClass("warn", "md")}>
              <RotateCcw size={14} /> Rework Queue
            </Link>
            <OutstandingWorkButton />
          </div>
        )}
      </div>

      {/* Status tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7" role="tablist" aria-label="Filter by status">
        {TILES.map((key) => {
          const active = tile === key;
          const tone: Tone = key === "All" ? "indigo" : woTone(key);
          const n = counts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTile(key)}
              className={`relative flex min-w-0 flex-col items-start overflow-hidden rounded-lg border px-3 py-2 pl-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                active ? "border-indigo-300 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500/15" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className={`absolute inset-y-0 left-0 w-[3px] ${TONES[tone].bar}`} />
              <span className={`flex w-full items-center gap-1.5 truncate text-[11px] font-medium ${active ? "text-indigo-700" : "text-slate-500"}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONES[tone].dot}`} />
                <span className="truncate">{key === "All" ? "All work orders" : key}</span>
              </span>
              <span className={`text-base font-semibold leading-tight tabular-nums ${active ? "text-indigo-900" : "text-slate-900"} ${n === 0 ? "opacity-40" : ""}`}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          Couldn&apos;t load work orders from the database. Please refresh; if it keeps happening, contact your administrator.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by WO No, Customer or Job..."
              refreshing={false}
              hasFilters={hasFilters}
              onClear={clearFilters}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-2">
          <button
            type="button"
            onClick={() => setOverdueOnly((v) => !v)}
            aria-pressed={overdueOnly}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors ${
              overdueOnly ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CalendarClock size={12} /> Past delivery date
            <span className="tabular-nums opacity-70">{overdueCount}</span>
          </button>
          {(counts["Rejected"] ?? 0) > 0 && tile !== "Rejected" && (
            <button
              type="button"
              onClick={() => setTile("Rejected")}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
            >
              <AlertTriangle size={12} /> {counts["Rejected"]} QC rejected
            </button>
          )}
        </div>

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
              icon={Factory}
              tone="indigo"
              title="No work orders yet"
              description={canCreate ? "Click Outstanding Work to pick a confirmed sales order batch." : undefined}
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
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Delivery</th>
                  <th className="hidden w-44 px-3 py-2 font-medium sm:table-cell">Progress</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((wo) => {
                  const rejected = wo.status === "Rejected";
                  const overdue = isOverdue(wo);
                  const pct = wo.totalQty > 0 ? Math.min(100, (wo.producedQty / wo.totalQty) * 100) : 0;
                  const href = `/dashboard/production/work-order/${wo.workOrderNo}`;
                  return (
                    <tr
                      key={wo.workOrderNo}
                      className={`group align-top transition-colors hover:bg-indigo-50/40 ${rejected ? "bg-rose-50/40 shadow-[inset_3px_0_0_0_rgb(244_63_94)]" : ""}`}
                    >
                      <td className="py-2 pl-4 pr-3">
                        <Link href={href} className="whitespace-nowrap font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                          {wo.workOrderNo}
                        </Link>
                        <p className="text-[11px] text-slate-400">{fmtDate(wo.date)}</p>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[200px] items-center gap-2" title={wo.customerName}>
                          <InitialsAvatar name={wo.customerName} />
                          <span className="truncate font-medium text-slate-800">{wo.customerName}</span>
                        </div>
                      </td>
                      <td className="hidden max-w-[260px] px-3 py-2 lg:table-cell">
                        <p className="truncate text-slate-600" title={wo.jobDescription}>{wo.jobDescription}</p>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <span className={`inline-flex items-center gap-1 whitespace-nowrap text-xs ${overdue ? "font-medium text-rose-700" : "text-slate-500"}`}>
                          {overdue && <CalendarClock size={12} />}
                          {fmtDate(wo.deliveryDate)}
                        </span>
                        {overdue && <p className="text-[11px] text-rose-600">Overdue</p>}
                      </td>
                      <td className="hidden px-3 py-2 sm:table-cell">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-semibold tabular-nums text-slate-800">
                            {wo.producedQty}
                            <span className="ml-1 text-[10px] font-normal uppercase text-slate-400">{wo.uom}</span>
                          </span>
                          <span className="tabular-nums text-slate-400">/ {wo.totalQty}</span>
                        </div>
                        <div
                          className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(pct)}
                          aria-label={`${wo.producedQty} of ${wo.totalQty} produced`}
                        >
                          <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                        {wo.rejectedQty > 0 && <p className="mt-0.5 text-[11px] font-medium text-rose-600">{wo.rejectedQty} rejected</p>}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={wo.status} tone={woTone(wo.status)} label={rejected ? "QC Rejected" : wo.status} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rejected && (
                            <Link href="/dashboard/production/rework" className={buttonClass("warn", "sm")}>
                              <Wrench size={12} /> Fix
                            </Link>
                          )}
                          <Link href={href} className={buttonClass("secondary", "sm", "lg:opacity-75 lg:group-hover:opacity-100")}>
                            Open <ArrowRight size={12} />
                          </Link>
                        </div>
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
          <span className="font-medium tabular-nums text-slate-600">{rows.length}</span> work orders
          {truncatedAt && <> · only the latest {truncatedAt} are loaded</>}
        </p>
      )}
    </div>
  );
}
