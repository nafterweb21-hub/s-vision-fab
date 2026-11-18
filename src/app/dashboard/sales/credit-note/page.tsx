/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  SearchX,
  Loader2,
  Edit2,
  Eye,
  AlertCircle,
  FileMinus,
  Printer,
  Mail,
  Package,
  Copy,
  Send,
  Ban,
  GitBranch,
  QrCode,
  XCircle,
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
import { getInvoices, getInvoice, voidInvoice, submitInvoice, createInvoice, reviseInvoice, generateEInvoice, cancelEInvoice } from "./credit-note.actions";
import {
  CN_PAYMENT_TONE,
  CN_STATUSES,
  creditNotePaymentState,
  creditNoteStatusTone,
  einvoiceTone,
  isCreditNotePrintable,
  normalizeCreditNoteStatus,
} from "./cn-status";
import { invoiceReviseBlockReason, invoiceVoidBlockReason } from "../invoice/inv-status";

type StatusTab = "All" | (typeof CN_STATUSES)[number];

type PendingAction = "void" | "submit" | "revise" | "copy" | "einvoice" | "cancel-einvoice";

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
  if (diff < -1 && diff > -7) return `in ${-diff}d`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

function formatAmount(n: unknown): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CreditNoteListPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const actionLoading = pendingAction !== null;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const fetchInvoicesList = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const result = await getInvoices();
      if (!result.success) throw new Error(result.error);
      setInvoices(result.data || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoicesList();
  }, []);

  const searchedInvoices = useMemo(() => {
    const q = debouncedSearch;
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        (inv.invoiceNo || "").toLowerCase().includes(q) ||
        (inv.customer?.customerName || "").toLowerCase().includes(q) ||
        (inv.poNo || "").toLowerCase().includes(q),
    );
  }, [invoices, debouncedSearch]);

  // Status counts follow the search so the tiles always add up to what's visible.
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: searchedInvoices.length };
    for (const s of CN_STATUSES) c[s] = 0;
    for (const r of searchedInvoices) {
      const s = normalizeCreditNoteStatus(r.status);
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [searchedInvoices]);

  const filteredInvoices = searchedInvoices.filter(
    (inv) => tab === "All" || normalizeCreditNoteStatus(inv.status) === tab,
  );

  const selected = useMemo(
    () => invoices.find((r) => r.id === selectedId) || null,
    [invoices, selectedId],
  );

  const hasFilters = search.trim() !== "" || tab !== "All";
  const clearFilters = () => {
    setSearch("");
    setTab("All");
  };

  const patchRow = (id: string, patch: Record<string, any>) =>
    setInvoices((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const onEdit = () => {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be edited");
    router.push(`/dashboard/sales/credit-note/form?id=${selected.id}`);
  };

  const onVoid = async () => {
    if (!selected) return;
    // Same rule voidInvoice enforces on the server (active IRN, payments or non-void receipts block it).
    const blocked = invoiceVoidBlockReason(selected);
    if (blocked) return hotToast.error(blocked);
    if (!await customConfirm(`Void credit note ${selected.invoiceNo}?`)) return;
    setPendingAction("void");
    try {
      const res = await voidInvoice(selected.id);
      if (!res.success) throw new Error(res.error || "Failed to void credit note");
      patchRow(selected.id, { status: "Void" });
      hotToast.success(`${selected.invoiceNo} is now Void`);
    } catch (err: any) {
      hotToast.error(err?.message || "Failed to void credit note");
    } finally {
      setPendingAction(null);
    }
  };

  const onSubmit = async () => {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be submitted");
    if (!await customConfirm(`Submit credit note ${selected.invoiceNo}?`)) return;
    setPendingAction("submit");
    try {
      const res = await submitInvoice(selected.id);
      if (!res.success) throw new Error(res.error || "Failed to submit credit note");
      patchRow(selected.id, { status: res.status || "Submitted" });
      hotToast.success(`${selected.invoiceNo} submitted`);
    } catch (err: any) {
      hotToast.error(err?.message || "Failed to submit credit note");
    } finally {
      setPendingAction(null);
    }
  };

  const onRevise = async () => {
    if (!selected) return;
    // Same rule reviseInvoice enforces on the server (status, active IRN).
    const reviseBlocked = invoiceReviseBlockReason(selected, "Credit Note");
    if (reviseBlocked) return hotToast.error(reviseBlocked);
    if (!await customConfirm(`Create a new revision of ${selected.invoiceNo}?`)) return;
    setPendingAction("revise");
    const invRes = await getInvoice(selected.id);
    if (!invRes.success) {
      hotToast.error("Failed to load credit note details");
      setPendingAction(null);
      return;
    }
    const res = await reviseInvoice(selected.id, invRes.data);
    if (res.success && res.data) {
      router.push(`/dashboard/sales/credit-note/form?id=${res.data.id}`);
    } else {
      hotToast.error(res.error || "Failed to revise credit note");
      setPendingAction(null);
    }
  };

  const onCopy = async () => {
    if (!selected) return;
    if (!await customConfirm(`Copy credit note ${selected.invoiceNo}?`)) return;
    setPendingAction("copy");
    const invRes = await getInvoice(selected.id);
    if (!invRes.success) {
      hotToast.error("Failed to load credit note details");
      setPendingAction(null);
      return;
    }
    const data = invRes.data;
    data.invoiceDate = new Date().toISOString().split("T")[0];
    data.doIds = data.deliveryOrders.map((doLink: any) => doLink.deliveryOrderId);
    // Remove IDs from items to create new ones
    data.items = data.items.map((item: any) => ({
      ...item,
      id: undefined,
      invoiceId: undefined,
    }));
    const res = await createInvoice(data);
    if (res.success && res.data) {
      router.push(`/dashboard/sales/credit-note/form?id=${res.data.id}`);
    } else {
      hotToast.error(res.error || "Failed to copy credit note");
      setPendingAction(null);
    }
  };

  const onPrint = () => {
    if (!selected) return;
    if (!isCreditNotePrintable(selected.status)) return hotToast.error("Only Submitted or Draft credit notes can be printed");
    window.open(`/print/invoice/${selected.id}`, "_blank");
  };

  const onPrintLabel = (type: "envelope" | "shipping") => {
    if (!selected) return;
    if (!isCreditNotePrintable(selected.status)) return hotToast.error("Only Submitted or Draft records can be printed");
    window.open(`/print/invoice-label/${selected.id}?type=${type}`, "_blank");
  };

  const onGenerateEInvoice = async () => {
    if (!selected) return;
    if (selected.status !== "Submitted") return hotToast.error("Submit the credit note before generating an e-invoice");
    if (selected.einvoiceStatus === "Generated") return hotToast.error("This credit note already has an IRN");
    if (!(await customConfirm(`Generate GST e-invoice (IRN) for ${selected.invoiceNo}?`))) return;
    setPendingAction("einvoice");
    const t = hotToast.loading("Reporting to the IRP…");
    const res = await generateEInvoice(selected.id);
    hotToast.dismiss(t);
    if (res.success) {
      hotToast.success(`IRN generated${res.data?.irn ? `: ${String(res.data.irn).slice(0, 12)}…` : ""}`);
      await fetchInvoicesList();
    } else {
      hotToast.error(res.error || "Failed to generate e-invoice", { duration: 8000 });
    }
    setPendingAction(null);
  };

  const onCancelEInvoice = async () => {
    if (!selected) return;
    if (selected.einvoiceStatus !== "Generated" || !selected.irn) return hotToast.error("No active IRN to cancel");
    if (!(await customConfirm(`Cancel the IRN for ${selected.invoiceNo}? This is reported to the IRP and allowed only within 24 hours.`))) return;
    const remark = (typeof window !== "undefined" ? window.prompt("Reason for cancellation:", "Data entry mistake") : "") || "";
    if (!remark.trim()) return hotToast.error("A cancellation reason is required");
    setPendingAction("cancel-einvoice");
    const t = hotToast.loading("Cancelling on the IRP…");
    const res = await cancelEInvoice(selected.id, "2", remark.trim());
    hotToast.dismiss(t);
    if (res.success) {
      hotToast.success("IRN cancelled");
      await fetchInvoicesList();
    } else {
      hotToast.error(res.error || "Failed to cancel e-invoice", { duration: 8000 });
    }
    setPendingAction(null);
  };

  const tiles: { key: StatusTab; label: string; tone: Tone }[] = [
    { key: "All", label: "All credit notes", tone: "indigo" },
    ...CN_STATUSES.map((s) => ({ key: s as StatusTab, label: s, tone: creditNoteStatusTone(s) })),
  ];

  // Applicability of each toolbar action for the selected credit note (same rules the handlers enforce).
  const sel = selected;
  const voidBlockReason = sel ? invoiceVoidBlockReason(sel) : null;
  const reviseBlockReason = sel ? invoiceReviseBlockReason(sel, "Credit Note") : null;
  const can = {
    edit: !!sel && sel.status === "Draft",
    void: !!sel && !voidBlockReason,
    submit: !!sel && sel.status === "Draft",
    revise: !!sel && !reviseBlockReason,
    copy: !!sel,
    print: !!sel && isCreditNotePrintable(sel.status),
    einvoice: !!sel && sel.status === "Submitted" && sel.einvoiceStatus !== "Generated",
    cancelEinvoice: !!sel && sel.einvoiceStatus === "Generated" && !!sel.irn,
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 sm:inline-flex">
            <FileMinus size={18} />
          </span>
          <div className="min-w-0">
            <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span>Sales</span>
              <span>/</span>
              <span className="text-slate-500">Credit Notes</span>
            </nav>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">Credit Notes</h1>
            <p className="text-xs text-slate-500">Manage customer credit notes and billing adjustments.</p>
          </div>
        </div>

        <Link href="/dashboard/sales/credit-note/form" className={buttonClass("primary", "md")}>
          <Plus size={14} /> New Credit Note
        </Link>
      </div>

      {/* Status summary tiles (also the status filter) */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="tablist" aria-label="Filter by status">
        {tiles.map(({ key, label, tone }) => {
          const active = tab === key;
          const count = loading && invoices.length === 0 ? null : counts[key] ?? 0;
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
              placeholder="Search credit note no, customer or PO no…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {loading && invoices.length > 0 && <Loader2 size={14} className="animate-spin text-indigo-500" aria-label="Refreshing" />}
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={buttonClass("ghost", "sm")}>
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Contextual action bar for the selected credit note */}
        <div
          className={`flex flex-col gap-2 border-b px-4 py-2 transition-colors sm:flex-row sm:items-center ${
            selected ? "border-indigo-100 bg-indigo-50/50" : "border-slate-100 bg-slate-50/50"
          }`}
        >
          <div className="flex min-w-0 shrink-0 items-center gap-2 text-xs">
            {selected ? (
              <>
                <span className="text-slate-500">Selected</span>
                <span className="truncate font-mono font-semibold text-indigo-700">{selected.invoiceNo}</span>
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
                <MousePointerClick size={13} /> Select a credit note to act on it
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
            <ToolbarBtn icon={<Edit2 size={12} />} label="Edit" onClick={onEdit} disabled={!can.edit || actionLoading} />
            <ToolbarBtn icon={<Send size={12} />} label="Submit" onClick={onSubmit} disabled={!can.submit || actionLoading} spinning={pendingAction === "submit"} variant="success" />
            <ToolbarBtn icon={<GitBranch size={12} />} label="Revise" onClick={onRevise} disabled={!can.revise || actionLoading} spinning={pendingAction === "revise"} variant="warn" title={reviseBlockReason || undefined} />
            <ToolbarBtn icon={<Copy size={12} />} label="Copy" onClick={onCopy} disabled={!can.copy || actionLoading} spinning={pendingAction === "copy"} />
            <ToolbarBtn icon={<Ban size={12} />} label="Void" onClick={onVoid} disabled={!can.void || actionLoading} spinning={pendingAction === "void"} variant="danger" title={voidBlockReason || undefined} />
            <span className="mx-0.5 hidden h-4 w-px bg-slate-200 sm:inline-block" />
            <ToolbarBtn icon={<Printer size={12} />} label="Print Credit Note" onClick={onPrint} disabled={!can.print || actionLoading} />
            <ToolbarBtn icon={<Mail size={12} />} label="Envelope" onClick={() => onPrintLabel("envelope")} disabled={!can.print || actionLoading} />
            <ToolbarBtn icon={<Package size={12} />} label="Shipping" onClick={() => onPrintLabel("shipping")} disabled={!can.print || actionLoading} />
            <span className="mx-0.5 hidden h-4 w-px bg-slate-200 sm:inline-block" />
            <ToolbarBtn icon={<QrCode size={12} />} label="Generate E-Invoice" onClick={onGenerateEInvoice} disabled={!can.einvoice || actionLoading} spinning={pendingAction === "einvoice"} variant="primary" />
            <ToolbarBtn icon={<XCircle size={12} />} label="Cancel E-Invoice" onClick={onCancelEInvoice} disabled={!can.cancelEinvoice || actionLoading} spinning={pendingAction === "cancel-einvoice"} />
          </div>
        </div>

        {/* Table Area */}
        {loading && invoices.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500">Loading credit notes…</p>
          </div>
        ) : errorMsg ? (
          <div className="m-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            <AlertCircle size={14} />
            <p className="font-medium">{errorMsg}</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No credit notes match these filters"
              description="Try a different search term or status."
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={FileMinus}
              tone="indigo"
              title="No credit notes yet"
              description="Click “New Credit Note” to issue your first credit to a customer."
              action={
                <Link href="/dashboard/sales/credit-note/form" className={buttonClass("primary", "md")}>
                  <Plus size={14} /> New Credit Note
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
                  <th className="px-3 py-2 font-medium">Credit Note No</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Date</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">PO No</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Vehicle Number</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Type</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">E-Invoice</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const isSelected = selectedId === inv.id;
                  const status = normalizeCreditNoteStatus(inv.status);
                  const payment = creditNotePaymentState(inv.status);
                  const customerName = inv.customer?.customerName || "";
                  const href = `/dashboard/sales/credit-note/form?id=${inv.id}`;
                  const isDraft = inv.status === "Draft";
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedId(inv.id === selectedId ? null : inv.id)}
                      aria-selected={isSelected}
                      className={`group cursor-pointer transition-colors ${isSelected ? "bg-indigo-50/70" : "hover:bg-indigo-50/40"}`}
                    >
                      <td className="py-2 pl-4 pr-1">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedId(inv.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${inv.invoiceNo}`}
                          className="h-3.5 w-3.5 accent-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {inv.invoiceNo}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[160px] items-center gap-2 sm:max-w-[240px]">
                          <InitialsAvatar name={customerName} />
                          <span className="truncate font-medium text-slate-800">{customerName || "—"}</span>
                        </div>
                      </td>
                      <td
                        className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell"
                        title={inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : undefined}
                      >
                        {relativeDate(inv.invoiceDate)}
                      </td>
                      <td className="hidden px-3 py-2 text-slate-600 lg:table-cell">{inv.poNo || "—"}</td>
                      <td className="hidden px-3 py-2 text-slate-600 xl:table-cell">{inv.vehicleNumber || "—"}</td>
                      <td className="hidden px-3 py-2 text-xs text-slate-500 xl:table-cell">{inv.invoiceType}</td>
                      <td className="hidden px-3 py-2 lg:table-cell">
                        <EInvoicePill status={inv.einvoiceStatus} irn={inv.irn} />
                      </td>
                      <td className="hidden px-3 py-2 text-right sm:table-cell">
                        <span className="mr-1 text-[11px] text-slate-400">{inv.currency?.code}</span>
                        <span className="font-semibold tabular-nums text-slate-900">{formatAmount(inv.amountAfterTax)}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <StatusBadge status={status} tone={creditNoteStatusTone(inv.status)} />
                          {payment && <Badge tone={CN_PAYMENT_TONE[payment]}>{payment}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={href}
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

      {!errorMsg && filteredInvoices.length > 0 && (
        <p className="px-1 text-[11px] text-slate-400">
          Showing <span className="font-medium tabular-nums text-slate-600">{filteredInvoices.length}</span> of{" "}
          <span className="font-medium tabular-nums text-slate-600">{invoices.length}</span> credit notes
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
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
  variant?: "secondary" | "primary" | "danger" | "warn" | "success";
  title?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={buttonClass(variant, "sm")}>
      {spinning ? <Loader2 size={12} className="animate-spin" /> : icon} {label}
    </button>
  );
}

function EInvoicePill({ status, irn }: { status?: string; irn?: string | null }) {
  const s = status || "Not Generated";
  if (s === "Not Generated") {
    return <span className="text-xs text-slate-300">—</span>;
  }
  return (
    <span title={irn || undefined}>
      <Badge tone={einvoiceTone(s)} icon={s === "Generated" ? QrCode : undefined}>
        {s === "Generated" ? "IRN" : s}
      </Badge>
    </span>
  );
}
