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
  PackageCheck,
  Send,
  Ban,
} from "lucide-react";
import { submitGoodsReceive, voidGoodsReceive } from "./actions";

const STATUS_TABS = ["All", "Draft", "Submitted", "Void"] as const;

type GoodsReceiveRow = {
  id: string;
  grNo: string;
  date: string;
  status: string;
  remark: string | null;
  company: { companyName: string };
  supplier: { supplierName: string };
  purchaseOrder: { poNo: string; receiveStatus?: string };
  creator: { name: string };
  progress?: { receivedPct: number; thisGrPct: number; overReceived: boolean };
};

export default function GoodsReceiveListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<GoodsReceiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const toastParam = searchParams.get("toast");
  useEffect(() => {
    if (!toastParam) return;
    if (toastParam === "updated") setToast("Goods Receive updated successfully.");
    else if (toastParam === "created") setToast("Goods Receive created successfully.");
    const t = setTimeout(() => setToast(null), 4000);
    router.replace("/dashboard/purchasing/goods-receive");
    return () => clearTimeout(t);
  }, [toastParam, router]);

  const fetchRows = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(
        `/api/purchasing/goods-receive?search=${encodeURIComponent(search)}&status=${tab}`
      );
      if (!res.ok) throw new Error("Failed to fetch goods receive records");
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
    [rows, selectedId]
  );

  async function onSubmit() {
    if (!selected) return;
    if (selected.status !== "Draft") return hotToast.error("Only Draft can be Submitted");
    if (!await customConfirm(`Submit Goods Receive ${selected.grNo}?`)) return;
    const res = await submitGoodsReceive(selected.id);
    if (!res.success) return hotToast.error(res.error || "Failed to submit");
    fetchRows();
    setSelectedId(null);
  }

  async function onVoid() {
    if (!selected) return;
    if (selected.status === "Void") return hotToast.error("Already voided");
    if (!await customConfirm(`Void Goods Receive ${selected.grNo}?`)) return;
    const res = await voidGoodsReceive(selected.id);
    if (!res.success) return hotToast.error(res.error || "Failed to void");
    fetchRows();
    setSelectedId(null);
  }

  function onEdit() {
    if (!selected) return;
    router.push(`/dashboard/purchasing/goods-receive/${selected.id}`);
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
            <span className="text-blue-500">Goods Receive</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <PackageCheck size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-blue-900">Goods Receive</h2>
              <p className="text-sm text-blue-500 mt-0.5">Manage goods received from purchase orders.</p>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/purchasing/goods-receive/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded-lg shadow-md active:scale-95 transition-all duration-200 shrink-0"
        >
          <Plus size={16} /> New Goods Receive
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-blue-200 p-3 rounded-xl shadow-sm">
        <ToolbarBtn icon={<Edit2 size={14} />} label="View / Edit" onClick={onEdit} disabled={!selected} />
        <ToolbarBtn icon={<Ban size={14} />} label="Void" onClick={onVoid} disabled={!selected || selected.status === "Void"} />
        <ToolbarBtn icon={<Send size={14} />} label="Submit" onClick={onSubmit} disabled={!selected || selected.status !== "Draft"} primary />
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
            placeholder="Search by GR No, Supplier, PO No, DO or Invoice..."
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
          <p className="text-sm text-blue-500">Loading records...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center gap-3 text-rose-700">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-blue-200 rounded-xl p-12 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <PackageCheck size={22} className="text-blue-600" />
          </div>
          <p className="text-blue-600 font-semibold">No Goods Receive found.</p>
          <p className="text-xs text-blue-400 mt-1">Click &quot;New Goods Receive&quot; to create your first.</p>
        </div>
      ) : (
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider border-b border-blue-200">
                <tr>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">GR No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">PO No</th>
                  <th className="px-4 py-3">PO Received</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3 hidden print:table-cell">Remark</th>
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
                        href={`/dashboard/purchasing/goods-receive/${r.id}`}
                        className="hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.grNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-blue-700">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-blue-700 font-medium">{r.supplier?.supplierName}</td>
                    <td className="px-4 py-3 text-blue-700 font-mono">{r.purchaseOrder?.poNo}</td>
                    <td className="px-4 py-3">
                      <ReceiveProgress row={r} />
                    </td>
                    <td className="px-4 py-3 text-blue-700">{r.company?.companyName}</td>
                    <td className="px-4 py-3 text-blue-700">{r.creator?.name}</td>
                    <td className="px-4 py-3 text-blue-700 max-w-[150px] truncate hidden print:table-cell print:whitespace-normal" title={r.remark || ""}>
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

/**
 * How much of the row's PO has been received. The darker segment is this GR's
 * share; a Draft GR's share is shown hatched on top, since it is not received yet.
 */
function ReceiveProgress({ row }: { row: GoodsReceiveRow }) {
  const p = row.progress;
  if (!p) return <span className="text-blue-300">—</span>;

  const isDraft = row.status === "Draft";
  const counted = row.status === "Submitted";
  const total = Math.min(p.receivedPct, 100);
  // A submitted GR is already inside receivedPct; a draft would add to it.
  const mine = row.status === "Void" ? 0 : Math.min(p.thisGrPct, counted ? total : 100 - total);
  const before = counted ? total - mine : total;

  const done = p.receivedPct >= 100;
  const barColor = p.overReceived ? "bg-red-500" : done ? "bg-emerald-500" : "bg-blue-500";
  const priorColor = p.overReceived ? "bg-red-300" : done ? "bg-emerald-300" : "bg-blue-300";

  const title = [
    `${p.receivedPct}% of ${row.purchaseOrder?.poNo ?? "PO"} received`,
    row.status !== "Void" ? `this GR: ${p.thisGrPct}%${isDraft ? " (draft, not yet counted)" : ""}` : null,
    p.overReceived ? "over-received on at least one line" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-2 min-w-[160px]" title={title}>
      <div
        className="relative h-2 w-28 rounded-full bg-blue-100 overflow-hidden flex"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p.receivedPct}
        aria-label={title}
      >
        <div className={priorColor} style={{ width: `${before}%` }} />
        {mine > 0 && (
          <div
            className={isDraft ? "bg-amber-400 bg-[repeating-linear-gradient(45deg,transparent_0_3px,rgba(255,255,255,0.5)_3px_6px)]" : barColor}
            style={{ width: `${mine}%` }}
          />
        )}
      </div>
      <span
        className={`text-xs font-semibold tabular-nums ${
          p.overReceived ? "text-red-600" : done ? "text-emerald-600" : "text-blue-700"
        }`}
      >
        {p.overReceived ? "Over" : `${p.receivedPct}%`}
      </span>
      {isDraft && p.thisGrPct > 0 && !p.overReceived && (
        <span className="whitespace-nowrap text-[11px] font-medium tabular-nums text-amber-600">
          +{p.thisGrPct}% draft
        </span>
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
    status === "Submitted"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "Draft"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "Void"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}
