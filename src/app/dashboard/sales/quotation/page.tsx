/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRightCircle,
  Ban,
  Briefcase,
  CheckCircle2,
  Copy,
  Eye,
  GitBranch,
  History,
  Loader2,
  MousePointerClick,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  SearchX,
  Send,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  EmptyState,
  InitialsAvatar,
  StatusBadge,
  TONES,
  buttonClass,
  type ButtonVariant,
  type Tone,
} from "@/components/form-ui";
import {
  QT_STATUSES,
  canQtAction,
  isQtEditable,
  normalizeQtStatus,
  qtStatusTone,
  transitionQuotation,
  type QtAction,
  type QtStatus,
} from "./qt-status";

type StatusFilter = "All" | QtStatus;

type Quotation = {
  id: string;
  quotationNo: string;
  revision: number;
  date: string;
  status: string;
  title: string;
  refNo: string | null;
  subTotal: string | number;
  lumpSumDisc: string | number;
  taxAmount: string | number | null;
  totalAmount: string | number;
  termsAndConditions: string | null;
  customer?: { customerName: string };
  salesperson?: { name: string };
  currency?: { code: string };
  taxType?: { taxType: string; taxRate: number } | null;
};

type PendingAction = QtAction | "copy";

function dayDiff(d: Date): number {
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((a - b) / 86400000);
}

function relativeDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = dayDiff(d);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff === -1) return "Tomorrow";
  if (diff > 1 && diff < 7) return `${diff}d ago`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

function formatAmount(n: unknown): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchQuotations(search: string, status: string): Promise<Quotation[]> {
  const res = await fetch(`/api/sales/quotation?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`);
  if (!res.ok) throw new Error("Failed to fetch quotations");
  return res.json();
}

type LoadResult = { key: string; rows: Quotation[]; error: string };

export default function QuotationListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<StatusFilter>("All");
  const [result, setResult] = useState<LoadResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<Quotation[]>([]);
  const [historyTitle, setHistoryTitle] = useState("");

  const toastParam = searchParams.get("toast");
  useEffect(() => {
    if (!toastParam) return;
    if (toastParam === "updated") hotToast.success("Quotation updated successfully.");
    else if (toastParam === "created") hotToast.success("Quotation created successfully.");
    router.replace("/dashboard/sales/quotation");
  }, [toastParam, router]);

  // Debounce the server-side search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Status is filtered client-side so the tiles can count every status. The API's "All" hides
  // superseded revisions, so Old Version rows are fetched alongside it.
  const queryKey = debouncedSearch;
  const loading = result?.key !== queryKey;

  useEffect(() => {
    let ignore = false;
    Promise.all([fetchQuotations(queryKey, "All"), fetchQuotations(queryKey, "Old Version")])
      .then(([current, old]) => {
        if (!ignore) setResult({ key: queryKey, rows: [...current, ...old], error: "" });
      })
      .catch((err: any) => {
        if (!ignore) setResult({ key: queryKey, rows: [], error: err.message || "Failed to fetch quotations" });
      });
    return () => {
      ignore = true;
    };
  }, [queryKey]);

  const allRows = useMemo(() => result?.rows ?? [], [result]);
  const errorMsg = result?.error ?? "";

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: 0 };
    for (const s of QT_STATUSES) c[s] = 0;
    for (const r of allRows) {
      const s = normalizeQtStatus(r.status);
      c[s] = (c[s] || 0) + 1;
      if (s !== "Old Version") c.All += 1;
    }
    return c;
  }, [allRows]);

  const rows = useMemo(
    () =>
      allRows.filter((r) => {
        const s = normalizeQtStatus(r.status);
        return tab === "All" ? s !== "Old Version" : s === tab;
      }),
    [allRows, tab],
  );

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);
  const selStatus = selected ? normalizeQtStatus(selected.status) : "";

  const hasFilters = search.trim() !== "" || tab !== "All";
  const clearFilters = () => {
    setSearch("");
    setTab("All");
  };

  const patchRow = (id: string, patch: Partial<Quotation>) =>
    setResult((prev) => (prev ? { ...prev, rows: prev.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : prev));

  async function run(action: PendingAction, fn: () => Promise<void>) {
    if (pending) return;
    setPending(action);
    try {
      await fn();
    } catch (err: any) {
      hotToast.error(err?.message || `Failed: ${action}`);
    } finally {
      setPending(null);
    }
  }

  async function onIssue() {
    if (!selected) return;
    if (!canQtAction(selStatus, "issue")) return hotToast.error("Only Draft can be Issued");
    const q = selected;
    await run("issue", async () => {
      const updated = await transitionQuotation(q.id, "issue");
      patchRow(q.id, { status: updated?.status ?? "Issued" });
      hotToast.success(`${q.quotationNo} issued`);
    });
  }
  async function onConfirm() {
    if (!selected) return;
    if (!canQtAction(selStatus, "confirm")) return hotToast.error("Only Draft or Issued can be Confirmed");
    const q = selected;
    if (!(await customConfirm(`Confirm quotation ${q.quotationNo}? It can then only be changed by creating a revision.`))) return;
    await run("confirm", async () => {
      const updated = await transitionQuotation(q.id, "confirm");
      patchRow(q.id, { status: updated?.status ?? "Confirmed" });
      hotToast.success(`${q.quotationNo} confirmed`);
    });
  }
  async function onVoid() {
    if (!selected) return;
    const q = selected;
    if (!(await customConfirm(`Void quotation ${q.quotationNo}?`))) return;
    await run("void", async () => {
      const updated = await transitionQuotation(q.id, "void");
      patchRow(q.id, { status: updated?.status ?? "Void" });
      hotToast.success(`${q.quotationNo} voided`);
    });
  }
  async function onRevise() {
    if (!selected) return;
    const q = selected;
    if (!(await customConfirm(`Create a new revision of ${q.quotationNo}?`))) return;
    await run("revise", async () => {
      const res = await transitionQuotation(q.id, "revise");
      patchRow(q.id, { status: "Old Version" });
      if (res?.id) router.push(`/dashboard/sales/quotation/${res.id}`);
    });
  }
  async function onConvertToSo() {
    if (!selected) return;
    if (!canQtAction(selStatus, "convertToSo")) return hotToast.error("Only Confirmed quotations can be converted to SO");
    const q = selected;
    if (!(await customConfirm(`Convert quotation ${q.quotationNo} to a Sales Order?`))) return;
    await run("convertToSo", async () => {
      const res = await transitionQuotation(q.id, "convertToSo");
      patchRow(q.id, { status: "Converted" });
      if (res?.id) router.push(`/dashboard/sales/sales-order/${res.id}`);
    });
  }
  async function onConvertToInvoice() {
    if (!selected) return;
    if (!canQtAction(selStatus, "convertToInvoice")) return hotToast.error("Only Confirmed quotations can be converted to Invoice");
    const q = selected;
    if (!(await customConfirm(`Convert quotation ${q.quotationNo} to an Invoice?`))) return;
    await run("convertToInvoice", async () => {
      const res = await transitionQuotation(q.id, "convertToInvoice");
      patchRow(q.id, { status: "Converted" });
      if (res?.id) router.push(`/dashboard/sales/invoice/form?id=${res.id}`);
    });
  }
  function onPrint() {
    if (!selected) return;
    window.open(`/print/quotation/${selected.id}`, "_blank");
  }
  function onEdit() {
    if (!selected) return;
    if (!isQtEditable(selStatus)) return hotToast.error("Only Draft can be edited");
    router.push(`/dashboard/sales/quotation/${selected.id}`);
  }
  async function onHistory() {
    if (!selected) return;
    setHistoryTitle(selected.quotationNo);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/sales/quotation/history?quotationNo=${encodeURIComponent(selected.quotationNo)}`);
      if (!res.ok) throw new Error("Failed to load history");
      setHistoryRows(await res.json());
    } catch (e: any) {
      hotToast.error(e.message || "Failed to load history");
      setHistoryOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function onCopy() {
    if (!selected) return;
    const q = selected;
    await run("copy", async () => {
      // Fetch full quotation and POST as new
      const full = await fetch(`/api/sales/quotation/${q.id}`).then((r) => r.json());
      const payload = {
        date: new Date(),
        salespersonId: full.salespersonId,
        customerId: full.customerId,
        contactPersonId: full.contactPersonId,
        customerPoRef: full.customerPoRef,
        refNo: full.refNo,
        title: `${full.title} (Copy)`,
        paymentTermId: full.paymentTermId,
        quoteValidityDays: full.quoteValidityDays,
        leadTime: full.leadTime,
        incoterms: full.incoterms,
        currencyId: full.currencyId,
        exchangeRate: full.exchangeRate,
        lumpSumDisc: full.lumpSumDisc,
        isRoundOff: !!full.isRoundOff,
        taxTypeId: full.taxTypeId,
        termsAndConditions: full.termsAndConditions,
        remark: full.remark,
        uploadUrl: full.uploadUrl,
        items: full.items.map((it: any) => ({
          partId: it.partId || null,
          uomId: it.uomId || null,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          sortOrder: it.sortOrder,
        })),
      };
      const res = await fetch(`/api/sales/quotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Copy failed");
      const created = await res.json();
      router.push(`/dashboard/sales/quotation/${created.id}`);
    });
  }

  const tiles: { key: StatusFilter; label: string; tone: Tone }[] = [
    { key: "All", label: "All current", tone: "indigo" },
    ...QT_STATUSES.map((s) => ({ key: s as StatusFilter, label: s, tone: qtStatusTone(s) })),
  ];

  const busy = !!pending;
  const toolbar: {
    key: string;
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    enabled: boolean;
    variant: ButtonVariant;
    pendingKey?: PendingAction;
  }[] = [
    { key: "edit", label: "Edit", icon: Pencil, onClick: onEdit, enabled: !!selected && isQtEditable(selStatus), variant: "secondary" },
    { key: "issue", label: "Issue", icon: Send, onClick: onIssue, enabled: !!selected && canQtAction(selStatus, "issue"), variant: "secondary", pendingKey: "issue" },
    { key: "confirm", label: "Confirm", icon: CheckCircle2, onClick: onConfirm, enabled: !!selected && canQtAction(selStatus, "confirm"), variant: "success", pendingKey: "confirm" },
    { key: "revise", label: "Revise", icon: GitBranch, onClick: onRevise, enabled: !!selected && canQtAction(selStatus, "revise"), variant: "warn", pendingKey: "revise" },
    { key: "void", label: "Void", icon: Ban, onClick: onVoid, enabled: !!selected && canQtAction(selStatus, "void"), variant: "danger", pendingKey: "void" },
    { key: "history", label: "History", icon: History, onClick: onHistory, enabled: !!selected, variant: "secondary" },
    { key: "copy", label: "Copy", icon: Copy, onClick: onCopy, enabled: !!selected, variant: "secondary", pendingKey: "copy" },
    { key: "print", label: "Print Quotation", icon: Printer, onClick: onPrint, enabled: !!selected, variant: "secondary" },
    { key: "toSo", label: "Convert to SO", icon: ArrowRightCircle, onClick: onConvertToSo, enabled: !!selected && canQtAction(selStatus, "convertToSo"), variant: "primary", pendingKey: "convertToSo" },
    { key: "toInv", label: "Convert to Invoice", icon: Receipt, onClick: onConvertToInvoice, enabled: !!selected && canQtAction(selStatus, "convertToInvoice"), variant: "primary", pendingKey: "convertToInvoice" },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 sm:inline-flex">
            <Briefcase size={18} />
          </span>
          <div className="min-w-0">
            <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span>Sales</span>
              <span>/</span>
              <span className="text-slate-500">Costing & Quotation</span>
            </nav>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">Costing & Quotation</h1>
            <p className="text-xs text-slate-500">Create and manage customer quotations.</p>
          </div>
        </div>

        <Link href="/dashboard/sales/quotation/new" className={buttonClass("primary", "md")}>
          <Plus size={14} /> New Quotation
        </Link>
      </div>

      {/* Status summary tiles (also the status filter) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8" role="tablist" aria-label="Filter by status">
        {tiles.map(({ key, label, tone }) => {
          const active = tab === key;
          const count = result ? counts[key] ?? 0 : null;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(key);
                setSelectedId(null);
              }}
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
            </button>
          );
        })}
      </div>

      {/* Card: toolbar + actions + table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2.5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Quotation No, Title or Customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {loading && result && <Loader2 size={14} className="animate-spin text-indigo-500" aria-label="Refreshing" />}
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={buttonClass("ghost", "sm")}>
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Selection action bar */}
        <div className={`flex flex-col gap-2 border-b border-slate-100 px-4 py-2 lg:flex-row lg:items-center ${selected ? "bg-indigo-50/40" : "bg-slate-50/50"}`}>
          <div className="flex min-w-0 items-center gap-2 text-xs lg:w-56 lg:shrink-0">
            {selected ? (
              <>
                <span className="truncate font-mono font-semibold text-indigo-700">{selected.quotationNo}</span>
                <span className="rounded bg-white px-1 py-px font-mono text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                  R{selected.revision}
                </span>
                <StatusBadge status={selStatus} tone={qtStatusTone(selStatus)} />
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  title="Clear selection"
                  className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-600 lg:ml-0"
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <MousePointerClick size={13} className="text-slate-400" /> Select a quotation to act on it
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 lg:ml-auto lg:justify-end">
            {toolbar.map((b) => {
              const Icon = b.icon;
              const spinning = !!b.pendingKey && pending === b.pendingKey;
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={b.onClick}
                  disabled={!b.enabled || busy}
                  className={buttonClass(b.variant, "sm")}
                >
                  {spinning ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table Area */}
        {loading && !result ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500">Loading quotations…</p>
          </div>
        ) : errorMsg ? (
          <div className="m-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            <AlertCircle size={14} />
            <p className="font-medium">{errorMsg}</p>
          </div>
        ) : rows.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No quotations match these filters"
              description="Try a different search term or status."
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              tone="indigo"
              title="No quotations yet"
              description="Cost up a job and send your first quotation to a customer."
              action={
                <Link href="/dashboard/sales/quotation/new" className={buttonClass("primary", "md")}>
                  <Plus size={14} /> New Quotation
                </Link>
              }
            />
          )
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
            <table className="w-full whitespace-nowrap text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="w-9 py-2 pl-4 pr-1 font-medium"><span className="sr-only">Select</span></th>
                  <th className="px-3 py-2 font-medium">Quotation No</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Date</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Prepared By</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Title</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Ref No</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Tax</th>
                  <th className="hidden px-3 py-2 text-right font-medium xl:table-cell">Amount</th>
                  <th className="hidden px-3 py-2 text-right font-medium xl:table-cell">Lump Sum Disc</th>
                  <th className="hidden px-3 py-2 text-right font-medium lg:table-cell">Tax Amount</th>
                  <th className="px-3 py-2 text-right font-medium">Total Amount</th>
                  <th className="hidden px-4 py-2 font-medium 2xl:table-cell">Terms & Conditions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const status = normalizeQtStatus(r.status);
                  const isSel = selectedId === r.id;
                  const customerName = r.customer?.customerName || "";
                  const href = `/dashboard/sales/quotation/${r.id}`;
                  const code = r.currency?.code || "";
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(isSel ? null : r.id)}
                      className={`group cursor-pointer transition-colors ${isSel ? "bg-indigo-50/70" : "hover:bg-indigo-50/40"}`}
                    >
                      <td className={`relative py-2 pl-4 pr-1 ${isSel ? "shadow-[inset_3px_0_0_0_#6366f1]" : ""}`}>
                        <input
                          type="radio"
                          aria-label={`Select ${r.quotationNo}`}
                          checked={isSel}
                          onChange={() => setSelectedId(r.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={href}
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            {r.quotationNo}
                          </Link>
                          <span className="rounded bg-slate-100 px-1 py-px font-mono text-[10px] font-medium text-slate-500" title="Revision">
                            R{r.revision}
                          </span>
                          <Link
                            href={href}
                            onClick={(e) => e.stopPropagation()}
                            title={isQtEditable(status) ? "Edit" : "View"}
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 opacity-0 transition-opacity hover:bg-white hover:text-indigo-600 group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            {isQtEditable(status) ? <Pencil size={11} /> : <Eye size={11} />}
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={status} tone={qtStatusTone(status)} />
                      </td>
                      <td className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell" title={new Date(r.date).toLocaleDateString()}>
                        {relativeDate(r.date)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[150px] items-center gap-2 sm:max-w-[240px]">
                          <InitialsAvatar name={customerName} />
                          <span className="truncate font-medium text-slate-800">{customerName || "—"}</span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 text-slate-600 lg:table-cell">{r.salesperson?.name || "—"}</td>
                      <td className="hidden max-w-[220px] truncate px-3 py-2 text-slate-600 md:table-cell" title={r.title}>
                        {r.title}
                      </td>
                      <td className="hidden px-3 py-2 text-slate-600 xl:table-cell">{r.refNo || "—"}</td>
                      <td className="hidden px-3 py-2 text-xs text-slate-500 xl:table-cell">
                        {r.taxType ? `${r.taxType.taxType} (${r.taxType.taxRate}%)` : "—"}
                      </td>
                      <td className="hidden px-3 py-2 text-right tabular-nums text-slate-700 xl:table-cell">{formatAmount(r.subTotal)}</td>
                      <td className="hidden px-3 py-2 text-right tabular-nums text-slate-500 xl:table-cell">{formatAmount(r.lumpSumDisc)}</td>
                      <td className="hidden px-3 py-2 text-right tabular-nums text-slate-500 lg:table-cell">{formatAmount(r.taxAmount)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="mr-1 text-[11px] text-slate-400">{code || "—"}</span>
                        <span className="font-semibold tabular-nums text-slate-900">{formatAmount(r.totalAmount)}</span>
                      </td>
                      <td className="hidden max-w-[180px] truncate px-4 py-2 text-xs text-slate-500 2xl:table-cell" title={r.termsAndConditions || ""}>
                        {r.termsAndConditions || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {result && !errorMsg && rows.length > 0 && (
        <p className="px-1 text-[11px] text-slate-400">
          Showing <span className="font-medium tabular-nums text-slate-600">{rows.length}</span> of{" "}
          <span className="font-medium tabular-nums text-slate-600">{allRows.length}</span> quotations (incl. old versions)
        </p>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
          <div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${TONES.indigo.tile}`}>
                  <History size={15} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold leading-tight text-slate-800">Revision History</h3>
                  <p className="truncate font-mono text-[11px] leading-tight text-slate-500">{historyTitle}</p>
                </div>
              </div>
              <button onClick={() => setHistoryOpen(false)} className={buttonClass("ghost", "sm")} aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <div className="overflow-auto">
              {historyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-indigo-600" size={20} />
                </div>
              ) : historyRows.length === 0 ? (
                <EmptyState icon={History} tone="slate" title="No revisions found" />
              ) : (
                <table className="w-full whitespace-nowrap text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 font-medium">Rev</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-4 py-2 text-right font-medium">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyRows.map((h) => {
                      const hs = normalizeQtStatus(h.status);
                      return (
                        <tr key={h.id} className="transition-colors hover:bg-indigo-50/40">
                          <td className="px-4 py-2 font-mono font-semibold text-slate-800">R{h.revision}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{new Date(h.date).toISOString().slice(0, 10)}</td>
                          <td className="max-w-[260px] truncate px-3 py-2 text-slate-600" title={h.title}>{h.title}</td>
                          <td className="px-3 py-2"><StatusBadge status={hs} tone={qtStatusTone(hs)} /></td>
                          <td className="px-3 py-2 text-right">
                            <span className="mr-1 text-[11px] text-slate-400">{h.currency?.code || ""}</span>
                            <span className="font-semibold tabular-nums text-slate-900">{formatAmount(h.totalAmount)}</span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Link
                              href={`/dashboard/sales/quotation/${h.id}`}
                              onClick={() => setHistoryOpen(false)}
                              className={buttonClass("secondary", "sm")}
                            >
                              <Eye size={12} /> View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
