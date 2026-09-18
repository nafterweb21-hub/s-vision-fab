"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Coins,
  Loader2,
  ArrowRight,
  TrendingUp,
  Database,
  CheckCircle2,
  XCircle,
  Ruler,
  Gauge,
  Cpu,
} from "lucide-react";

export default function ProfilesDashboard() {
  const [stats, setStats] = useState<Record<string, { total: number; active: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/profiles/summary");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed loading profile counts: ", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const currencyStats = stats["currency"] || { total: 0, active: 0 };
  const uomStats      = stats["uom"]      || { total: 0, active: 0 };
  const elcometerStats = stats["elcometer"] || { total: 0, active: 0 };
  const machineStats = stats["machine"] || { total: 0, active: 0 };

  return (
    <div className="p-6 lg:p-10 space-y-8 relative">
      {/* Welcome header */}
      <div className="relative rounded-2xl overflow-hidden border border-blue-500/10 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 p-8 lg:p-10 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-blue-600/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[200px] h-[200px] rounded-full bg-sky-600/10 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider">
            <TrendingUp size={12} />
            <span>Settings / Master</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent">
            Master Profiles
          </h2>
          <p className="text-blue-400 text-sm lg:text-base leading-relaxed">
            Manage system-wide configuration data, including currencies, units of measurement, measuring gauges, and machines.
          </p>
        </div>
      </div>

      {/* KPI Metric Strip — Currency */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Currencies",
            value: loading ? "..." : currencyStats.total.toString(),
            desc: "Registered currency codes",
            icon: Database,
            color: "text-blue-500",
            bg: "bg-blue-500/5",
            border: "border-blue-500/10",
          },
          {
            label: "Active Currencies",
            value: loading ? "..." : currencyStats.active.toString(),
            desc: "Available for transactions",
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-500/5",
            border: "border-emerald-500/10",
          },
          {
            label: "Deactive Currencies",
            value: loading ? "..." : (currencyStats.total - currencyStats.active).toString(),
            desc: "Deactivated denominations",
            icon: XCircle,
            color: "text-sky-500",
            bg: "bg-sky-500/5",
            border: "border-sky-500/10",
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`rounded-xl border ${card.border} bg-white p-5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300`}
            >
              <div className="space-y-1.5 z-10">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 ">
                  {card.label}
                </p>
                <h3 className="text-2xl font-bold text-blue-900 tracking-tight">
                  {card.value}
                </h3>
                <p className="text-[11px] text-blue-500 font-medium">
                  {card.desc}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-300 z-10`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI Metric Strip — UOM */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total UOMs",
            value: loading ? "..." : uomStats.total.toString(),
            desc: "Registered unit types",
            icon: Database,
            color: "text-violet-500",
            bg: "bg-violet-500/5",
            border: "border-violet-500/10",
          },
          {
            label: "Active UOMs",
            value: loading ? "..." : uomStats.active.toString(),
            desc: "Available for use",
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-500/5",
            border: "border-emerald-500/10",
          },
          {
            label: "Deactive UOMs",
            value: loading ? "..." : (uomStats.total - uomStats.active).toString(),
            desc: "Deactivated units",
            icon: XCircle,
            color: "text-purple-500",
            bg: "bg-purple-500/5",
            border: "border-purple-500/10",
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`rounded-xl border ${card.border} bg-white p-5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300`}
            >
              <div className="space-y-1.5 z-10">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 ">
                  {card.label}
                </p>
                <h3 className="text-2xl font-bold text-blue-900 tracking-tight">
                  {card.value}
                </h3>
                <p className="text-[11px] text-blue-500 font-medium">
                  {card.desc}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-300 z-10`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI Metric Strip — Elcometer */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Elcometers",
            value: loading ? "..." : elcometerStats.total.toString(),
            desc: "Registered serial numbers",
            icon: Database,
            color: "text-blue-500",
            bg: "bg-blue-500/5",
            border: "border-blue-500/10",
          },
          {
            label: "Active Elcometers",
            value: loading ? "..." : elcometerStats.active.toString(),
            desc: "Available for routing processes",
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-500/5",
            border: "border-emerald-500/10",
          },
          {
            label: "Deactive Elcometers",
            value: loading ? "..." : (elcometerStats.total - elcometerStats.active).toString(),
            desc: "Deactivated gauges",
            icon: XCircle,
            color: "text-sky-500",
            bg: "bg-sky-500/5",
            border: "border-sky-500/10",
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`rounded-xl border ${card.border} bg-white p-5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300`}
            >
              <div className="space-y-1.5 z-10">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 ">
                  {card.label}
                </p>
                <h3 className="text-2xl font-bold text-blue-900 tracking-tight">
                  {card.value}
                </h3>
                <p className="text-[11px] text-blue-500 font-medium">
                  {card.desc}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-300 z-10`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>
      {/* KPI Metric Strip — Machine */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Machines",
            value: loading ? "..." : machineStats.total.toString(),
            desc: "Registered machines & welders",
            icon: Database,
            color: "text-amber-500",
            bg: "bg-amber-500/5",
            border: "border-amber-500/10",
          },
          {
            label: "Active Machines",
            value: loading ? "..." : machineStats.active.toString(),
            desc: "Available for production orders",
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-500/5",
            border: "border-emerald-500/10",
          },
          {
            label: "Deactive Machines",
            value: loading ? "..." : (machineStats.total - machineStats.active).toString(),
            desc: "Deactivated machine units",
            icon: XCircle,
            color: "text-amber-600",
            bg: "bg-amber-600/5",
            border: "border-amber-600/10",
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`rounded-xl border ${card.border} bg-white p-5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300`}
            >
              <div className="space-y-1.5 z-10">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 ">
                  {card.label}
                </p>
                <h3 className="text-2xl font-bold text-blue-900 tracking-tight">
                  {card.value}
                </h3>
                <p className="text-[11px] text-blue-500 font-medium">
                  {card.desc}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-300 z-10`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>


      {/* Quick Action Cards */}
      {loading ? (
        <div className="h-32 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-blue-500">Loading...</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Currency card */}
          <Link
            href="/dashboard/profiles/currency"
            className="group block bg-white border border-blue-200 rounded-xl p-6 hover:border-blue-500 :border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-500 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all duration-300">
                <Coins size={22} className="transform group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-blue-950 group-hover:text-blue-600 :text-blue-400 transition-colors">
                    Currency Master
                  </h4>
                  <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-blue-600 transition-all duration-300" />
                </div>
                <p className="text-sm text-blue-400 leading-relaxed">
                  Manage currency codes, exchange rates, and default currency.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-blue-100 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-blue-400 font-medium">Total Records</span>
              <div className="flex items-center gap-2">
                <span className="text-blue-950 font-bold">{currencyStats.total}</span>
                <span className="text-blue-300 ">|</span>
                <span className="text-emerald-600 font-bold">{currencyStats.active} Active</span>
              </div>
            </div>
          </Link>

          {/* UOM card */}
          <Link
            href="/dashboard/profiles/uom"
            className="group block bg-white border border-blue-200 rounded-xl p-6 hover:border-violet-500 :border-violet-500 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-500 group-hover:bg-violet-600 group-hover:border-violet-600 group-hover:text-white transition-all duration-300">
                <Ruler size={22} className="transform group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-blue-950 group-hover:text-violet-600 :text-violet-400 transition-colors">
                    UOM Profile
                  </h4>
                  <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-violet-600 transition-all duration-300" />
                </div>
                <p className="text-sm text-blue-400 leading-relaxed">
                  Manage units of measurement (Piece, Pair, Box, Kg, Meter) for orders and materials.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-blue-100 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-blue-400 font-medium">Total Records</span>
              <div className="flex items-center gap-2">
                <span className="text-blue-950 font-bold">{uomStats.total}</span>
                <span className="text-blue-300 ">|</span>
                <span className="text-emerald-600 font-bold">{uomStats.active} Active</span>
              </div>
            </div>
          </Link>

          {/* Elcometer card */}
          <Link
            href="/dashboard/profiles/elcometer"
            className="group block bg-white border border-blue-200 rounded-xl p-6 hover:border-blue-500 :border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-500 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all duration-300">
                <Gauge size={22} className="transform group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-blue-950 group-hover:text-blue-600 :text-blue-400 transition-colors">
                    Elcometer Profile
                  </h4>
                  <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-blue-600 transition-all duration-300" />
                </div>
                <p className="text-sm text-blue-400 leading-relaxed">
                  Manage Elcometer Serial Numbers for Dry Film Thickness spray painting measurements.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-blue-100 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-blue-400 font-medium">Total Records</span>
              <div className="flex items-center gap-2">
                <span className="text-blue-950 font-bold">{elcometerStats.total}</span>
                <span className="text-blue-300 ">|</span>
                <span className="text-emerald-600 font-bold">{elcometerStats.active} Active</span>
              </div>
            </div>
          </Link>
          {/* Machine card */}
          <Link
            href="/dashboard/profiles/machine"
            className="group block bg-white border border-blue-200 rounded-xl p-6 hover:border-amber-500 :border-amber-500 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-500 group-hover:bg-amber-600 group-hover:border-amber-600 group-hover:text-white transition-all duration-300">
                <Cpu size={22} className="transform group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-blue-950 group-hover:text-amber-600 :text-amber-400 transition-colors">
                    Machine Profile
                  </h4>
                  <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 text-amber-600 transition-all duration-300" />
                </div>
                <p className="text-sm text-blue-400 leading-relaxed">
                  Manage machines and welding equipment parameters, specifications, and files.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-blue-100 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-blue-400 font-medium">Total Records</span>
              <div className="flex items-center gap-2">
                <span className="text-blue-950 font-bold">{machineStats.total}</span>
                <span className="text-blue-300 ">|</span>
                <span className="text-emerald-600 font-bold">{machineStats.active} Active</span>
              </div>
            </div>
          </Link>
        </div>
      )}
      {/* Master Profiles Directory appended from merge */}
      <div className="mt-12 border-t border-blue-200 pt-8">
        <MasterProfilesDirectory />
      </div>
    </div>
  );
}

// Categorized master profiles from the specification profiles.md
const MASTER_CATEGORIES = [
  {
    name: "Admin & Finance",
    profiles: [
      {
        id: "approval-levels",
        name: "Approval Level Profile",
        active: true,
        href: "/dashboard/profiles/approval-levels",
        desc: "Defines purchase value bands and multi-tier approval groups.",
        rules: [
          "Defines value bands (Min/Max ranges with 2 decimals).",
          "One band can have multiple approvers; any one can sign off.",
          "Tier-2 POs require Tier-1 approval first.",
          "Applies to material PO and subcon PO, never PR or WO."
        ],
        fields: [
          { name: "Module", type: "Dropdown (Fixed Choices)", mand: "Yes" },
          { name: "Action/Button", type: "Dropdown / Text", mand: "No" },
          { name: "Min Range", type: "Numeric (2 decimals)", mand: "No" },
          { name: "Max Range", type: "Numeric (2 decimals)", mand: "No" },
          { name: "Status", type: "Read-only (Active/Inactive/Void)", mand: "N/A" }
        ]
      },
      {
        id: "company",
        name: "Company Profile",
        active: true,
        href: "/dashboard/profiles/company",
        desc: "Maintains legal tenant identities, logos, and AS9100 flags.",
        rules: [
          "Single shared DB — companies are rows, not separate databases.",
          "Allow to create PO for WO governs WO linkages (Vision One = Yes, Vision Laser = No).",
          "AS9100 Requirement Note Required toggles supplier note blocks on printouts."
        ],
        fields: [
          { name: "Company Name", type: "Text", mand: "Yes" },
          { name: "Address", type: "Multi-text", mand: "Yes" },
          { name: "GST Reg No", type: "Text", mand: "Yes" },
          { name: "Allow PO for WO", type: "Checkbox", mand: "No" },
          { name: "AS9100 Flag", type: "Checkbox", mand: "No" }
        ]
      },
      {
        id: "department",
        name: "Department Profile",
        active: true,
        href: "/dashboard/master-profile/department",
        desc: "Maintains department records within the company.",
        rules: [
          "Department name is immutable once saved."
        ],
        fields: [
          { name: "Department", type: "Text (Immutable)", mand: "Yes" },
          { name: "Remark", type: "Multi-text", mand: "No" },
          { name: "Status", type: "Read-only (Active/Inactive)", mand: "N/A" }
        ]
      },
      {
        id: "employee",
        name: "Employee Profile",
        active: true,
        href: "/dashboard/master-profile/employee",
        desc: "Tracks staff members, designation, emails and NRICs for COCs.",
        rules: [
          "Employee name is immutable once saved.",
          "NRIC / FIN is sourced from other entries and is used on COC printouts.",
          "Must have a valid email to receive PR submission notifications."
        ],
        fields: [
          { name: "Employee Code", type: "Text", mand: "Yes" },
          { name: "Employee Name", type: "Text (Immutable)", mand: "Yes" },
          { name: "NRIC / FIN", type: "Dropdown (Employee NRIC)", mand: "Yes" },
          { name: "Email", type: "Text (Email format)", mand: "Yes" }
        ]
      },
      {
        id: "tax",
        name: "Tax Profile",
        active: true,
        href: "/dashboard/admin/master-profile/tax",
        desc: "Defines operational tax percentages such as GST rates.",
        rules: [
          "Tax Type is immutable once created (e.g. GST @ 7%).",
          "Tax Rate is numerical up to 3 decimals."
        ],
        fields: [
          { name: "Tax Type", type: "Text (Immutable)", mand: "Yes" },
          { name: "Tax Rate", type: "Numeric (3 decimals)", mand: "Yes" }
        ]
      },
      {
        id: "currency",
        name: "Currency Profile",
        active: true,
        href: "/dashboard/profiles/currency",
        desc: "Configures foreign currency conversion rates against INR.",
        rules: [
          "All transactions snap the latest rate at creation. Transaction date is irrelevant.",
          "If no rate is defined, system aborts transactions with a prompt.",
          "One currency can be marked as Default."
        ],
        fields: [
          { name: "Currency Code", type: "Text (Immutable)", mand: "Yes" },
          { name: "Currency Name", type: "Text (Immutable)", mand: "Yes" },
          { name: "Exchange Rate", type: "Numeric (3 decimals)", mand: "Yes" },
          { name: "Default", type: "Checkbox", mand: "No" }
        ]
      },
      {
        id: "payment",
        name: "Payment Term Profile",
        active: true,
        href: "/dashboard/profiles/payment-term",
        desc: "Defines credit limits and terms such as COD or Net 30.",
        rules: [
          "Saves standard payment text (e.g. COD, Net 30).",
          "Mandatory integer days."
        ],
        fields: [
          { name: "Term", type: "Text (Immutable)", mand: "Yes" },
          { name: "Day", type: "Numeric (Integer)", mand: "Yes" }
        ]
      }
    ]
  },
  {
    name: "Partners & Contacts",
    profiles: [
      {
        id: "customer",
        name: "Customer Profile",
        active: true,
        href: "/dashboard/admin/master-profile/customer",
        desc: "Manages buyers, multiple contact persons, and delivery addresses.",
        rules: [
          "Customer must be created in this profile before use in Sales Orders.",
          "Has multiple contact persons & addresses with exactly one default each.",
          "Customer Code and Customer Name are immutable once saved."
        ],
        fields: [
          { name: "Customer Code", type: "Text (Immutable)", mand: "Yes" },
          { name: "Customer Name", type: "Text (Immutable)", mand: "Yes" },
          { name: "Contact Person List", type: "Table with 1 Default", mand: "Yes" },
          { name: "Address List", type: "Table with 1 Default", mand: "Yes" }
        ]
      },
      {
        id: "supplier",
        name: "Supplier Profile",
        active: true,
        href: "/dashboard/admin/master-profile/supplier",
        desc: "Maintains vendor records for procurement and subcon orders.",
        rules: [
          "Supplier must exist before use in purchase orders.",
          "Structure is identical to Customer Profile (header + contact + address).",
          "Purchasers must verify vendor status remains Active."
        ],
        fields: [
          { name: "Supplier Code", type: "Text (Immutable)", mand: "Yes" },
          { name: "Supplier Name", type: "Text (Immutable)", mand: "Yes" },
          { name: "Contacts & Addresses", type: "Sub-tables", mand: "Yes" }
        ]
      }
    ]
  },
  {
    name: "Inventory & Materials",
    profiles: [
      {
        id: "material",
        name: "Material Profile",
        active: true,
        href: "/dashboard/master-profile/material",
        desc: "Stores internal item catalog, sizes, shapes, and category links.",
        rules: [
          "Must exist before use in purchase orders (unless free-text override is used).",
          "Supplier-specific descriptions are captured on the PO line directly, not here.",
          "NO standard UOM is tied to a material — UOM is selected per PO."
        ],
        fields: [
          { name: "Part No", type: "Text", mand: "No" },
          { name: "Description", type: "Multi-text", mand: "Yes" },
          { name: "Shape / Size", type: "Text", mand: "Yes/No" },
          { name: "Material Category", type: "Dropdown (Material Category)", mand: "Yes" }
        ]
      },
      {
        id: "finished-good",
        name: "Finished Good Profile",
        active: true,
        href: "/dashboard/profiles/finished-good",
        desc: "Tracks manufactured items sold to customers in Sales Orders.",
        rules: [
          "Must exist before use in Sales Order item rows.",
          "No quantity tracking or UOM is defined on the profile."
        ],
        fields: [
          { name: "Part No", type: "Text", mand: "No" },
          { name: "Description", type: "Multi-text", mand: "Yes" }
        ]
      },
      {
        id: "material-cat",
        name: "Material Category Profile",
        active: true,
        href: "/dashboard/profiles/material-categories",
        desc: "Groups items into specific categories (e.g. Raw Plates).",
        rules: [
          "Used to categorize materials in the main Material Profile.",
          "Category name is immutable once saved."
        ],
        fields: [
          { name: "Category", type: "Text (Immutable)", mand: "Yes" },
          { name: "Remark", type: "Multi-text", mand: "No" }
        ]
      },
      {
        id: "material-type",
        name: "Material Type Profile",
        active: true,
        href: "/dashboard/profiles/material-types",
        desc: "Groups items into specific material types (e.g. Stainless Steel).",
        rules: [
          "Used to categorize material types for WO - Welding.",
          "Type name is immutable once saved."
        ],
        fields: [
          { name: "Type", type: "Text (Immutable)", mand: "Yes" },
          { name: "Remark", type: "Multi-text", mand: "No" }
        ]
      },
      {
        id: "uom",
        name: "UOM Profile",
        active: true,
        href: "/dashboard/profiles/uom",
        desc: "Defines units of measurement like Pieces, Boxes, or Packs.",
        rules: [
          "UOM is immutable once created.",
          "Used extensively in Materials and Purchase Orders."
        ],
        fields: [
          { name: "UOM", type: "Text (Immutable)", mand: "Yes" },
          { name: "Remarks", type: "Multi-text", mand: "No" }
        ]
      }
    ]
  },
  {
    name: "Production & Shop Floor",
    profiles: [
      {
        id: "machine",
        name: "Machine Profile",
        active: true,
        href: "/dashboard/profiles/machine",
        desc: "Maintains welding and machining equipment with categorizations.",
        rules: [
          "Allows inline creation directly from operation modules if value not found.",
          "Machine Category filters which machines appear in welding vs machining routing dropdowns.",
          "Ties to CNC/Convention and Milling/Turning choices."
        ],
        fields: [
          { name: "Machine Code", type: "Text (Immutable)", mand: "Yes" },
          { name: "Machine No / Brand", type: "Text", mand: "Yes" },
          { name: "Machine Category", type: "Fixed Dropdown (Welding / Machine)", mand: "Yes" }
        ]
      },
      {
        id: "process",
        name: "Process Profile (Routing)",
        active: true,
        href: "/dashboard/profiles/process-profiles",
        desc: "Configures sub-process routing steps, costs, and scan parameters.",
        rules: [
          "One row corresponds to one routing process under a Main Process.",
          "Cost per minute (2 decimals) must be specified for costing reports.",
          "Welding, Spray Painting, Machining checkboxes trigger specialized parameter forms on scan-out."
        ],
        fields: [
          { name: "Main Process", type: "Dropdown (Main Process)", mand: "Yes" },
          { name: "Routing Process", type: "Text (Immutable)", mand: "Yes" },
          { name: "Welding/Painting/Machining Flags", type: "Checkboxes", mand: "No" },
          { name: "Cost Per Minute", type: "Numeric (2 decimals)", mand: "Yes" }
        ]
      },
      {
        id: "main-process",
        name: "Main Process Profile",
        active: true,
        href: "/dashboard/profiles/main-process",
        desc: "Tracks high-level operational groupings (e.g. Sizing).",
        rules: [
          "Main Process name is immutable once saved.",
          "Feeds into Routing Process dropdowns."
        ],
        fields: [
          { name: "Main Process", type: "Text (Immutable)", mand: "Yes" },
          { name: "Remark", type: "Multi-text", mand: "No" }
        ]
      },
      {
        id: "failure-mode",
        name: "Failure Mode Profile",
        active: true,
        href: "/dashboard/master-profile/failure-mode",
        desc: "Catalogs failure reasons for Non-Conformance reporting (NCR).",
        rules: [
          "Allows inline creation directly from NCR module.",
          "Failure Mode is immutable once created (e.g. Coating, Welding Defect)."
        ],
        fields: [
          { name: "Failure Mode", type: "Text (Immutable)", mand: "Yes" },
          { name: "Remark", type: "Multi-text", mand: "No" }
        ]
      },
      {
        id: "welding-type",
        name: "Welding Type Profile",
        active: true,
        href: "/dashboard/profiles/welding-types",
        desc: "Maintains list of welding types.",
        rules: [
          "Information in this profile will be used in work order - welding.",
          "Welding type can be created directly from operation module."
        ],
        fields: [
          { name: "Type", type: "Text (Immutable)", mand: "Yes" },
          { name: "Remark", type: "Multi-text", mand: "No" }
        ]
      },
      {
        id: "joint-profile",
        name: "Joint Profile",
        active: true,
        href: "/dashboard/profiles/joint-profiles",
        desc: "Maintains list of joint types.",
        rules: [
          "Information in this profile will be used in work order - welding.",
          "Joint can be created directly from operation module."
        ],
        fields: [
          { name: "Joint", type: "Text (Immutable)", mand: "Yes" },
          { name: "Remark", type: "Multi-text", mand: "No" }
        ]
      },
      {
        id: "painting-method",
        name: "Painting Method Profile",
        active: true,
        href: "/dashboard/profiles/painting-method",
        desc: "Maintains list of painting methods.",
        rules: [
          "Information from this profile will be used in Certificate of Conformity (COC).",
          "Painting method can be created directly from COC module."
        ],
        fields: [
          { name: "Painting Method", type: "Text (Immutable)", mand: "Yes" },
          { name: "Remark", type: "Multi-text", mand: "No" }
        ]
      },
      {
        id: "incoterm",
        name: "Incoterm Profile",
        active: true,
        href: "/dashboard/profiles/incoterm",
        desc: "Maintains list of incoterms.",
        rules: [
          "Incoterm will be used in sales order.",
          "Incoterm can be created directly from sales order."
        ],
        fields: [
          { name: "Incoterm", type: "Text (Immutable)", mand: "Yes" },
          { name: "Remark", type: "Multi-text", mand: "No" }
        ]
      }
    ]
  }
];

type ProfileDetails = typeof MASTER_CATEGORIES[0]["profiles"][0];

function MasterProfilesDirectory() {
  const [selectedProfile, setSelectedProfile] = useState<ProfileDetails | null>(null);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600 ">
          Admin Portal
        </span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-blue-900 ">
          Master Profiles Directory
        </h2>
        <p className="mt-1 text-sm text-blue-500 ">
          Manage system-wide static data, finance rates, operational parameters, and approval matrices.
        </p>
      </div>

      {/* Directory Category Loops */}
      <div className="space-y-10">
        {MASTER_CATEGORIES.map((category) => (
          <div key={category.name} className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 ">
              {category.name}
            </h3>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {category.profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`group relative flex flex-col justify-between rounded-xl border border-blue-200 bg-white p-5 shadow-sm transition hover:shadow-md ${profile.active
                      ? "ring-1 ring-indigo-500/25 "
                      : ""
                    }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h4 className="text-base font-bold text-blue-900 group-hover:text-indigo-600 :text-indigo-400 transition-colors">
                        {profile.name}
                      </h4>
                      {profile.active ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-500 uppercase">
                          Spec Only
                        </span>
                      )}
                    </div>
                    <p className="mt-2.5 text-xs text-blue-500 leading-relaxed ">
                      {profile.desc}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-blue-100 pt-3.5 flex items-center justify-between ">
                    <button
                      onClick={() => setSelectedProfile(profile)}
                      className="text-xs font-semibold text-blue-500 hover:text-blue-900 :text-blue-200"
                    >
                      View Profile Specification
                    </button>
                    {profile.active ? (
                      <a
                        href={profile.href}
                        className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition"
                      >
                        Manage &rarr;
                      </a>
                    ) : (
                      <button
                        onClick={() => setSelectedProfile(profile)}
                        className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-50 hover:text-blue-600 :bg-blue-850"
                      >
                        Locked
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* SPEC DRAWER SLIDE-OVER */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Drawer backdrop */}
          <div
            onClick={() => setSelectedProfile(null)}
            className="absolute inset-0 bg-blue-900/60 backdrop-blur-xs transition-opacity"
          ></div>

          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-lg transform bg-white shadow-2xl transition-transform duration-300">
              <div className="flex h-full flex-col overflow-y-scroll py-6 px-6">

                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-blue-100 pb-5 ">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900 ">
                      {selectedProfile.name}
                    </h3>
                    <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mt-0.5">
                      {selectedProfile.active ? "Interactive Module" : "Developer Reference Specs"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-100 :bg-blue-800"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="mt-6 flex-1 space-y-6">
                  {/* Summary */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400">Description</h4>
                    <p className="mt-2 text-sm text-blue-600 leading-relaxed">
                      {selectedProfile.desc}
                    </p>
                  </div>

                  {/* Profile Rules */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400">Business Specifications</h4>
                    <ul className="mt-2 space-y-2">
                      {selectedProfile.rules.map((rule, index) => (
                        <li key={index} className="flex gap-2.5 text-sm text-blue-600 ">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500"></span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Profile Fields Table */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400">Database &amp; UI Fields</h4>
                    <div className="mt-3 overflow-hidden rounded-lg border border-blue-200 ">
                      <table className="min-w-full divide-y divide-blue-200 text-left">
                        <thead className="bg-blue-50 text-xs font-semibold text-blue-500">
                          <tr>
                            <th className="px-4 py-2">Field Name</th>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">Mandatory</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100 bg-white text-xs text-blue-700 ">
                          {selectedProfile.fields.map((field) => (
                            <tr key={field.name}>
                              <td className="px-4 py-2.5 font-semibold">{field.name}</td>
                              <td className="px-4 py-2.5 font-mono text-blue-500 ">{field.type}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold ${field.mand === "Yes"
                                    ? "bg-rose-50 text-rose-600 "
                                    : "bg-blue-100 text-blue-500 "
                                  }`}>
                                  {field.mand}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="mt-6 border-t border-blue-100 pt-5 flex items-center justify-between ">
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="rounded-lg border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 :bg-blue-850"
                  >
                    Close spec
                  </button>
                  {selectedProfile.active ? (
                    <a
                      href={selectedProfile.href}
                      onClick={() => setSelectedProfile(null)}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-sm"
                    >
                      Open Master Admin
                    </a>
                  ) : (
                    <span className="text-xs text-blue-400 italic">
                      Locked module - reference only
                    </span>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
