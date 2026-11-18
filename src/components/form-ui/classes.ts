// Compact input / label / button class strings shared by form-ui screens.
// Literal strings only so Tailwind can see them.

const focus =
  "focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export const labelClass = "mb-1 block text-xs font-medium text-slate-600";
export const labelSmClass = "mb-0.5 block text-[11px] font-medium text-slate-500";
export const helpClass = "mt-1 text-[11px] text-slate-500";
export const errorTextClass = "mt-1 text-[11px] font-medium text-rose-600";

export const inputClass = `h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors ${focus} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`;
export const inputSmClass = `h-7 w-full rounded-md border border-slate-300 bg-white px-2 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors ${focus} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`;
export const textareaClass = `block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors ${focus} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`;
export const textareaSmClass = `block min-h-7 w-full resize-y break-words rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] leading-snug text-slate-900 transition-colors ${focus} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`;
export const readOnlyClass =
  "h-8 w-full cursor-not-allowed truncate rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[13px] text-slate-500";
/** Trigger className for SearchableSelect-style div triggers. */
export const selectTriggerClass =
  "h-8 rounded-md border border-slate-300 bg-white px-2.5 text-[13px] text-slate-900 hover:border-slate-400";
export const selectTriggerSmClass =
  "h-7 rounded-md border border-slate-300 bg-white px-2 text-[13px] text-slate-900 hover:border-slate-400";
export const checkboxClass = "h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500";

export type ButtonVariant = "primary" | "secondary" | "danger" | "warn" | "success" | "ghost" | "link";
export type ButtonSize = "xs" | "sm" | "md";

const BTN_BASE =
  "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50";

const BTN_SIZE: Record<ButtonSize, string> = {
  xs: "h-6 gap-1 rounded-md px-1.5 text-[11px]",
  sm: "h-7 gap-1 rounded-md px-2 text-xs",
  md: "h-8 gap-1.5 rounded-lg px-3 text-xs",
};

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] hover:border-slate-300 hover:bg-slate-50",
  danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  warn: "border border-amber-200 bg-white text-amber-700 hover:bg-amber-50",
  success: "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  link: "text-indigo-600 hover:bg-indigo-50",
};

/** Button class helper: buttonClass("primary", "md", "w-full"). */
export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra = ""): string {
  return `${BTN_BASE} ${BTN_SIZE[size]} ${BTN_VARIANT[variant]}${extra ? ` ${extra}` : ""}`;
}

/** Square icon-only button (e.g. remove row). */
export const iconButtonDangerClass =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 disabled:pointer-events-none disabled:opacity-40";
