"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  SearchX,
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle2,
  Inbox,
  ShieldCheck,
  Clock,
  MousePointerClick,
  X,
  ArrowRight,
} from "lucide-react";
import {
  Badge,
  EmptyState,
  InitialsAvatar,
  Segmented,
  StatusBadge,
  TONES,
  buttonClass,
  type Tone,
} from "@/components/form-ui";
import { poApprovalStage, poStatusTone } from "../purchase-order/po-status";

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
  // Display only (the list API returns every PO column).
  amountAfterTax?: string | number | null;
  approvalTier?: number | null;
  firstApproverName?: string | null;
  firstApprovedAt?: string | null;
  secondApproverName?: string | null;
  updatedAt?: string | null;
};

// ---- Display helpers ----

type QueueView = "all" | "tier1" | "tier2" | "overdue";

const fmtAmount = (v: string | number | null | undefined) =>
  Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** When the PO started waiting on its current approver: tier 1 sign-off for a tier-2 wait, else the last update (submit). */
function waitingSince(r: PurchaseOrder, tier2Current: boolean): string | null {
  if (tier2Current && r.firstApprovedAt) return r.firstApprovedAt;
  return r.updatedAt || null;
}

function ageDays(value: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, (Date.now() - t) / 86400000);
}

function ageLabel(days: number | null): string {
  if (days === null) return "—";
  const hours = days * 24;
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(days)}d`;
}

function ageClass(days: number | null): string {
  if (days === null) return "text-slate-400";
  if (days > 5) return "bg-rose-50 text-rose-700 ring-rose-600/15";
  if (days > 2) return "bg-amber-50 text-amber-700 ring-amber-600/15";
  return "bg-slate-100 text-slate-600 ring-slate-500/15";
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export type PoApprovalKind = "MATERIAL" | "SUBCON";

const KIND_CONFIG: Record<PoApprovalKind, { base: string; title: string; subtitle: string; noun: string }> = {
  MATERIAL: {
    base: "/dashboard/purchasing/purchase-order-approval",
    title: "Purchase Order Approval",
    subtitle: "Review and approve pending purchase orders.",
    noun: "purchase orders",
  },
  SUBCON: {
    base: "/dashboard/purchasing/purchase-order-subcon-approval",
    title: "PO Subcon Approval",
    subtitle: "Review and approve pending subcon purchase orders.",
    noun: "subcon purchase orders",
  },
};

/** Approval queue shared by the Material and Subcon PO approval screens. */
export default function PoApprovalList({ kind }: { kind: PoApprovalKind }) {
  const cfg = KIND_CONFIG[kind];
  const router = useRouter();
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<QueueView>("all");

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
        `/api/purchasing/purchase-order-approval?search=${encodeURIComponent(debouncedSearch)}&status=${tab}&type=${kind}`
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
  }, [debouncedSearch, tab, kind]);

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
    router.push(`${cfg.base}/${selected.id}`);
  }

  // ---- Display-only derived values ----
  const decorated = useMemo(
    () =>
      rows.map((r) => {
        const stage = poApprovalStage(r);
        const days = ageDays(waitingSince(r, stage.tier2 === "current"));
        return { r, stage, days };
      }),
    [rows],
  );

  const viewCounts = useMemo(() => {
    const c: Record<QueueView, number> = { all: decorated.length, tier1: 0, tier2: 0, overdue: 0 };
    for (const d of decorated) {
      if (d.stage.tier1 === "current") c.tier1++;
      if (d.stage.tier2 === "current") c.tier2++;
      if (d.days !== null && d.days > 2) c.overdue++;
    }
    return c;
  }, [decorated]);

  const visible = useMemo(
    () =>
      decorated.filter((d) =>
        view === "all"
          ? true
          : view === "tier1"
            ? d.stage.tier1 === "current"
            : view === "tier2"
              ? d.stage.tier2 === "current"
              : d.days !== null && d.days > 2,
      ),
    [decorated, view],
  );

  const hasFilters = search.trim() !== "" || tab !== "All" || view !== "all";
  const clearFilters = () => {
    setSearch("");
    setTab("All");
    setView("all");
  };

  const firstLoad = loading && rows.length === 0;
  const tiles: { key: QueueView; label: string; tone: Tone; icon: typeof Inbox }[] = [
    { key: "all", label: "In queue", tone: "indigo", icon: Inbox },
    { key: "tier1", label: "Awaiting tier 1", tone: "amber", icon: ShieldCheck },
    { key: "tier2", label: "Awaiting tier 2", tone: "violet", icon: ShieldCheck },
    { key: "overdue", label: "Waiting > 2 days", tone: "rose", icon: Clock },
  ];

  return (
    <div className="relative space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 sm:inline-flex">
            <CheckCircle2 size={18} />
          </span>
          <div className="min-w-0">
            <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span>Purchasing</span>
              <span>/</span>
              <span className="text-slate-500">{cfg.title}</span>
            </nav>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">{cfg.title}</h1>
            <p className="text-xs text-slate-500">{cfg.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Queue tiles (view filter over the loaded rows) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Filter the approval queue">
        {tiles.map(({ key, label, tone, icon: Icon }) => {
          const active = view === key;
          const count = firstLoad ? null : viewCounts[key];
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(key)}
              className={`relative flex min-w-0 flex-col items-start overflow-hidden rounded-lg border px-3 py-2 pl-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                active
                  ? "border-indigo-300 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500/15"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className={`absolute inset-y-0 left-0 w-[3px] ${TONES[tone].bar}`} />
              <span className={`flex w-full items-center gap-1.5 truncate text-[11px] font-medium ${active ? "text-indigo-700" : "text-slate-500"}`}>
                <Icon size={12} className={`shrink-0 ${TONES[tone].text}`} />
                <span className="truncate">{label}</span>
              </span>
              <span className={`text-base font-semibold leading-tight tabular-nums ${active ? "text-indigo-900" : "text-slate-900"} ${count === 0 ? "opacity-40" : ""}`}>
                {count === null ? "–" : count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Card: search + status filter + selection toolbar + queue */}
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
            <Segmented
              ariaLabel="Filter by status"
              value={tab}
              onChange={setTab}
              options={STATUS_TABS.map((t) => ({
                value: t,
                label: (
                  <>
                    {t}
                    {counts[t] != null && <span className="ml-1 tabular-nums text-slate-400">{counts[t]}</span>}
                  </>
                ),
              }))}
            />
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
                <MousePointerClick size={13} /> Select an order to review it
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
            <button type="button" onClick={onView} disabled={!selected} className={buttonClass("primary", "sm")}>
              <FileText size={12} /> Review & Approve
            </button>
          </div>
        </div>

        {/* Queue */}
        {firstLoad ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500">Loading pending approvals...</p>
          </div>
        ) : errorMsg ? (
          <div className="m-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            <AlertCircle size={14} />
            <p className="font-medium">{errorMsg}</p>
          </div>
        ) : visible.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title={`No ${cfg.noun} match these filters`}
              description="Try a different search term or queue filter."
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={CheckCircle2}
              tone="emerald"
              title="You're all caught up"
              description={`No ${cfg.noun} pending approval.`}
            />
          )
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
            <table className="w-full whitespace-nowrap text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="w-8 py-2 pl-4 pr-1 font-medium"><span className="sr-only">Select</span></th>
                  <th className="px-3 py-2 font-medium">Purchase order</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Status</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Approval</th>
                  <th className="px-3 py-2 font-medium">Waiting</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Rev</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Date</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Work Order No</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Purchaser</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="hidden px-3 py-2 font-medium print:table-cell">Remark</th>
                  <th className="hidden px-4 py-2 text-right font-medium sm:table-cell print:hidden">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(({ r, stage, days }) => {
                  const isSelected = selectedId === r.id;
                  const href = `${cfg.base}/${r.id}`;
                  const supplier = r.supplier?.supplierName || "";
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                      aria-selected={isSelected}
                      className={`group cursor-pointer transition-colors ${isSelected ? "bg-indigo-50/70" : "hover:bg-indigo-50/40"}`}
                    >
                      <td className="py-2.5 pl-4 pr-1">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedId(r.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${r.poNo}-R${r.revision}`}
                          className="h-3.5 w-3.5 accent-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex min-w-0 max-w-[200px] items-center gap-2.5 sm:max-w-[280px]">
                          <InitialsAvatar name={supplier} size="md" />
                          <div className="min-w-0">
                            <Link
                              href={href}
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              {r.poNo}-R{r.revision}
                            </Link>
                            <p className="truncate text-xs text-slate-500" title={supplier}>{supplier || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2.5 md:table-cell">
                        <StatusBadge status={r.status} tone={poStatusTone(r.status)} />
                      </td>
                      <td className="hidden px-3 py-2.5 sm:table-cell">
                        <Badge tone={stage.tone} icon={ShieldCheck}>{stage.label}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ring-1 ring-inset ${ageClass(days)}`}
                          title={days === null ? undefined : `Waiting since ${new Date(waitingSince(r, stage.tier2 === "current") as string).toLocaleString()}`}
                        >
                          <Clock size={11} />
                          {ageLabel(days)}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2.5 xl:table-cell">
                        <span className="rounded bg-slate-100 px-1 py-px font-mono text-[11px] font-medium text-slate-500">{r.revision}</span>
                      </td>
                      <td className="hidden px-3 py-2.5 text-xs text-slate-500 lg:table-cell">{fmtDate(r.date)}</td>
                      <td className="hidden px-3 py-2.5 font-mono text-xs text-slate-600 lg:table-cell">{r.workOrderNo || "—"}</td>
                      <td className="hidden px-3 py-2.5 md:table-cell">
                        <div className="flex items-center gap-2">
                          <InitialsAvatar name={r.purchaser?.name} />
                          <span className="text-slate-600">{r.purchaser?.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                        {fmtAmount(r.amountAfterTax)}
                      </td>
                      <td className="hidden max-w-[150px] truncate px-3 py-2.5 text-slate-600 print:table-cell print:whitespace-normal" title={r.remark || ""}>
                        {r.remark || "—"}
                      </td>
                      <td className="hidden px-4 py-2.5 text-right sm:table-cell print:hidden">
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className={buttonClass("secondary", "sm", "lg:opacity-75 lg:group-hover:opacity-100")}
                        >
                          Review <ArrowRight size={12} />
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

      {!errorMsg && visible.length > 0 && (
        <p className="px-1 text-[11px] text-slate-400">
          Showing <span className="font-medium tabular-nums text-slate-600">{visible.length}</span> of{" "}
          <span className="font-medium tabular-nums text-slate-600">{rows.length}</span> {cfg.noun} awaiting approval
        </p>
      )}
    </div>
  );
}
