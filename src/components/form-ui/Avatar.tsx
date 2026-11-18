import React from "react";

// Fixed literal palette so Tailwind can see every class.
const AVATAR_TINTS = [
  "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
  "bg-sky-50 text-sky-700 ring-sky-600/15",
  "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  "bg-amber-50 text-amber-700 ring-amber-600/15",
  "bg-violet-50 text-violet-700 ring-violet-600/15",
  "bg-rose-50 text-rose-700 ring-rose-600/15",
  "bg-teal-50 text-teal-700 ring-teal-600/15",
  "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/15",
] as const;

export function initials(name: string | null | undefined): string {
  const words = (name || "").replace(/[.,&()/_+\-]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Initials avatar with a deterministic tint derived from the name. */
export function InitialsAvatar({ name, size = "sm" }: { name: string | null | undefined; size?: "sm" | "md" }) {
  const tint = AVATAR_TINTS[hash(name || "") % AVATAR_TINTS.length];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset ${tint} ${
        size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]"
      }`}
    >
      {initials(name)}
    </span>
  );
}
