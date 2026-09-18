"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  BarChart2, 
  Search, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { toast } from "react-hot-toast";

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
  margin: number;
  status: string;
};

export default function CostMonitoringPage() {
  const [data, setData] = useState<CostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchData = async (searchQuery: string = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cost-monitoring?search=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch cost monitoring data");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(search);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatPercent = (val: number) => {
    return `${(val || 0).toFixed(2)}%`;
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-500 tracking-wider uppercase mb-1">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-blue-400">Cost Monitoring</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl">
              <BarChart2 size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Cost Monitoring
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Track revenue, costs, and profit margins across all Work Orders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <form onSubmit={handleSearch} className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by WO No or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </form>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => fetchData(search)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors w-full sm:w-auto"
          >
            Search
          </button>
          <button
            onClick={() => {
              setSearch("");
              fetchData("");
            }}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-colors w-full sm:w-auto"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-rose-500" size={20} />
            <p className="text-sm text-rose-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Work Order
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Customer
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-emerald-600 uppercase tracking-wider whitespace-nowrap text-right bg-emerald-50/50">
                  Revenue
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-rose-600 uppercase tracking-wider whitespace-nowrap text-right bg-rose-50/50">
                  Total Cost
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">
                  Labor Cost
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">
                  Material Cost
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">
                  Subcon Cost
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-blue-600 uppercase tracking-wider whitespace-nowrap text-right bg-blue-50/50">
                  Profit / Margin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                    <p className="mt-3 text-sm text-slate-500 font-medium">
                      Loading cost data...
                    </p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No work orders found.</p>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.workOrderNo} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/dashboard/production/work-order/${item.workOrderNo}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {item.workOrderNo}
                      </Link>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {item.customerName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Status: <span className="font-semibold">{item.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-emerald-700 bg-emerald-50/10">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-rose-700 bg-rose-50/10">
                      {formatCurrency(item.totalCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                      {formatCurrency(item.laborCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                      {formatCurrency(item.materialCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                      {formatCurrency(item.subconCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right bg-blue-50/10">
                      <div className={`text-sm font-bold flex justify-end items-center gap-1.5 ${item.margin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {item.margin >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {formatCurrency(item.profit)}
                      </div>
                      <div className={`text-xs font-semibold mt-0.5 ${
                        item.margin >= 20 ? "text-emerald-500" : 
                        item.margin >= 0 ? "text-amber-500" : 
                        "text-rose-500"
                      }`}>
                        {formatPercent(item.margin)} margin
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
