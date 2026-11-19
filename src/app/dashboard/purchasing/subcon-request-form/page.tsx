"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, SearchX, Edit2, Eye, ClipboardList, Send, Ban, Printer } from "lucide-react";
import { Badge, EmptyState, InitialsAvatar, StatusBadge, buttonClass } from "@/components/form-ui";
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
import { SRF_RECEIVE_TONE, SRF_TONE } from "./SrfParts";

const STATUS_TABS = ["All", "Draft", "Submitted", "Void"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

type PendingAction = "submit" | "void";

export default function SubconRequestFormListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  // Status counts from the last "All" load for the current search, so the tiles keep their
  // numbers while a single-status tab is open (the API filters by status server-side).
  const [allCounts, setAllCounts] = useState<{ key: string; counts: Record<string, number> } | null>(null);

  const toastParam = searchParams.get("toast");
  useEffect(() => {
    if (!toastParam) return;
    if (toastParam === "updated") setToast("Subcon Request Form updated successfully.");
    else if (toastParam === "created") setToast("Subcon Request Form created successfully.");
    const t = setTimeout(() => setToast(null), 4000);
    router.replace("/dashboard/purchasing/subcon-request-form");
    return () => clearTimeout(t);
  }, [toastParam, router]);

  // Debounce the server-side search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const fetchRows = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(
        `/api/purchasing/subcon-request-form?search=${encodeURIComponent(debouncedSearch)}&status=${tab}`
      );
      if (!res.ok) throw new Error("Failed to fetch subcon request forms");
      setRows(await res.json());
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [debouncedSearch, tab]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  if (tab === "All" && !loading && !errorMsg && allCounts?.counts !== counts) {
    setAllCounts({ key: debouncedSearch, counts });
  }

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);

  const hasFilters = search.trim() !== "" || tab !== "All";
  const clearFilters = () => {
    setSearch("");
    setTab("All");
  };

  async function callAction(action: PendingAction) {
    if (!selected) return;
    const target = selected;
    setPendingAction(action);
    try {
      const res = await fetch(`/api/purchasing/subcon-request-form/${target.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        hotToast.error(err.error || `Failed: ${action}`);
        return;
      }
      hotToast.success(action === "submit" ? `${target.srfNo} submitted` : `${target.srfNo} is now Void`);
      setSelectedId(null);
      fetchRows();
    } finally {
      setPendingAction(null);
    }
  }

  async function onSubmit() {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be Submitted");
    if (!await customConfirm(`Submit Subcon Request Form ${selected.srfNo}?`)) return;
    callAction("submit");
  }

  async function onVoid() {
    if (!selected) return;
    if (selected.status === "Void") return hotToast.error("Already voided");
    if (!await customConfirm(`Void Subcon Request Form ${selected.srfNo}? Its quantity goes back to the PO line.`)) return;
    callAction("void");
  }

  function onEdit() {
    if (selected) router.push(`/dashboard/purchasing/subcon-request-form/${selected.id}`);
  }

  function onPrint() {
    if (selected) window.open(`/print/subcon-request-form/${selected.id}`, "_blank");
  }

  const actionLoading = pendingAction !== null;
  const firstLoad = loading && rows.length === 0;
  const cachedCounts = allCounts && allCounts.key === debouncedSearch ? allCounts.counts : null;
  const tileCount = (key: StatusTab): number | null => {
    if (firstLoad) return null;
    if (key === tab && !loading && !errorMsg) return counts.All;
    return cachedCounts ? cachedCounts[key] ?? 0 : null;
  };

  return (
    <div className="relative space-y-4">
      {toast && <Toast message={toast} />}

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 sm:inline-flex">
            <ClipboardList size={18} />
          </span>
          <div className="min-w-0">
            <Breadcrumb current="Subcon Request Form" />
            <h1 className="text-lg font-semibold leading-tight text-slate-900">Subcon Request Form</h1>
            <p className="text-xs text-slate-500">Delivery notes for items handed over to subcontractors against an Issued PO-Subcon.</p>
          </div>
        </div>
        <Link href="/dashboard/purchasing/subcon-request-form/new" className={buttonClass("primary", "md")}>
          <Plus size={14} /> New Form
        </Link>
      </div>

      <StatusTiles
        tabs={STATUS_TABS}
        tab={tab}
        onTab={setTab}
        count={tileCount}
        label={(t) => (t === "All" ? "All forms" : t)}
        tone={(t) => (t === "All" ? "indigo" : SRF_TONE[t] ?? "slate")}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by SRF No, PO No, Supplier, Company, Description or Remark..."
          refreshing={loading && rows.length > 0}
          hasFilters={hasFilters}
          onClear={clearFilters}
        />

        <SelectionBar selectedLabel={selected?.srfNo} onClear={() => setSelectedId(null)} hint="Select a form to act on it">
          <ToolbarBtn
            icon={selected && selected.status !== "Draft" ? <Eye size={12} /> : <Edit2 size={12} />}
            label={selected && selected.status !== "Draft" ? "View" : "Edit"}
            onClick={onEdit}
            disabled={!selected || actionLoading}
          />
          <ToolbarBtn
            icon={<Ban size={12} />}
            label="Void"
            onClick={onVoid}
            disabled={!selected || selected.status === "Void" || actionLoading}
            spinning={pendingAction === "void"}
            variant="danger"
          />
          <ToolbarBtn icon={<Printer size={12} />} label="Print" onClick={onPrint} disabled={!selected || actionLoading} />
          <span className="mx-0.5 hidden h-4 w-px bg-slate-200 sm:inline-block" />
          <ToolbarBtn
            icon={<Send size={12} />}
            label="Submit"
            onClick={onSubmit}
            disabled={!selected || selected.status !== "Draft" || actionLoading}
            spinning={pendingAction === "submit"}
            variant="primary"
          />
        </SelectionBar>

        {firstLoad ? (
          <LoadingBlock label="Loading forms..." />
        ) : errorMsg ? (
          <ErrorBlock message={errorMsg} />
        ) : rows.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No request forms match these filters"
              description="Try a different search term or status."
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              tone="indigo"
              title="No subcon request forms yet."
              description="Create one for each batch of items handed over to a subcontractor on an Issued PO-Subcon."
              action={
                <Link href="/dashboard/purchasing/subcon-request-form/new" className={buttonClass("primary", "md")}>
                  <Plus size={14} /> New Form
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
                  <th className="px-3 py-2 font-medium">SRF No</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Date</th>
                  <th className="px-3 py-2 font-medium">Supplier</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">PO No</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Part Description</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Returned</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Company</th>
                  <th className="px-4 py-2 text-right font-medium print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const isSelected = selectedId === r.id;
                  const href = `/dashboard/purchasing/subcon-request-form/${r.id}`;
                  const editable = r.status === "Draft";
                  const po = r.purchaseOrderItem?.purchaseOrder;
                  const supplier = po?.supplier?.supplierName || "";
                  const receive: string = r.receiveStatus || "N/A";
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
                          aria-label={`Select ${r.srfNo}`}
                          className="h-3.5 w-3.5 accent-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} tone={SRF_TONE[r.status] ?? "slate"} />
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {r.srfNo}
                        </Link>
                      </td>
                      <td className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell">{fmtDate(r.srfDate)}</td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[150px] items-center gap-2 sm:max-w-[220px]" title={supplier}>
                          <InitialsAvatar name={supplier} />
                          <span className="truncate font-medium text-slate-800">{supplier || "—"}</span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 font-mono text-xs text-slate-600 md:table-cell">{po?.poNo || "—"}</td>
                      <td className="hidden max-w-[240px] px-3 py-2 text-slate-600 lg:table-cell">
                        <p className="truncate" title={r.purchaseOrderItem?.description || ""}>{r.purchaseOrderItem?.description || "—"}</p>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-semibold tabular-nums text-slate-900">{Number(r.quantity)}</span>
                        <span className="ml-1 text-[11px] text-slate-400">{r.purchaseOrderItem?.poUom?.uomName}</span>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <Badge tone={SRF_RECEIVE_TONE[receive] ?? "slate"} dot>
                          {receive === "N/A" ? "Not yet" : receive}
                        </Badge>
                      </td>
                      <td className="hidden max-w-[180px] truncate px-3 py-2 text-slate-600 xl:table-cell">{po?.company?.companyName}</td>
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
          Showing <span className="font-medium tabular-nums text-slate-600">{rows.length}</span> request form
          {rows.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
