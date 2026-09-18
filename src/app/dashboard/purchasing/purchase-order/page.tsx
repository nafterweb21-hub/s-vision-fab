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
  Copy,
  CheckCircle2,
  Send,
  Ban,
  GitBranch,
  History,
  X,
  Printer,
} from "lucide-react";

const STATUS_TABS = [
  "All",
  "Draft",
  "Pending For Approval",
  "Approved",
  "Issued",
  "Void",
  "Old Version",
] as const;

type PurchaseOrder = {
  id: string;
  poNo: string;
  revision: number;
  date: string;
  status: string;
  poStatus: string;
  receiveStatus: string;
  remark: string | null;
  workOrderNo: string | null;
  company: { companyName: string };
  supplier: { supplierName: string };
  purchaser: { name: string };
  workOrder?: { jobDescription: string | null } | null;
};

export default function PurchaseOrderListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<PurchaseOrder[]>([]);
  const [historyTitle, setHistoryTitle] = useState("");

  const toastParam = searchParams.get("toast");
  useEffect(() => {
    if (!toastParam) return;
    if (toastParam === "updated") setToast("Purchase Order updated successfully.");
    else if (toastParam === "created") setToast("Purchase Order created successfully.");
    const t = setTimeout(() => setToast(null), 4000);
    router.replace("/dashboard/purchasing/purchase-order");
    return () => clearTimeout(t);
  }, [toastParam, router]);

  const fetchRows = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(
        `/api/purchasing/purchase-order?search=${encodeURIComponent(search)}&status=${tab}`,
      );
      if (!res.ok) throw new Error("Failed to fetch purchase orders");
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

  async function callAction(id: string, action: "submit" | "void" | "revise") {
    const res = await fetch(`/api/purchasing/purchase-order/${id}/transition`, {
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

  async function onSubmit() {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be Submitted");
    await callAction(selected.id, "submit");
    fetchRows();
  }

  async function onVoid() {
    if (!selected) return;
    if (selected.status === "Void") return hotToast.error("Already voided");
    if (!await customConfirm(`Void purchase order ${selected.poNo}-R${selected.revision}?`)) return;
    await callAction(selected.id, "void");
    fetchRows();
  }

  async function onRevise() {
    if (!selected) return;
    if (selected.status !== "Approved" && selected.status !== "Issued") {
      return hotToast.error("Only Approved or Issued purchase orders can be revised");
    }
    if (!await customConfirm(`Create a new revision of ${selected.poNo}?`)) return;
    const res = await callAction(selected.id, "revise");
    if (res?.id) router.push(`/dashboard/purchasing/purchase-order/${res.id}`);
  }

  function onEdit() {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be edited");
    router.push(`/dashboard/purchasing/purchase-order/${selected.id}`);
  }

  async function onHistory() {
    if (!selected) return;
    setHistoryTitle(selected.poNo);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/purchasing/purchase-order/history?poNo=${encodeURIComponent(selected.poNo)}`,
      );
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
    try {
      const full = await fetch(`/api/purchasing/purchase-order/${selected.id}`).then((r) => r.json());
      const payload = {
        companyId: full.companyId,
        date: new Date().toISOString().slice(0, 10),
        workOrderNo: full.workOrderNo,
        requestedById: full.requestedById,
        remark: full.remark ? `${full.remark} (Copy)` : "Copy",
        items: full.items.map((it: any) => ({
          fromMaterialProfile: it.fromMaterialProfile,
          material: it.material,
          description: it.description,
          shape: it.shape,
          size: it.size,
          uomId: it.uomId,
          quantity: it.quantity,
          cancelQuantity: 0,
          deliveryDate: new Date().toISOString().slice(0, 10),
          remark: it.remark,
          materialProfileId: it.materialProfileId,
          sortOrder: it.sortOrder,
        })),
      };
      const res = await fetch(`/api/purchasing/purchase-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return hotToast.error((await res.json()).error || "Copy failed");
      const created = await res.json();
      router.push(`/dashboard/purchasing/purchase-order/${created.id}`);
    } catch (e: any) {
      hotToast.error(e.message || "Failed to copy purchase order");
    }
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
            <span className="text-blue-500">Purchasing</span>
            <span>/</span>
            <span className="text-blue-500">Purchase Orders</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-blue-900">Purchase Order</h2>
              <p className="text-sm text-blue-500 mt-0.5">Create and manage material or non-material purchase orders.</p>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/purchasing/purchase-order/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded-lg shadow-md active:scale-95 transition-all duration-200 shrink-0"
        >
          <Plus size={16} /> New order
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-blue-200 p-3 rounded-xl shadow-sm">
        <ToolbarBtn icon={<Edit2 size={14} />} label="Edit" onClick={onEdit} disabled={!selected || selected.status !== "Draft"} />
        <ToolbarBtn icon={<Ban size={14} />} label="Void" onClick={onVoid} disabled={!selected || selected.status === "Void"} />
        <ToolbarBtn icon={<Send size={14} />} label="Submit" onClick={onSubmit} disabled={!selected || selected.status !== "Draft"} primary />
        <ToolbarBtn icon={<GitBranch size={14} />} label="Revise" onClick={onRevise} disabled={!selected || selected.status !== "Submitted"} />
        <ToolbarBtn icon={<History size={14} />} label="History" onClick={onHistory} disabled={!selected} />
        <ToolbarBtn icon={<Copy size={14} />} label="Copy" onClick={onCopy} disabled={!selected} />
        <ToolbarBtn icon={<Printer size={14} />} label="Print" onClick={() => { if (selected) window.open(`/print/purchase-order/${selected.id}`, "_blank"); }} disabled={!selected} />
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
            placeholder="Search by PO No, Supplier, Purchaser, Work Order or Remark..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-blue-500">Loading orders...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center gap-3 text-rose-700">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-blue-200 rounded-xl p-6 sm:p-12 text-center shadow-sm">
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <FileText size={22} className="text-blue-600" />
          </div>
          <p className="text-blue-600 font-semibold">No purchase orders found.</p>
          <p className="text-xs text-blue-400 mt-1">Click &quot;New Purchase Order&quot; to create your first.</p>
        </div>
      ) : (
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] sm:text-sm text-left whitespace-nowrap">
              <thead className="text-[10px] sm:text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider border-b border-blue-200">
                <tr>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3 w-8 sm:w-10"></th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3">Status</th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3">PO No</th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">Rev</th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3 hidden md:table-cell">Date</th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3">Supplier</th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">Work Order No</th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3 hidden xl:table-cell">Work Description</th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3 hidden md:table-cell">Purchaser</th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">Receive Status</th>
                  <th className="px-1.5 sm:px-4 py-2 sm:py-3 hidden xl:table-cell">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedId === r.id ? "bg-blue-50/70" : "hover:bg-blue-50/30"
                    }`}
                  >
                    <td className="px-1.5 sm:px-4 py-2 sm:py-3">
                      <input
                        type="radio"
                        checked={selectedId === r.id}
                        onChange={() => setSelectedId(r.id)}
                        className="accent-blue-600 scale-75 sm:scale-100"
                      />
                    </td>
                    <td className="px-1.5 sm:px-4 py-2 sm:py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 font-bold text-blue-900">
                      <Link
                        href={`/dashboard/purchasing/purchase-order/${r.id}`}
                        className="hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.poNo}<span className="hidden sm:inline">-R{r.revision}</span>
                      </Link>
                    </td>
                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-blue-700 hidden sm:table-cell">{r.revision}</td>
                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-blue-700 hidden md:table-cell">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-blue-700 font-medium truncate max-w-[120px] sm:max-w-none">{r.supplier?.supplierName}</td>
                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-blue-700 font-mono hidden lg:table-cell">{r.workOrderNo || "—"}</td>
                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-blue-700 max-w-[200px] truncate hidden xl:table-cell" title={r.workOrder?.jobDescription || ""}>
                      {r.workOrder?.jobDescription || "—"}
                    </td>
                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-blue-700 hidden md:table-cell">{r.purchaser?.name}</td>
                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">
                      <POStatusPill status={r.receiveStatus} />
                    </td>
                    <td className="px-1.5 sm:px-4 py-2 sm:py-3 text-blue-700 max-w-[150px] truncate hidden xl:table-cell" title={r.remark || ""}>
                      {r.remark || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Modal */}
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
                      <th className="px-3 py-2.5 text-left">Purchaser</th>
                      <th className="px-3 py-2.5 text-left">Status</th>
                      <th className="px-3 py-2.5 text-left">Receive Status</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {historyRows.map((h) => (
                      <tr key={h.id} className="hover:bg-blue-50/40">
                        <td className="px-3 py-2.5 font-bold text-blue-900">R{h.revision}</td>
                        <td className="px-3 py-2.5 text-blue-700">{new Date(h.date).toLocaleDateString()}</td>
                        <td className="px-3 py-2.5 text-blue-700">{h.purchaser?.name}</td>
                        <td className="px-3 py-2.5"><StatusPill status={h.status} /></td>
                        <td className="px-3 py-2.5"><POStatusPill status={h.receiveStatus} /></td>
                        <td className="px-3 py-2.5 text-right">
                          <Link
                            href={`/dashboard/purchasing/purchase-order/${h.id}`}
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
          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-500"
          : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "Issued" || status === "Approved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "Pending For Approval"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : status === "Draft"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "Void" || status === "Rejected"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : status === "Old Version"
      ? "bg-slate-100 text-slate-600 border-slate-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}

function POStatusPill({ status }: { status: string }) {
  const cls =
    status === "Fully Received"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "Partially Received"
      ? "bg-sky-50 text-sky-700 border-sky-200"
      : status === "Not Received"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}
