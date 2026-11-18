import React from "react";
import type { LucideIcon } from "lucide-react";
import { TONES, statusTone, type Tone } from "./tones";

export type BadgeProps = {
  tone?: Tone;
  dot?: boolean;
  icon?: LucideIcon;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
};

/** Tinted pill. */
export function Badge({ tone = "slate", dot, icon: Icon, size = "sm", className = "", children }: BadgeProps) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset ${t.pill} ${
        size === "md" ? "px-2.5 py-0.5 text-xs" : "px-2 py-0.5 text-[11px]"
      } ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}

/** Status pill with a coloured dot. Pass `tone` to override the default status → tone mapping. */
export function StatusBadge({ status, tone, size, label }: { status: string; tone?: Tone; size?: "sm" | "md"; label?: React.ReactNode }) {
  return (
    <Badge tone={tone ?? statusTone(status)} dot size={size}>
      {label ?? status}
    </Badge>
  );
}

/** Small meta chip for document headers: icon + muted label + value. */
export function MetaChip({ icon: Icon, label, children, title }: { icon: LucideIcon; label?: string; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600"
    >
      <Icon size={12} className="shrink-0 text-slate-400" />
      {label && <span className="shrink-0 text-slate-400">{label}</span>}
      <span className="truncate font-medium text-slate-700">{children}</span>
    </span>
  );
}
