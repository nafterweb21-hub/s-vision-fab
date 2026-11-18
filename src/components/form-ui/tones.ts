// Tonal palette shared by the form-ui primitives.
// Every class string is a full literal so Tailwind's scanner can see it —
// never build these with template interpolation (e.g. `bg-${tone}-50`).

export type Tone = "slate" | "indigo" | "sky" | "amber" | "violet" | "emerald" | "rose" | "blue";

export type ToneClasses = {
  /** 28px icon tile: tinted bg + -600 icon + /15 ring */
  tile: string;
  /** pill / tag: tinted bg + -700 text + /15 ring (use with ring-1 ring-inset) */
  pill: string;
  /** small solid dot */
  dot: string;
  /** solid left/top accent bar */
  bar: string;
  /** -600 text only */
  text: string;
};

export const TONES: Record<Tone, ToneClasses> = {
  slate: {
    tile: "bg-slate-100 text-slate-600 ring-slate-500/15",
    pill: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dot: "bg-slate-400",
    bar: "bg-slate-400",
    text: "text-slate-600",
  },
  indigo: {
    tile: "bg-indigo-50 text-indigo-600 ring-indigo-600/15",
    pill: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
    dot: "bg-indigo-500",
    bar: "bg-indigo-500",
    text: "text-indigo-600",
  },
  sky: {
    tile: "bg-sky-50 text-sky-600 ring-sky-600/15",
    pill: "bg-sky-50 text-sky-700 ring-sky-600/15",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
    text: "text-sky-600",
  },
  amber: {
    tile: "bg-amber-50 text-amber-600 ring-amber-600/15",
    pill: "bg-amber-50 text-amber-700 ring-amber-600/15",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    text: "text-amber-600",
  },
  violet: {
    tile: "bg-violet-50 text-violet-600 ring-violet-600/15",
    pill: "bg-violet-50 text-violet-700 ring-violet-600/15",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
    text: "text-violet-600",
  },
  emerald: {
    tile: "bg-emerald-50 text-emerald-600 ring-emerald-600/15",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
  },
  rose: {
    tile: "bg-rose-50 text-rose-600 ring-rose-600/15",
    pill: "bg-rose-50 text-rose-700 ring-rose-600/15",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    text: "text-rose-600",
  },
  blue: {
    tile: "bg-blue-50 text-blue-600 ring-blue-600/15",
    pill: "bg-blue-50 text-blue-700 ring-blue-600/15",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    text: "text-blue-600",
  },
};

/** Default tone per common document status across modules. */
const STATUS_TONES: Record<string, Tone> = {
  Draft: "amber",
  Submitted: "sky",
  Pending: "amber",
  "Pending Approval": "amber",
  Approved: "emerald",
  Confirmed: "emerald",
  Active: "emerald",
  Completed: "emerald",
  Revised: "blue",
  "Old Version": "slate",
  "Old Revise": "slate", // legacy spelling
  Closed: "slate",
  Inactive: "slate",
  Rejected: "rose",
  Void: "rose",
};

export function statusTone(status: string | null | undefined): Tone {
  return (status && STATUS_TONES[status]) || "slate";
}
