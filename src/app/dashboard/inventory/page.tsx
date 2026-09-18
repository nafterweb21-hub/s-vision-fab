"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Search, Loader2, AlertCircle, FileText, Box, ArrowLeftRight, Plus, ChevronDown, Layers, Droplet, Armchair, Edit2, Trash2 } from "lucide-react";
import { canCreate, canEdit, canDelete } from "@/lib/access";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";
import { deleteMaterialProfile } from "@/app/dashboard/master-profile/material/actions";
import MovementModal from "./movement-modal";

type InventorySummary = {
  id: string;
  partNo: string;
  description: string;
  shape: string;
  size: string;
  category: string;
  materialStatus: string;
  internalUom: string;
  openingStock: number;
  onOrderQty: number;
  receivedQty: number;
  returnedQty: number;
  consumedQty: number;
  reservedQty: number;
  openPoCount: number;
  netReceivedQty: number;
  balance: number;
  available: number;
};

type WorkOrderSummary = {
  workOrderNo: string;
  customer: string;
  salesOrderNo: string;
  date: string | null;
  items: Array<{
    id: string;
    partNo: string;
    description: string;
    prNo: string;
    poNo: string;
    supplier: string;
    prQty: number;
    poQty: number;
    receivedQty: number;
    outstandingQty: number;
    unitPriceSgd: number;
    totalCostSgd: number;
  }>;
};

export default function InventoryPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"summary" | "by-work-order">("summary");
  
  // Summary State
  const [summaryRows, setSummaryRows] = useState<InventorySummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [search, setSearch] = useState("");
  
  // Work Order State
  const [woRows, setWoRows] = useState<WorkOrderSummary[]>([]);
  const [woLoading, setWoLoading] = useState(false);
  const [woError, setWoError] = useState("");
  
  // Modal State
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [selectedMaterialDesc, setSelectedMaterialDesc] = useState<string>("");

  useEffect(() => {
    if (activeTab === "summary") {
      fetchSummary();
    } else {
      fetchByWorkOrder();
    }
  }, [activeTab, search]);

  async function fetchSummary() {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const res = await fetch(`/api/inventory/summary?search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("Failed to load inventory summary");
      setSummaryRows(await res.json());
    } catch (err: any) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function fetchByWorkOrder() {
    setWoLoading(true);
    setWoError("");
    try {
      const res = await fetch(`/api/inventory/by-work-order?search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("Failed to load work order inventory");
      setWoRows(await res.json());
    } catch (err: any) {
      setWoError(err.message);
    } finally {
      setWoLoading(false);
    }
  }

  // Summary rows are Material Profiles, so editing and deleting them is governed
  // by that module, not by Inventory.
  const role = session?.user?.role;
  const permissions = session?.user?.permissions;
  const allowEdit = canEdit(permissions, "MATERIAL_PROFILE", role);
  const allowDelete = canDelete(permissions, "MATERIAL_PROFILE", role);

  async function handleDeleteMaterial(row: InventorySummary) {
    const label = row.partNo || row.description;
    if (!(await customConfirm(`Delete material "${label}"? This action cannot be undone.`))) return;

    const res = await deleteMaterialProfile(row.id);
    if (res.success) {
      hotToast.success("Material deleted");
      fetchSummary();
    } else {
      hotToast.error(res.error || "Failed to delete material");
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-blue-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-1">
            <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
            <span>/</span>
            <span className="text-blue-500">Inventory</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Box size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-blue-900">Inventory</h2>
              <p className="text-sm text-blue-500 mt-0.5">View material stock levels and movement history.</p>
            </div>
          </div>
        </div>

        <AddItemMenu />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 bg-blue-50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "summary" ? "bg-white text-blue-900 shadow-sm" : "text-blue-600 hover:bg-blue-100"
            }`}
          >
            Inventory Summary
          </button>
          <button
            onClick={() => setActiveTab("by-work-order")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "by-work-order" ? "bg-white text-blue-900 shadow-sm" : "text-blue-600 hover:bg-blue-100"
            }`}
          >
            By Work Order
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-400" />
          <input
            type="text"
            placeholder={activeTab === "summary" ? "Search part, description..." : "Search work order no..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {activeTab === "summary" ? (
        <SummaryView
          rows={summaryRows}
          loading={summaryLoading}
          error={summaryError}
          onOpenMovement={(id, desc) => { setSelectedMaterialId(id); setSelectedMaterialDesc(desc); }}
          allowEdit={allowEdit}
          allowDelete={allowDelete}
          onDelete={handleDeleteMaterial}
        />
      ) : (
        <WorkOrderView rows={woRows} loading={woLoading} error={woError} />
      )}

      {selectedMaterialId && (
        <MovementModal 
          materialId={selectedMaterialId} 
          description={selectedMaterialDesc}
          onClose={() => setSelectedMaterialId(null)} 
        />
      )}
    </div>
  );
}

/**
 * Inventory Summary is derived from documents, so there is nothing to create
 * here. This is pure navigation into the Item Master pages, and it only offers
 * the ones the role may actually create in.
 */
function AddItemMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const role = session?.user?.role;
  const permissions = session?.user?.permissions;

  const targets = [
    { code: "RAW_MATERIAL", href: "/dashboard/inventory/raw-materials", label: "Raw Material", icon: Layers, iconClass: "text-amber-600" },
    { code: "CONSUMABLE", href: "/dashboard/inventory/consumables", label: "Consumable", icon: Droplet, iconClass: "text-cyan-600" },
    { code: "FIXED_ASSET", href: "/dashboard/inventory/fixed-assets", label: "Fixed Asset", icon: Armchair, iconClass: "text-purple-600" },
  ].filter((t) => canCreate(permissions, t.code, role));

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (targets.length === 0) return null;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        id="btn-add-inventory"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-md shadow-blue-500/20 active:scale-95 transition-all duration-200"
      >
        <Plus size={16} /> Add
        <ChevronDown size={14} className={`transform transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-52 overflow-hidden bg-white border border-blue-200 rounded-xl shadow-lg"
        >
          {targets.map(({ href, label, icon: Icon, iconClass }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <Icon size={15} className={iconClass} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryView({ rows, loading, error, onOpenMovement, allowEdit, allowDelete, onDelete }: {
  rows: InventorySummary[],
  loading: boolean,
  error: string,
  onOpenMovement: (id: string, desc: string) => void,
  allowEdit: boolean,
  allowDelete: boolean,
  onDelete: (row: InventorySummary) => void,
}) {
  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-blue-500">Loading inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center gap-3 text-rose-700">
        <AlertCircle size={18} />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider border-b border-blue-200">
            <tr>
              <th className="px-2 py-3">SN</th>
              <th className="px-2 py-3">Part No</th>
              <th className="px-2 py-3">Description</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3 text-right whitespace-nowrap" title="Stock held before any document was raised">Opening Stock</th>
              <th className="px-2 py-3 text-right whitespace-nowrap">On-Order Qty</th>
              <th className="px-2 py-3 text-right whitespace-nowrap">Net Received</th>
              <th className="px-2 py-3 text-right whitespace-nowrap">Consumed</th>
              <th className="px-2 py-3 text-right whitespace-nowrap" title="Requisitioned but not yet issued">Reserved</th>
              <th className="px-2 py-3 text-right whitespace-nowrap" title="On hand: opening stock plus net received, less consumed">Balance</th>
              <th className="px-2 py-3 text-right whitespace-nowrap" title="Balance less reserved">Available</th>
              <th className="px-2 py-3 text-center">Open POs</th>
              <th className="px-2 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-12 text-center text-blue-500">
                  No inventory records found.
                </td>
              </tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-2 py-3 text-blue-500">{i + 1}</td>
                <td className="px-2 py-3 font-bold text-blue-900">{r.partNo || "—"}</td>
                <td className="px-2 py-3 text-blue-700 max-w-[160px] truncate" title={r.description}>{r.description}</td>
                <td className="px-2 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    r.materialStatus === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {r.materialStatus}
                  </span>
                </td>
                <td className="px-2 py-3 text-right whitespace-nowrap text-blue-700">{r.openingStock.toFixed(2)} {r.internalUom}</td>
                <td className="px-2 py-3 text-right whitespace-nowrap text-blue-700">{r.onOrderQty.toFixed(2)} {r.internalUom}</td>
                <td className="px-2 py-3 text-right whitespace-nowrap text-emerald-700 font-medium">{r.netReceivedQty.toFixed(2)} {r.internalUom}</td>
                <td className="px-2 py-3 text-right whitespace-nowrap text-rose-700">{r.consumedQty.toFixed(2)} {r.internalUom}</td>
                <td className="px-2 py-3 text-right whitespace-nowrap text-amber-700">{r.reservedQty.toFixed(2)} {r.internalUom}</td>
                <td className={`px-2 py-3 text-right whitespace-nowrap font-bold ${r.balance < 0 ? "text-rose-600" : "text-blue-900"}`}>
                  {r.balance.toFixed(2)} {r.internalUom}
                </td>
                <td className={`px-2 py-3 text-right whitespace-nowrap font-medium ${r.available < 0 ? "text-rose-600" : "text-blue-700"}`}>
                  {r.available.toFixed(2)} {r.internalUom}
                </td>
                <td className="px-2 py-3 text-center text-blue-700">
                  {r.openPoCount > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                      {r.openPoCount}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-2 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => onOpenMovement(r.id, r.description)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-all active:scale-95"
                      title="Movement History"
                    >
                      <ArrowLeftRight size={14} /> Detail
                    </button>

                    {/* Rows are Material Profiles — edit them where they live. */}
                    {allowEdit && (
                      <Link
                        href={`/dashboard/master-profile/material/${r.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-all active:scale-95"
                        title="Edit Material Profile"
                      >
                        <Edit2 size={13} /> Edit
                      </Link>
                    )}

                    {allowDelete && (
                      <button
                        onClick={() => onDelete(r)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-all active:scale-95"
                        title="Delete Material Profile"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WorkOrderView({ rows, loading, error }: { rows: WorkOrderSummary[], loading: boolean, error: string }) {
  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-blue-500">Loading work order inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center gap-3 text-rose-700">
        <AlertCircle size={18} />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-blue-200 rounded-xl p-12 text-center shadow-sm">
        <p className="text-blue-600 font-semibold">No work order inventory found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rows.map((wo) => (
        <div key={wo.workOrderNo} className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-200 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <span className="text-xs text-blue-500 font-bold uppercase">Work Order</span>
              <h3 className="text-base font-bold text-blue-900">{wo.workOrderNo}</h3>
            </div>
            <div>
              <span className="text-xs text-blue-500 font-bold uppercase">Customer</span>
              <p className="text-sm text-blue-700">{wo.customer || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-blue-500 font-bold uppercase">Date</span>
              <p className="text-sm text-blue-700">{wo.date ? new Date(wo.date).toLocaleDateString() : "—"}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-blue-500 bg-white uppercase tracking-wider border-b border-blue-100">
                <tr>
                  <th className="px-4 py-2">Part No</th>
                  <th className="px-4 py-2">PR No</th>
                  <th className="px-4 py-2">PO No</th>
                  <th className="px-4 py-2">Supplier</th>
                  <th className="px-4 py-2 text-right">PO Qty</th>
                  <th className="px-4 py-2 text-right">Received</th>
                  <th className="px-4 py-2 text-right">Outstanding</th>
                  <th className="px-4 py-2 text-right">Total Cost (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {wo.items.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30">
                    <td className="px-4 py-2 font-medium text-blue-900">{item.partNo}</td>
                    <td className="px-4 py-2 text-blue-700">{item.prNo || "—"}</td>
                    <td className="px-4 py-2 text-blue-700 font-bold">{item.poNo || "—"}</td>
                    <td className="px-4 py-2 text-blue-700">{item.supplier || "—"}</td>
                    <td className="px-4 py-2 text-right text-blue-700">{item.poQty.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{item.receivedQty.toFixed(2)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${item.outstandingQty > 0 ? "text-amber-600" : "text-blue-700"}`}>
                      {item.outstandingQty.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-blue-700">${item.totalCostSgd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
