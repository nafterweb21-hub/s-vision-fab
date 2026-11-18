// Purchase Requisition status vocabulary shared by the list and the form (display only).
// Spec (docs/spec/purchasing.md):
//   Status:    Draft → Submitted | Void   (Revise marks the source "Old Version")
//   PO Status: N/A → Partially Issued → Fully Issued | Cancelled  (computed by src/lib/pr-po-status.ts)
import type { Tone } from "@/components/form-ui";

export const PR_STATUSES = ["Draft", "Submitted", "Void", "Old Version"] as const;
export type PrStatus = (typeof PR_STATUSES)[number];

export const PR_STATUS_TONE: Record<PrStatus, Tone> = {
  Draft: "amber",
  Submitted: "emerald",
  Void: "rose",
  "Old Version": "slate",
};

export function prStatusTone(status: string | null | undefined): Tone {
  return PR_STATUS_TONE[status as PrStatus] ?? "blue";
}

export const PR_PO_STATUSES = ["N/A", "Partially Issued", "Fully Issued", "Cancelled"] as const;
export type PrPoStatus = (typeof PR_PO_STATUSES)[number];

export const PR_PO_STATUS_TONE: Record<PrPoStatus, Tone> = {
  "N/A": "slate",
  "Partially Issued": "sky",
  "Fully Issued": "emerald",
  Cancelled: "rose",
};

/** Friendlier labels for the PO-status tiles; the stored value is unchanged. */
export const PR_PO_STATUS_LABEL: Record<PrPoStatus, string> = {
  "N/A": "Not ordered",
  "Partially Issued": "Partially ordered",
  "Fully Issued": "Fully ordered",
  Cancelled: "Cancelled",
};

export function prPoStatusTone(status: string | null | undefined): Tone {
  return PR_PO_STATUS_TONE[status as PrPoStatus] ?? "slate";
}

// ---- PO tracking rules shared by the server recompute (src/lib/pr-po-status.ts) and the UI ----

/** PO statuses that no longer hold PR quantity. */
export const PR_PO_NOT_COUNTED = ["Void", "Old Version"] as const;

type Num = number | string | { toString(): string } | null | undefined;
const num = (v: Num) => Number(v ?? 0) || 0;
const EPS = 1e-9;

/**
 * A PO line's quantity expressed in the PR line's UOM, or null when it can't be converted.
 * The PO line converts itself through `conversion` into its Internal UOM (Internal Qty =
 * Qty × Conversion), so a matching Internal UOM wins; otherwise a matching PO UOM is taken
 * as-is. No UOM-to-UOM conversion table exists, so any other line is excluded (never added
 * in its own unit).
 */
export function poQtyInPrUom(
  prUomId: string | null | undefined,
  po: { quantity: Num; poUomId?: string | null; internalQuantity?: Num; internalUomId?: string | null },
): number | null {
  if (!prUomId) return null;
  if (po.internalUomId && po.internalUomId === prUomId) return num(po.internalQuantity);
  if (po.poUomId && po.poUomId === prUomId) return num(po.quantity);
  return null;
}

/** PR Qty / Balance Require Purchase for one line. Balance never goes below 0; any excess is `overOrdered`. */
export function prLineBalance(quantity: Num, cancelQuantity: Num, issued: Num) {
  const prQty = Math.max(num(quantity) - num(cancelQuantity), 0);
  const po = num(issued);
  const diff = prQty - po;
  return {
    prQty,
    issued: po,
    balance: diff > EPS ? diff : 0,
    overOrdered: diff < -EPS ? -diff : 0,
  };
}

type PoRef = { poNo: string; revision?: number | null };
const poLabel = (po: PoRef) => (po.revision == null ? po.poNo : `${po.poNo}-R${po.revision}`);

/** Unique "PO-no-Rn" labels of the counted PO lines on one PR line. */
export function linkedPoNos(
  item: { purchaseOrderItems?: { purchaseOrder?: (PoRef & { status?: string | null }) | null }[] | null } | null | undefined,
): string[] {
  const out = new Set<string>();
  for (const pl of item?.purchaseOrderItems ?? []) {
    const po = pl.purchaseOrder;
    if (!po) continue;
    if (po.status && (PR_PO_NOT_COUNTED as readonly string[]).includes(po.status)) continue;
    out.add(poLabel(po));
  }
  return [...out];
}

/** Unique PO labels across every line of a PR. */
export function issuedPoNosOf(pr: { items?: Parameters<typeof linkedPoNos>[0][] | null } | null | undefined): string[] {
  return [...new Set((pr?.items ?? []).flatMap((it) => linkedPoNos(it)))];
}

const poList = (pos: string[]) =>
  pos.length === 1 ? `${pos[0]} was` : `${pos.slice(0, -1).join(", ")} and ${pos[pos.length - 1]} were`;

/** Why a PR can't be voided, or null. `issuedPoNos` = POs (not Void / Old Version) on its lines. */
export function prVoidBlockReason(
  pr: { status?: string | null } | null | undefined,
  issuedPoNos: string[] = [],
): string | null {
  if (!pr) return "No purchase requisition selected.";
  if (pr.status === "Void") return "This purchase requisition is already void.";
  if (issuedPoNos.length) {
    return `${poList(issuedPoNos)} issued against this requisition; void the PO${issuedPoNos.length > 1 ? "s" : ""} first.`;
  }
  return null;
}

/** Why a PR line can't be removed while editing, or null. */
export function prLineRemoveBlockReason(lineNo: number, poNos: string[]): string | null {
  if (!poNos.length) return null;
  return `Line ${lineNo} has PO quantity issued (${poNos.join(", ")}); it can't be removed.`;
}

/** Why a PR line's UOM can't change, or null. */
export function prLineUomChangeBlockReason(lineNo: number, poNos: string[]): string | null {
  if (!poNos.length) return null;
  return `Line ${lineNo} has PO quantity issued (${poNos.join(", ")}) in its current UOM; the UOM can't be changed.`;
}
