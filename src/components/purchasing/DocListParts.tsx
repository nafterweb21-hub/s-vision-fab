import React from "react";
import Link from "next/link";
import { AlertCircle, Loader2, MousePointerClick, Search, X } from "lucide-react";
import { TONES, buttonClass, type Tone } from "@/components/form-ui";

// Building blocks for the Goods Receive / Goods Return list screens, in the same
// form-ui style as the Purchase Order list.

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function Toast({ message }: { message: string }) {
  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2.5 rounded-lg bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-white shadow-xl ring-1 ring-white/10 sm:right-6 sm:top-6">
      <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
      {message}
    </div>
  );
}

export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-400">
      <Link href="/dashboard" className="hover:text-slate-600">Dashboard</Link>
      <span>/</span>
      <span>Purchasing</span>
      <span>/</span>
      <span className="text-slate-500">{current}</span>
    </nav>
  );
}

export function StatusTiles<T extends string>({
  tabs,
  tab,
  onTab,
  count,
  label,
  tone,
}: {
  tabs: readonly T[];
  tab: T;
  onTab: (t: T) => void;
  count: (t: T) => number | null;
  label: (t: T) => string;
  tone: (t: T) => Tone;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Filter by status">
      {tabs.map((key) => {
        const active = tab === key;
        const n = count(key);
        const t = tone(key);
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTab(key)}
            className={`relative flex min-w-0 flex-col items-start overflow-hidden rounded-lg border px-3 py-2 pl-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
              active
                ? "border-indigo-300 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500/15"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span className={`absolute inset-y-0 left-0 w-[3px] ${TONES[t].bar}`} />
            <span className={`flex w-full items-center gap-1.5 truncate text-[11px] font-medium ${active ? "text-indigo-700" : "text-slate-500"}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONES[t].dot}`} />
              <span className="truncate">{label(key)}</span>
            </span>
            <span className={`text-base font-semibold leading-tight tabular-nums ${active ? "text-indigo-900" : "text-slate-900"} ${n === 0 ? "opacity-40" : ""}`}>
              {n === null ? "–" : n}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder,
  refreshing,
  hasFilters,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  refreshing: boolean;
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2.5 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-sm">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {refreshing && <Loader2 size={14} className="animate-spin text-indigo-500" aria-label="Refreshing" />}
        {hasFilters && (
          <button type="button" onClick={onClear} className={buttonClass("ghost", "sm")}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

export function SelectionBar({
  selectedLabel,
  onClear,
  hint,
  children,
}: {
  selectedLabel?: string;
  onClear: () => void;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-2 border-b px-4 py-2 transition-colors sm:flex-row sm:items-center ${
        selectedLabel ? "border-indigo-100 bg-indigo-50/50" : "border-slate-100 bg-slate-50/50"
      }`}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2 text-xs">
        {selectedLabel ? (
          <>
            <span className="text-slate-500">Selected</span>
            <span className="truncate font-mono font-semibold text-indigo-700">{selectedLabel}</span>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-600"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <MousePointerClick size={13} /> {hint}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1 sm:ml-auto">{children}</div>
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2">
      <Loader2 size={20} className="animate-spin text-indigo-600" />
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="m-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
      <AlertCircle size={14} />
      <p className="font-medium">{message}</p>
    </div>
  );
}

export function ToolbarBtn({
  icon,
  label,
  onClick,
  disabled,
  title,
  spinning,
  variant = "secondary",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  spinning?: boolean;
  variant?: "secondary" | "primary" | "danger" | "warn" | "success";
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={buttonClass(variant, "sm")}>
      {spinning ? <Loader2 size={12} className="animate-spin" /> : icon} {label}
    </button>
  );
}
