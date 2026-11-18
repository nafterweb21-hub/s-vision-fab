import React from "react";
import type { LucideIcon } from "lucide-react";
import { TONES, type Tone } from "./tones";

export type CardProps = {
  icon?: LucideIcon;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-side header actions. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
};

/** Tinted icon tile used in card headers (28px). */
export function IconTile({ icon: Icon, tone = "indigo", size = 28 }: { icon: LucideIcon; tone?: Tone; size?: 24 | 28 }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${TONES[tone].tile} ${
        size === 24 ? "h-6 w-6" : "h-7 w-7"
      }`}
    >
      <Icon size={size === 24 ? 13 : 15} strokeWidth={2} />
    </span>
  );
}

/** White section card with a tinted icon tile header. Lightly highlights while a field inside has focus. */
export function Card({ icon, tone = "indigo", title, description, actions, children, className = "", bodyClassName = "p-4", id }: CardProps) {
  return (
    <section
      id={id}
      className={`rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] focus-within:border-indigo-200 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.07)] ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <IconTile icon={icon} tone={tone} />}
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold leading-tight text-slate-800">{title}</h2>
            {description && <p className="truncate text-[11px] leading-tight text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
