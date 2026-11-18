import React from "react";
import type { LucideIcon } from "lucide-react";

export type SegmentedOption<T extends string> = {
  value: T;
  label?: React.ReactNode;
  icon?: LucideIcon;
};

export type SegmentedProps<T extends string> = {
  options: readonly (T | SegmentedOption<T>)[];
  value: T;
  onChange: (value: T) => void;
  /** "neutral": white active segment. "primary": indigo-tinted active segment (for the main choice on a form). */
  variant?: "neutral" | "primary";
  size?: "sm" | "md";
  fullWidth?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

const ACTIVE = {
  neutral: "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200",
  primary: "bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-200",
};

/** Segmented control on a slate-100 track. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant = "neutral",
  size = "sm",
  fullWidth,
  disabled,
  ariaLabel,
  className = "",
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`${fullWidth ? "flex w-full" : "inline-flex max-w-full"} items-center gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-0.5 ${
        size === "md" ? "h-8" : ""
      } ${className}`}
    >
      {options.map((raw) => {
        const opt: SegmentedOption<T> = typeof raw === "string" ? { value: raw as T } : (raw as SegmentedOption<T>);
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${
              fullWidth ? "flex-1" : ""
            } ${active ? ACTIVE[variant] : "text-slate-600 hover:text-slate-900"}`}
          >
            {Icon && <Icon size={13} className={active && variant === "primary" ? "text-indigo-600" : "opacity-70"} />}
            {opt.label ?? opt.value}
          </button>
        );
      })}
    </div>
  );
}
