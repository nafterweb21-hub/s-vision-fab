/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast as hotToast } from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileClock,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  ShoppingCart,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { customConfirm } from "@/lib/customConfirm";
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
import {
  SO_STATUSES,
  changeSalesOrderStatus,
  normalizeSoStatus,
  soStatusTone,
  soTransitions,
  type SoStatus,
  type SoTransition,
} from "./so-status";

const ORDER_TYPES = ["All", "Direct", "Sub-contract"] as const;
type OrderTypeFilter = (typeof ORDER_TYPES)[number];
type StatusFilter = "All" | SoStatus;

const ACTION_ICON: Partial<Record<SoStatus, LucideIcon>> = {
  Confirmed: CheckCircle2,
  Revised: RotateCcw,
  Closed: Lock,
  Void: XCircle,
  "Old Version": FileClock,
};

function orderTypeTone(type: string | null | undefined): Tone {
  return type === "Sub-contract" ? "violet" : "sky";
}

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

function formatAmount(n: unknown): string {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type LoadResult = { key: string; orders: any[]; error: string };

export default function SalesOrderListPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderTypeFilter>("All");
  const [result, setResult] = useState<LoadResult | null>(null);
  const [busy, setBusy] = useState<Record<string, SoStatus>>({});

  // Debounce the server-side search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Status is filtered client-side so the summary tiles can count every status.
  const queryKey = `${debouncedSearch}|${orderTypeFilter}`;
  const loading = result?.key !== queryKey;

  useEffect(() => {
    let ignore = false;
    const [q, type] = queryKey.split("|");
    fetch(`/api/sales/sales-order?search=${encodeURIComponent(q)}&status=All&orderType=${encodeURIComponent(type)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch sales orders");
        return res.json();
      })
      .then((orders) => {
        if (!ignore) setResult({ key: queryKey, orders, error: "" });
      })
      .catch((err: any) => {
        if (!ignore) setResult({ key: queryKey, orders: [], error: err.message || "Failed to fetch sales orders" });
      });
    return () => {
      ignore = true;
    };
  }, [queryKey]);

  const allOrders = useMemo(() => result?.orders ?? [], [result]);
  const errorMsg = result?.error ?? "";

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: allOrders.length };
    for (const s of SO_STATUSES) c[s] = 0;
    for (const o of allOrders) {
      const s = normalizeSoStatus(o.status);
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [allOrders]);

  const orders = useMemo(
    () => (statusFilter === "All" ? allOrders : allOrders.filter((o) => normalizeSoStatus(o.status) === statusFilter)),
    [allOrders, statusFilter],
  );

  const hasFilters = search.trim() !== "" || statusFilter !== "All" || orderTypeFilter !== "All";
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setOrderTypeFilter("All");
  };

  const runAction = async (order: any, t: SoTransition) => {
    if (busy[order.id]) return;
    if (t.confirm && !(await customConfirm(t.confirm))) return;
    setBusy((b) => ({ ...b, [order.id]: t.to }));
    try {
      const updated = await changeSalesOrderStatus(order.id, t.to);
      setResult((prev) =>
        prev
          ? {
              ...prev,
              orders: prev.orders.map((o) =>
                o.id === order.id
                  ? {
                      ...o,
                      status: updated?.status ?? t.to,
                      revision: updated?.revision ?? o.revision,
                      amountAfterTax: updated?.amountAfterTax ?? o.amountAfterTax,
                    }
                  : o,
              ),
            }
          : prev,
      );
      hotToast.success(`${order.orderNo} is now ${updated?.status ?? t.to}`);
    } catch (err: any) {
      hotToast.error(err?.message || "Failed to update status");
    } finally {
      setBusy((b) => {
        const next = { ...b };
        delete next[order.id];
        return next;
      });
    }
  };

  const tiles: { key: StatusFilter; label: string; tone: Tone }[] = [
    { key: "All", label: "All orders", tone: "indigo" },
    ...SO_STATUSES.map((s) => ({ key: s as StatusFilter, label: s, tone: soStatusTone(s) })),
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 sm:inline-flex">
            <ShoppingCart size={18} />
          </span>
          <div className="min-w-0">
            <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span>Sales</span>
              <span>/</span>
              <span className="text-slate-500">Sales Orders</span>
            </nav>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">Sales Orders</h1>
            <p className="text-xs text-slate-500">Track customer orders from draft to confirmation and close-out.</p>
          </div>
        </div>

        <Link href="/dashboard/sales/sales-order/new" className={buttonClass("primary", "md")}>
          <Plus size={14} /> New Sales Order
        </Link>
      </div>

      {/* Status summary tiles (also the status filter) */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7" role="tablist" aria-label="Filter by status">
        {tiles.map(({ key, label, tone }) => {
          const active = statusFilter === key;
          const count = result ? counts[key] ?? 0 : null;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatusFilter(key)}
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

      {/* Card: toolbar + table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2.5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search order no or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {loading && result && <Loader2 size={14} className="animate-spin text-indigo-500" aria-label="Refreshing" />}
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={buttonClass("ghost", "sm")}>
                Clear filters
              </button>
            )}
            <Segmented
              ariaLabel="Order type"
              options={ORDER_TYPES.map((t) => ({ value: t, label: t === "All" ? "All types" : t }))}
              value={orderTypeFilter}
              onChange={setOrderTypeFilter}
            />
          </div>
        </div>

        {/* Table Area */}
        {loading && !result ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500">Loading orders…</p>
          </div>
        ) : errorMsg ? (
          <div className="m-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            <AlertCircle size={14} />
            <p className="font-medium">{errorMsg}</p>
          </div>
        ) : orders.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={SearchX}
              tone="slate"
              title="No orders match these filters"
              description="Try a different search term, status or order type."
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={ShoppingCart}
              tone="indigo"
              title="No sales orders yet"
              description="Create your first sales order to start generating work orders."
              action={
                <Link href="/dashboard/sales/sales-order/new" className={buttonClass("primary", "md")}>
                  <Plus size={14} /> New Sales Order
                </Link>
              }
            />
          )
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
            <table className="w-full whitespace-nowrap text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 font-medium">Order No</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Date</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Type</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Salesperson</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const status = normalizeSoStatus(order.status);
                  const rowBusy = busy[order.id];
                  const actions = soTransitions(status).filter((t) => t.inList);
                  const isDraft = status === "Draft";
                  const href = `/dashboard/sales/sales-order/${order.id}`;
                  const customerName = order.customer?.customerName || "";
                  return (
                    <tr key={order.id} className="group transition-colors hover:bg-indigo-50/40">
                      <td className="px-4 py-2">
                        <Link href={href} className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                          {order.orderNo}
                        </Link>
                        {order.revision > 0 && (
                          <span className="ml-1.5 rounded bg-slate-100 px-1 py-px font-mono text-[10px] font-medium text-slate-500">
                            R{order.revision}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[160px] items-center gap-2 sm:max-w-[260px]">
                          <InitialsAvatar name={customerName} />
                          <span className="truncate font-medium text-slate-800">{customerName || "—"}</span>
                        </div>
                      </td>
                      <td
                        className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell"
                        title={order.date ? new Date(order.date).toLocaleDateString() : undefined}
                      >
                        {relativeDate(order.date)}
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <Badge tone={orderTypeTone(order.orderType)}>{order.orderType || "Direct"}</Badge>
                      </td>
                      <td className="hidden px-3 py-2 text-slate-600 lg:table-cell">{order.salesperson?.name || "—"}</td>
                      <td className="hidden px-3 py-2 text-right sm:table-cell">
                        <span className="mr-1 text-[11px] text-slate-400">{order.currency?.code}</span>
                        <span className="font-semibold tabular-nums text-slate-900">{formatAmount(order.amountAfterTax)}</span>
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={status} tone={soStatusTone(status)} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1 transition-opacity lg:opacity-75 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
                          <Link
                            href={href}
                            aria-disabled={!!rowBusy}
                            className={buttonClass("secondary", "sm", rowBusy ? "pointer-events-none opacity-50" : "")}
                          >
                            {isDraft ? <Pencil size={12} /> : <Eye size={12} />}
                            {isDraft ? "Edit" : "View"}
                          </Link>
                          {actions.map((t) => {
                            const Icon = ACTION_ICON[t.to];
                            const spinning = rowBusy === t.to;
                            const variant = t.to === "Void" ? "danger" : t.to === "Closed" ? "secondary" : t.to === "Revised" ? "warn" : "primary";
                            return (
                              <button
                                key={t.to}
                                type="button"
                                disabled={!!rowBusy}
                                onClick={() => runAction(order, t)}
                                className={buttonClass(variant, "sm")}
                              >
                                {spinning ? <Loader2 size={12} className="animate-spin" /> : Icon ? <Icon size={12} /> : null}
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {result && !errorMsg && orders.length > 0 && (
        <p className="px-1 text-[11px] text-slate-400">
          Showing <span className="font-medium tabular-nums text-slate-600">{orders.length}</span> of{" "}
          <span className="font-medium tabular-nums text-slate-600">{allOrders.length}</span> orders
        </p>
      )}
    </div>
  );
}
