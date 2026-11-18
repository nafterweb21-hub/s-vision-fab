// Purchase Order status vocabulary shared by the list and the form (display only).
// Spec (docs/spec/purchasing.md):
//   Status:         Draft → Pending For Approval → Rejected | Approved → Issued   (plus Void / Old Version)
//                   Two-tier POs move Pending First Tier Approval → Pending Second Tier Approval.
//   Receive Status: NA / Not Received / Partially Received / Fully Received  (computed by src/lib/po-receive-status.ts)
import type { Tone } from "@/components/form-ui";

/** Every status that means "waiting on an approver". The list API's "Pending For Approval" filter matches all three. */
export const PO_PENDING_STATUSES = [
  "Pending For Approval",
  "Pending First Tier Approval",
  "Pending Second Tier Approval",
] as const;

export function isPoPending(status: string | null | undefined): boolean {
  return (PO_PENDING_STATUSES as readonly string[]).includes(status ?? "");
}

const PO_STATUS_TONE: Record<string, Tone> = {
  Draft: "amber",
  "Pending For Approval": "sky",
  "Pending First Tier Approval": "amber",
  "Pending Second Tier Approval": "violet",
  Approved: "emerald",
  Issued: "emerald",
  Rejected: "rose",
  Void: "rose",
  Revised: "blue",
  "Old Version": "slate",
};

export function poStatusTone(status: string | null | undefined): Tone {
  return (status && PO_STATUS_TONE[status]) || "blue";
}

const RECEIVE_TONE: Record<string, Tone> = {
  NA: "slate",
  "Not Received": "rose",
  "Partially Received": "sky",
  "Fully Received": "emerald",
};

export function poReceiveTone(status: string | null | undefined): Tone {
  return (status && RECEIVE_TONE[status]) || "slate";
}

/** Display label for a receive status; the stored value is unchanged. */
export function poReceiveLabel(status: string | null | undefined): string {
  if (!status || status === "NA") return "N/A";
  return status;
}

export type TierState = "done" | "current" | "waiting" | "rejected" | "skipped" | "none";

export type PoApprovalStage = {
  /** 1 or 2 once submitted; null before anyone has submitted it. */
  tiers: 1 | 2 | null;
  tier1: TierState;
  tier2: TierState;
  /** Short label for the header pill. */
  label: string;
  tone: Tone;
};

type ApprovalFields = {
  status?: string | null;
  approvalTier?: number | null;
  firstApproverName?: string | null;
  secondApproverName?: string | null;
};

/**
 * Where a PO sits in the two-tier approval flow, for display. Same reading as
 * evaluatePoApprovalState in src/lib/po-approval-logic.ts: a two-tier PO whose
 * first approver is recorded is waiting on tier 2.
 */
export function poApprovalStage(po: ApprovalFields | null | undefined): PoApprovalStage {
  const status = po?.status || "Draft";
  const submitted = status !== "Draft" && status !== "Void" && status !== "Old Version";
  const hasFirst = !!po?.firstApproverName;
  const hasSecond = !!po?.secondApproverName;
  const twoTier =
    status === "Pending First Tier Approval" || status === "Pending Second Tier Approval" || (po?.approvalTier ?? 1) === 2;
  const tiers: 1 | 2 | null = submitted || hasFirst ? (twoTier ? 2 : 1) : null;

  if (tiers === null) {
    return { tiers, tier1: "none", tier2: "none", label: "Not submitted", tone: "slate" };
  }

  const secondPending =
    status === "Pending Second Tier Approval" || (twoTier && isPoPending(status) && hasFirst);

  let tier1: TierState;
  let tier2: TierState = tiers === 2 ? "waiting" : "none";

  if (status === "Rejected") {
    if (hasFirst && tiers === 2) {
      tier1 = "done";
      tier2 = "rejected";
    } else {
      tier1 = "rejected";
      if (tiers === 2) tier2 = "skipped";
    }
  } else if (secondPending) {
    tier1 = "done";
    tier2 = "current";
  } else if (isPoPending(status)) {
    tier1 = "current";
  } else if (status === "Approved" || status === "Issued" || hasFirst) {
    tier1 = "done";
    if (tiers === 2) tier2 = hasSecond || status === "Approved" || status === "Issued" ? "done" : "waiting";
  } else {
    tier1 = "waiting";
  }

  const label =
    status === "Rejected"
      ? "Rejected"
      : tier1 === "current"
        ? tiers === 2 ? "Awaiting tier 1 of 2" : "Awaiting approval"
        : tier2 === "current"
          ? "Awaiting tier 2 of 2"
          : tier1 === "done" && (tiers === 1 || tier2 === "done")
            ? tiers === 2 ? "2-tier approved" : "Approved"
            : tiers === 2 ? "2-tier approval" : "1-tier approval";

  const tone: Tone =
    status === "Rejected" ? "rose" : tier1 === "current" || tier2 === "current" ? "amber" : tier1 === "done" ? "emerald" : "slate";

  return { tiers, tier1, tier2, label, tone };
}

/** Why the list's Void action is unavailable, or null. Mirrors the transition route (Void / Issued are refused). */
export function poVoidBlockReason(status: string | null | undefined): string | null {
  if (status === "Void") return "Already voided";
  if (status === "Issued") return "An Issued purchase order can't be voided; revise it instead.";
  return null;
}

/** Draft and Rejected POs are editable and submittable (the form and the transition route both allow Rejected). */
export function isPoEditable(status: string | null | undefined): boolean {
  return status === "Draft" || status === "Rejected";
}
