"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Download, Filter, Loader2, RotateCcw, TableProperties } from "lucide-react";
import { Card, buttonClass } from "@/components/form-ui";
import { Breadcrumb } from "@/components/purchasing/DocListParts";

// Layout shared by the Purchasing and Subcon Purchasing report screens:
// search criteria on the left, what the Excel file contains on the right.

/** PO statuses offered by the report filters. "Pending For Approval" also covers both tier stages. */
export const REPORT_PO_STATUSES = ["Draft", "Pending For Approval", "Approved", "Issued", "Rejected", "Old Version"] as const;

export type ColumnGroup = { label: string; columns: string[]; highlight?: string };

export function ReportShell({
  title,
  subtitle,
  icon: Icon,
  fields,
  columnGroups,
  note,
  activeFilters,
  loading,
  error,
  lastExport,
  onExport,
  onReset,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  fields: React.ReactNode;
  columnGroups: ColumnGroup[];
  note?: React.ReactNode;
  activeFilters: number;
  loading: boolean;
  error: string;
  lastExport: { lines: number; pos: number; at: Date } | null;
  onExport: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 sm:inline-flex">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <Breadcrumb current={title} />
            <h1 className="text-lg font-semibold leading-tight text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <button type="button" onClick={onExport} disabled={loading} className={buttonClass("primary", "md")}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {loading ? "Generating…" : "Export to Excel"}
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card
          icon={Filter}
          tone="indigo"
          title="Search criteria"
          description="Leave a field empty to include everything"
          actions={
            activeFilters > 0 ? (
              <button type="button" onClick={onReset} className={buttonClass("ghost", "sm")}>
                <RotateCcw size={12} /> Reset ({activeFilters})
              </button>
            ) : undefined
          }
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{fields}</div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}
          {!error && lastExport && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
              <CheckCircle2 size={14} className="shrink-0" />
              Exported {lastExport.lines} line{lastExport.lines === 1 ? "" : "s"} from {lastExport.pos} PO
              {lastExport.pos === 1 ? "" : "s"} at{" "}
              {lastExport.at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}.
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={onReset} disabled={activeFilters === 0} className={buttonClass("secondary", "md")}>
              <RotateCcw size={14} /> Reset
            </button>
            <button type="button" onClick={onExport} disabled={loading} className={buttonClass("primary", "md")}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {loading ? "Generating…" : "Export to Excel"}
            </button>
          </div>
        </Card>

        <Card icon={TableProperties} tone="sky" title="What's in the file" description="One row per PO line, grouped by PO No">
          <div className="space-y-3">
            {columnGroups.map((g) => (
              <div key={g.label}>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">{g.label}</p>
                <div className="flex flex-wrap gap-1">
                  {g.columns.map((c) => (
                    <span
                      key={c}
                      className={`rounded-md px-1.5 py-0.5 text-[11px] ring-1 ring-inset ${
                        c === g.highlight
                          ? "bg-rose-50 font-medium text-rose-700 ring-rose-600/20"
                          : "bg-slate-50 text-slate-600 ring-slate-500/15"
                      }`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {note && <p className="border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-500">{note}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
