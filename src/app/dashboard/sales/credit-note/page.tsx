"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Loader2,
  Edit2,
  AlertCircle,
  FileText,
  Printer,
  Copy,
  Send,
  Ban,
  GitBranch,
  QrCode,
  XCircle,
} from "lucide-react";
import { getInvoices, getInvoice, voidInvoice, submitInvoice, createInvoice, reviseInvoice, generateEInvoice, cancelEInvoice } from "./credit-note.actions";

const STATUS_TABS = ["All", "Draft", "Submitted", "Old Version", "Void"] as const;

export default function CreditNoteListPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) || 
                          (inv.customer?.customerName || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = tab === "All" || inv.status === tab;
    return matchesSearch && matchesStatus;
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: invoices.length };
    for (const r of invoices) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [invoices]);

  const selected = useMemo(
    () => invoices.find((r) => r.id === selectedId) || null,
    [invoices, selectedId],
  );

  const onEdit = () => {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be edited");
    router.push(`/dashboard/sales/credit-note/form?id=${selected.id}`);
  };

  const onVoid = async () => {
    if (!selected) return;
    if (selected.status === "Void" || selected.status === "Old Version") return hotToast.error("Cannot void this credit note");
    if (!await customConfirm(`Void credit note ${selected.invoiceNo}?`)) return;
    setActionLoading(true);
    await voidInvoice(selected.id);
    await fetchInvoicesList();
    setSelectedId(null);
    setActionLoading(false);
  };

  const onSubmit = async () => {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be submitted");
    if (!await customConfirm(`Submit credit note ${selected.invoiceNo}?`)) return;
    setActionLoading(true);
    await submitInvoice(selected.id);
    await fetchInvoicesList();
    setSelectedId(null);
    setActionLoading(false);
  };

  const onRevise = async () => {
    if (!selected) return;
    if (selected.status !== "Submitted") return hotToast.error("Only Submitted credit notes can be revised");
    if (!await customConfirm(`Create a new revision of ${selected.invoiceNo}?`)) return;
    setActionLoading(true);
    const invRes = await getInvoice(selected.id);
    if (!invRes.success) {
      hotToast.error("Failed to load credit note details");
      setActionLoading(false);
      return;
    }
    const res = await reviseInvoice(selected.id, invRes.data);
    if (res.success && res.data) {
      router.push(`/dashboard/sales/credit-note/form?id=${res.data.id}`);
    } else {
      hotToast.error(res.error || "Failed to revise credit note");
      setActionLoading(false);
    }
  };

  const onCopy = async () => {
    if (!selected) return;
    if (!await customConfirm(`Copy credit note ${selected.invoiceNo}?`)) return;
    setActionLoading(true);
    const invRes = await getInvoice(selected.id);
    if (!invRes.success) {
      hotToast.error("Failed to load credit note details");
      setActionLoading(false);
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
      setActionLoading(false);
    }
  };

  const onPrint = () => {
    if (!selected) return;
    if (selected.status !== "Submitted" && selected.status !== "Draft") return hotToast.error("Only Submitted or Draft credit notes can be printed");
    window.open(`/print/invoice/${selected.id}`, "_blank");
  };

  const onGenerateEInvoice = async () => {
    if (!selected) return;
    if (selected.status !== "Submitted") return hotToast.error("Submit the credit note before generating an e-invoice");
    if (selected.einvoiceStatus === "Generated") return hotToast.error("This credit note already has an IRN");
    if (!(await customConfirm(`Generate GST e-invoice (IRN) for ${selected.invoiceNo}?`))) return;
    setActionLoading(true);
    const t = hotToast.loading("Reporting to the IRP…");
    const res = await generateEInvoice(selected.id);
    hotToast.dismiss(t);
    if (res.success) {
      hotToast.success(`IRN generated${res.data?.irn ? `: ${String(res.data.irn).slice(0, 12)}…` : ""}`);
      await fetchInvoicesList();
    } else {
      hotToast.error(res.error || "Failed to generate e-invoice", { duration: 8000 });
    }
    setActionLoading(false);
  };

  const onCancelEInvoice = async () => {
    if (!selected) return;
    if (selected.einvoiceStatus !== "Generated" || !selected.irn) return hotToast.error("No active IRN to cancel");
    if (!(await customConfirm(`Cancel the IRN for ${selected.invoiceNo}? This is reported to the IRP and allowed only within 24 hours.`))) return;
    const remark = (typeof window !== "undefined" ? window.prompt("Reason for cancellation:", "Data entry mistake") : "") || "";
    if (!remark.trim()) return hotToast.error("A cancellation reason is required");
    setActionLoading(true);
    const t = hotToast.loading("Cancelling on the IRP…");
    const res = await cancelEInvoice(selected.id, "2", remark.trim());
    hotToast.dismiss(t);
    if (res.success) {
      hotToast.success("IRN cancelled");
      await fetchInvoicesList();
    } else {
      hotToast.error(res.error || "Failed to cancel e-invoice", { duration: 8000 });
    }
    setActionLoading(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-blue-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-1">
            <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
            <span>/</span>
            <span className="text-blue-500">Sales</span>
            <span>/</span>
            <span className="text-blue-500">Credit Notes</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-blue-900">Credit Notes</h2>
              <p className="text-sm text-blue-500 mt-0.5">Manage customer credit notes and billing adjustments.</p>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/sales/credit-note/form"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg shadow-md shadow-indigo-500/20 active:scale-95 transition-all duration-200 shrink-0"
        >
          <Plus size={16} /> New Credit Note
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-blue-200 p-3 rounded-xl shadow-sm">
        <ToolbarBtn icon={<Edit2 size={14} />} label="Edit" onClick={onEdit} disabled={!selected || actionLoading} />
        <ToolbarBtn icon={<Ban size={14} />} label="Void" onClick={onVoid} disabled={!selected || actionLoading} />
        <ToolbarBtn icon={<Send size={14} />} label="Submit" onClick={onSubmit} disabled={!selected || actionLoading} />
        <ToolbarBtn icon={<GitBranch size={14} />} label="Revise" onClick={onRevise} disabled={!selected || actionLoading} />
        <ToolbarBtn icon={<Copy size={14} />} label="Copy" onClick={onCopy} disabled={!selected || actionLoading} />
        <ToolbarBtn icon={<Printer size={14} />} label="Print Credit Note" onClick={onPrint} disabled={!selected || actionLoading} />
        <ToolbarBtn icon={<QrCode size={14} />} label="Generate E-Invoice" onClick={onGenerateEInvoice} disabled={!selected || actionLoading} primary />
        <ToolbarBtn icon={<XCircle size={14} />} label="Cancel E-Invoice" onClick={onCancelEInvoice} disabled={!selected || actionLoading} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              tab === t
                ? "bg-blue-900 text-white border-blue-900"
                : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
            }`}
          >
            {t} {counts[t] != null ? `(${counts[t]})` : ""}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-blue-200 p-4 rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-400" />
          <input
            type="text"
            placeholder="Search by Credit Note No or Customer Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Table Area */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-blue-500">Loading credit notes...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center gap-3 text-rose-700">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white border border-blue-200 rounded-xl p-12 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <FileText size={22} className="text-indigo-500" />
          </div>
          <p className="text-blue-600 font-semibold">No credit notes found.</p>
          <p className="text-xs text-blue-400 mt-1">
            Click &quot;New Credit Note&quot; to create your first credit note.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider border-b border-blue-200">
                <tr>
                  <th className="px-3 py-3 w-10"></th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Credit Note No</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Vehicle Number</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">E-Invoice</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id === selectedId ? null : inv.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedId === inv.id ? "bg-indigo-50/70" : "hover:bg-blue-50/50"
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="radio"
                        checked={selectedId === inv.id}
                        onChange={() => setSelectedId(inv.id)}
                        className="accent-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={inv.status} />
                    </td>
                    <td className="px-3 py-3 font-bold text-blue-900">
                      <Link
                        href={`/dashboard/sales/credit-note/form?id=${inv.id}`}
                        className="hover:text-indigo-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-blue-700">
                      {new Date(inv.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 font-medium text-blue-700">
                      {inv.customer?.customerName || "—"}
                    </td>
                    <td className="px-3 py-3 text-blue-700">
                      {inv.vehicleNumber || "—"}
                    </td>
                    <td className="px-3 py-3 text-blue-700">
                      {inv.invoiceType}
                    </td>
                    <td className="px-3 py-3">
                      <EInvoicePill status={inv.einvoiceStatus} irn={inv.irn} />
                    </td>
                    <td className="px-3 py-3 text-blue-700 font-semibold text-right">
                      {inv.currency?.code} {Number(inv.amountAfterTax).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  onClick,
  disabled,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
        primary
          ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500"
          : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function EInvoicePill({ status, irn }: { status?: string; irn?: string | null }) {
  const s = status || "Not Generated";
  if (s === "Not Generated") {
    return <span className="text-xs text-blue-300">—</span>;
  }
  const cls =
    s === "Generated"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "Cancelled"
      ? "bg-slate-100 text-slate-600 border-slate-200"
      : s === "Failed"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span
      title={irn || undefined}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}
    >
      {s === "Generated" ? "IRN ✓" : s}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "Submitted"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "Draft"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "Void"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : status === "Old Version"
      ? "bg-slate-100 text-slate-600 border-slate-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}
