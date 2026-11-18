// Delivery Order status rules shared by the list and the create/edit form.
// Spec (docs/spec/delivery-and-coc.md): Draft → Submitted | Void.
import type { Tone } from "@/components/form-ui";

export const DO_STATUSES = ["Draft", "Submitted", "Void"] as const;
export type DoStatus = (typeof DO_STATUSES)[number];

/**
 * Canonical spellings are "Draft" / "Submitted" / "Void" (spec + API).
 * Accept case/whitespace variants and the "Voided" / "Cancelled" / "Submit" spellings used elsewhere on read.
 */
export function normalizeDoStatus(status: string | null | undefined): string {
  const s = (status || "").trim();
  if (!s) return "Draft";
  switch (s.toLowerCase()) {
    case "draft":
      return "Draft";
    case "submitted":
    case "submit":
      return "Submitted";
    case "void":
    case "voided":
    case "cancelled":
    case "canceled":
      return "Void";
    default:
      return s;
  }
}

export const DO_STATUS_TONE: Record<DoStatus, Tone> = {
  Draft: "amber",
  Submitted: "emerald",
  Void: "rose",
};

export function doStatusTone(status: string | null | undefined): Tone {
  return DO_STATUS_TONE[normalizeDoStatus(status) as DoStatus] ?? "slate";
}

/** Only Draft delivery orders can be edited or submitted (the PUT / submit routes enforce the same). */
export function isDoDraft(status: string | null | undefined): boolean {
  return normalizeDoStatus(status) === "Draft";
}
