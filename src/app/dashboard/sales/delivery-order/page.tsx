/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Eye,
  Loader2,
  Mail,
  Package,
  Pencil,
  Plus,
  Printer,
  Search,
  SearchX,
  ShieldCheck,
  Tag,
  Truck,
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
import { DO_STATUSES, doStatusTone, isDoDraft, normalizeDoStatus, type DoStatus } from "./do-status";

type StatusFilter = "All" | DoStatus;

// The list API paginates (default 10 rows). Fetch a large first page so the status
// tiles and client-side status filter cover the whole result set.
const PAGE_SIZE = 500;

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

type LoadResult = { key: string; orders: any[]; total: number; error: string };

const iconLinkClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40";

export default function DeliveryOrderListPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [result, setResult] = useState<LoadResult | null>(null);

  // Debounce the server-side search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Status is filtered client-side (the API ignores ?status=) so the tiles can count every status.
  const queryKey = debouncedSearch;
  const loading = result?.key !== queryKey;

  useEffect(() => {
    let ignore = false;
    fetch(`/api/sales/delivery-order?search=${encodeURIComponent(queryKey)}&page=1&pageSize=${PAGE_SIZE}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch delivery orders");
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          const orders = data.data || [];
          setResult({ key: queryKey, orders, total: Number(data.total) || orders.length, error: "" });
        }
      })
      .catch((err: any) => {
        if (!ignore) setResult({ key: queryKey, orders: [], total: 0, error: err.message || "Failed to fetch delivery orders" });
      });
    return () => {
      ignore = true;
    };
  }, [queryKey]);

  const allOrders = useMemo(() => result?.orders ?? [], [result]);
  const errorMsg = result?.error ?? "";

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: allOrders.length };
    for (const s of DO_STATUSES) c[s] = 0;
    for (const o of allOrders) {
      const s = normalizeDoStatus(o.status);
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [allOrders]);

  const orders = useMemo(
    () => (statusFilter === "All" ? allOrders : allOrders.filter((o) => normalizeDoStatus(o.status) === statusFilter)),
    [allOrders, statusFilter],
  );

  const hasFilters = search.trim() !== "" || statusFilter !== "All";
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  const tiles: { key: StatusFilter; label: string; tone: Tone }[] = [
    { key: "All", label: "All deliveries", tone: "indigo" },
    ...DO_STATUSES.map((s) => ({ key: s as StatusFilter, label: s, tone: doStatusTone(s) })),
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 sm:inline-flex">
            <Truck size={18} />
          </span>
          <div className="min-w-0">
            <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
              <span>/</span>
              <span>Sales</span>
              <span>/</span>
              <span className="text-slate-500">Delivery Orders</span>
            </nav>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">Delivery Orders</h1>
            <p className="text-xs text-slate-500">Manage deliveries for sales orders.</p>
          </div>
        </div>

        <Link href="/dashboard/sales/delivery-order/form" className={buttonClass("primary", "md")}>
          <Plus size={14} /> New Delivery Order
        </Link>
      </div>

      {/* Status summary tiles (also the status filter) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Filter by status">
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
          <div className="relative w-full sm:max-w-sm">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search DO No, customer, PO No or vehicle…"
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
          </div>
        </div>

        {/* Table Area */}
        {loading && !result ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500">Loading delivery orders…</p>
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
              title="No delivery orders match these filters"
              description="Try a different search term or status."
              action={
                <button type="button" onClick={clearFilters} className={buttonClass("secondary", "md")}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={Truck}
              tone="indigo"
              title="No delivery orders yet"
              description="Create a delivery order once QC-approved work orders are ready to ship."
              action={
                <Link href="/dashboard/sales/delivery-order/form" className={buttonClass("primary", "md")}>
                  <Plus size={14} /> New Delivery Order
                </Link>
              }
            />
          )
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
            <table className="w-full whitespace-nowrap text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 font-medium">DO No</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Date</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Sales Order</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">PO No</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Transport</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Vehicle No</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">COC Req.</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const status = normalizeDoStatus(order.status);
                  const isDraft = isDoDraft(status);
                  const href = `/dashboard/sales/delivery-order/form?id=${order.id}`;
                  const customerName = order.customer?.customerName || "";
                  const poNo = order.poNo || order.salesOrder?.customerPoRef || "";
                  return (
                    <tr key={order.id} className="group transition-colors hover:bg-indigo-50/40">
                      <td className="px-4 py-2">
                        <Link href={href} className="font-mono text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                          {order.doNo}
                        </Link>
                        {order.isReturnable && (
                          <span className="ml-1.5 rounded bg-amber-50 px-1 py-px text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/15" title="Returnable Delivery Challan">
                            RDC
                          </span>
                        )}
                      </td>
                      <td
                        className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell"
                        title={order.date ? new Date(order.date).toLocaleDateString() : undefined}
                      >
                        {relativeDate(order.date)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 max-w-[160px] items-center gap-2 sm:max-w-[240px]">
                          <InitialsAvatar name={customerName} />
                          <span className="truncate font-medium text-slate-800">{customerName || "—"}</span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        {order.salesOrder?.orderNo ? (
                          <span className="font-mono text-xs text-slate-600">{order.salesOrder.orderNo}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden px-3 py-2 text-slate-600 lg:table-cell">{poNo || "—"}</td>
                      <td className="hidden px-3 py-2 text-slate-600 xl:table-cell">{order.modeOfTransport || "—"}</td>
                      <td className="hidden px-3 py-2 font-mono text-xs text-slate-600 lg:table-cell">{order.vehicleNo || "—"}</td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        {order.cocRequired ? (
                          <Badge tone="violet" icon={ShieldCheck}>Yes</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={status} tone={doStatusTone(status)} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1 transition-opacity lg:opacity-75 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
                          <Link href={`/print/delivery-order/${order.id}`} target="_blank" className={iconLinkClass} title="Print" aria-label="Print">
                            <Printer size={13} />
                          </Link>
                          <Link
                            href={`/print/delivery-order-label/${order.id}?type=envelope`}
                            target="_blank"
                            className={iconLinkClass}
                            title="Envelope"
                            aria-label="Envelope"
                          >
                            <Mail size={13} />
                          </Link>
                          <Link
                            href={`/print/delivery-order-label/${order.id}?type=shipping`}
                            target="_blank"
                            className={iconLinkClass}
                            title="Shipping Label"
                            aria-label="Shipping Label"
                          >
                            <Tag size={13} />
                          </Link>
                          <Link href={href} className={buttonClass("secondary", "sm")} title="Edit/View">
                            {isDraft ? <Pencil size={12} /> : <Eye size={12} />}
                            {isDraft ? "Edit" : "View"}
                          </Link>
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
        <p className="flex items-center gap-1 px-1 text-[11px] text-slate-400">
          <Package size={11} />
          Showing <span className="font-medium tabular-nums text-slate-600">{orders.length}</span> of{" "}
          <span className="font-medium tabular-nums text-slate-600">{allOrders.length}</span> delivery orders
          {result.total > allOrders.length && (
            <span>
              {" "}(latest {allOrders.length} of <span className="tabular-nums">{result.total}</span> loaded; refine the search to find older ones)
            </span>
          )}
        </p>
      )}
    </div>
  );
}
