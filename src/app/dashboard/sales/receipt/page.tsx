/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { toast as hotToast } from "react-hot-toast";
import { customConfirm } from "@/lib/customConfirm";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  SearchX,
  Loader2,
  Edit2,
  Eye,
  AlertCircle,
  Banknote,
  CheckCircle2,
  Ban,
  Printer,
  MousePointerClick,
  X,
} from "lucide-react";
import {
  Badge,
  EmptyState,
  InitialsAvatar,
  StatusBadge,
  TONES,
  buttonClass,
  type Tone,
} from "@/components/form-ui";
import { getReceipts, transitionReceiptAction } from "./receipt.actions";
import {
  RC_STATUSES,
  emeraldButtonClass,
  formatAmount,
  normalizeReceiptStatus,
  paymentMethodMeta,
  receiptStatusTone,
  relativeDate,
} from "./rc-status";

type StatusTab = "All" | (typeof RC_STATUSES)[number];

type PendingAction = "confirm" | "void";

type Receipt = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  status: string;
  paymentMethod: string;
  amountReceived: string | number;
  chequeRefNo: string | null;
  customer?: { customerName: string };
  invoice?: { invoiceNo: string };
  currency?: { code: string };
};

export default function ReceiptListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const actionLoading = pendingAction !== null;

  const toastParam = searchParams.get("toast");
  useEffect(() => {
    if (!toastParam) return;
    if (toastParam === "updated") hotToast.success("Receipt updated successfully.", { id: "receipt-saved", duration: 4000 });
    else if (toastParam === "created") hotToast.success("Receipt created successfully.", { id: "receipt-saved", duration: 4000 });
    router.replace("/dashboard/sales/receipt");
  }, [toastParam, router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const fetchRows = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await getReceipts();
      if (!res.success) throw new Error(res.error || "Failed to fetch receipts");
      setRows(res.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const searchedRows = useMemo(() => {
    const s = debouncedSearch;
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.receiptNo.toLowerCase().includes(s) ||
        r.customer?.customerName?.toLowerCase().includes(s) ||
        r.invoice?.invoiceNo?.toLowerCase().includes(s) ||
        r.paymentMethod.toLowerCase().includes(s),
    );
  }, [rows, debouncedSearch]);

  const filteredRows = useMemo(
    () => searchedRows.filter((r) => tab === "All" || normalizeReceiptStatus(r.status) === tab),
    [searchedRows, tab],
  );

  // Tile counts follow the search so they add up to what's visible.
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: searchedRows.length };
    for (const s of RC_STATUSES) c[s] = 0;
    for (const r of searchedRows) {
      const s = normalizeReceiptStatus(r.status);
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [searchedRows]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const r of searchedRows) {
      const s = normalizeReceiptStatus(r.status);
      if (s === "Void") continue;
      const key = `${s}|${r.currency?.code || ""}`;
      t[key] = (t[key] ?? 0) + (Number(r.amountReceived) || 0);
    }
    return t;
  }, [searchedRows]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId],
  );

  const hasFilters = search.trim() !== "" || tab !== "All";
  const clearFilters = () => {
    setSearch("");
    setTab("All");
  };

  const patchRow = (id: string, patch: Partial<Receipt>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function onConfirm() {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be Confirmed");
    if (!await customConfirm(`Confirm receipt ${selected.receiptNo}?`)) return;

    const target = selected;
    setPendingAction("confirm");
    try {
      const res = await transitionReceiptAction(target.id, "confirm");
      if (!res.success) throw new Error(res.error || "Failed to confirm");
      patchRow(target.id, { status: "Confirmed" });
      hotToast.success(`${target.receiptNo} confirmed`);
    } catch (err: any) {
      hotToast.error(err?.message || "Failed to confirm");
    } finally {
      setPendingAction(null);
    }
  }

  async function onVoid() {
    if (!selected) return;
    if (selected.status === "Void") return hotToast.error("Already Voided");
    const voidPrompt =
      selected.status === "Draft"
        ? `Void draft receipt ${selected.receiptNo}? It was never applied to the invoice; the number stays used.`
        : `Void receipt ${selected.receiptNo}? Its amount will be taken off the invoice.`;
    if (!await customConfirm(voidPrompt)) return;

    const target = selected;
    setPendingAction("void");
    try {
      const res = await transitionReceiptAction(target.id, "void");
      if (!res.success) throw new Error(res.error || "Failed to void");
      patchRow(target.id, { status: "Void" });
      hotToast.success(`${target.receiptNo} is now Void`);
    } catch (err: any) {
      hotToast.error(err?.message || "Failed to void");
    } finally {
      setPendingAction(null);
    }
  }

  function onEdit() {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be edited");
    router.push(`/dashboard/sales/receipt/form?id=${selected.id}`);
  }

  function onPrint() {
    if (!selected) return;
    if (selected.status !== "Confirmed") return hotToast.error("Only Confirmed receipts can be printed");
    window.open(`/print/receipt/${selected.id}`, "_blank");
  }

  const tiles: { key: StatusTab; label: string; tone: Tone }[] = [
    { key: "All", label: "All receipts", tone: "indigo" },
    ...RC_STATUSES.map((s) => ({ key: s as StatusTab, label: s, tone: receiptStatusTone(s) })),
  ];

  const tileTotal = (key: StatusTab): string | null => {
    const parts = Object.entries(totals)
      .filter(([k]) => (key === "All" ? true : k.startsWith(`${key}|`)))
      .reduce<Record<string, number>>((acc, [k, v]) => {
        const code = k.split("|")[1];
        acc[code] = (acc[code] ?? 0) + v;
        return acc;
      }, {});
    const entries = Object.entries(parts);
    if (entries.length === 0) return null;
    return entries.map(([code, v]) => `${code} ${formatAmount(v)}`.trim()).join(" · ");
  };

  const sel = selected;
  const can = {
    edit: !!sel && sel.status === "Draft",
    confirm: !!sel && sel.status === "Draft",
    void: !!sel && sel.status !== "Void",
    print: !!sel && sel.status === "Confirmed",
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/20 sm:inline-flex">
            <Banknote size={18} />
          </span>
          <div className="min-w-0">
            <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span>Sales</span>
              <span>/</span>
              <span className="text-slate-500">Receipt / Payment Record</span>
            </nav>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">Receipts</h1>
            <p className="text-xs text-slate-500">Record payments received from customers.</p>
          </div>
        </div>

        <Link href="/dashboard/sales/receipt/form" className={emeraldButtonClass}>
          <Plus size={14} /> New Receipt
        </Link>
      </div>

      {/* Status summary tiles (also the status filter) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Filter by status">
        {tiles.map(({ key, label, tone }) => {
          const active = tab === key;
          const count = loading && rows.length === 0 ? null : counts[key] ?? 0;
          const total = key === "Void" ? null : tileTotal(key);
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={`relative flex min-w-0 flex-col items-start overflow-hidden rounded-lg border px-3 py-2 pl-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                active
                  ? "border-indigo-300 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500/15"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className={`absolute inset-y-0 left-0 w-[3px] ${TONES[tone].bar}`} />
              <span className={`flex w-full items-center gap-1.5 truncate text-[11px] font-medium ${active ? "text-indigo-700" : "text-slate-500"}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONES[tone].dot}`} />
                <span className="truncate">{label}</span>
              </span>
              <span className={`text-base font-semibold leading-tight tabular-nums ${active ? "text-indigo-900" : "text-slate-900"} ${count === 0 ? "opacity-40" : ""}`}>
                {count === null ? "–" : count}
              </span>
              {total && (
                <span className="w-full truncate text-[11px] font-medium tabular-nums text-emerald-700" title={key === "All" ? "Excludes void receipts" : undefined}>
                  {total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Card: search + actions + table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2.5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Receipt No, Customer, or Invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {loading && rows.length > 0 && <Loader2 size={14} className="animate-spin text-indigo-500" aria-label="Refreshing" />}
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={buttonClass("ghost", "sm")}>
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Contextual action bar for the selected receipt */}
        <div
          className={`flex flex-col gap-2 border-b px-4 py-2 transition-colors sm:flex-row sm:items-center ${
            selected ? "border-indigo-100 bg-indigo-50/50" : "border-slate-100 bg-slate-50/50"
          }`}
        >
          <div className="flex min-w-0 shrink-0 items-center gap-2 text-xs">
            {selected ? (
              <>
                <span className="text-slate-500">Selected</span>
                <span className="truncate font-mono font-semibold text-indigo-700">{selected.receiptNo}</span>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-600"
                  title="Clear selection"
                  aria-label="Clear selection"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <MousePointerClick size={13} /> Select a receipt to act on it
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
            <ToolbarBtn icon={<Edit2 size={12} />} label="Edit" onClick={onEdit} disabled={!can.edit || actionLoading} />
            <ToolbarBtn icon={<CheckCircle2 size={12} />} label="Confirm" onClick={onConfirm} disabled={!can.confirm || actionLoading} spinning={pendingAction === "confirm"} variant="success" />
            <ToolbarBtn icon={<Ban size={12} />} label="Void" onClick={onVoid} disabled={!can.void || actionLoading} spinning={pendingAction === "void"} variant="danger" />
            <span className="mx-0.5 hidden h-4 w-px bg-slate-200 sm:inline-block" />
            <ToolbarBtn icon={<Printer size={12} />} label="Print" onClick={onPrint} disabled={!can.print || actionLoading} />
          </div>
        </div>

        {/* Table area */}
        {loading && rows.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-emerald-600" />
            <p className="text-xs text-slate-500">Loading receipts…</p>
          </div>
        ) : errorMsg ? (
          <div className="m-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            <AlertCircle size={14} />
            <p className="font-medium">{errorMsg}</p>
          </div>
        ) : filteredRows.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No receipts match these filters"
              description="Try a different search term or status."
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={Banknote}
              tone="emerald"
              title="No receipts found."
              description='Click "New Receipt" to record a payment.'
              action={
                <Link href="/dashboard/sales/receipt/form" className={emeraldButtonClass}>
                  <Plus size={14} /> New Receipt
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
                  <th className="px-3 py-2 font-medium">Receipt No</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Date</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Invoice No</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Method</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Ref No</th>
                  <th className="px-3 py-2 text-right font-medium">Amount Received</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r) => {
                  const isSelected = selectedId === r.id;
                  const status = normalizeReceiptStatus(r.status);
                  const customerName = r.customer?.customerName || "";
                  const method = paymentMethodMeta(r.paymentMethod);
                  const isVoid = status === "Void";
                  const isDraft = r.status === "Draft";
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                      aria-selected={isSelected}
                      className={`group cursor-pointer transition-colors ${isSelected ? "bg-emerald-50/70" : "hover:bg-emerald-50/40"}`}
                    >
                      <td className="py-2 pl-4 pr-1">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedId(r.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${r.receiptNo}`}
                          className="h-3.5 w-3.5 accent-emerald-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/dashboard/sales/receipt/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {r.receiptNo}
                        </Link>
                        <div className="text-[11px] text-slate-400 md:hidden">
                          {r.invoice?.invoiceNo ? <span className="font-mono">{r.invoice.invoiceNo}</span> : "—"}
                          <span className="sm:hidden"> · {relativeDate(r.receiptDate)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[140px] items-center gap-2 sm:max-w-[220px]">
                          <InitialsAvatar name={customerName} />
                          <span className="truncate font-medium text-slate-800">{customerName || "—"}</span>
                        </div>
                      </td>
                      <td
                        className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell"
                        title={new Date(r.receiptDate).toLocaleDateString()}
                      >
                        {relativeDate(r.receiptDate)}
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        {r.invoice?.invoiceNo ? (
                          <span className="font-mono text-xs text-slate-600">{r.invoice.invoiceNo}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="hidden px-3 py-2 lg:table-cell">
                        <Badge tone={method.tone} icon={method.icon}>{r.paymentMethod}</Badge>
                      </td>
                      <td className="hidden px-3 py-2 font-mono text-xs text-slate-600 lg:table-cell">{r.chequeRefNo || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="mr-1 text-[11px] text-slate-400">{r.currency?.code}</span>
                        <span className={`font-semibold tabular-nums ${isVoid ? "text-slate-400 line-through" : "text-emerald-700"}`}>
                          {Number(r.amountReceived).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={status} tone={receiptStatusTone(r.status)} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={isDraft ? `/dashboard/sales/receipt/form?id=${r.id}` : `/dashboard/sales/receipt/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={buttonClass("secondary", "sm", "lg:opacity-75 lg:group-hover:opacity-100")}
                        >
                          {isDraft ? <Edit2 size={12} /> : <Eye size={12} />}
                          {isDraft ? "Edit" : "View"}
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

      {!errorMsg && filteredRows.length > 0 && (
        <p className="px-1 text-[11px] text-slate-400">
          Showing <span className="font-medium tabular-nums text-slate-600">{filteredRows.length}</span> of{" "}
          <span className="font-medium tabular-nums text-slate-600">{rows.length}</span> receipts
        </p>
      )}
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  onClick,
  disabled,
  spinning,
  variant = "secondary",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
  variant?: "secondary" | "primary" | "danger" | "warn" | "success";
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={buttonClass(variant, "sm")}>
      {spinning ? <Loader2 size={12} className="animate-spin" /> : icon} {label}
    </button>
  );
}
