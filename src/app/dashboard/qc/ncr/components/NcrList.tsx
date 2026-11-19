"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, SearchX, Edit2, Eye, Printer, FileWarning } from "lucide-react";
import { EmptyState, InitialsAvatar, StatusBadge, buttonClass } from "@/components/form-ui";
import { Breadcrumb, SearchBar, SelectionBar, StatusTiles, ToolbarBtn, fmtDate } from "@/components/purchasing/DocListParts";
import { NCR_STATUS_TONE } from "./NcrForm";

const STATUS_TABS = ["All", "Draft", "Closed", "Void"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

/** Disposition split, in a fixed order. */
const DISPOSITIONS = [
  { key: "reworkQuantity", label: "Rework" },
  { key: "useAsIsQuantity", label: "Use-as-is" },
  { key: "scrapQuantity", label: "Scrap" },
  { key: "otherQuantity", label: "Other" },
] as const;

export default function NcrList({ ncrs }: { ncrs: any[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // The list is loaded once on the server; search and status filter it here.
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ncrs;
    return ncrs.filter((n) =>
      [
        n.ncrNo,
        n.CustomerProfile?.customerName,
        n.WorkOrder?.workOrderNo,
        n.descriptionOfNonConformance,
        n.RoutingProcess?.routingProcess?.routingProcess,
        n.Employee_Ncr_requestorIdToEmployee?.name,
      ].some((v) => v && String(v).toLowerCase().includes(q)),
    );
  }, [ncrs, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: searched.length };
    for (const n of searched) c[n.status] = (c[n.status] ?? 0) + 1;
    return c;
  }, [searched]);

  const rows = tab === "All" ? searched : searched.filter((n) => n.status === tab);
  const selected = rows.find((n) => n.id === selectedId) || null;
  const hasFilters = search.trim() !== "" || tab !== "All";
  const clearFilters = () => {
    setSearch("");
    setTab("All");
  };

  return (
    <div className="relative space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-600/20 sm:inline-flex">
            <FileWarning size={18} />
          </span>
          <div className="min-w-0">
            <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span>QC</span>
              <span>/</span>
              <span className="text-slate-500">NCR</span>
            </nav>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">Non-Conformance Reports</h1>
            <p className="text-xs text-slate-500">Rejected quantities from a routing process, their disposition and corrective actions.</p>
          </div>
        </div>
        <Link href="/dashboard/qc/ncr/new" className={buttonClass("primary", "md")}>
          <Plus size={14} /> Create NCR
        </Link>
      </div>

      <StatusTiles
        tabs={STATUS_TABS}
        tab={tab}
        onTab={setTab}
        count={(t) => counts[t] ?? 0}
        label={(t) => (t === "All" ? "All NCRs" : t)}
        tone={(t) => (t === "All" ? "indigo" : NCR_STATUS_TONE[t] ?? "slate")}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by NCR No, Customer, Work Order, Process or Problem..."
          refreshing={false}
          hasFilters={hasFilters}
          onClear={clearFilters}
        />

        <SelectionBar selectedLabel={selected?.ncrNo} onClear={() => setSelectedId(null)} hint="Select an NCR to act on it">
          <ToolbarBtn
            icon={selected && selected.status !== "Draft" ? <Eye size={12} /> : <Edit2 size={12} />}
            label={selected && selected.status !== "Draft" ? "View" : "Edit"}
            onClick={() => selected && router.push(`/dashboard/qc/ncr/${selected.id}`)}
            disabled={!selected}
          />
          <ToolbarBtn
            icon={<Printer size={12} />}
            label="Print"
            onClick={() => selected && window.open(`/print/ncr/${selected.id}`, "_blank")}
            disabled={!selected}
          />
        </SelectionBar>

        {rows.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No NCRs match these filters"
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={FileWarning}
              tone="rose"
              title="No NCRs yet."
              description="Raise an NCR when a routing process rejects quantity."
              action={
                <Link href="/dashboard/qc/ncr/new" className={buttonClass("primary", "md")}>
                  <Plus size={14} /> Create NCR
                </Link>
              }
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="w-8 py-2 pl-4 pr-1 font-medium"><span className="sr-only">Select</span></th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">NCR No</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Date</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Work Order · Process</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Problem</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Requestor</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((n) => {
                  const isSelected = selectedId === n.id;
                  const href = `/dashboard/qc/ncr/${n.id}`;
                  const editable = n.status === "Draft";
                  const customer = n.CustomerProfile?.customerName || "";
                  const step = n.RoutingProcess?.routingProcess?.routingProcess;
                  const split = DISPOSITIONS.filter((d) => Number(n[d.key]) > 0)
                    .map((d) => `${d.label} ${n[d.key]}`)
                    .join(" · ");
                  const failureModes = (n.NcrFailureMode ?? []).map((f: any) => f.FailureModeProfile?.failureMode).filter(Boolean);
                  return (
                    <tr
                      key={n.id}
                      onClick={() => setSelectedId(isSelected ? null : n.id)}
                      aria-selected={isSelected}
                      className={`group cursor-pointer align-top transition-colors ${isSelected ? "bg-indigo-50/70" : "hover:bg-indigo-50/40"}`}
                    >
                      <td className="py-2 pl-4 pr-1">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedId(n.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${n.ncrNo}`}
                          className="h-3.5 w-3.5 accent-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={n.status} tone={NCR_STATUS_TONE[n.status] ?? "slate"} />
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {n.ncrNo}
                        </Link>
                      </td>
                      <td className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell">{fmtDate(n.ncrDate)}</td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[200px] items-center gap-2" title={customer}>
                          <InitialsAvatar name={customer} />
                          <span className="truncate font-medium text-slate-800">{customer || "—"}</span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <p className="font-mono text-xs text-slate-700">{n.WorkOrder?.workOrderNo}</p>
                        <p className="text-[11px] text-slate-400">
                          {[n.MainProcess?.process, step].filter(Boolean).join(" · ") || "No process set"}
                        </p>
                      </td>
                      <td className="hidden max-w-[260px] px-3 py-2 xl:table-cell">
                        <p className="truncate text-slate-700" title={n.descriptionOfNonConformance}>{n.descriptionOfNonConformance}</p>
                        {failureModes.length > 0 && (
                          <p className="truncate text-[11px] text-slate-400" title={failureModes.join(", ")}>{failureModes.join(", ")}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <p className="font-semibold tabular-nums text-slate-900">{n.ncrQuantity}</p>
                        {split && <p className="whitespace-nowrap text-[11px] text-slate-400">{split}</p>}
                      </td>
                      <td className="hidden px-3 py-2 text-slate-600 lg:table-cell">{n.Employee_Ncr_requestorIdToEmployee?.name || "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className={buttonClass("secondary", "sm", "lg:opacity-75 lg:group-hover:opacity-100")}
                        >
                          {editable ? <Edit2 size={12} /> : <Eye size={12} />}
                          {editable ? "Edit" : "View"}
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

      {rows.length > 0 && (
        <p className="px-1 text-[11px] text-slate-400">
          Showing <span className="font-medium tabular-nums text-slate-600">{rows.length}</span> of{" "}
          <span className="font-medium tabular-nums text-slate-600">{ncrs.length}</span> NCRs
        </p>
      )}
    </div>
  );
}
