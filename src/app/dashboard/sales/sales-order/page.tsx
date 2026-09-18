"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Loader2, Edit2, AlertCircle, ShoppingCart } from "lucide-react";
export default function SalesOrderListPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [orderTypeFilter, setOrderTypeFilter] = useState("All");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/sales/sales-order?search=${encodeURIComponent(search)}&status=${statusFilter}&orderType=${encodeURIComponent(orderTypeFilter)}`);
      if (!res.ok) throw new Error("Failed to fetch sales orders");
      setOrders(await res.json());
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter, orderTypeFilter]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-blue-200 ">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-1">
            <Link href="/dashboard" className="hover:text-blue-600 :text-blue-300">Dashboard</Link>
            <span>/</span>
            <span className="text-blue-500 ">Sales</span>
            <span>/</span>
            <span className="text-blue-500 ">Sales Orders</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-blue-900 ">Sales Orders</h2>
              <p className="text-sm text-blue-500 mt-0.5">Manage customer sales orders and items.</p>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/sales/sales-order/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg shadow-md shadow-indigo-500/20 active:scale-95 transition-all duration-200 shrink-0"
        >
          <Plus size={16} /> New Sales Order
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 bg-white border border-blue-200 p-4 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-400 " />
            <input
              type="text"
              placeholder="Search by Order No or Customer Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {["All", "Draft", "Confirmed", "Revised", "Old Revise", "Void", "Closed"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                statusFilter === status
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-105"
                  : "bg-blue-50/50 text-blue-600 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              {status === "All" ? "All Status" : status}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-blue-100">
          {["All", "Direct", "Sub-contract"].map((type) => (
            <button
              key={type}
              onClick={() => setOrderTypeFilter(type)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                orderTypeFilter === type
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/20 scale-105"
                  : "bg-blue-50/50 text-blue-600 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              {type === "All" ? "All Types" : type}
            </button>
          ))}
        </div>
      </div>

      {/* Table Area */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-blue-500">Loading orders...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 sm:p-6 flex items-center gap-3 text-rose-700 ">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-blue-200 rounded-xl p-6 sm:p-12 text-center shadow-sm">
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <ShoppingCart size={22} className="text-indigo-500" />
          </div>
          <p className="text-blue-600 font-semibold">No sales orders found.</p>
          <p className="text-xs text-blue-400 mt-1">
            Click &quot;New Sales Order&quot; to create your first order.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
              <thead className="text-[10px] sm:text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider border-b border-blue-200 ">
                <tr>
                  <th className="px-2 sm:px-6 py-2 sm:py-4">Order No</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-4 hidden sm:table-cell">Date</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-4 hidden md:table-cell">Type</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-4">Customer</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-4 hidden lg:table-cell">Salesperson</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-right hidden sm:table-cell">Amount</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-4">Status</th>
                  <th className="px-2 sm:px-6 py-2 sm:py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100 text-[10px] sm:text-sm">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-blue-50/50 :bg-blue-800/20 transition-colors group">
                    <td className="px-2 sm:px-6 py-2 sm:py-4 font-bold text-blue-900 ">
                      <Link href={`/dashboard/sales/sales-order/${order.id}`} className="hover:text-indigo-600 :text-indigo-400 transition-colors">
                        {order.orderNo}
                        {order.revision > 0 && <span className="ml-1 text-[8px] sm:text-xs text-blue-500 font-normal">v{order.revision}</span>}
                      </Link>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-blue-700 hidden sm:table-cell">
                      {new Date(order.date).toLocaleDateString()}
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 hidden md:table-cell">
                      <span className={`inline-flex px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-xs font-semibold border ${
                        order.orderType === "Sub-contract"
                          ? "bg-violet-50 text-violet-700 border-violet-200/60"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}>
                        {order.orderType || "Direct"}
                      </span>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 font-medium text-blue-700 truncate max-w-[100px] sm:max-w-none">
                      {order.customer?.customerName || "—"}
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-blue-700 hidden lg:table-cell">
                      {order.salesperson?.name || "—"}
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-right font-mono font-semibold text-blue-900 hidden sm:table-cell">
                      {order.currency?.code} {Number(order.amountAfterTax || 0).toFixed(2)}
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4">
                      <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-xs font-semibold border ${
                        order.status === "Confirmed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 "
                          : order.status === "Closed"
                          ? "bg-blue-100 text-blue-600 border-blue-200 "
                          : "bg-amber-50 text-amber-700 border-amber-200/60 "
                      }`}>
                        <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                          order.status === "Confirmed" ? "bg-emerald-500" : order.status === "Closed" ? "bg-blue-400" : "bg-amber-500"
                        }`} />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 text-right">
                      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1 sm:gap-2">
                        {order.status === "Draft" && (
                          <>
                            <Link href={`/dashboard/sales/sales-order/${order.id}`} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-blue-700 bg-blue-100 rounded sm:rounded-lg hover:bg-blue-200 transition-colors">Save</Link>
                            <Link href={`/dashboard/sales/sales-order/${order.id}`} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-blue-700 bg-blue-100 rounded sm:rounded-lg hover:bg-blue-200 transition-colors">Edit</Link>
                            <Link href={`/dashboard/sales/sales-order/${order.id}`} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-white bg-indigo-600 rounded sm:rounded-lg hover:bg-indigo-500 transition-colors">Confirm</Link>
                            <Link href={`/dashboard/sales/sales-order/${order.id}`} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-rose-700 bg-rose-100 rounded sm:rounded-lg hover:bg-rose-200 transition-colors">Void</Link>
                          </>
                        )}
                        {order.status === "Confirmed" && (
                          <>
                            <Link href={`/dashboard/sales/sales-order/${order.id}`} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-slate-700 bg-slate-100 rounded sm:rounded-lg hover:bg-slate-200 transition-colors">View</Link>
                            <Link href={`/dashboard/sales/sales-order/${order.id}`} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-amber-700 bg-amber-100 rounded sm:rounded-lg hover:bg-amber-200 transition-colors">Revise</Link>
                            <Link href={`/dashboard/sales/sales-order/${order.id}`} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-rose-700 bg-rose-100 rounded sm:rounded-lg hover:bg-rose-200 transition-colors hidden sm:inline-flex">Stop Purchase</Link>
                          </>
                        )}
                        {order.status === "Revised" && (
                          <>
                            <Link href={`/dashboard/sales/sales-order/${order.id}`} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-slate-700 bg-slate-100 rounded sm:rounded-lg hover:bg-slate-200 transition-colors">View</Link>
                            <Link href={`/dashboard/sales/sales-order/${order.id}`} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-white bg-indigo-600 rounded sm:rounded-lg hover:bg-indigo-500 transition-colors">Confirm</Link>
                          </>
                        )}
                        {(order.status === "Closed" || order.status === "Void" || order.status === "Old Revise") && (
                          <Link href={`/dashboard/sales/sales-order/${order.id}`} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-slate-700 bg-slate-100 rounded sm:rounded-lg hover:bg-slate-200 transition-colors">View Only</Link>
                        )}
                      </div>
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
