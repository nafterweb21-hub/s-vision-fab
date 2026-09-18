import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Factory,
  ShieldCheck,
  ShoppingCart,
  Target,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { getScorecard, type CustomRange, type KpiResult, type KraResult } from "@/lib/kpi";
import {
  DEFAULT_PERIOD,
  PERIODS,
  isPeriodKey,
  parseDateInput,
  toDateInput,
  type KpiUnit,
  type RagStatus,
} from "@/lib/kpi.config";
import DateRangePicker from "./DateRangePicker";

export const dynamic = "force-dynamic";

const KRA_ICONS: Record<string, LucideIcon> = {
  SALES: ShoppingCart,
  DELIVERY: Truck,
  PRODUCTION: Factory,
  QUALITY: ShieldCheck,
  PROCUREMENT: BadgeCheck,
  FINANCE: Banknote,
};

const RAG: Record<RagStatus, { label: string; text: string; bg: string; border: string; bar: string; dot: string }> = {
  "on-track": {
    label: "On track",
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  "at-risk": {
    label: "At risk",
    text: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  "off-track": {
    label: "Off track",
    text: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
  },
};

function formatValue(value: number, unit: KpiUnit): string {
  switch (unit) {
    case "%":
      return `${value.toFixed(1)}%`;
    case "days":
      return `${value.toFixed(1)} d`;
    case "count":
      return Math.round(value).toLocaleString();
    case "INR":
      if (value >= 1_000_000) return `INR ${(value / 1_000_000).toFixed(2)}M`;
      if (value >= 1_000) return `INR ${(value / 1_000).toFixed(1)}K`;
      return `INR ${value.toFixed(0)}`;
  }
}

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function AccessDenied() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
      <h1 className="text-2xl font-bold text-blue-900">Access denied</h1>
      <p className="mt-2 text-blue-500">You must be an administrator to view this page.</p>
    </div>
  );
}

function KpiRow({ kpi }: { kpi: KpiResult }) {
  const rag = RAG[kpi.status];
  const unmeasured = kpi.sampleSize === 0;
  const fill = Math.min(100, Math.max(0, kpi.attainment * 100));

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{kpi.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">{kpi.basis}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-lg font-extrabold ${unmeasured ? "text-slate-300" : "text-slate-900"}`}>
            {unmeasured ? "—" : formatValue(kpi.value, kpi.unit)}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">
            {kpi.direction === "up" ? "≥" : "≤"} {formatValue(kpi.effectiveTarget, kpi.unit)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${unmeasured ? "bg-slate-200" : rag.bar}`}
            style={{ width: `${unmeasured ? 0 : fill}%` }}
          />
        </div>
        {unmeasured ? (
          <span className="w-24 shrink-0 text-right text-[11px] font-semibold text-slate-400">No data</span>
        ) : (
          <span className={`w-24 shrink-0 text-right text-xs font-bold ${rag.text}`}>
            {Math.round(kpi.attainment * 100)}% · {rag.label}
          </span>
        )}
      </div>
    </div>
  );
}

function KraCard({ kra }: { kra: KraResult }) {
  const Icon = KRA_ICONS[kra.code] ?? Target;
  const rag = RAG[kra.status];
  const measured = kra.kpis.some((kpi) => kpi.sampleSize > 0);

  return (
    <div className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-6">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              measured ? `${rag.bg} ${rag.text}` : "bg-slate-50 text-slate-300"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{kra.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Owner · {kra.owner}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-extrabold ${measured ? rag.text : "text-slate-300"}`}>
            {measured ? `${Math.round(kra.score)}%` : "—"}
          </p>
          {measured ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${rag.border} ${rag.bg} ${rag.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${rag.dot}`} /> {rag.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> No data
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100 px-6 pb-2">
        {kra.kpis.map((kpi) => (
          <KpiRow key={kpi.code} kpi={kpi} />
        ))}
      </div>
    </div>
  );
}

export default async function SuperAdminKpiPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return <AccessDenied />;

  const { period: requested, from, to } = await searchParams;

  // A custom range needs two well-formed dates the right way round. Anything
  // else — a hand-edited URL, a half-filled range — falls back to the default
  // period rather than reporting on a nonsense window.
  const fromDate = parseDateInput(from);
  const toDate = parseDateInput(to);
  const custom: CustomRange | undefined =
    fromDate && toDate && fromDate <= toDate ? { from: fromDate, to: toDate } : undefined;

  const asked = isPeriodKey(requested) ? requested : DEFAULT_PERIOD;
  const period = asked === "CUSTOM" && !custom ? DEFAULT_PERIOD : asked;

  const scorecard = await getScorecard(period, custom);
  const overall = RAG[scorecard.overallStatus];
  const isCustom = period === "CUSTOM";

  return (
    <div className="animate-fade-in space-y-8 pb-12">
      {/* Header */}
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-[100vw] overflow-hidden rounded-b-3xl bg-slate-900 px-4 pt-6 pb-8 shadow-2xl sm:px-8 sm:pt-8 sm:pb-10 md:px-12 lg:px-16">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-emerald-600/20 blur-3xl" />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="ml-16 max-w-2xl md:ml-20 lg:ml-24 xl:ml-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Super Admin
            </span>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              KPI &amp; KRA Scorecard
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-slate-300">
              {formatDate(scorecard.from)} — {formatDate(scorecard.to)}. Every figure is derived
              live from the document trail; targets come from the KPI configuration.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {PERIODS.map((option) => {
                const active = option.key === period;
                return (
                  <Link
                    key={option.key}
                    href={`/dashboard/admin/kpi?period=${option.key}`}
                    className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
                      active
                        ? "border-white/20 bg-white text-slate-900"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-3">
              <DateRangePicker
                from={toDateInput(scorecard.from)}
                to={toDateInput(scorecard.to)}
                active={isCustom}
              />
            </div>
          </div>

          <div className="flex min-w-[260px] flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
              Overall Attainment
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-white">
                {Math.round(scorecard.overallScore)}%
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${overall.bg} ${overall.text}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${overall.dot}`} /> {overall.label}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full rounded-full ${overall.bar}`}
                style={{ width: `${Math.min(100, Math.max(0, scorecard.overallScore))}%` }}
              />
            </div>
            <p className="text-xs font-medium text-slate-300">
              Mean of {scorecard.kras.length} key result areas
            </p>
          </div>
        </div>
      </div>

      {/* Needs attention */}
      <div className="relative z-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Needs Attention
          </h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500">
            <Activity className="h-3 w-3" /> {scorecard.attention.length} KPIs below target
          </span>
        </div>

        {scorecard.attention.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-slate-500">
            Every measured KPI is at or above target for this period.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scorecard.attention.slice(0, 6).map(({ kra, kpi }) => {
              const rag = RAG[kpi.status];
              return (
                <div
                  key={`${kra}-${kpi.code}`}
                  className={`rounded-2xl border p-4 ${rag.border} ${rag.bg}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {kra}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{kpi.name}</p>
                    </div>
                    <span className={`shrink-0 text-sm font-extrabold ${rag.text}`}>
                      {Math.round(kpi.attainment * 100)}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    {formatValue(kpi.value, kpi.unit)}{" "}
                    <span className="font-medium text-slate-400">
                      vs {kpi.direction === "up" ? "≥" : "≤"}{" "}
                      {formatValue(kpi.effectiveTarget, kpi.unit)} target
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KRA scorecards */}
      <div>
        <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
          <Target className="h-5 w-5 text-indigo-600" />
          Key Result Areas
        </h3>
        <div className="grid gap-8 lg:grid-cols-2">
          {scorecard.kras.map((kra) => (
            <KraCard key={kra.code} kra={kra} />
          ))}
        </div>
      </div>
    </div>
  );
}
