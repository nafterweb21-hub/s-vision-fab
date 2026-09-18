"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Loader2,
  Edit2,
  AlertCircle,
  FileText,
  Printer,
  Copy,
  CheckCircle2,
  Send,
  Ban,
  GitBranch,
  ArrowRightCircle,
  History,
  X,
} from "lucide-react";

const STATUS_TABS = [
  "All",
  "Draft",
  "Issued",
  "Confirmed",
  "Old Version",
  "Revised",
  "Void",
  "Converted",
] as const;

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

export default function QuotationListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<Quotation[]>([]);
  const [historyTitle, setHistoryTitle] = useState("");

  const toastParam = searchParams.get("toast");
  useEffect(() => {
    if (!toastParam) return;
    if (toastParam === "updated") setToast("Quotation updated successfully.");
    else if (toastParam === "created") setToast("Quotation created successfully.");
    const t = setTimeout(() => setToast(null), 4000);
    router.replace("/dashboard/sales/quotation");
    return () => clearTimeout(t);
  }, [toastParam, router]);

  const fetchRows = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(
        `/api/sales/quotation?search=${encodeURIComponent(search)}&status=${tab}`,
      );
      if (!res.ok) throw new Error("Failed to fetch quotations");
      setRows(await res.json());
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [search, tab]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId],
  );

  async function callAction(
    id: string,
    action: "issue" | "confirm" | "void" | "revise" | "convertToSo" | "convertToInvoice",
  ) {
    const res = await fetch(`/api/sales/quotation/${id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      hotToast.error(err.error || `Failed: ${action}`);
      return null;
    }
    return res.json();
  }

  async function onIssue() {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be Issued");
    await callAction(selected.id, "issue");
    fetchRows();
  }
  async function onConfirm() {
    if (!selected) return;
    if (selected.status !== "Issued" && selected.status !== "Draft")
      return hotToast.error("Only Draft or Issued can be Confirmed");
    await callAction(selected.id, "confirm");
    fetchRows();
  }
  async function onVoid() {
    if (!selected) return;
    if (!await customConfirm(`Void quotation ${selected.quotationNo}?`)) return;
    await callAction(selected.id, "void");
    fetchRows();
  }
  async function onRevise() {
    if (!selected) return;
    if (!await customConfirm(`Create a new revision of ${selected.quotationNo}?`)) return;
    const res = await callAction(selected.id, "revise");
    if (res?.id) router.push(`/dashboard/sales/quotation/${res.id}`);
  }
  async function onConvertToSo() {
    if (!selected) return;
    if (selected.status !== "Confirmed")
      return hotToast.error("Only Confirmed quotations can be converted to SO");
    const res = await callAction(selected.id, "convertToSo");
    if (res?.id) router.push(`/dashboard/sales/sales-order/${res.id}`);
  }
  async function onConvertToInvoice() {
    if (!selected) return;
    if (selected.status !== "Confirmed")
      return hotToast.error("Only Confirmed quotations can be converted to Invoice");
    const res = await callAction(selected.id, "convertToInvoice");
    if (res?.id) router.push(`/dashboard/sales/invoice/form?id=${res.id}`);
  }
  function onPrint() {
    if (!selected) return;
    window.open(`/print/quotation/${selected.id}`, "_blank");
  }
  function onEdit() {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be edited");
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
    // Fetch full quotation and POST as new
    const full = await fetch(`/api/sales/quotation/${selected.id}`).then((r) => r.json());
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
      taxTypeId: full.taxTypeId,
      termsAndConditions: full.termsAndConditions,
      remark: full.remark,
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
    if (!res.ok) return hotToast.error((await res.json()).error || "Copy failed");
    const created = await res.json();
    router.push(`/dashboard/sales/quotation/${created.id}`);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-blue-900 px-4 py-3.5 text-xs font-bold text-white shadow-xl border border-blue-800">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          {toast}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-blue-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-1">
            <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
            <span>/</span>
            <span className="text-blue-500">Sales</span>
            <span>/</span>
            <span className="text-blue-500">Costing & Quotation</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-blue-900">Costing & Quotation</h2>
              <p className="text-sm text-blue-500 mt-0.5">Create and manage customer quotations.</p>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/sales/quotation/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-lg shadow-md active:scale-95 transition-all duration-200 shrink-0"
        >
          <Plus size={16} /> New Quotation
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-blue-200 p-3 rounded-xl shadow-sm">
        <ToolbarBtn icon={<Edit2 size={14} />} label="Edit" onClick={onEdit} disabled={selected?.status !== "Draft"} />
        <ToolbarBtn icon={<Ban size={14} />} label="Void" onClick={onVoid} disabled={!selected} />
        <ToolbarBtn icon={<Send size={14} />} label="Issue" onClick={onIssue} disabled={selected?.status !== "Draft"} />
        <ToolbarBtn icon={<CheckCircle2 size={14} />} label="Confirm" onClick={onConfirm} disabled={selected?.status !== "Draft" && selected?.status !== "Issued"} />
        <ToolbarBtn icon={<GitBranch size={14} />} label="Revise" onClick={onRevise} disabled={!selected} />
        <ToolbarBtn icon={<History size={14} />} label="History" onClick={onHistory} disabled={!selected} />
        <ToolbarBtn icon={<ArrowRightCircle size={14} />} label="Convert to SO" onClick={onConvertToSo} disabled={selected?.status !== "Confirmed"} primary />
        <ToolbarBtn icon={<ArrowRightCircle size={14} />} label="Convert to Invoice" onClick={onConvertToInvoice} disabled={selected?.status !== "Confirmed"} primary />
        <ToolbarBtn icon={<Copy size={14} />} label="Copy" onClick={onCopy} disabled={!selected} />
        <ToolbarBtn icon={<Printer size={14} />} label="Print Quotation" onClick={onPrint} disabled={!selected} />
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

      {/* Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-blue-200 p-4 rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-400" />
          <input
            type="text"
            placeholder="Search by Quotation No, Title or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm text-blue-500">Loading quotations...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center gap-3 text-rose-700">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-blue-200 rounded-xl p-12 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <FileText size={22} className="text-amber-500" />
          </div>
          <p className="text-blue-600 font-semibold">No quotations found.</p>
          <p className="text-xs text-blue-400 mt-1">Click &quot;New Quotation&quot; to create your first.</p>
        </div>
      ) : (
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider border-b border-blue-200">
                <tr>
                  <th className="px-1.5 py-3 w-10"></th>
                  <th className="px-1.5 py-3">Status</th>
                  <th className="px-1.5 py-3">Quotation No</th>
                  <th className="px-1.5 py-3">Rev</th>
                  <th className="px-1.5 py-3">Date</th>
                  <th className="px-1.5 py-3">Prepared By</th>
                  <th className="px-1.5 py-3">Customer Name</th>
                  <th className="px-1.5 py-3">Ref No</th>
                  <th className="px-1.5 py-3">Title</th>
                  <th className="px-1.5 py-3">Currency</th>
                  <th className="px-1.5 py-3">Tax</th>
                  <th className="px-1.5 py-3 text-right">Amount</th>
                  <th className="px-1.5 py-3 text-right">Lump Sum Disc</th>
                  <th className="px-1.5 py-3 text-right">Tax Amount</th>
                  <th className="px-1.5 py-3 text-right">Total Amount</th>
                  <th className="px-1.5 py-3">Terms & Conditions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedId === r.id ? "bg-amber-50/70" : "hover:bg-blue-50/50"
                    }`}
                  >
                    <td className="px-1.5 py-3">
                      <input
                        type="radio"
                        checked={selectedId === r.id}
                        onChange={() => setSelectedId(r.id)}
                        className="accent-amber-500"
                      />
                    </td>
                    <td className="px-1.5 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-1.5 py-3 font-bold text-blue-900 whitespace-nowrap">
                      <Link
                        href={`/dashboard/sales/quotation/${r.id}`}
                        className="hover:text-amber-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.quotationNo}
                      </Link>
                    </td>
                    <td className="px-1.5 py-3 text-blue-700">{r.revision}</td>
                    <td className="px-1.5 py-3 text-blue-700 whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="px-1.5 py-3 text-blue-700">{r.salesperson?.name || "—"}</td>
                    <td className="px-1.5 py-3 font-medium text-blue-700">
                      {r.customer?.customerName || "—"}
                    </td>
                    <td className="px-1.5 py-3 text-blue-700">{r.refNo || "—"}</td>
                    <td className="px-1.5 py-3 text-blue-700 max-w-[120px] truncate" title={r.title}>
                      {r.title}
                    </td>
                    <td className="px-1.5 py-3 text-blue-700">{r.currency?.code || "—"}</td>
                    <td className="px-1.5 py-3 text-blue-700">
                      {r.taxType ? `${r.taxType.taxType} (${r.taxType.taxRate}%)` : "—"}
                    </td>
                    <td className="px-1.5 py-3 text-right whitespace-nowrap font-mono text-blue-900">
                      {Number(r.subTotal).toFixed(2)}
                    </td>
                    <td className="px-1.5 py-3 text-right whitespace-nowrap font-mono text-blue-700">
                      {Number(r.lumpSumDisc || 0).toFixed(2)}
                    </td>
                    <td className="px-1.5 py-3 text-right whitespace-nowrap font-mono text-blue-700">
                      {Number(r.taxAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-1.5 py-3 text-right whitespace-nowrap font-mono font-semibold text-blue-900">
                      {Number(r.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-1.5 py-3 text-blue-700 max-w-[100px] truncate" title={r.termsAndConditions || ""}>
                      {r.termsAndConditions || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="fixed inset-0 bg-blue-950/30 backdrop-blur-xs" onClick={() => setHistoryOpen(false)} />
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl border border-blue-200 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-blue-200">
              <div>
                <h3 className="text-base font-bold text-blue-900">Revision History</h3>
                <p className="text-xs text-blue-500">{historyTitle}</p>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="rounded-md p-1 text-blue-500 hover:bg-blue-50 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {historyLoading ? (
                <div className="flex items-center justify-center py-10 text-blue-500">
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : historyRows.length === 0 ? (
                <p className="text-center text-sm text-blue-500 py-6">No revisions found.</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 uppercase tracking-wider">
                      <th className="px-3 py-2.5 text-left">Rev</th>
                      <th className="px-3 py-2.5 text-left">Date</th>
                      <th className="px-3 py-2.5 text-left">Title</th>
                      <th className="px-3 py-2.5 text-left">Status</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5 text-right">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {historyRows.map((h) => (
                      <tr key={h.id} className="hover:bg-blue-50/40">
                        <td className="px-3 py-2.5 font-bold text-blue-900">R{h.revision}</td>
                        <td className="px-3 py-2.5 text-blue-700">{new Date(h.date).toISOString().slice(0, 10)}</td>
                        <td className="px-3 py-2.5 text-blue-700">{h.title}</td>
                        <td className="px-3 py-2.5"><StatusPill status={h.status} /></td>
                        <td className="px-3 py-2.5 text-right text-blue-800">
                          {h.currency?.code || ""} {Number(h.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Link
                            href={`/dashboard/sales/quotation/${h.id}`}
                            onClick={() => setHistoryOpen(false)}
                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
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
          ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500"
          : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "Confirmed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "Issued"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : status === "Draft"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "Void"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : status === "Converted"
      ? "bg-violet-50 text-violet-700 border-violet-200"
      : status === "Old Version"
      ? "bg-slate-100 text-slate-600 border-slate-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}
