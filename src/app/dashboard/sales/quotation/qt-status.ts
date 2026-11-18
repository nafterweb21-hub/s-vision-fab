// Quotation status rules shared by the list and the create/edit form.
// Lifecycle (src/lib/quotations.ts): Draft → Issued → Confirmed → Converted, with Void from any
// non-converted state and Revise (Issued/Confirmed → Old Version + new Draft revision).
// Quotation management is outside docs/spec, so the server code is the source of truth.
import type { Tone } from "@/components/form-ui";

// No "Revised" status: revise marks the old row "Old Version" and opens a new Draft revision (the
// next revision must be editable/issuable, which only Draft allows). Legacy "Revised" rows still
// render (blue tone below) and count under "All current".
export const QT_STATUSES = ["Draft", "Issued", "Confirmed", "Old Version", "Void", "Converted"] as const;
export type QtStatus = (typeof QT_STATUSES)[number];

export type QtAction = "issue" | "confirm" | "void" | "revise" | "convertToSo" | "convertToInvoice";

/** Canonical spelling is "Old Version" (server + every other module). Accept the legacy "Old Revise" on read. */
export function normalizeQtStatus(status: string | null | undefined): string {
  const s = (status || "").trim();
  if (!s) return "Draft";
  if (s === "Old Revise") return "Old Version";
  return s;
}

const QT_STATUS_TONE: Record<QtStatus | "Revised", Tone> = {
  Draft: "amber",
  Issued: "sky",
  Confirmed: "emerald",
  Revised: "blue",
  "Old Version": "slate",
  Void: "rose",
  Converted: "violet",
};

export function qtStatusTone(status: string | null | undefined): Tone {
  return QT_STATUS_TONE[normalizeQtStatus(status) as keyof typeof QT_STATUS_TONE] ?? "slate";
}

/** The server only accepts edits on Draft quotations. */
export function isQtEditable(status: string | null | undefined): boolean {
  return normalizeQtStatus(status) === "Draft";
}

/** Which transition actions the server will accept for a status (mirrors transitionQuotation). */
export function canQtAction(status: string | null | undefined, action: QtAction): boolean {
  const s = normalizeQtStatus(status);
  switch (action) {
    case "issue":
      return s === "Draft";
    case "confirm":
      return s === "Draft" || s === "Issued";
    case "void":
      return s !== "Converted" && s !== "Void";
    case "revise":
      return s === "Issued" || s === "Confirmed";
    case "convertToSo":
    case "convertToInvoice":
      return s === "Confirmed";
  }
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data?.error || fallback;
  } catch {
    return fallback;
  }
}

/** POST /api/sales/quotation/[id]/transition `{ action }` — throws with the server message on failure. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function transitionQuotation(id: string, action: QtAction): Promise<any> {
  const res = await fetch(`/api/sales/quotation/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(await readError(res, `Failed: ${action}`));
  return res.json();
}
