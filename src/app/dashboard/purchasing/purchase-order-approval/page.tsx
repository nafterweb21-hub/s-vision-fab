"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle2,
} from "lucide-react";

const STATUS_TABS = [
  "All",
  "Pending For Approval",
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

export default function PurchaseOrderApprovalListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(
        `/api/purchasing/purchase-order-approval?search=${encodeURIComponent(search)}&status=${tab}&type=MATERIAL`
      );
      if (!res.ok) throw new Error("Failed to fetch purchase orders pending approval");
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

  function onView() {
    if (!selected) return;
    router.push(`/dashboard/purchasing/purchase-order-approval/${selected.id}`);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-blue-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-1">
            <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
            <span>/</span>
            <span className="text-blue-500">Purchasing</span>
            <span>/</span>
            <span className="text-blue-500">Purchase Order Approval</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-blue-900">Purchase Order Approval</h2>
              <p className="text-sm text-blue-500 mt-0.5">Review and approve pending purchase orders.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-blue-200 p-3 rounded-xl shadow-sm">
        <button
          onClick={onView}
          disabled={!selected}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 text-white border-blue-600 hover:bg-blue-500`}
        >
          <FileText size={14} /> Review & Approve
        </button>
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
          <p className="text-sm text-blue-500">Loading pending approvals...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center gap-3 text-rose-700">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-blue-200 rounded-xl p-12 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 size={22} className="text-blue-600" />
          </div>
          <p className="text-blue-600 font-semibold">No purchase orders pending approval.</p>
        </div>
      ) : (
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider border-b border-blue-200">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">PO No</th>
                  <th className="px-4 py-3">Rev</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Work Order No</th>
                  <th className="px-4 py-3">Purchaser</th>
                  <th className="px-4 py-3">Remark</th>
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
                    <td className="px-4 py-3">
                      <input
                        type="radio"
                        checked={selectedId === r.id}
                        onChange={() => setSelectedId(r.id)}
                        className="accent-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-900">
                      <Link
                        href={`/dashboard/purchasing/purchase-order-approval/${r.id}`}
                        className="hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.poNo}-R{r.revision}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-blue-700">{r.revision}</td>
                    <td className="px-4 py-3 text-blue-700">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-blue-700 font-medium">{r.supplier?.supplierName}</td>
                    <td className="px-4 py-3 text-blue-700 font-mono">{r.workOrderNo || "—"}</td>
                    <td className="px-4 py-3 text-blue-700">{r.purchaser?.name}</td>
                    <td className="px-4 py-3 text-blue-700 max-w-[150px] truncate" title={r.remark || ""}>
                      {r.remark || "—"}
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

function StatusPill({ status }: { status: string }) {
  let cls = "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "Pending First Tier Approval") {
    cls = "bg-amber-50 text-amber-800 border-amber-300";
  } else if (status === "Pending Second Tier Approval") {
    cls = "bg-indigo-50 text-indigo-800 border-indigo-300";
  } else if (status === "Pending For Approval") {
    cls = "bg-sky-50 text-sky-700 border-sky-200";
  } else if (status === "Issued") {
    cls = "bg-emerald-50 text-emerald-800 border-emerald-300";
  } else if (status === "Rejected") {
    cls = "bg-rose-50 text-rose-800 border-rose-300";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}
