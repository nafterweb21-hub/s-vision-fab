"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, SearchX, Edit2, Eye, PackageX, Send, Ban } from "lucide-react";
import { EmptyState, InitialsAvatar, StatusBadge, buttonClass, type Tone } from "@/components/form-ui";
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
import { submitGoodsReturn, voidGoodsReturn } from "./actions";

const STATUS_TABS = ["All", "Draft", "Submitted", "Void"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

/** Submitted is the final state of a return, so it reads as done (green). */
const RTN_TONE: Record<string, Tone> = { Draft: "amber", Submitted: "emerald", Void: "rose" };
const rtnTone = (s: string): Tone => RTN_TONE[s] ?? "slate";

type GoodsReturnRow = {
  id: string;
  rtnNo: string;
  rtnDate: string;
  status: string;
  remark: string | null;
  company: { companyName: string };
  supplier: { supplierName: string };
  purchaseOrder: { poNo: string };
  goodsReceive: { grNo: string };
  creator: { name: string };
};

type PendingAction = "submit" | "void";

export default function GoodsReturnListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<GoodsReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [allCounts, setAllCounts] = useState<{ key: string; counts: Record<string, number> } | null>(null);

  const toastParam = searchParams.get("toast");
  useEffect(() => {
    if (!toastParam) return;
    if (toastParam === "updated") setToast("Goods Return updated successfully.");
    else if (toastParam === "created") setToast("Goods Return created successfully.");
    const t = setTimeout(() => setToast(null), 4000);
    router.replace("/dashboard/purchasing/goods-return");
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
        `/api/purchasing/goods-return?search=${encodeURIComponent(debouncedSearch)}&status=${tab}`
      );
      if (!res.ok) throw new Error("Failed to fetch goods return records");
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

  // Remember the "All" counts so the tiles keep their numbers while a status tab is open.
  if (tab === "All" && !loading && !errorMsg && allCounts?.counts !== counts) {
    setAllCounts({ key: debouncedSearch, counts });
  }

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);

  const hasFilters = search.trim() !== "" || tab !== "All";
  const clearFilters = () => {
    setSearch("");
    setTab("All");
  };

  async function onSubmit() {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be Submitted");
    if (!await customConfirm(`Submit Goods Return ${selected.rtnNo}?`)) return;
    setPendingAction("submit");
    try {
      const res = await submitGoodsReturn(selected.id);
      if (!res.success) return hotToast.error(res.error || "Failed to submit");
      hotToast.success(`${selected.rtnNo} submitted`);
      setSelectedId(null);
      fetchRows();
    } finally {
      setPendingAction(null);
    }
  }

  async function onVoid() {
    if (!selected) return;
    if (selected.status === "Void") return hotToast.error("Already voided");
    if (!await customConfirm(`Void Goods Return ${selected.rtnNo}?`)) return;
    setPendingAction("void");
    try {
      const res = await voidGoodsReturn(selected.id);
      if (!res.success) return hotToast.error(res.error || "Failed to void");
      hotToast.success(`${selected.rtnNo} is now Void`);
      setSelectedId(null);
      fetchRows();
    } finally {
      setPendingAction(null);
    }
  }

  function onEdit() {
    if (!selected) return;
    router.push(`/dashboard/purchasing/goods-return/${selected.id}`);
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
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm shadow-rose-600/20 sm:inline-flex">
            <PackageX size={18} />
          </span>
          <div className="min-w-0">
            <Breadcrumb current="Goods Return" />
            <h1 className="text-lg font-semibold leading-tight text-slate-900">Goods Return</h1>
            <p className="text-xs text-slate-500">Return goods to suppliers against a submitted goods receive.</p>
          </div>
        </div>
        <Link href="/dashboard/purchasing/goods-return/new" className={buttonClass("primary", "md")}>
          <Plus size={14} /> New Goods Return
        </Link>
      </div>

      <StatusTiles
        tabs={STATUS_TABS}
        tab={tab}
        onTab={setTab}
        count={tileCount}
        label={(t) => (t === "All" ? "All returns" : t)}
        tone={(t) => (t === "All" ? "indigo" : rtnTone(t))}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by RTN No, Supplier, PO No, GR No..."
          refreshing={loading && rows.length > 0}
          hasFilters={hasFilters}
          onClear={clearFilters}
        />

        <SelectionBar selectedLabel={selected?.rtnNo} onClear={() => setSelectedId(null)} hint="Select a return to act on it">
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
          <LoadingBlock label="Loading returns..." />
        ) : errorMsg ? (
          <ErrorBlock message={errorMsg} />
        ) : rows.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No goods returns match these filters"
              description="Try a different search term or status."
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={PackageX}
              tone="rose"
              title="No goods returns yet."
              description="Return goods against a submitted goods receive; returned quantities reduce the PO's received quantity."
              action={
                <Link href="/dashboard/purchasing/goods-return/new" className={buttonClass("primary", "md")}>
                  <Plus size={14} /> New Goods Return
                </Link>
              }
            />
          )
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
            <table className="w-full whitespace-nowrap text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="w-8 py-2 pl-4 pr-1 font-medium"><span className="sr-only">Select</span></th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">RTN No</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">RTN Date</th>
                  <th className="px-3 py-2 font-medium">Supplier</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">PO No</th>
                  <th className="px-3 py-2 font-medium">GR No</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Company</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Creator</th>
                  <th className="hidden px-3 py-2 font-medium print:table-cell">Remark</th>
                  <th className="px-4 py-2 text-right font-medium print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const isSelected = selectedId === r.id;
                  const href = `/dashboard/purchasing/goods-return/${r.id}`;
                  const editable = r.status === "Draft";
                  const supplier = r.supplier?.supplierName || "";
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
                          aria-label={`Select ${r.rtnNo}`}
                          className="h-3.5 w-3.5 accent-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} tone={rtnTone(r.status)} />
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {r.rtnNo}
                        </Link>
                      </td>
                      <td className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell">{fmtDate(r.rtnDate)}</td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[150px] items-center gap-2 sm:max-w-[220px]" title={supplier}>
                          <InitialsAvatar name={supplier} />
                          <span className="truncate font-medium text-slate-800">{supplier || "—"}</span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 font-mono text-xs text-slate-600 md:table-cell">{r.purchaseOrder?.poNo || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.goodsReceive?.grNo || "—"}</td>
                      <td className="hidden max-w-[180px] truncate px-3 py-2 text-slate-600 lg:table-cell">{r.company?.companyName}</td>
                      <td className="hidden px-3 py-2 text-slate-600 lg:table-cell">{r.creator?.name}</td>
                      <td className="hidden max-w-[150px] truncate px-3 py-2 text-slate-600 print:table-cell print:whitespace-normal" title={r.remark || ""}>
                        {r.remark || "—"}
                      </td>
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
          Showing <span className="font-medium tabular-nums text-slate-600">{rows.length}</span> goods return
          {rows.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
