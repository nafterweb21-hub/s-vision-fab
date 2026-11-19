// Pure two-tier Purchase Order approval rules, shared by the server
// (src/lib/po-approval-logic.ts) and the approval / PO screens. No Prisma here.
//
// Spec (docs/spec/purchasing.md "PO Approval", docs/spec/profiles.md §3):
//   value-banded; tier-1 band → one tier-1 approver; tier-2 band → tier 1 first, then tier 2.
// The spec is silent on segregation of duties and on admins. Defaults chosen here:
//   - nobody approves a PO they purchased or whose PR they requested;
//   - the tier-2 approver must differ from the tier-1 approver;
//   - ADMIN may act without being listed in a band, but the two rules above still apply.

export const PO_PENDING_STATUSES = [
  "Pending For Approval",
  "Pending First Tier Approval",
  "Pending Second Tier Approval",
] as const;

/** Only these statuses may be edited (PUT) or submitted. Matches isPoEditable in po-status.ts. */
export const PO_EDITABLE_STATUSES = ["Draft", "Rejected"] as const;

export function isPoPendingStatus(status: string | null | undefined): boolean {
  return (PO_PENDING_STATUSES as readonly string[]).includes(status ?? "");
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Base-currency amount: document amount × the exchange rate stored on the PO
 * (same conversion as `base()` in src/lib/kpi.ts). Rounded to 2 decimals, the
 * precision of the Approval Level Profile bands.
 */
export function poBaseAmount(amount: unknown, exchangeRate: unknown): number {
  const rate = num(exchangeRate) || 1;
  return Math.round(num(amount) * rate * 100) / 100;
}

/** Used when the first band has no Max Range (the spec's example tier-1 ceiling). */
export const DEFAULT_FIRST_LEVEL_CEILING = 499.99;

export type TierBands = {
  /** First band's Max Range; null/0 when not configured. */
  firstLevelMax: number | null;
  hasSecondLevel: boolean;
};

/** 2 when a second band exists and the base amount is above the first band's ceiling. */
export function requiredTiersForAmount(baseAmount: number, bands: TierBands): 1 | 2 {
  const ceiling = bands.firstLevelMax || DEFAULT_FIRST_LEVEL_CEILING;
  return bands.hasSecondLevel && baseAmount > ceiling ? 2 : 1;
}

type StageFields = {
  status?: string | null;
  approvalTier?: number | null;
  firstApproverId?: string | null;
  firstApproverName?: string | null;
};

/** Which tier is waiting, or null when the PO is not pending approval. */
export function poPendingStage(po: StageFields | null | undefined): "first" | "second" | null {
  const status = po?.status ?? "";
  if (!isPoPendingStatus(status)) return null;
  if (status === "Pending Second Tier Approval") return "second";
  // Legacy rows: two-tier PO still on an earlier pending status with tier 1 recorded.
  if (po?.approvalTier === 2 && (po.firstApproverId || po.firstApproverName)) return "second";
  return "first";
}

/**
 * Tier count for a pending PO: the larger of what was decided on submit (status /
 * approvalTier) and what the current bands say for its base amount.
 */
export function effectiveRequiredTiers(po: StageFields | null | undefined, computed: 1 | 2): 1 | 2 {
  const status = po?.status ?? "";
  if (status === "Pending First Tier Approval" || status === "Pending Second Tier Approval") return 2;
  if (po?.approvalTier === 2) return 2;
  return computed;
}

export type ApproverIdentity = {
  userId: string;
  /** Employee linked to the user (User.employeeId). */
  employeeId?: string | null;
  email?: string | null;
  isAdmin?: boolean;
};

/** People on the PO who may not approve it. */
export type PoParties = {
  /** PurchaseOrder.purchaserId (Employee). */
  purchaserId?: string | null;
  purchaserEmail?: string | null;
  /** PurchaseRequisition.requestedById (Employee). */
  requesterId?: string | null;
  requesterEmail?: string | null;
  /** PurchaseOrder.firstApproverId (User). */
  firstApproverId?: string | null;
};

const sameEmail = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** "purchaser" / "requester" when the user is that party on the PO, else null. */
export function poOwnershipConflict(
  user: ApproverIdentity,
  parties: PoParties,
): "purchaser" | "requester" | null {
  const isParty = (id?: string | null, email?: string | null) =>
    (!!user.employeeId && !!id && user.employeeId === id) || sameEmail(user.email, email);
  if (isParty(parties.purchaserId, parties.purchaserEmail)) return "purchaser";
  if (isParty(parties.requesterId, parties.requesterEmail)) return "requester";
  return null;
}

export const PO_OWN_PURCHASER_REASON = "You can't approve your own PO: you are its purchaser.";
export const PO_OWN_REQUESTER_REASON = "You can't approve your own PO: you requested its purchase requisition.";
export const PO_SAME_APPROVER_REASON = "You approved tier 1; a different approver must approve tier 2.";

/** Approver names for display; "Not assigned" when the band has none. */
export function formatApproverNames(list: { name?: string | null }[] | null | undefined, sep = ", "): string {
  const names = (list || []).map((a) => a.name).filter((n): n is string => !!n);
  return names.length ? names.join(sep) : "Not assigned";
}

export type BlockReasonInput = {
  status?: string | null;
  stage: "first" | "second" | null;
  requiredTiers: 1 | 2;
  user: ApproverIdentity;
  parties: PoParties;
  /** The user is an active approver on the band for the pending stage. */
  isStageApprover: boolean;
  stageApproverNames: { name?: string | null }[];
};

/**
 * Why this user may not approve or reject the PO right now, or null when they may.
 * Segregation-of-duties checks run before the admin allowance, so they bind admins too.
 */
export function poApprovalBlockReason(input: BlockReasonInput): string | null {
  const { stage, user, parties } = input;
  if (!stage) return `This purchase order is not pending approval (status: ${input.status || "unknown"}).`;

  const own = poOwnershipConflict(user, parties);
  if (own === "purchaser") return PO_OWN_PURCHASER_REASON;
  if (own === "requester") return PO_OWN_REQUESTER_REASON;

  if (stage === "second" && !!parties.firstApproverId && parties.firstApproverId === user.userId) {
    return PO_SAME_APPROVER_REASON;
  }

  if (input.isStageApprover || user.isAdmin) return null;

  const hasNames = input.stageApproverNames.some((a) => !!a.name);
  const names = formatApproverNames(input.stageApproverNames, " or ");
  if (stage === "second") {
    return hasNames
      ? `First Tier is approved. Second Tier approval is required from ${names}.`
      : "First Tier is approved. No Second Tier approver is assigned in the Approval Level Profile.";
  }
  const tierLabel = input.requiredTiers === 2 ? "First Tier" : "Single Tier";
  return hasNames
    ? `${tierLabel} approval is required from ${names}.`
    : `No ${tierLabel} approver is assigned in the Approval Level Profile.`;
}

/** Status after a successful approve at this stage. */
export function poStatusAfterApprove(stage: "first" | "second", requiredTiers: 1 | 2): string {
  return stage === "first" && requiredTiers === 2 ? "Pending Second Tier Approval" : "Issued";
}
