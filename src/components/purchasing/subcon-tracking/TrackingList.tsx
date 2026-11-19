"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, SearchX, Edit2, Eye, Send, Ban } from "lucide-react";
import { EmptyState, InitialsAvatar, StatusBadge, buttonClass } from "@/components/form-ui";
import {
  Breadcrumb,
  ErrorBlock,
  LoadingBlock,
  SearchBar,
  SelectionBar,
  StatusTiles,
  Toast,
  ToolbarBtn,
  fmtDate,
} from "@/components/purchasing/DocListParts";
import { TRACKING_KINDS, TRACKING_STATUS_TONE, type TrackingKind } from "./kinds";

const STATUS_TABS = ["All", "Draft", "Submitted", "Void"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

type PendingAction = "Submitted" | "Void";

/** List screen shared by Subcon Return Tracking and Subcon Reject Tracking. */
export default function TrackingList({ kind }: { kind: TrackingKind }) {
  const cfg = TRACKING_KINDS[kind];
  const Icon = cfg.icon;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allRows, setAllRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const toastParam = searchParams.get("toast");
  useEffect(() => {
    if (!toastParam) return;
    if (toastParam === "updated") setToast(`${cfg.noun} updated successfully.`);
    else if (toastParam === "created") setToast(`${cfg.noun} created successfully.`);
    const t = setTimeout(() => setToast(null), 4000);
    router.replace(cfg.base);
    return () => clearTimeout(t);
  }, [toastParam, router, cfg]);

  // Debounce the server-side search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // The API has no status filter; the tabs filter the loaded rows.
  const fetchRows = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${cfg.api}?search=${encodeURIComponent(debouncedSearch)}`);
      if (!res.ok) throw new Error(`Failed to fetch ${cfg.noun.toLowerCase()} records`);
      setAllRows(await res.json());
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [debouncedSearch, kind]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: allRows.length };
    for (const r of allRows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [allRows]);

  const rows = useMemo(() => (tab === "All" ? allRows : allRows.filter((r) => r.status === tab)), [allRows, tab]);
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);

  const hasFilters = search.trim() !== "" || tab !== "All";
  const clearFilters = () => {
    setSearch("");
    setTab("All");
  };

  async function changeStatus(status: PendingAction) {
    if (!selected) return;
    const target = selected;
    const no = target[cfg.noField];
    const msg =
      status === "Submitted" ? `Submit ${cfg.noun} ${no}?` : `Void ${cfg.noun} ${no}? This can't be undone.`;
    if (!await customConfirm(msg)) return;
    setPendingAction(status);
    try {
      const res = await fetch(`${cfg.api}/${target.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        hotToast.error(err.error || `Failed to change status to ${status}`);
        return;
      }
      hotToast.success(status === "Submitted" ? `${no} submitted` : `${no} is now Void`);
      setSelectedId(null);
      fetchRows();
    } finally {
      setPendingAction(null);
    }
  }

  const actionLoading = pendingAction !== null;
  const firstLoad = loading && allRows.length === 0;

  return (
    <div className="relative space-y-4">
      {toast && <Toast message={toast} />}

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm sm:inline-flex ${cfg.headerGradient}`}>
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <Breadcrumb current={cfg.noun} />
            <h1 className="text-lg font-semibold leading-tight text-slate-900">{cfg.noun}</h1>
            <p className="text-xs text-slate-500">{cfg.subtitle}</p>
          </div>
        </div>
        <Link href={`${cfg.base}/new`} className={buttonClass("primary", "md")}>
          <Plus size={14} /> New Tracking
        </Link>
      </div>

      <StatusTiles
        tabs={STATUS_TABS}
        tab={tab}
        onTab={setTab}
        count={(t) => (firstLoad ? null : counts[t] ?? 0)}
        label={(t) => (t === "All" ? "All trackings" : t)}
        tone={(t) => (t === "All" ? "indigo" : TRACKING_STATUS_TONE[t] ?? "slate")}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={`Search by ${cfg.short} No, PO No or SRF No...`}
          refreshing={loading && allRows.length > 0}
          hasFilters={hasFilters}
          onClear={clearFilters}
        />

        <SelectionBar selectedLabel={selected?.[cfg.noField]} onClear={() => setSelectedId(null)} hint="Select a tracking to act on it">
          <ToolbarBtn
            icon={selected && selected.status !== "Draft" ? <Eye size={12} /> : <Edit2 size={12} />}
            label={selected && selected.status !== "Draft" ? "View" : "Edit"}
            onClick={() => selected && router.push(`${cfg.base}/${selected.id}`)}
            disabled={!selected || actionLoading}
          />
          <ToolbarBtn
            icon={<Ban size={12} />}
            label="Void"
            onClick={() => changeStatus("Void")}
            disabled={!selected || selected.status === "Void" || actionLoading}
            spinning={pendingAction === "Void"}
            variant="danger"
          />
          <span className="mx-0.5 hidden h-4 w-px bg-slate-200 sm:inline-block" />
          <ToolbarBtn
            icon={<Send size={12} />}
            label="Submit"
            onClick={() => changeStatus("Submitted")}
            disabled={!selected || selected.status !== "Draft" || actionLoading}
            spinning={pendingAction === "Submitted"}
            variant="primary"
          />
        </SelectionBar>

        {firstLoad ? (
          <LoadingBlock label="Loading trackings..." />
        ) : errorMsg ? (
          <ErrorBlock message={errorMsg} />
        ) : rows.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No trackings match these filters"
              description="Try a different search term or status."
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={Icon}
              tone={cfg.tone}
              title={`No ${cfg.noun.toLowerCase()} records yet.`}
              description={`Record quantities ${cfg.verbPast} against a Submitted Subcon Request Form.`}
              action={
                <Link href={`${cfg.base}/new`} className={buttonClass("primary", "md")}>
                  <Plus size={14} /> New Tracking
                </Link>
              }
            />
          )
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="w-8 py-2 pl-4 pr-1 font-medium"><span className="sr-only">Select</span></th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">{cfg.short} No</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Date</th>
                  <th className="px-3 py-2 font-medium">Supplier</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">PO No</th>
                  <th className="px-3 py-2 font-medium">SRF No</th>
                  <th className="px-3 py-2 text-right font-medium">{cfg.qtyLabel}</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Company</th>
                  <th className="px-4 py-2 text-right font-medium print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const isSelected = selectedId === r.id;
                  const href = `${cfg.base}/${r.id}`;
                  const editable = r.status === "Draft";
                  const supplier = r.supplierName || "";
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(isSelected ? null : r.id)}
                      aria-selected={isSelected}
                      className={`group cursor-pointer transition-colors ${isSelected ? "bg-indigo-50/70" : "hover:bg-indigo-50/40"}`}
                    >
                      <td className="py-2 pl-4 pr-1">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedId(r.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${r[cfg.noField]}`}
                          className="h-3.5 w-3.5 accent-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} tone={TRACKING_STATUS_TONE[r.status] ?? "slate"} />
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {r[cfg.noField]}
                        </Link>
                      </td>
                      <td className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell">{fmtDate(r[cfg.dateField])}</td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[150px] items-center gap-2 sm:max-w-[220px]" title={supplier}>
                          <InitialsAvatar name={supplier} />
                          <span className="truncate font-medium text-slate-800">{supplier || "—"}</span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 font-mono text-xs text-slate-600 md:table-cell">{r.poNo || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.srfNo || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-semibold tabular-nums text-slate-900">{Number(r[cfg.qtyField])}</span>
                        {r.uom && r.uom !== "—" && <span className="ml-1 text-[11px] text-slate-400">{r.uom}</span>}
                      </td>
                      <td className="hidden max-w-[180px] truncate px-3 py-2 text-slate-600 xl:table-cell">{r.companyName}</td>
                      <td className="px-4 py-2 text-right print:hidden">
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

      {!errorMsg && rows.length > 0 && (
        <p className="px-1 text-[11px] text-slate-400">
          Showing <span className="font-medium tabular-nums text-slate-600">{rows.length}</span> of{" "}
          <span className="font-medium tabular-nums text-slate-600">{allRows.length}</span> trackings
        </p>
      )}
    </div>
  );
}
