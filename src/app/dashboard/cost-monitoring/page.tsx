"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart2,
  Search,
  SearchX,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Wallet,
  Coins,
  Scale,
  AlertTriangle,
  Hourglass,
} from "lucide-react";
import { Badge, EmptyState, StatusBadge, buttonClass, checkboxClass, selectTriggerClass } from "@/components/form-ui";

type CostData = {
  workOrderNo: string;
  customerName: string;
  date: string;
  revenue: number;
  laborCost: number;
  materialCost: number;
  subconCost: number;
  totalCost: number;
  profit: number;
  /** Null when the WO has no revenue. */
  margin: number | null;
  /** Value of Draft / pending-approval POs, not counted in the costs. */
  pendingPoCost: number;
  committedPoCount: number;
  status: string;
};

type SortKey = "newest" | "margin-asc" | "profit-asc" | "cost-desc" | "revenue-desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "margin-asc", label: "Lowest margin first" },
  { key: "profit-asc", label: "Lowest profit first" },
  { key: "cost-desc", label: "Highest cost first" },
  { key: "revenue-desc", label: "Highest revenue first" },
];

// Cost-type series, in fixed categorical order (validated: dataviz validate_palette, light surface).
// Values always sit in their own table columns, so colour is never the only cue.
const SERIES = [
  { key: "laborCost", label: "Labor", color: "#2a78d6" },
  { key: "materialCost", label: "Material", color: "#eb6834" },
  { key: "subconCost", label: "Subcon", color: "#1baf7a" },
] as const;

const inr = (val: number, digits = 2) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    val || 0,
  );
const fmtDate = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

/** Margin band → reserved status colour, always with an icon and a label. */
function marginBand(margin: number | null) {
  if (margin === null) return { tone: "slate" as const, icon: Minus, label: "No revenue" };
  if (margin < 0) return { tone: "rose" as const, icon: TrendingDown, label: "Loss" };
  if (margin < 20) return { tone: "amber" as const, icon: TrendingUp, label: "Thin" };
  return { tone: "emerald" as const, icon: TrendingUp, label: "Healthy" };
}

export default function CostMonitoringPage() {
  const [data, setData] = useState<CostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [lossOnly, setLossOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");

  // Debounce the server-side search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cost-monitoring?search=${encodeURIComponent(debouncedSearch)}`);
        if (!res.ok) throw new Error("Failed to fetch cost monitoring data");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const statuses = useMemo(() => ["All", ...Array.from(new Set(data.map((d) => d.status))).sort()], [data]);

  const rows = useMemo(() => {
    let r = data;
    if (status !== "All") r = r.filter((d) => d.status === status);
    if (lossOnly) r = r.filter((d) => d.profit < 0);
    const sorted = [...r];
    const by: Record<SortKey, (a: CostData, b: CostData) => number> = {
      newest: () => 0, // API order (newest first)
      "margin-asc": (a, b) => (a.margin ?? Infinity) - (b.margin ?? Infinity),
      "profit-asc": (a, b) => a.profit - b.profit,
      "cost-desc": (a, b) => b.totalCost - a.totalCost,
      "revenue-desc": (a, b) => b.revenue - a.revenue,
    };
    if (sort !== "newest") sorted.sort(by[sort]);
    return sorted;
  }, [data, status, lossOnly, sort]);

  const totals = useMemo(() => {
    const t = { revenue: 0, laborCost: 0, materialCost: 0, subconCost: 0, totalCost: 0, profit: 0, pendingPoCost: 0, losses: 0 };
    for (const r of rows) {
      t.revenue += r.revenue;
      t.laborCost += r.laborCost;
      t.materialCost += r.materialCost;
      t.subconCost += r.subconCost;
      t.totalCost += r.totalCost;
      t.profit += r.profit;
      t.pendingPoCost += r.pendingPoCost;
      if (r.profit < 0) t.losses += 1;
    }
    return { ...t, margin: t.revenue > 0 ? (t.profit / t.revenue) * 100 : null };
  }, [rows]);

  const hasFilters = search.trim() !== "" || status !== "All" || lossOnly;
  const clearFilters = () => {
    setSearch("");
    setStatus("All");
    setLossOnly(false);
  };
  const firstLoad = loading && data.length === 0;
  const overall = marginBand(totals.margin);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 sm:inline-flex">
          <BarChart2 size={18} />
        </span>
        <div className="min-w-0">
          <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
            <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
            <span>/</span>
            <span className="text-slate-500">Cost Monitoring</span>
          </nav>
          <h1 className="text-lg font-semibold leading-tight text-slate-900">Cost Monitoring</h1>
          <p className="text-xs text-slate-500">Revenue, cost and margin per work order. Costs use Approved / Issued POs in base currency.</p>
        </div>
      </div>

      {/* Headline tiles — totals over the rows currently shown */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Wallet} label="Revenue" value={firstLoad ? null : inr(totals.revenue, 0)} sub={`${rows.length} work order${rows.length === 1 ? "" : "s"}`} />
        <StatTile
          icon={Coins}
          label="Total cost"
          value={firstLoad ? null : inr(totals.totalCost, 0)}
          sub={
            !firstLoad && totals.totalCost > 0 ? (
              <span className="block space-y-1.5">
                <CostBar parts={SERIES.map((s) => ({ ...s, value: totals[s.key] }))} total={totals.totalCost} height="h-1.5" />
                <Legend values={SERIES.map((s) => ({ ...s, value: totals[s.key] }))} />
              </span>
            ) : (
              "Labor + material + subcon"
            )
          }
        />
        <StatTile
          icon={Scale}
          label="Profit"
          value={firstLoad ? null : inr(totals.profit, 0)}
          sub={
            <span className="inline-flex items-center gap-1.5">
              <Badge tone={overall.tone} icon={overall.icon}>
                {totals.margin === null ? overall.label : `${totals.margin.toFixed(1)}% · ${overall.label}`}
              </Badge>
              <span className="text-slate-400">overall margin</span>
            </span>
          }
        />
        <StatTile
          icon={AlertTriangle}
          label="Loss-making"
          value={firstLoad ? null : String(totals.losses)}
          sub={
            totals.pendingPoCost > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <Hourglass size={11} /> {inr(totals.pendingPoCost, 0)} in POs awaiting approval
              </span>
            ) : (
              "Work orders with negative profit"
            )
          }
          action={
            totals.losses > 0 && !lossOnly ? (
              <button type="button" onClick={() => setLossOnly(true)} className={buttonClass("link", "xs")}>
                Show
              </button>
            ) : undefined
          }
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Filters */}
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2.5 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by WO No or Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectTriggerClass} w-full lg:w-44`} aria-label="Work order status">
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All statuses" : s}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${selectTriggerClass} w-full lg:w-48`} aria-label="Sort">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <label className="inline-flex h-8 cursor-pointer items-center gap-2 text-[13px] text-slate-700">
            <input type="checkbox" checked={lossOnly} onChange={(e) => setLossOnly(e.target.checked)} className={checkboxClass} />
            Loss-making only
          </label>
          <div className="flex items-center gap-2 lg:ml-auto">
            {loading && data.length > 0 && <Loader2 size={14} className="animate-spin text-indigo-500" aria-label="Refreshing" />}
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={buttonClass("ghost", "sm")}>
                Clear filters
              </button>
            )}
          </div>
        </div>

        {firstLoad ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500">Loading cost data...</p>
          </div>
        ) : error ? (
          <div className="m-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            <AlertCircle size={14} />
            <p className="font-medium">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No work orders match these filters"
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState icon={BarChart2} tone="indigo" title="No work orders yet" description="Work orders appear here once created; costs build up from timesheets and POs." />
          )
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-2 pl-4 pr-3 font-medium">Work Order</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                  {SERIES.map((s) => (
                    <th key={s.key} className="hidden px-3 py-2 text-right font-medium lg:table-cell">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} aria-hidden />
                        {s.label}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Total Cost</th>
                  <th className="px-3 py-2 text-right font-medium">Profit</th>
                  <th className="py-2 pl-3 pr-4 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((item) => {
                  const band = marginBand(item.margin);
                  return (
                    <tr key={item.workOrderNo} className="align-top transition-colors hover:bg-indigo-50/40">
                      <td className="py-2 pl-4 pr-3">
                        <Link
                          href={`/dashboard/production/work-order/${item.workOrderNo}`}
                          className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {item.workOrderNo}
                        </Link>
                        <p className="text-[11px] text-slate-400">{fmtDate(item.date)}</p>
                      </td>
                      <td className="max-w-[220px] px-3 py-2">
                        <p className="truncate font-medium text-slate-800" title={item.customerName}>{item.customerName}</p>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-900"><span className="whitespace-nowrap">{inr(item.revenue)}</span></td>
                      {SERIES.map((s) => (
                        <td key={s.key} className={`hidden px-3 py-2 text-right tabular-nums lg:table-cell ${item[s.key] ? "text-slate-600" : "text-slate-300"}`}>
                          {inr(item[s.key])}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <p className="whitespace-nowrap font-semibold tabular-nums text-slate-900">{inr(item.totalCost)}</p>
                        {item.totalCost > 0 && (
                          <div className="ml-auto mt-1 w-28">
                            <CostBar parts={SERIES.map((s) => ({ ...s, value: item[s.key] }))} total={item.totalCost} height="h-1" />
                          </div>
                        )}
                        {item.pendingPoCost > 0 && (
                          <p className="mt-0.5 inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-amber-700" title="Draft or pending-approval POs, not counted yet">
                            <Hourglass size={10} /> +{inr(item.pendingPoCost, 0)} pending
                          </p>
                        )}
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold tabular-nums ${item.profit < 0 ? "text-rose-700" : "text-slate-900"}`}>
                        <span className="whitespace-nowrap">{inr(item.profit)}</span>
                      </td>
                      <td className="py-2 pl-3 pr-4 text-right">
                        <Badge tone={band.tone} icon={band.icon}>
                          {item.margin === null ? band.label : `${item.margin.toFixed(1)}%`}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50/70 text-[13px] font-semibold">
                <tr>
                  <td colSpan={2} className="py-2 pl-4 pr-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Total · {rows.length} work order{rows.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-900">{inr(totals.revenue)}</td>
                  {SERIES.map((s) => (
                    <td key={s.key} className="hidden px-3 py-2 text-right tabular-nums text-slate-700 lg:table-cell">
                      {inr(totals[s.key])}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right tabular-nums text-slate-900">{inr(totals.totalCost)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${totals.profit < 0 ? "text-rose-700" : "text-slate-900"}`}><span className="whitespace-nowrap">{inr(totals.profit)}</span></td>
                  <td className="py-2 pl-3 pr-4 text-right">
                    <Badge tone={overall.tone} icon={overall.icon}>
                      {totals.margin === null ? overall.label : `${totals.margin.toFixed(1)}%`}
                    </Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="px-1 text-[11px] text-slate-400">
        Margin bands: <span className="text-slate-500">Healthy ≥ 20%</span> · <span className="text-slate-500">Thin 0–20%</span> ·{" "}
        <span className="text-slate-500">Loss &lt; 0%</span>. Labor = timesheet minutes × the process&apos;s cost per minute.
      </p>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | null;
  sub?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          <Icon size={12} className="text-slate-400" /> {label}
        </p>
        {action}
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-slate-900">{value ?? "–"}</p>
      {sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

/** Stacked share-of-cost bar with 2px surface gaps between segments; each segment has a tooltip. */
function CostBar({
  parts,
  total,
  height,
}: {
  parts: { key: string; label: string; color: string; value: number }[];
  total: number;
  height: string;
}) {
  const visible = parts.filter((p) => p.value > 0);
  return (
    <div className={`flex w-full gap-[2px] overflow-hidden rounded-full bg-slate-100 ${height}`} role="img" aria-label={visible.map((p) => `${p.label} ${inr(p.value)}`).join(", ")}>
      {visible.map((p) => (
        <span
          key={p.key}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
          title={`${p.label}: ${inr(p.value)} (${((p.value / total) * 100).toFixed(0)}%)`}
        />
      ))}
    </div>
  );
}

function Legend({ values }: { values: { key: string; label: string; color: string; value: number }[] }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5">
      {values.map((v) => (
        <span key={v.key} className="inline-flex items-center gap-1 text-slate-600">
          <span className="h-2 w-2 rounded-sm" style={{ background: v.color }} aria-hidden />
          {v.label}
        </span>
      ))}
    </span>
  );
}
