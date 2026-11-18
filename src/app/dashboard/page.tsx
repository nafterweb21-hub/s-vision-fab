"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Factory,
  FileText,
  Gauge,
  PieChart,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { canAccess } from "@/lib/access";
import { getDashboardMetrics } from "./dashboard.actions";

/* ------------------------------------------------------------------ helpers */

const formatCurrency = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
};

const formatDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

// Full class strings so Tailwind can see them.
const TONES = {
  blue: { pill: "bg-blue-50 text-blue-700 ring-blue-600/15", dot: "bg-blue-500", hex: "#3b82f6" },
  amber: { pill: "bg-amber-50 text-amber-700 ring-amber-600/15", dot: "bg-amber-500", hex: "#f59e0b" },
  emerald: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot: "bg-emerald-500", hex: "#10b981" },
  rose: { pill: "bg-rose-50 text-rose-700 ring-rose-600/15", dot: "bg-rose-500", hex: "#f43f5e" },
  orange: { pill: "bg-orange-50 text-orange-700 ring-orange-600/15", dot: "bg-orange-500", hex: "#f97316" },
  slate: { pill: "bg-slate-100 text-slate-600 ring-slate-500/15", dot: "bg-slate-400", hex: "#94a3b8" },
} as const;
type Tone = keyof typeof TONES;

const WO_STATUS_TONE: Record<string, Tone> = {
  WIP: "blue",
  Proceed: "amber",
  "Pending QC": "orange",
  Completed: "emerald",
};
const QC_TONE: Record<string, Tone> = { Approved: "emerald", Rejected: "rose" };
const NCR_TONE: Record<string, Tone> = {
  Draft: "amber",
  "Pending Closure": "rose",
  Closed: "emerald",
  Completed: "emerald",
};
const DIST_TONE: Record<string, Tone> = {
  WIP: "blue",
  Proceed: "amber",
  Completed: "emerald",
  "Pending QC": "rose",
  Others: "slate",
};

/* --------------------------------------------------------------- primitives */

function StatusPill({ label, tone = "slate" }: { label?: string | null; tone?: Tone }) {
  if (!label) return <span className="text-slate-400">—</span>;
  const t = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${t.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {label}
    </span>
  );
}

function Card({
  title,
  icon: Icon,
  action,
  children,
  className = "",
  bodyClassName = "p-4",
}: {
  title: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`flex flex-col rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
          <Icon size={15} className="text-slate-500" />
          {title}
        </h2>
        {action}
      </header>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
      {label} <ArrowRight size={12} />
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-xs text-slate-500">{children}</p>;
}

function StatCard({
  href,
  label,
  value,
  sub,
  icon: Icon,
  iconClass,
  loading,
}: {
  href: string;
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  icon: LucideIcon;
  iconClass: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-indigo-200"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
          {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-100 align-middle" /> : value}
        </p>
        <p className="mt-1 truncate text-xs text-slate-500">{loading ? " " : sub}</p>
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
        <Icon size={17} />
      </div>
    </Link>
  );
}

/* --------------------------------------------------------------------- page */

type Metrics = Awaited<ReturnType<typeof getDashboardMetrics>>;

const EMPTY_METRICS: Metrics = {
  activeWorkOrders: { count: 0, pendingQc: 0, onHold: 0 },
  openSalesOrders: { count: 0, totalValue: 0 },
  posAwaitingDelivery: { count: 0, overdue: 0 },
  openNcrs: { count: 0, pendingClosure: 0 },
  recentWorkOrders: [],
  processLoad: [],
  pendingPoApprovals: { urgentCount: 0, list: [] },
  recentNcrsList: [],
  woStatusDistribution: { total: 0, distribution: [] },
  companyProfiles: [],
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const permissions = session?.user?.permissions || null;
  const role = session?.user?.role || null;
  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "";

  const [storedCompany, setActiveCompany] = useState("");
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  // Active company comes from real company profiles: the stored choice if it still exists, else the first profile.
  const activeCompany =
    metrics.companyProfiles.find((c) => c.companyName === storedCompany)?.companyName ??
    metrics.companyProfiles[0]?.companyName ??
    "";
  const currentCompany = metrics.companyProfiles.find((c) => c.companyName === activeCompany);

  useEffect(() => {
    const stored = localStorage.getItem("fitprise_company");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    if (stored) setActiveCompany(stored);

    const handleCompanyChange = () => {
      const updated = localStorage.getItem("fitprise_company");
      if (updated) setActiveCompany(updated);
    };
    window.addEventListener("companyChanged", handleCompanyChange);

    getDashboardMetrics()
      .then((data) => setMetrics(data))
      .finally(() => setLoading(false));

    return () => window.removeEventListener("companyChanged", handleCompanyChange);
  }, []);

  const allowSales = canAccess("/dashboard/sales/sales-order", permissions, role);
  const allowPurchasing = canAccess("/dashboard/purchasing/purchase-order", permissions, role);
  const allowProduction = canAccess("/dashboard/production/work-order", permissions, role);
  const allowQC = canAccess("/dashboard/qc/ncr", permissions, role);
  const isAdmin = role === "ADMIN";

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const distribution: { label: string; value: number }[] = metrics.woStatusDistribution?.distribution?.length
    ? metrics.woStatusDistribution.distribution
    : ["WIP", "Proceed", "Completed", "Pending QC", "Others"].map((label) => ({ label, value: 0 }));
  const distTotal = metrics.woStatusDistribution?.total || 0;

  const processLoad = metrics.processLoad.slice(0, 8);

  return (
    <div className="space-y-4 pb-8">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {greeting()}
            {userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-xs text-slate-500">{today} · Here’s what needs attention today</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700">
            <Building2 size={14} className="text-slate-400" />
            {activeCompany || "No company configured"}
          </span>
          {allowProduction && (
            <Link
              href="/dashboard/production/work-order"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <ClipboardList size={14} /> Work orders
            </Link>
          )}
          {allowSales && (
            <Link
              href="/dashboard/sales/sales-order"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus size={14} /> Sales order
            </Link>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {allowProduction && (
          <StatCard
            href="/dashboard/production/work-order"
            label="Active work orders"
            value={metrics.activeWorkOrders.count}
            sub={`${metrics.activeWorkOrders.pendingQc} pending QC · ${metrics.activeWorkOrders.onHold} on hold`}
            icon={ClipboardList}
            iconClass="bg-indigo-50 text-indigo-600"
            loading={loading}
          />
        )}
        {allowSales && (
          <StatCard
            href="/dashboard/sales/sales-order"
            label="Open sales orders"
            value={metrics.openSalesOrders.count}
            sub={`${formatCurrency(metrics.openSalesOrders.totalValue)} total value`}
            icon={ShoppingCart}
            iconClass="bg-amber-50 text-amber-600"
            loading={loading}
          />
        )}
        {allowPurchasing && (
          <StatCard
            href="/dashboard/purchasing/purchase-order"
            label="POs awaiting delivery"
            value={metrics.posAwaitingDelivery.count}
            sub={
              metrics.posAwaitingDelivery.overdue > 0 ? (
                <span className="font-medium text-rose-600">{metrics.posAwaitingDelivery.overdue} overdue</span>
              ) : (
                "None overdue"
              )
            }
            icon={Truck}
            iconClass="bg-sky-50 text-sky-600"
            loading={loading}
          />
        )}
        {allowQC && (
          <StatCard
            href="/dashboard/qc/ncr"
            label="Open NCRs"
            value={metrics.openNcrs.count}
            sub={`${metrics.openNcrs.pendingClosure} pending closure`}
            icon={AlertCircle}
            iconClass="bg-rose-50 text-rose-600"
            loading={loading}
          />
        )}
      </div>

      {/* Work orders + status */}
      {allowProduction && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card
            title="Recent work orders"
            icon={ClipboardList}
            action={<ViewAll href="/dashboard/production/work-order" />}
            className="xl:col-span-2"
            bodyClassName=""
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 font-medium">WO no.</th>
                    <th className="px-4 py-2 font-medium">Customer</th>
                    <th className="hidden px-4 py-2 font-medium sm:table-cell">Delivery</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">QC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recentWorkOrders.length > 0 ? (
                    metrics.recentWorkOrders.map((wo, i) => (
                      <tr key={`${wo.workOrderNo}-${i}`} className="hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-900">{wo.workOrderNo}</td>
                        <td className="max-w-[220px] truncate px-4 py-2 text-slate-600">{wo.customerName}</td>
                        <td className="hidden whitespace-nowrap px-4 py-2 text-slate-500 sm:table-cell">
                          {formatDate(wo.deliveryDate)}
                        </td>
                        <td className="px-4 py-2">
                          <StatusPill label={wo.status} tone={WO_STATUS_TONE[wo.status] ?? "slate"} />
                        </td>
                        <td className="px-4 py-2">
                          <StatusPill label={wo.qcAcceptance} tone={QC_TONE[wo.qcAcceptance] ?? "slate"} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>
                        <Empty>{loading ? "Loading…" : "No recent work orders."}</Empty>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Work order status" icon={PieChart}>
            <div className="flex h-full items-center gap-6">
              <div className="relative h-28 w-28 shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="11" />
                  {(() => {
                    const c = 2 * Math.PI * 40;
                    let offset = 0;
                    return distribution.map((item) => {
                      if (!item.value || !distTotal) return null;
                      const len = (item.value / distTotal) * c;
                      const el = (
                        <circle
                          key={item.label}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={TONES[DIST_TONE[item.label] ?? "slate"].hex}
                          strokeWidth="11"
                          strokeDasharray={`${len} ${c}`}
                          strokeDashoffset={-offset}
                        />
                      );
                      offset += len;
                      return el;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-semibold tabular-nums text-slate-900">{distTotal}</span>
                  <span className="text-[10px] text-slate-500">total</span>
                </div>
              </div>
              <ul className="flex-1 space-y-2">
                {distribution.map((s) => (
                  <li key={s.label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className={`h-2 w-2 rounded-sm ${TONES[DIST_TONE[s.label] ?? "slate"].dot}`} />
                      {s.label}
                    </span>
                    <span className="font-medium tabular-nums text-slate-900">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}

      {/* Approvals, NCRs, process load */}
      {(allowPurchasing || allowQC || allowProduction) && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {allowPurchasing && (
            <Card
              title="PO approvals pending"
              icon={CheckCircle2}
              action={
                metrics.pendingPoApprovals.urgentCount > 0 ? (
                  <StatusPill label={`${metrics.pendingPoApprovals.urgentCount} urgent`} tone="rose" />
                ) : (
                  <ViewAll href="/dashboard/purchasing/purchase-order-approval" />
                )
              }
              bodyClassName=""
            >
              {metrics.pendingPoApprovals.list.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {metrics.pendingPoApprovals.list.map((po) => (
                    <li key={po.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-slate-900">{po.poNo}</span>
                          <StatusPill label={po.tier} tone={po.tier === "1st Tier" ? "amber" : "blue"} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {po.supplierName}
                          {po.workOrderNo ? ` · WO ${po.workOrderNo}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-medium tabular-nums text-slate-900">
                          ₹{Number(po.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                        <Link
                          href={`/dashboard/purchasing/purchase-order-approval/${po.id}`}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Review
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>{loading ? "Loading…" : "No pending PO approvals."}</Empty>
              )}
            </Card>
          )}

          {allowQC && (
            <Card title="Open NCRs" icon={ShieldCheck} action={<ViewAll href="/dashboard/qc/ncr" />} bodyClassName="">
              {metrics.recentNcrsList.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {metrics.recentNcrsList.map((ncr, i) => (
                    <li key={`${ncr.ncrNo}-${i}`} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-rose-600">{ncr.ncrNo}</span>
                          {ncr.workOrderNo && <span className="text-xs text-slate-400">· {ncr.workOrderNo}</span>}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-700">{ncr.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {ncr.raisedBy} · {ncr.timeText}
                        </p>
                      </div>
                      <StatusPill label={ncr.status} tone={NCR_TONE[ncr.status] ?? "slate"} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>{loading ? "Loading…" : "No open NCRs."}</Empty>
              )}
            </Card>
          )}

          {allowProduction && (
            <Card
              title="Process load · this week"
              icon={Gauge}
              action={
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>
              }
            >
              {processLoad.length > 0 ? (
                <ul className="space-y-3">
                  {processLoad.map((p) => (
                    <li key={p.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="truncate text-slate-600">{p.label}</span>
                        <span className="font-medium tabular-nums text-slate-900">{p.value}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            p.value >= 85 ? "bg-rose-500" : p.value >= 60 ? "bg-amber-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${Math.min(100, p.value)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>{loading ? "Loading…" : "No process activity this week."}</Empty>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Admin */}
      {isAdmin && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card
            title="System configuration"
            icon={Settings}
            action={<ViewAll href="/dashboard/profiles" label="All masters" />}
            className="lg:col-span-2"
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                {
                  href: "/dashboard/profiles/approval-levels",
                  icon: CheckCircle2,
                  title: "Approval levels",
                  desc: "Value bands and multi-tier approvers",
                },
                {
                  href: "/dashboard/master-profile/employee",
                  icon: Users,
                  title: "Employees",
                  desc: "Codes, FINs and designations",
                },
                {
                  href: "/dashboard/profiles/company",
                  icon: Building2,
                  title: "Company profile",
                  desc: "AS9100 notes and legal identifiers",
                },
              ].map(({ href, icon: Icon, title, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-900">{title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card title="Company rules" icon={Factory}>
            <dl className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Company</dt>
                <dd className="truncate font-medium text-slate-900">{activeCompany || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">PO linked to work orders</dt>
                <dd>
                  {!currentCompany ? (
                    "—"
                  ) : currentCompany.allowPoForWo ? (
                    <StatusPill label="Allowed" tone="emerald" />
                  ) : (
                    <StatusPill label="Standalone only" tone="slate" />
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">AS9100 note on PR / PO / Subcon</dt>
                <dd>
                  {!currentCompany ? (
                    "—"
                  ) : currentCompany.as9100RequirementNote ? (
                    <StatusPill label="On" tone="blue" />
                  ) : (
                    <StatusPill label="Off" tone="slate" />
                  )}
                </dd>
              </div>
              {!currentCompany && (
                <p className="flex items-center gap-1.5 pt-1 text-slate-500">
                  <FileText size={13} />
                  <Link href="/dashboard/profiles/company" className="text-indigo-600 hover:text-indigo-700">
                    Create a company profile
                  </Link>{" "}
                  to configure these.
                </p>
              )}
            </dl>
          </Card>
        </div>
      )}
    </div>
  );
}
