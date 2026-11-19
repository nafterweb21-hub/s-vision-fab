"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { FileCheck, Plus, Printer, SearchX } from "lucide-react";
import { Badge, EmptyState, InitialsAvatar, StatusBadge, TONES, buttonClass } from "@/components/form-ui";
import { SearchBar } from "@/components/purchasing/DocListParts";
import { COC_TYPES } from "@/lib/coc-types";
import { COC_STATUSES, COC_STATUS_TONE, COC_TYPE_TONE } from "./coc-status";

export type CocRow = {
  id: string;
  cocNo: string;
  date: string;
  type: string;
  status: string;
  customerName: string;
  doNo: string;
  doStatus: string;
  workOrderNo: string;
  description: string;
  quantity: number;
  uom: string;
  /** Welder or painter the COC is tied to. */
  person: string | null;
  checkedBy: string | null;
  approvedBy: string | null;
};

type StatusKey = "All" | (typeof COC_STATUSES)[number];
const TILES: { key: StatusKey; label: string; hint: string }[] = [
  { key: "All", label: "All COCs", hint: "" },
  { key: "Draft", label: "Draft", hint: "Editable; waiting to be checked" },
  { key: "Require Approval", label: "Require approval", hint: "Checked; waiting for approval" },
  { key: "Approved", label: "Approved", hint: "Counts toward the DO's COC requirement" },
];

const fmtDate = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

export default function CocList({ rows, capped }: { rows: CocRow[]; capped: boolean }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusKey>("All");
  const [type, setType] = useState<string>("All");

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (type !== "All" && r.type !== type) return false;
      if (!q) return true;
      return [r.cocNo, r.doNo, r.workOrderNo, r.customerName, r.description, r.person ?? ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, search, type]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: searched.length };
    for (const r of searched) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [searched]);

  const visible = status === "All" ? searched : searched.filter((r) => r.status === status);
  const hasFilters = search.trim() !== "" || status !== "All" || type !== "All";
  const clearFilters = () => {
    setSearch("");
    setStatus("All");
    setType("All");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/20 sm:inline-flex">
            <FileCheck size={18} />
          </span>
          <div className="min-w-0">
            <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span>QC</span>
              <span>/</span>
              <span className="text-slate-500">Certificate Of Conformity</span>
            </nav>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">Certificate Of Conformity</h1>
            <p className="text-xs text-slate-500">COCs for delivery orders with &quot;COC Required&quot;. Each needs one check and one approval before the DO can be submitted.</p>
          </div>
        </div>
        <Link href="/dashboard/qc/coc/form" className={buttonClass("primary", "md")}>
          <Plus size={14} /> New COC
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Filter by status">
        {TILES.map((t) => {
          const active = status === t.key;
          const n = counts[t.key] ?? 0;
          const tone = t.key === "All" ? "indigo" : COC_STATUS_TONE[t.key];
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatus(t.key)}
              title={t.hint || undefined}
              className={`relative flex min-w-0 flex-col items-start overflow-hidden rounded-lg border px-3 py-2 pl-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                active ? "border-indigo-300 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500/15" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className={`absolute inset-y-0 left-0 w-[3px] ${TONES[tone].bar}`} />
              <span className={`flex w-full items-center gap-1.5 truncate text-[11px] font-medium ${active ? "text-indigo-700" : "text-slate-500"}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONES[tone].dot}`} />
                <span className="truncate">{t.label}</span>
              </span>
              <span className={`text-base font-semibold leading-tight tabular-nums ${active ? "text-indigo-900" : "text-slate-900"} ${n === 0 ? "opacity-40" : ""}`}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by COC No, DO No, WO, Customer or Welder / Painter..." refreshing={false} hasFilters={hasFilters} onClear={clearFilters} />
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 py-2">
          <span className="mr-1 text-[11px] font-medium text-slate-500">Type</span>
          {["All", ...COC_TYPES].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`h-6 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                type === t ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No COCs match these filters"
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={FileCheck}
              tone="emerald"
              title="No certificates yet"
              description="Create a COC for a Draft delivery order that has COC Required ticked."
              action={
                <Link href="/dashboard/qc/coc/form" className={buttonClass("primary", "md")}>
                  <Plus size={14} /> New COC
                </Link>
              }
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-2 pl-4 pr-3 font-medium">COC No</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">DO · WO</th>
                  <th className="hidden px-3 py-2 text-right font-medium lg:table-cell">Qty</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Check · Approval</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((c) => {
                  const href = `/dashboard/qc/coc/form?id=${c.id}`;
                  return (
                    <tr key={c.id} className="group align-top transition-colors hover:bg-indigo-50/40">
                      <td className="py-2 pl-4 pr-3">
                        <Link href={href} className="whitespace-nowrap font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                          {c.cocNo}
                        </Link>
                        <p className="whitespace-nowrap text-[11px] text-slate-400">{fmtDate(c.date)}</p>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={COC_TYPE_TONE[c.type] ?? "slate"}>{c.type}</Badge>
                        {c.person && <p className="mt-0.5 max-w-[140px] truncate text-[11px] text-slate-500" title={c.person}>{c.person}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[200px] items-center gap-2" title={c.customerName}>
                          <InitialsAvatar name={c.customerName} />
                          <span className="truncate font-medium text-slate-800">{c.customerName}</span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <p className="whitespace-nowrap font-mono text-xs text-slate-700">
                          {c.doNo}
                          {c.doStatus && c.doStatus !== "Draft" && <span className="ml-1.5 font-sans text-[10px] font-medium uppercase text-slate-400">{c.doStatus}</span>}
                        </p>
                        <p className="max-w-[220px] truncate font-mono text-[11px] text-slate-400" title={c.description || c.workOrderNo}>{c.workOrderNo}</p>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-800 lg:table-cell">
                        {c.quantity}
                        <span className="ml-1 text-[10px] uppercase text-slate-400">{c.uom}</span>
                      </td>
                      <td className="hidden px-3 py-2 text-xs xl:table-cell">
                        <p className={c.checkedBy ? "text-slate-700" : "text-slate-300"}>{c.checkedBy ? `Checked · ${c.checkedBy}` : "Not checked"}</p>
                        <p className={c.approvedBy ? "text-slate-700" : "text-slate-300"}>{c.approvedBy ? `Approved · ${c.approvedBy}` : "Not approved"}</p>
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={c.status} tone={COC_STATUS_TONE[c.status] ?? "slate"} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <a href={`/print/coc/${c.id}`} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")} title="Print COC" aria-label={`Print ${c.cocNo}`}>
                            <Printer size={13} />
                          </a>
                          <Link href={href} className={buttonClass("secondary", "sm", "lg:opacity-75 lg:group-hover:opacity-100")}>
                            {c.status === "Draft" ? "Edit" : "View"}
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
          <span className="font-medium tabular-nums text-slate-600">{rows.length}</span> certificates
          {capped && " (latest 500)"}
        </p>
      )}
    </div>
  );
}
