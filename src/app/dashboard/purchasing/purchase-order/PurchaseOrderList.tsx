"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { copyPoShipTo } from "@/lib/po-ship-to";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  SearchX,
  Loader2,
  Edit2,
  Eye,
  AlertCircle,
  FileText,
  Copy,
  Send,
  Ban,
  GitBranch,
  History,
  X,
  Printer,
  PackageCheck,
  MousePointerClick,
  ShieldCheck,
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
import {
  PO_PENDING_STATUSES,
  isPoEditable,
  poApprovalStage,
  poReceiveLabel,
  poReceiveTone,
  poStatusTone,
  poVoidBlockReason,
} from "./po-status";

const REVISABLE_STATUSES = [
  "Pending For Approval",
  "Pending First Tier Approval",
  "Pending Second Tier Approval",
  "Approved",
  "Issued",
];

const STATUS_TABS = [
  "All",
  "Draft",
  "Pending For Approval",
  "Approved",
  "Issued",
  "Void",
  "Old Version",
] as const;

const RECEIVE_STATUSES = ["NA", "Not Received", "Partially Received", "Fully Received"] as const;
type ReceiveFilter = "All" | (typeof RECEIVE_STATUSES)[number];

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
  amountAfterTax?: string | number | null;
  approvalTier?: number | null;
  firstApproverName?: string | null;
  secondApproverName?: string | null;
  company: { companyName: string };
  supplier: { supplierName: string };
  purchaser: { name: string };
  workOrder?: { jobDescription: string | null } | null;
  purchaseRequisition?: { prNo: string } | null;
};

type PendingAction = "submit" | "void" | "revise" | "copy";

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

const fmtAmount = (v: string | number | null | undefined) =>
  Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type PoKind = "MATERIAL" | "SUBCON";

const KIND_CONFIG: Record<PoKind, {
  base: string;
  print: string;
  module: string;
  crumb: string;
  title: string;
  subtitle: string;
  emptyHint: string;
  showPr: boolean;
}> = {
  MATERIAL: {
    base: "/dashboard/purchasing/purchase-order",
    print: "/print/purchase-order",
    module: "Purchase Order",
    crumb: "Purchase Orders",
    title: "Purchase Order",
    subtitle: "Create and manage material or non-material purchase orders.",
    emptyHint: 'Click "New order" to create your first, or convert a Submitted purchase requisition.',
    showPr: true,
  },
  SUBCON: {
    base: "/dashboard/purchasing/purchase-order-subcon",
    print: "/print/purchase-order-subcon",
    module: "Purchase Order Subcon",
    crumb: "Purchase Order - Subcon",
    title: "Purchase Order - Subcon",
    subtitle: "Create and manage subcontractor purchase orders.",
    emptyHint: 'Click "New order" to create your first subcon purchase order.',
    showPr: false,
  },
};

/** Purchase order list shared by the Material and Subcon PO screens. */
export default function PurchaseOrderList({ kind }: { kind: PoKind }) {
  const cfg = KIND_CONFIG[kind];
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>("All");
  const [receiveFilter, setReceiveFilter] = useState<ReceiveFilter>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<PurchaseOrder[]>([]);
  const [historyTitle, setHistoryTitle] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  // Status counts from the last "All" load for the current search, so the tiles keep their numbers
  // while a single-status tab is open (the API filters by status server-side).
  const [allCounts, setAllCounts] = useState<{ key: string; counts: Record<string, number> } | null>(null);
  const actionLoading = pendingAction !== null;

  const toastParam = searchParams.get("toast");
  useEffect(() => {
    if (!toastParam) return;
    if (toastParam === "updated") setToast(`${cfg.module} updated successfully.`);
    else if (toastParam === "created") setToast(`${cfg.module} created successfully.`);
    const t = setTimeout(() => setToast(null), 4000);
    router.replace(cfg.base);
    return () => clearTimeout(t);
  }, [toastParam, router, cfg]);

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
        `/api/purchasing/purchase-order?search=${encodeURIComponent(debouncedSearch)}&status=${tab}&type=${kind}`,
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
  }, [debouncedSearch, tab, kind]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const r of rows) {
      // The "Pending For Approval" tab (and API filter) covers all three pending statuses.
      const key = (PO_PENDING_STATUSES as readonly string[]).includes(r.status) ? "Pending For Approval" : r.status;
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  // Remember the "All" counts (derived state, updated during render rather than in an effect).
  if (tab === "All" && !loading && !errorMsg && allCounts?.counts !== counts) {
    setAllCounts({ key: debouncedSearch, counts });
  }

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId],
  );

  // Receive-status filter is a view filter over the loaded rows.
  const receiveCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of RECEIVE_STATUSES) c[s] = 0;
    for (const r of rows) c[r.receiveStatus] = (c[r.receiveStatus] ?? 0) + 1;
    return c;
  }, [rows]);

  const visibleRows = useMemo(
    () => (receiveFilter === "All" ? rows : rows.filter((r) => r.receiveStatus === receiveFilter)),
    [rows, receiveFilter],
  );

  const hasFilters = search.trim() !== "" || tab !== "All" || receiveFilter !== "All";
  const clearFilters = () => {
    setSearch("");
    setTab("All");
    setReceiveFilter("All");
  };

  const patchRow = (id: string, patch: Partial<PurchaseOrder>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

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
    if (!isPoEditable(selected.status)) return hotToast.error("Only Draft or Rejected can be Submitted");
    const target = selected;
    setPendingAction("submit");
    try {
      const updated = await callAction(target.id, "submit");
      if (updated) {
        patchRow(target.id, {
          status: updated.status ?? "Pending For Approval",
          approvalTier: updated.status === "Pending First Tier Approval" ? 2 : 1,
          firstApproverName: null,
          secondApproverName: null,
        });
        hotToast.success(`${target.poNo}-R${target.revision} submitted for approval`);
      }
    } catch (e) {
      hotToast.error(e instanceof Error ? e.message : "Failed: submit");
    } finally {
      setPendingAction(null);
    }
  }

  async function onVoid() {
    if (!selected) return;
    const blocked = poVoidBlockReason(selected.status);
    if (blocked) return hotToast.error(blocked);
    if (!await customConfirm(`Void purchase order ${selected.poNo}-R${selected.revision}?`)) return;
    const target = selected;
    setPendingAction("void");
    try {
      const updated = await callAction(target.id, "void");
      if (updated) {
        patchRow(target.id, { status: updated.status ?? "Void" });
        hotToast.success(`${target.poNo}-R${target.revision} is now Void`);
      }
    } catch (e) {
      hotToast.error(e instanceof Error ? e.message : "Failed: void");
    } finally {
      setPendingAction(null);
    }
  }

  async function onRevise() {
    if (!selected) return;
    if (!REVISABLE_STATUSES.includes(selected.status)) {
      return hotToast.error("Only purchase orders pending approval, Approved or Issued can be revised");
    }
    const msg = selected.status.startsWith("Pending")
      ? `${selected.poNo} is pending approval. Revising will cancel the current approval and create a new Draft revision that must be re-submitted. Continue?`
      : `Create a new revision of ${selected.poNo}?`;
    if (!await customConfirm(msg)) return;
    setPendingAction("revise");
    try {
      const res = await callAction(selected.id, "revise");
      if (res?.id) {
        router.push(`${cfg.base}/${res.id}`);
        return;
      }
    } catch (e) {
      hotToast.error(e instanceof Error ? e.message : "Failed: revise");
    }
    setPendingAction(null);
  }

  function onEdit() {
    if (!selected) return;
    if (!isPoEditable(selected.status)) return hotToast.error("Only Draft or Rejected can be edited");
    router.push(`${cfg.base}/${selected.id}`);
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
    setPendingAction("copy");
    try {
      const fullRes = await fetch(`/api/purchasing/purchase-order/${selected.id}`);
      const full = await fullRes.json();
      if (!fullRes.ok || full.error) throw new Error(full.error || "Failed to load purchase order");
      const today = new Date().toISOString().slice(0, 10);
      // Same body the PO form posts. The copy is an independent Draft: it is not linked to the
      // source PR (that would count its quantities against the PR twice) and takes the
      // currency's latest exchange rate.
      const payload = {
        ...copyPoShipTo(full),
        type: kind,
        companyId: full.companyId,
        supplierId: full.supplierId,
        date: today,
        workOrderNo: full.workOrderNo,
        purchaseRequisitionId: null,
        purchaserId: full.purchaserId,
        contactPersonId: full.contactPersonId || null,
        email: full.email,
        telNo: full.telNo,
        faxNo: full.faxNo,
        mobileNo: full.mobileNo,
        currencyId: full.currencyId,
        exchangeRate: Number(full.currency?.exchangeRate ?? full.exchangeRate ?? 1),
        taxTypeId: full.taxTypeId || null,
        taxRate: Number(full.taxRate) || 0,
        amountBeforeTax: Number(full.amountBeforeTax) || 0,
        taxAmount: Number(full.taxAmount) || 0,
        amountAfterTax: Number(full.amountAfterTax) || 0,
        roundOff: Number(full.roundOff) || 0,
        supplierGst: full.supplierGst || null,
        millCertificate: !!full.millCertificate,
        certOfConformance: !!full.certOfConformance,
        remark: full.remark ? `${full.remark} (Copy)` : "Copy",
        items: (full.items || []).map((it: any) => ({
          fromMaterialProfile: it.fromMaterialProfile,
          materialProfileId: it.fromMaterialProfile ? it.materialProfileId : null,
          material: it.material || null,
          description: it.description,
          supplierMaterialNo: it.supplierMaterialNo || null,
          shape: it.shape || null,
          size: it.size || null,
          poUomId: it.poUomId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          amount: Number(it.amount),
          conversion: Number(it.conversion),
          internalUomId: it.internalUomId || null,
          internalQuantity: Number(it.internalQuantity),
          deliveryDate: today,
          remark: it.remark || null,
          hsnCode: it.hsnCode || null,
          hsnDescription: it.hsnDescription || null,
          taxTypeId: it.taxTypeId || null,
          taxRate: Number(it.taxRate) || 0,
          taxAmount: Number(it.taxAmount) || 0,
          // Subcon lines (null on material lines).
          hardness: it.hardness || null,
          thickness: it.thickness || null,
          woRoutingProcessId: it.woRoutingProcessId || null,
          masterMainProcessId: it.masterMainProcessId || null,
          masterRoutingProcessId: it.masterRoutingProcessId || null,
        })),
      };
      const res = await fetch(`/api/purchasing/purchase-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setPendingAction(null);
        return hotToast.error((await res.json().catch(() => ({}))).error || "Copy failed");
      }
      const created = await res.json();
      hotToast.success(`Copied to new Draft ${created.poNo ?? ""}`.trim());
      router.push(`${cfg.base}/${created.id}`);
    } catch (e: any) {
      hotToast.error(e.message || "Failed to copy purchase order");
      setPendingAction(null);
    }
  }

  function onPrint() {
    if (selected) window.open(`${cfg.print}/${selected.id}`, "_blank");
  }

  // Applicability of each toolbar action.
  const voidBlockReason = selected ? poVoidBlockReason(selected.status) : null;
  const can = {
    edit: !!selected && isPoEditable(selected.status),
    void: !!selected && !voidBlockReason,
    submit: !!selected && isPoEditable(selected.status),
    revise: !!selected && REVISABLE_STATUSES.includes(selected.status),
    history: !!selected,
    copy: !!selected,
    print: !!selected,
  };

  const firstLoad = loading && rows.length === 0;
  const cachedCounts = allCounts && allCounts.key === debouncedSearch ? allCounts.counts : null;
  const tileCount = (key: (typeof STATUS_TABS)[number]): number | null => {
    if (firstLoad) return null;
    if (key === tab && !loading && !errorMsg) return counts.All;
    return cachedCounts ? cachedCounts[key] ?? 0 : null;
  };
  const statusTiles: { key: (typeof STATUS_TABS)[number]; label: string; tone: Tone }[] = STATUS_TABS.map((t) => ({
    key: t,
    label: t === "All" ? "All orders" : t === "Pending For Approval" ? "Pending approval" : t,
    tone: t === "All" ? "indigo" : poStatusTone(t),
  }));
  const receiveTiles: { key: ReceiveFilter; label: string; tone: Tone }[] = [
    { key: "All", label: "Any receive status", tone: "indigo" },
    ...RECEIVE_STATUSES.map((s) => ({ key: s as ReceiveFilter, label: s === "NA" ? "Not issued (N/A)" : s, tone: poReceiveTone(s) })),
  ];

  return (
    <div className="relative space-y-4">
      {toast && (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2.5 rounded-lg bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-white shadow-xl ring-1 ring-white/10 sm:right-6 sm:top-6">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 sm:inline-flex">
            <FileText size={18} />
          </span>
          <div className="min-w-0">
            <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span>Purchasing</span>
              <span>/</span>
              <span className="text-slate-500">{cfg.crumb}</span>
            </nav>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">{cfg.title}</h1>
            <p className="text-xs text-slate-500">{cfg.subtitle}</p>
          </div>
        </div>

        <Link href={`${cfg.base}/new`} className={buttonClass("primary", "md")}>
          <Plus size={14} /> New order
        </Link>
      </div>

      {/* Status tiles (also the status filter) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7" role="tablist" aria-label="Filter by status">
        {statusTiles.map(({ key, label, tone }) => {
          const active = tab === key;
          const count = tileCount(key);
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

      {/* Receive-status tiles (view filter over the loaded rows) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="tablist" aria-label="Filter by receive status">
        {receiveTiles.map(({ key, label, tone }) => {
          const active = receiveFilter === key;
          const count = firstLoad ? null : key === "All" ? rows.length : receiveCounts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setReceiveFilter(key)}
              className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                active
                  ? "border-indigo-300 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500/15"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className={`flex min-w-0 items-center gap-1.5 text-[11px] font-medium ${active ? "text-indigo-700" : "text-slate-500"}`}>
                <PackageCheck size={12} className={`shrink-0 ${TONES[tone].text}`} />
                <span className="truncate">{label}</span>
              </span>
              <span className={`text-[13px] font-semibold tabular-nums ${active ? "text-indigo-900" : "text-slate-900"} ${count === 0 ? "opacity-40" : ""}`}>
                {count === null ? "–" : count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Card: search + selection toolbar + table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2.5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PO No, Supplier, Purchaser, Work Order or Remark..."
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

        {/* Contextual action bar for the selected order */}
        <div
          className={`flex flex-col gap-2 border-b px-4 py-2 transition-colors sm:flex-row sm:items-center ${
            selected ? "border-indigo-100 bg-indigo-50/50" : "border-slate-100 bg-slate-50/50"
          }`}
        >
          <div className="flex min-w-0 shrink-0 items-center gap-2 text-xs">
            {selected ? (
              <>
                <span className="text-slate-500">Selected</span>
                <span className="truncate font-mono font-semibold text-indigo-700">
                  {selected.poNo}-R{selected.revision}
                </span>
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
                <MousePointerClick size={13} /> Select an order to act on it
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
            <ToolbarBtn icon={<Edit2 size={12} />} label="Edit" onClick={onEdit} disabled={!can.edit || actionLoading} />
            <ToolbarBtn icon={<Ban size={12} />} label="Void" onClick={onVoid} disabled={!can.void || actionLoading} title={voidBlockReason ?? undefined} spinning={pendingAction === "void"} variant="danger" />
            <ToolbarBtn icon={<GitBranch size={12} />} label="Revise" onClick={onRevise} disabled={!can.revise || actionLoading} spinning={pendingAction === "revise"} variant="warn" />
            <ToolbarBtn icon={<History size={12} />} label="History" onClick={onHistory} disabled={!can.history || actionLoading} />
            <ToolbarBtn icon={<Copy size={12} />} label="Copy" onClick={onCopy} disabled={!can.copy || actionLoading} spinning={pendingAction === "copy"} />
            <ToolbarBtn icon={<Printer size={12} />} label="Print" onClick={onPrint} disabled={!can.print || actionLoading} />
            <span className="mx-0.5 hidden h-4 w-px bg-slate-200 sm:inline-block" />
            <ToolbarBtn icon={<Send size={12} />} label="Submit" onClick={onSubmit} disabled={!can.submit || actionLoading} spinning={pendingAction === "submit"} variant="primary" />
          </div>
        </div>

        {/* Table area */}
        {firstLoad ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500">Loading orders...</p>
          </div>
        ) : errorMsg ? (
          <div className="m-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            <AlertCircle size={14} />
            <p className="font-medium">{errorMsg}</p>
          </div>
        ) : visibleRows.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No purchase orders match these filters"
              description="Try a different search term, status or receive status."
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={FileText}
              tone="indigo"
              title="No purchase orders found."
              description={cfg.emptyHint}
              action={
                <Link href={`${cfg.base}/new`} className={buttonClass("primary", "md")}>
                  <Plus size={14} /> New order
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
                  <th className="px-3 py-2 font-medium">PO No</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Rev</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Date</th>
                  <th className="px-3 py-2 font-medium">Supplier</th>
                  {cfg.showPr && <th className="hidden px-3 py-2 font-medium lg:table-cell">PR No</th>}
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Work Order No</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Work Description</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Purchaser</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Approval</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Receive Status</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="hidden px-3 py-2 font-medium print:table-cell">Remark</th>
                  <th className="px-4 py-2 text-right font-medium print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((r) => {
                  const isSelected = selectedId === r.id;
                  const href = `${cfg.base}/${r.id}`;
                  const editable = isPoEditable(r.status);
                  const supplier = r.supplier?.supplierName || "";
                  const stage = poApprovalStage(r);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                      aria-selected={isSelected}
                      className={`group cursor-pointer transition-colors ${isSelected ? "bg-indigo-50/70" : "hover:bg-indigo-50/40"}`}
                    >
                      <td className="py-2 pl-4 pr-1">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedId(r.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${r.poNo}-R${r.revision}`}
                          className="h-3.5 w-3.5 accent-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} tone={poStatusTone(r.status)} />
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {r.poNo}<span className="hidden sm:inline">-R{r.revision}</span>
                        </Link>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <span className="rounded bg-slate-100 px-1 py-px font-mono text-[11px] font-medium text-slate-500">{r.revision}</span>
                      </td>
                      <td
                        className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell"
                        title={r.date ? new Date(r.date).toLocaleDateString() : undefined}
                      >
                        {relativeDate(r.date)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[150px] items-center gap-2 sm:max-w-[220px]" title={supplier}>
                          <InitialsAvatar name={supplier} />
                          <span className="truncate font-medium text-slate-800">{supplier || "—"}</span>
                        </div>
                      </td>
                      {cfg.showPr && (
                        <td className="hidden px-3 py-2 font-mono text-xs text-slate-600 lg:table-cell">
                          {r.purchaseRequisition?.prNo || <span className="font-sans text-slate-400">Independent</span>}
                        </td>
                      )}
                      <td className="hidden px-3 py-2 font-mono text-xs text-slate-600 lg:table-cell">{r.workOrderNo || "—"}</td>
                      <td className="hidden max-w-[200px] truncate px-3 py-2 text-slate-600 xl:table-cell" title={r.workOrder?.jobDescription || ""}>
                        {r.workOrder?.jobDescription || "—"}
                      </td>
                      <td className="hidden px-3 py-2 text-slate-600 md:table-cell">{r.purchaser?.name}</td>
                      <td className="hidden px-3 py-2 xl:table-cell">
                        {stage.tiers ? (
                          <Badge tone={stage.tone} icon={ShieldCheck}>{stage.label}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden px-3 py-2 lg:table-cell">
                        <Badge tone={poReceiveTone(r.receiveStatus)} dot>{poReceiveLabel(r.receiveStatus)}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
                        {fmtAmount(r.amountAfterTax)}
                      </td>
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

      {!errorMsg && visibleRows.length > 0 && (
        <p className="px-1 text-[11px] text-slate-400">
          Showing <span className="font-medium tabular-nums text-slate-600">{visibleRows.length}</span> of{" "}
          <span className="font-medium tabular-nums text-slate-600">{rows.length}</span> purchase orders
        </p>
      )}

      {/* History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
          <div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-600/15">
                  <History size={15} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold leading-tight text-slate-800">Revision History</h3>
                  <p className="truncate font-mono text-[11px] leading-tight text-slate-500">{historyTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto">
              {historyLoading ? (
                <div className="flex items-center justify-center py-10 text-indigo-500">
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : historyRows.length === 0 ? (
                <EmptyState icon={History} tone="slate" title="No revisions found." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2 text-left font-medium">Rev</th>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Purchaser</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Receive Status</th>
                        <th className="px-4 py-2 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyRows.map((h) => (
                        <tr key={h.id} className="hover:bg-indigo-50/40">
                          <td className="px-4 py-2 font-mono font-semibold text-slate-900">R{h.revision}</td>
                          <td className="px-3 py-2 text-slate-600">{new Date(h.date).toLocaleDateString()}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <InitialsAvatar name={h.purchaser?.name} />
                              <span className="text-slate-700">{h.purchaser?.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2"><StatusBadge status={h.status} tone={poStatusTone(h.status)} /></td>
                          <td className="px-3 py-2"><Badge tone={poReceiveTone(h.receiveStatus)} dot>{poReceiveLabel(h.receiveStatus)}</Badge></td>
                          <td className="px-4 py-2 text-right">
                            <Link
                              href={`${cfg.base}/${h.id}`}
                              onClick={() => setHistoryOpen(false)}
                              className={buttonClass("secondary", "sm")}
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
  title,
  spinning,
  variant = "secondary",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  spinning?: boolean;
  variant?: "secondary" | "primary" | "danger" | "warn" | "success";
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={buttonClass(variant, "sm")}>
      {spinning ? <Loader2 size={12} className="animate-spin" /> : icon} {label}
    </button>
  );
}
