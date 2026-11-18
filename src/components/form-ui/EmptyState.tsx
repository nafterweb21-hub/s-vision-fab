import React from "react";
import type { LucideIcon } from "lucide-react";
import { TONES, type Tone } from "./tones";

export type EmptyStateProps = {
  icon: LucideIcon;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Dashed, tinted box (inside a card) instead of a plain block. */
  boxed?: boolean;
  className?: string;
};

/** Friendly empty / no-results state: tinted icon circle, message, optional action. */
export function EmptyState({ icon: Icon, tone = "indigo", title, description, action, boxed, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center px-4 py-10 text-center ${
        boxed ? "rounded-lg border border-dashed border-slate-200 bg-slate-50/50" : ""
      } ${className}`}
    >
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-inset ${TONES[tone].tile}`}>
        <Icon size={18} />
      </div>
      <p className="text-[13px] font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-0.5 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
