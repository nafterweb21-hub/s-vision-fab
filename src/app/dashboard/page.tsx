"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  ShoppingCart, 
  FileText, 
  Users, 
  Building2, 
  Settings,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { canAccess } from "@/lib/access";
import { getDashboardMetrics } from "./dashboard.actions";

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `SGD ${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `SGD ${(value / 1000).toFixed(2)}K`;
  }
  return `SGD ${value.toFixed(2)}`;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const permissions = (session?.user as any)?.permissions || null;
  const role = session?.user?.role || null;
  const [activeCompany, setActiveCompany] = useState("Vision One Pte Ltd");
  const [metrics, setMetrics] = useState({
    activeWorkOrders: { count: 0, pendingQc: 0, onHold: 0 },
    openSalesOrders: { count: 0, totalValue: 0 },
    posAwaitingDelivery: { count: 0, overdue: 0 },
    openNcrs: { count: 0, pendingClosure: 0 },
    recentWorkOrders: [] as any[],
    processLoad: [] as { label: string, value: number }[],
    pendingPoApprovals: { urgentCount: 0, list: [] as any[] },
    recentNcrsList: [] as any[],
    woStatusDistribution: { total: 0, distribution: [] as any[] },
    companyProfiles: [] as any[]
  });

  useEffect(() => {
    const stored = localStorage.getItem("fitprise_company");
    if (stored) {
      setActiveCompany(stored);
    }

    const handleCompanyChange = () => {
      const updated = localStorage.getItem("fitprise_company");
      if (updated) {
        setActiveCompany(updated);
      }
    };

    window.addEventListener("companyChanged", handleCompanyChange);
    
    getDashboardMetrics().then(data => {
      setMetrics(data);
    });

    return () => window.removeEventListener("companyChanged", handleCompanyChange);
  }, []);

  const allowSales = canAccess("/dashboard/sales/sales-order", permissions, role);
  const allowPurchasing = canAccess("/dashboard/purchasing/purchase-order", permissions, role);
  const allowProduction = canAccess("/dashboard/production/work-order", permissions, role);
  const allowQC = canAccess("/dashboard/qc/ncr", permissions, role);

  return (
    <div className="space-y-4 sm:space-y-8 animate-fade-in pb-6 sm:pb-12">
      {/* Welcome Banner */}
      <div className="relative -mx-6 sm:-mx-8 md:-mx-12 lg:-mx-16 mb-0 overflow-hidden bg-slate-900 px-6 sm:px-8 md:px-12 lg:px-16 pt-4 pb-4 shadow-2xl sm:pt-8 sm:pb-10 rounded-b-2xl sm:rounded-b-3xl">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl"></div>
        <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-blue-600/30 blur-3xl"></div>
        
        <div className="relative z-10 mx-auto max-w-7xl flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
              <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-indigo-400"></span>
              System Overview
            </span>
            <h2 className="mt-2 sm:mt-4 text-base sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Welcome to Vision One ERP
            </h2>
            <p className="mt-1.5 sm:mt-3 text-slate-300 text-[11px] sm:text-base leading-relaxed max-w-xl">
              Manage Sales, Purchasing, Subcon, and Production routing processes all in one centralized platform.
            </p>
          </div>
          
          <div className="flex flex-col gap-2 sm:gap-4 min-w-[280px] rounded-xl sm:rounded-2xl bg-white/10 p-3 sm:p-6 backdrop-blur-md border border-white/10">
            <div>
              <p className="text-[8px] sm:text-[10px] text-indigo-200 font-semibold uppercase tracking-wider">Active Company</p>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                <p className="text-xs sm:text-base font-bold text-white">{activeCompany}</p>
              </div>
            </div>
            <div className="h-px w-full bg-white/10"></div>
            <div>
              <p className="text-[8px] sm:text-[10px] text-indigo-200 font-semibold uppercase tracking-wider">Purchasing Access</p>
              <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm font-medium text-white/90">
                {activeCompany === "Vision One Pte Ltd" 
                  ? "Standard & Subcon PO (Full Access)" 
                  : "Standard & Subcon PO (Restricted)"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Statistics */}
      <div className="mt-4 sm:mt-8 relative z-10">
        <div className="flex items-center justify-between mb-2 sm:mb-6">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            Operational Metrics
          </h3>
        </div>
        <div className="grid gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {allowProduction && (
            <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute -right-4 -top-4 rounded-full p-4 opacity-50 transition-transform group-hover:scale-150 bg-indigo-50 text-indigo-600 border-indigo-100">
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="mb-2 sm:mb-4 inline-flex rounded-lg sm:rounded-xl p-2 sm:p-3 bg-indigo-50 text-indigo-600 border-indigo-100">
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Active Work Orders</p>
              <div className="mt-1 sm:mt-2 flex items-baseline gap-2">
                <p className="text-xl sm:text-3xl font-extrabold text-slate-900">{metrics.activeWorkOrders.count}</p>
              </div>
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-sm font-medium text-slate-500 flex items-center gap-1 sm:gap-1.5">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {metrics.activeWorkOrders.pendingQc} Pending QC · {metrics.activeWorkOrders.onHold} On Hold
              </p>
            </div>
          )}

          {allowSales && (
            <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute -right-4 -top-4 rounded-full p-4 opacity-50 transition-transform group-hover:scale-150 bg-amber-50 text-amber-600 border-amber-100">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="mb-2 sm:mb-4 inline-flex rounded-lg sm:rounded-xl p-2 sm:p-3 bg-amber-50 text-amber-600 border-amber-100">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Open Sales Orders</p>
              <div className="mt-1 sm:mt-2 flex items-baseline gap-2">
                <p className="text-xl sm:text-3xl font-extrabold text-slate-900">{metrics.openSalesOrders.count}</p>
              </div>
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-sm font-medium text-slate-500 flex items-center gap-1 sm:gap-1.5">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {formatCurrency(metrics.openSalesOrders.totalValue)} Total Value
              </p>
            </div>
          )}

          {allowPurchasing && (
            <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute -right-4 -top-4 rounded-full p-4 opacity-50 transition-transform group-hover:scale-150 bg-sky-50 text-sky-600 border-sky-100">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="mb-2 sm:mb-4 inline-flex rounded-lg sm:rounded-xl p-2 sm:p-3 bg-sky-50 text-sky-600 border-sky-100">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">POs Awaiting Delivery</p>
              <div className="mt-1 sm:mt-2 flex items-baseline gap-2">
                <p className="text-xl sm:text-3xl font-extrabold text-slate-900">{metrics.posAwaitingDelivery.count}</p>
              </div>
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-sm font-medium text-slate-500 flex items-center gap-1 sm:gap-1.5">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {metrics.posAwaitingDelivery.overdue} Overdue
              </p>
            </div>
          )}

          {allowQC && (
            <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute -right-4 -top-4 rounded-full p-4 opacity-50 transition-transform group-hover:scale-150 bg-rose-50 text-rose-600 border-rose-100">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="mb-2 sm:mb-4 inline-flex rounded-lg sm:rounded-xl p-2 sm:p-3 bg-rose-50 text-rose-600 border-rose-100">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Open NCRs</p>
              <div className="mt-1 sm:mt-2 flex items-baseline gap-2">
                <p className="text-xl sm:text-3xl font-extrabold text-slate-900">{metrics.openNcrs.count}</p>
              </div>
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-sm font-medium text-slate-500 flex items-center gap-1 sm:gap-1.5">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {metrics.openNcrs.pendingClosure} Pending Closure
              </p>
            </div>
          )}
        </div>
      </div>

      {/* NEW DASHBOARD SECTION */}
      <div className="grid gap-4 sm:gap-8 lg:grid-cols-2">
        {/* Recent Work Orders Panel */}
        {allowProduction && (
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between p-3 sm:p-6 border-b border-slate-100">
            <h4 className="text-lg font-bold text-slate-900">Recent Work Orders</h4>
            <Link href="/dashboard/production/work-order" className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white text-[10px] sm:text-xs uppercase text-slate-400 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-1 sm:px-6 py-2 sm:py-4">WO NO</th>
                  <th className="px-1 sm:px-6 py-2 sm:py-4">CUSTOMER</th>
                  <th className="px-1 sm:px-6 py-2 sm:py-4 hidden sm:table-cell">DELIVERY</th>
                  <th className="px-1 sm:px-6 py-2 sm:py-4">STATUS</th>
                  <th className="px-1 sm:px-6 py-2 sm:py-4">QC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[9px] sm:text-sm">
                {metrics.recentWorkOrders?.length > 0 ? (
                  metrics.recentWorkOrders.map((wo: any, index: number) => {
                    const statusStyles: Record<string, { badge: string; dot: string }> = {
                      "WIP": { badge: "border-blue-200 bg-blue-50 text-blue-500", dot: "bg-blue-500" },
                      "Proceed": { badge: "border-amber-200 bg-amber-50 text-amber-500", dot: "bg-amber-500" },
                      "Pending QC": { badge: "border-orange-200 bg-orange-50 text-orange-500", dot: "bg-orange-500" },
                      "Completed": { badge: "border-emerald-200 bg-emerald-50 text-emerald-500", dot: "bg-emerald-500" }
                    };
                    const currentStatusStyle = statusStyles[wo.status as string] || { badge: "border-slate-200 bg-slate-50 text-slate-400", dot: "bg-slate-400" };
                    
                    const qcStyles: Record<string, { badge: string; dot: string }> = {
                      "Approved": { badge: "border-emerald-200 bg-emerald-50 text-emerald-500", dot: "bg-emerald-500" },
                      "Rejected": { badge: "border-red-200 bg-red-50 text-red-500", dot: "bg-red-500" }
                    };
                    const currentQcStyle = qcStyles[wo.qcAcceptance as string] || { badge: "border-slate-200 bg-slate-50 text-slate-400", dot: "bg-slate-400" };

                    return (
                      <tr key={index} className={index % 2 === 0 ? "bg-slate-50/50" : ""}>
                        <td className="px-1 sm:px-6 py-2 sm:py-4 font-bold text-slate-900 break-all">{wo.workOrderNo}</td>
                        <td className="px-1 sm:px-6 py-2 sm:py-4 leading-tight">{wo.customerName}</td>
                        <td className="px-1 sm:px-6 py-2 sm:py-4 text-slate-500 hidden sm:table-cell">
                          {wo.deliveryDate 
                            ? new Date(wo.deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                            : "N/A"}
                        </td>
                        <td className="px-1 sm:px-6 py-2 sm:py-4">
                          <span className={`inline-flex items-center gap-0.5 sm:gap-1.5 rounded-full border px-1 sm:px-2.5 py-0.5 text-[8px] sm:text-xs font-bold ${currentStatusStyle.badge}`}>
                            <span className={`h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full ${currentStatusStyle.dot}`}></span> {wo.status}
                          </span>
                        </td>
                        <td className="px-1 sm:px-6 py-2 sm:py-4">
                          <span className={`inline-flex items-center gap-0.5 sm:gap-1.5 rounded-full border px-1 sm:px-2.5 py-0.5 text-[8px] sm:text-xs font-bold ${currentQcStyle.badge}`}>
                            <span className={`h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full ${currentQcStyle.dot}`}></span> {wo.qcAcceptance}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">No recent work orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Process Load Panel */}
        {allowProduction && (
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-6 mb-3 sm:mb-6">
            <h4 className="text-lg font-bold text-slate-900">Process Load — This Week</h4>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span> Live
            </span>
          </div>
          
          <div className="space-y-3 sm:space-y-6 flex-grow flex flex-col justify-center">
            {(metrics.processLoad.length > 0 ? metrics.processLoad : [
              { label: "Welding", value: 0 },
              { label: "Machining", value: 0 },
              { label: "Spray Paint", value: 0 },
              { label: "Sizing", value: 0 },
              { label: "Assembly", value: 0 },
              { label: "QC", value: 0 },
            ]).map((process, idx) => {
              const colorMap: Record<string, string> = {
                "Welding": "bg-blue-500",
                "Machining": "bg-amber-500",
                "Spray Paint": "bg-emerald-500",
                "Sizing": "bg-orange-500",
                "Assembly": "bg-slate-400",
                "QC": "bg-red-500",
              };
              const defaultColors = ["bg-blue-500", "bg-amber-500", "bg-emerald-500", "bg-orange-500", "bg-slate-400", "bg-red-500"];
              const processColor = colorMap[process.label] || defaultColors[idx % defaultColors.length];

              return (
              <div key={process.label} className="flex items-center gap-4">
                <div className="w-24 text-right text-sm font-semibold text-slate-600">
                  {process.label}
                </div>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-slate-100 flex items-center">
                   <div className="w-full relative h-full">
                       <div 
                       className={`absolute top-0 left-0 h-full rounded-full ${processColor}`} 
                       style={{ width: `${process.value}%` }}
                       ></div>
                   </div>
                </div>
                <div className="w-10 text-right text-sm font-bold text-slate-700">
                  {process.value}%
                </div>
              </div>
            )})}
          </div>
        </div>
        )}
      </div>

      {/* OPERATIONS CARDS */}
      <div className="grid gap-4 sm:gap-8 lg:grid-cols-3">
        {/* PO Approvals Pending Panel */}
        {allowPurchasing && (
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-4 mb-2 sm:mb-4">
            <h4 className="text-lg font-bold text-slate-900">PO Approvals Pending</h4>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-500">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span> {metrics.pendingPoApprovals?.urgentCount || 0} urgent
            </span>
          </div>
          
          <div className="space-y-2 sm:space-y-4">
            {metrics.pendingPoApprovals?.list?.length > 0 ? (
              metrics.pendingPoApprovals.list.map((po, i) => {
                const isFirstTier = po.tier === "1st Tier";
                const tierBadgeBg = isFirstTier ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500";
                const tierDotBg = isFirstTier ? "bg-amber-500" : "bg-blue-500";
                return (
                  <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-bold text-slate-900">{po.poNo}</h5>
                        <p className="text-sm text-slate-500">{po.supplierName}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full ${tierBadgeBg} px-2.5 py-1 text-xs font-bold`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${tierDotBg}`}></span> {po.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-4 text-sm font-medium">
                      <span className="text-slate-500">SGD <span className="text-slate-900 font-bold">{po.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500">WO <span className="text-slate-900 font-bold">{po.workOrderNo}</span></span>
                    </div>
                    <div className="flex gap-3">
                      <a 
                        href={`/dashboard/purchasing/purchase-order-approval/${po.id}`}
                        className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 flex items-center justify-center gap-1"
                      >
                        ✓ Approve
                      </a>
                      <a 
                        href={`/dashboard/purchasing/purchase-order-approval/${po.id}`}
                        className="flex-1 rounded-xl border border-rose-200 bg-rose-50 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 flex items-center justify-center gap-1"
                      >
                        ✗ Reject
                      </a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-sm font-medium text-slate-500">
                No pending PO approvals.
              </div>
            )}
          </div>
        </div>
        )}

        {/* Open NCRs Panel */}
        {allowQC && (
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-4 mb-2 sm:mb-4">
            <h4 className="text-lg font-bold text-slate-900">Open NCRs</h4>
            <Link href="/dashboard/qc/ncr" className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          
          <div className="flex-grow flex flex-col justify-center space-y-2 sm:space-y-4">
            {metrics.recentNcrsList?.length > 0 ? (
              metrics.recentNcrsList.map((ncr, i, arr) => {
                const statusColors: Record<string, string> = {
                  "Draft": "amber",
                  "Pending Closure": "rose",
                  "Closed": "emerald",
                  "Completed": "emerald"
                };
                const statusColor = statusColors[ncr.status as string] || "slate";
                
                return (
                  <div key={i} className={`flex items-center justify-between py-2 ${i !== arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-[125px] flex-shrink-0 text-sm font-bold text-rose-500 pt-0.5">
                        {ncr.ncrNo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 leading-snug">
                          {ncr.title} <br /> {ncr.workOrderNo}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 leading-snug">
                          Raised by {ncr.raisedBy} · <br /> {ncr.timeText}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full bg-${statusColor}-50 px-3 py-1 text-xs font-bold text-${statusColor}-500`}>
                        <span className={`h-1.5 w-1.5 rounded-full bg-${statusColor}-500`}></span> {ncr.status}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-sm font-medium text-slate-500">
                No open NCRs found.
              </div>
            )}
          </div>
        </div>
        )}

        {/* WO Status Distribution Panel */}
        {allowProduction && (
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 sm:pb-4 mb-3 sm:mb-6">
            <h4 className="text-lg font-bold text-slate-900">WO Status Distribution</h4>
          </div>
          
          <div className="flex-grow flex items-center justify-center gap-8">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {(() => {
                  const distribution = metrics.woStatusDistribution?.distribution || [];
                  const total = metrics.woStatusDistribution?.total || 1;
                  
                  let currentOffset = 0;
                  const circleCircumference = 2 * Math.PI * 40; // ~251.2
                  
                  return distribution.map((item, index) => {
                    if (item.value === 0) return null;
                    
                    const percentage = item.value / total;
                    const strokeDasharray = `${percentage * circleCircumference} ${circleCircumference}`;
                    const strokeDashoffset = -currentOffset;
                    
                    currentOffset += percentage * circleCircumference;
                    
                    const colorMap: Record<string, string> = {
                      "WIP": "#3b82f6", // blue-500
                      "Proceed": "#f59e0b", // amber-500
                      "Completed": "#10b981", // emerald-500
                      "Pending QC": "#f43f5e", // rose-500
                      "Others": "#94a3b8" // slate-400
                    };
                    
                    return (
                      <circle 
                        key={item.label}
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="none" 
                        stroke={colorMap[item.label] || "#94a3b8"} 
                        strokeWidth="12" 
                        strokeDasharray={strokeDasharray} 
                        strokeDashoffset={strokeDashoffset} 
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{metrics.woStatusDistribution?.total || 0}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 flex-1">
              {(metrics.woStatusDistribution?.distribution || [
                { label: "WIP", value: 0 },
                { label: "Proceed", value: 0 },
                { label: "Completed", value: 0 },
                { label: "Pending QC", value: 0 },
                { label: "Others", value: 0 },
              ]).map((stat) => {
                const colorMap: Record<string, string> = {
                  "WIP": "bg-blue-500",
                  "Proceed": "bg-amber-500",
                  "Completed": "bg-emerald-500",
                  "Pending QC": "bg-rose-500",
                  "Others": "bg-slate-400"
                };
                return (
                  <div key={stat.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-md ${colorMap[stat.label] || "bg-slate-400"}`}></div>
                      <span className="text-sm font-semibold text-slate-600">{stat.label}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{stat.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Main Actions Panel */}
      {role === "ADMIN" && (
      <div className="grid gap-4 sm:gap-8 lg:grid-cols-3">
        {/* Master Profiles Portal */}
        <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-6 h-6 text-indigo-600" />
                System Configurations
              </h4>
              <p className="mt-1 text-sm text-slate-500">Manage Master data profiles that govern the ERP rules</p>
            </div>
            <Link
              href="/dashboard/profiles"
              className="group flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View All 
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          <div className="mt-4 sm:mt-8 grid gap-2 sm:gap-4 sm:grid-cols-2">
            <a
              href="/dashboard/profiles/approval-levels"
              className="group flex items-center gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50 p-3 sm:p-5 transition-all hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm border border-slate-100 transition-transform group-hover:scale-110">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h5 className="text-[11px] sm:text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">Approval Level Profile</h5>
                <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-xs text-slate-500 line-clamp-1">Configure value bands and multi-tier approvers</p>
              </div>
            </a>

            <a
              href="/dashboard/profiles/employee"
              className="group flex items-center gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50 p-3 sm:p-5 transition-all hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm border border-slate-100 transition-transform group-hover:scale-110">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h5 className="text-[11px] sm:text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">Employee Profile</h5>
                <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-xs text-slate-500 line-clamp-1">Manage employee codes, FINs & designations</p>
              </div>
            </a>

            <a
              href="/dashboard/profiles/company"
              className="group flex items-center gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50 p-3 sm:p-5 transition-all hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm border border-slate-100 transition-transform group-hover:scale-110">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h5 className="text-[11px] sm:text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">Company Profile</h5>
                <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-xs text-slate-500 line-clamp-1">AS9100 requirement logs & legal identifiers</p>
              </div>
            </a>
          </div>
        </div>

        {/* Company Quick-Rules Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-3 sm:mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Tenant Specifications</h4>
              <p className="text-xs font-medium text-slate-500">Rules fetched from active profile</p>
            </div>
          </div>

          {(() => {
            const currentCompany = metrics.companyProfiles?.find(c => c.companyName === activeCompany);
            
            return (
              <div className="space-y-2 sm:space-y-4">
                <div className="rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4 transition-colors hover:bg-slate-100/50">
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</p>
                  </div>
                  <p className="text-[11px] sm:text-sm font-bold text-slate-900">{activeCompany}</p>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4 transition-colors hover:bg-slate-100/50">
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">PO linkage to Work Orders</p>
                  </div>
                  <p className="text-[11px] sm:text-sm font-semibold text-emerald-600 bg-emerald-50 inline-flex px-1.5 py-0.5 sm:px-2 sm:py-1 rounded sm:rounded-md">
                    {currentCompany?.allowPoForWo 
                      ? "✓ Allowed (Standard)" 
                      : "✗ Forbidden (Standalone)"
                    }
                  </p>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4 transition-colors hover:bg-slate-100/50">
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]"></div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">AS9100 Certification Note</p>
                  </div>
                  <p className="text-[11px] sm:text-sm font-medium text-slate-700">
                    {currentCompany?.as9100RequirementNote
                      ? "Toggled on for PR, PO, Subcon forms."
                      : "Not standard for this company profile."
                    }
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      )}
    </div>
  );
}
