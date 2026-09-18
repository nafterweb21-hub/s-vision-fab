/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { getCompletedSessions } from "../actions";

type Result = Awaited<ReturnType<typeof getCompletedSessions>>;

const PAGE_SIZE = 15;

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtTime = (v?: string | null) =>
  v ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--";

const fmtMins = (m: number) => {
  const t = Math.round(m);
  const h = Math.floor(t / 60);
  return h ? `${h}h ${t % 60}m` : `${t}m`;
};

function dayLabel(key: string) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (key === ymd(today)) return "Today";
  if (key === ymd(yesterday)) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

/** 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, count: number): (number | "…")[] {
  const pages = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

const QC_STYLE: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function HistoryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [qInput, setQInput] = useState(q);
  // Loading is derived from "which request the shown data belongs to", so no state is set synchronously in the effect.
  const requestKey = `${q}|${from}|${to}|${page}`;
  const [loaded, setLoaded] = useState<{ key: string; data: Result | null; error: string }>({ key: "", data: null, error: "" });
  const data = loaded.data;
  const loading = loaded.key !== requestKey;
  const error = loading ? "" : loaded.error;
  const [openId, setOpenId] = useState<string | null>(null);

  function update(patch: Record<string, string | number | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || (k === "page" && v === 1)) next.delete(k);
      else next.set(k, String(v));
    }
    if (!("page" in patch)) next.delete("page"); // any filter change starts again from page 1
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Search-as-you-type, without a request per keystroke.
  useEffect(() => {
    if (qInput === q) return;
    const t = setTimeout(() => update({ q: qInput.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  useEffect(() => {
    let cancelled = false;
    getCompletedSessions({ q, from, to, page, pageSize: PAGE_SIZE, tzOffsetMinutes: new Date().getTimezoneOffset() })
      .then((r) => {
        if (cancelled) return;
        setLoaded({ key: requestKey, data: r, error: "" });
        setOpenId(null);
      })
      .catch(() => {
        if (!cancelled) setLoaded((prev) => ({ key: requestKey, data: prev.data, error: "Could not load your history. Please try again." }));
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, q, from, to, page]);

  const ranges = useMemo(() => {
    const now = new Date();
    const back = (days: number) => {
      const d = new Date();
      d.setDate(now.getDate() - days);
      return ymd(d);
    };
    const months = new Date();
    months.setMonth(now.getMonth() - 6);
    return [
      { label: "Today", from: ymd(now), to: ymd(now) },
      { label: "Last 7 days", from: back(6), to: ymd(now) },
      { label: "Last 30 days", from: back(29), to: ymd(now) },
      { label: "Last 6 months", from: ymd(months), to: ymd(now) },
      { label: "All time", from: "", to: "" },
    ];
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const r of data?.rows ?? []) {
      const key = ymd(new Date(r.timeOut));
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()];
  }, [data]);

  const hasFilters = !!(q || from || to);
  const firstRow = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastRow = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Completed Work</h2>
        <p className="text-sm text-slate-500">
          {data?.scope === "all" ? "Every worker's finished sessions." : "Your finished sessions, newest first."}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 md:p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2 md:gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search work order, customer or process…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
            {qInput && (
              <button
                onClick={() => {
                  setQInput("");
                  update({ q: "" });
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => update({ from: e.target.value })}
              aria-label="From date"
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
            <span className="text-slate-400 text-sm">to</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => update({ to: e.target.value })}
              aria-label="To date"
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ranges.map((r) => {
            const active = r.from === from && r.to === to;
            return (
              <button
                key={r.label}
                onClick={() => update({ from: r.from, to: r.to })}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  active ? "bg-cyan-500 text-white border-cyan-500" : "bg-white text-slate-600 border-slate-200 hover:border-cyan-300"
                }`}
              >
                {r.label}
              </button>
            );
          })}
          {hasFilters && (
            <button
              onClick={() => {
                setQInput("");
                router.replace(pathname, { scroll: false });
              }}
              className="ml-auto text-xs font-bold text-slate-500 hover:text-rose-600 underline underline-offset-2"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Totals for the current filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {[
          { label: "Sessions", value: data?.totals.sessions ?? 0, tone: "text-slate-900" },
          { label: "Pieces done", value: data?.totals.completedQty ?? 0, tone: "text-emerald-600" },
          { label: "Rejected", value: data?.totals.rejectedQty ?? 0, tone: "text-rose-600" },
          { label: "Time worked", value: fmtMins(data?.totals.minutes ?? 0), tone: "text-cyan-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-2xl shadow-sm px-4 py-3">
            <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{c.label}</div>
            <div className={`text-xl md:text-2xl font-bold ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className={`space-y-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm">{error}</div>}

        {!error && !loading && data && data.total === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
            {hasFilters ? "No completed sessions match these filters." : "You have no completed sessions yet."}
          </div>
        )}

        {groups.map(([day, rows]) => (
          <section key={day}>
            <h3 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2 px-1">{dayLabel(day)}</h3>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
              {rows.map((r) => {
                const wo = r.routingProcess?.inProcess;
                const open = openId === r.id;
                const done = Number(r.completedQty) || 0;
                const rej = Number(r.rejectedQty) || 0;
                return (
                  <div key={r.id}>
                    <button
                      onClick={() => setOpenId(open ? null : r.id)}
                      aria-expanded={open}
                      className="w-full text-left px-3 md:px-5 py-3 md:py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span className="font-bold text-sm md:text-base text-slate-900">{wo?.workOrderNo}</span>
                          <span className="text-xs md:text-sm font-semibold text-emerald-700">
                            {[r.routingProcess?.mainProcess?.process, r.routingProcess?.routingProcess?.routingProcess].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {wo?.workOrder?.customer?.customerName}
                          {" · "}
                          {fmtTime(r.timeIn)} – {fmtTime(r.timeOut)}
                          {r.totalMinutes != null && ` · ${fmtMins(Number(r.totalMinutes))}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-emerald-600">{done}</span>
                        {rej > 0 && <span className="text-sm font-bold text-rose-600">/ {rej} rej</span>}
                        <span className={`hidden sm:inline text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${QC_STYLE[r.qcStatus] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                          QC {r.qcStatus}
                        </span>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {open && (
                      <dl className="px-3 md:px-5 pb-4 pt-1 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-sm bg-slate-50/60">
                        {[
                          ["Job", wo?.workOrder?.jobDescription],
                          ["In-process", wo?.description],
                          ["Work order qty", wo?.workOrder?.quantity != null ? `${Number(wo.workOrder.quantity)} ${wo.workOrder.uom ?? ""}`.trim() : null],
                          ["Started", r.timeIn ? new Date(r.timeIn).toLocaleString() : null],
                          ["Finished", r.timeOut ? new Date(r.timeOut).toLocaleString() : null],
                          ["Idle time", Number(r.totalIdleMinutes) > 0 ? fmtMins(Number(r.totalIdleMinutes)) : null],
                          ["Machines", r.machineCodes],
                          ["Reject reason", r.rejectReason],
                          ["QC", `${r.qcStatus}${r.qcRemark ? ` — ${r.qcRemark}` : ""}`],
                          ...(data?.scope === "all" ? [["Worker", `${r.employee?.name} (${r.employee?.code})`]] : []),
                        ]
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <div key={k as string}>
                              <dt className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{k}</dt>
                              <dd className="text-slate-800 break-words">{v}</dd>
                            </div>
                          ))}
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-6">
          <p className="text-xs text-slate-500">
            Showing <b>{firstRow}–{lastRow}</b> of <b>{data.total}</b>
          </p>
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <button
              onClick={() => update({ page: data.page - 1 })}
              disabled={data.page <= 1}
              className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-cyan-300"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {pageWindow(data.page, data.pageCount).map((p, i) =>
              p === "…" ? (
                <span key={`gap-${i}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => update({ page: p })}
                  aria-current={p === data.page ? "page" : undefined}
                  className={`min-w-9 px-2 py-2 rounded-lg border text-sm font-bold ${
                    p === data.page ? "bg-cyan-500 text-white border-cyan-500" : "bg-white text-slate-600 border-slate-200 hover:border-cyan-300"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              onClick={() => update({ page: data.page + 1 })}
              disabled={data.page >= data.pageCount}
              className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:border-cyan-300"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
