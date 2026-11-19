import React from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarClock, Hash, Package } from "lucide-react";
import { MetaChip, StatusBadge } from "@/components/form-ui";
import { WO_STATUS_TONE } from "./wo-status";

// Header bar + tab strip shared by the four Work Order detail tabs.
// No hooks, so it renders from both server and client pages.

export type WorkOrderTab = "details" | "routing" | "timesheets" | "files";

export type ShellTab = { key: WorkOrderTab; label: string; path: string };

const TABS: ShellTab[] = [
  { key: "details", label: "Order Details", path: "" },
  { key: "routing", label: "In-Process & Routing", path: "/routing" },
  { key: "timesheets", label: "Timesheets & Parameters", path: "/timesheets" },
  { key: "files", label: "Files", path: "/files" },
];

export type WorkOrderSummary = {
  workOrderNo: string;
  status: string;
  customerName?: string | null;
  projectCode?: string | null;
  deliveryDate?: string | Date | null;
  quantity?: string | number | null;
  uom?: string | null;
};

/** Deterministic dd Mon yyyy (no locale), so server and client render the same text. */
export function fmtWoDate(d?: string | Date | null): string {
  if (!d) return "—";
  const iso = typeof d === "string" ? d : d.toISOString();
  const [y, m, day] = iso.slice(0, 10).split("-");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1];
  return mon ? `${day} ${mon} ${y}` : "—";
}

/** Where the shell lives. Defaults to the Work Order module; QC Approval passes its own. */
export type ShellNav = {
  /** Path prefix the WO number is appended to, e.g. "/dashboard/qc/approval". */
  basePath: string;
  backHref: string;
  backLabel: string;
  tabs: ShellTab[];
};

const WO_NAV: ShellNav = {
  basePath: "/dashboard/production/work-order",
  backHref: "/dashboard/production/work-order",
  backLabel: "Work Orders",
  tabs: TABS,
};

export default function WorkOrderShell({
  wo,
  active,
  actions,
  notice,
  nav = WO_NAV,
  children,
}: {
  wo: WorkOrderSummary;
  active: WorkOrderTab;
  nav?: ShellNav;
  /** Right side of the header bar (print, label, add buttons...). */
  actions?: React.ReactNode;
  /** Optional banner under the header bar. */
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  const base = `${nav.basePath}/${encodeURIComponent(wo.workOrderNo)}`;
  const qty = wo.quantity != null && wo.quantity !== "" ? Number(wo.quantity) : null;

  return (
    <div className="w-full space-y-4">
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md print:hidden">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 pt-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href={nav.backHref} className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> {nav.backLabel}
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">WO</span>
                <span className="truncate font-mono text-lg font-semibold text-slate-900">{wo.workOrderNo}</span>
              </h1>
              <StatusBadge status={wo.status} tone={WO_STATUS_TONE[wo.status] ?? "slate"} size="md" />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Customer">{wo.customerName || "—"}</MetaChip>
              {wo.projectCode && <MetaChip icon={Hash} label="Project" title="Project code">{wo.projectCode}</MetaChip>}
              <MetaChip icon={CalendarClock} label="Delivery" title="Delivery date">{fmtWoDate(wo.deliveryDate)}</MetaChip>
              {qty != null && (
                <MetaChip icon={Package} label="Qty" title="Work order quantity">
                  {qty} {wo.uom || ""}
                </MetaChip>
              )}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
        </div>

        <nav className="mt-2 flex gap-1 overflow-x-auto px-3" aria-label="Work order sections">
          {nav.tabs.map((t) => {
            const on = t.key === active;
            return (
              <Link
                key={t.key}
                href={`${base}${t.path}`}
                aria-current={on ? "page" : undefined}
                className={`relative whitespace-nowrap px-2.5 pb-2 pt-1 text-[13px] font-medium transition-colors ${
                  on ? "text-indigo-700" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
                <span className={`absolute inset-x-1.5 bottom-0 h-0.5 rounded-full ${on ? "bg-indigo-600" : "bg-transparent"}`} />
              </Link>
            );
          })}
        </nav>
      </div>

      {notice}
      {children}
    </div>
  );
}

