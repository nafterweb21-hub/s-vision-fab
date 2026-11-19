import { prisma } from "@/lib/prisma";
import { isSuperRole } from "@/lib/access";
import {
  effectiveRequiredTiers,
  poApprovalBlockReason,
  poBaseAmount,
  poPendingStage,
  poStatusAfterApprove,
  requiredTiersForAmount,
  type ApproverIdentity,
  type PoParties,
} from "@/lib/po-approval-rules";

/** The prisma client or a transaction client; only the delegates used here. */
type DbClient = Pick<typeof prisma, "approvalLevelProfile" | "user">;

export interface ApprovalTierInfo {
  requiredTiers: 1 | 2;
  initialStatus: string;
  firstTierApprovers: { id: string; name: string; email: string }[];
  secondTierApprovers: { id: string; name: string; email: string }[];
  /** First level value band from the ApprovalLevelProfile (null when not configured). */
  firstLevelMin: number | null;
  firstLevelMax: number | null;
}

export function poApprovalModule(type: string | null | undefined): string {
  return type === "SUBCON" ? "Purchase Order - Subcon" : "Purchase Order - Material";
}

/**
 * Determines whether a PO needs 1 or 2 tiers of approval based on the active
 * ApprovalLevelProfile value bands. `baseAmount` must already be in base
 * currency — use poBaseAmount(amountAfterTax, exchangeRate).
 */
export async function determineApprovalRequirement(
  moduleName: string,
  baseAmount: number,
  dbClient: DbClient = prisma
): Promise<ApprovalTierInfo> {
  const profiles = await dbClient.approvalLevelProfile.findMany({
    where: {
      module: moduleName,
      status: "Active",
    },
    include: {
      approvers: {
        where: { status: "Active" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { minRange: "asc" },
  });

  const firstLevel = profiles.find((p) =>
    (p.actionButton || "").toLowerCase().includes("first")
  ) || profiles[0];

  const secondLevel = profiles.find((p) =>
    (p.actionButton || "").toLowerCase().includes("second")
  ) || (profiles.length > 1 ? profiles[1] : null);

  const toApprover = (a: { user: { id: string; name: string | null; email: string } }) => ({
    id: a.user.id,
    name: a.user.name || a.user.email,
    email: a.user.email,
  });
  const firstTierApprovers = (firstLevel?.approvers || []).map(toApprover);
  const secondTierApprovers = (secondLevel?.approvers || []).map(toApprover);

  const firstLevelMax = firstLevel?.maxRange ? Number(firstLevel.maxRange) : null;
  const requiredTiers = requiredTiersForAmount(baseAmount, { firstLevelMax, hasSecondLevel: !!secondLevel });

  return {
    requiredTiers,
    initialStatus: requiredTiers === 2 ? "Pending First Tier Approval" : "Pending For Approval",
    firstTierApprovers,
    secondTierApprovers,
    firstLevelMin: firstLevel?.minRange != null ? Number(firstLevel.minRange) : null,
    firstLevelMax,
  };
}

/** Tier requirement for a PO row, using its base-currency amount. */
export function poApprovalRequirement(
  po: { type?: string | null; amountAfterTax: unknown; exchangeRate: unknown },
  dbClient: DbClient = prisma
): Promise<ApprovalTierInfo> {
  return determineApprovalRequirement(
    poApprovalModule(po.type),
    poBaseAmount(po.amountAfterTax, po.exchangeRate),
    dbClient
  );
}

/** Reads the approver's employee link and email from the DB (the session copy can be stale). */
export async function loadApproverIdentity(
  userId: string,
  role: string | null | undefined,
  dbClient: DbClient = prisma
): Promise<ApproverIdentity & { name: string }> {
  const u = userId
    ? await dbClient.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, employeeId: true },
      })
    : null;
  return {
    userId,
    employeeId: u?.employeeId ?? null,
    email: u?.email ?? null,
    name: u?.name || u?.email || "System Approver",
    isAdmin: isSuperRole(role),
  };
}

/** Prisma include that gives evaluatePoApprovalState what it needs. */
export const PO_APPROVAL_PARTIES_INCLUDE = {
  purchaser: true,
  purchaseRequisition: { include: { requestedBy: { select: { id: true, email: true } } } },
} as const;

type PartiesPo = {
  purchaserId?: string | null;
  firstApproverId?: string | null;
  purchaser?: { email?: string | null } | null;
  purchaseRequisition?: { requestedById?: string | null; requestedBy?: { email?: string | null } | null } | null;
};

function partiesOf(po: PartiesPo): PoParties {
  return {
    purchaserId: po.purchaserId,
    purchaserEmail: po.purchaser?.email ?? null,
    requesterId: po.purchaseRequisition?.requestedById ?? null,
    requesterEmail: po.purchaseRequisition?.requestedBy?.email ?? null,
    firstApproverId: po.firstApproverId ?? null,
  };
}

/**
 * Evaluates the current state of a PO to determine who can approve it.
 * `po` must be loaded with PO_APPROVAL_PARTIES_INCLUDE.
 */
export async function evaluatePoApprovalState(
  po: any,
  user: ApproverIdentity,
  dbClient: DbClient = prisma
) {
  const baseAmount = poBaseAmount(po.amountAfterTax, po.exchangeRate);
  const tierInfo = await determineApprovalRequirement(poApprovalModule(po.type), baseAmount, dbClient);
  const requiredTiers = effectiveRequiredTiers(po, tierInfo.requiredTiers);
  const stage = poPendingStage(po);

  const stageApprovers = stage === "second" ? tierInfo.secondTierApprovers : tierInfo.firstTierApprovers;
  const cannotApproveReason =
    poApprovalBlockReason({
      status: po.status,
      stage,
      requiredTiers,
      user,
      parties: partiesOf(po),
      isStageApprover: stageApprovers.some((a) => a.id === user.userId),
      stageApproverNames: stageApprovers,
    }) || "";

  const currentStageTitle =
    stage === "second"
      ? "Second Tier Approval"
      : stage === "first"
        ? requiredTiers === 2 ? "First Tier Approval" : "Single Tier Approval"
        : "Approval";

  return {
    requiredTiers,
    stage,
    isFirstTierPending: stage === "first",
    isSecondTierPending: stage === "second",
    currentStageTitle,
    // Same rules gate both decisions.
    canApprove: !cannotApproveReason,
    canReject: !cannotApproveReason,
    cannotApproveReason,
    firstTierApprovers: tierInfo.firstTierApprovers,
    secondTierApprovers: tierInfo.secondTierApprovers,
    firstLevelMin: tierInfo.firstLevelMin,
    firstLevelMax: tierInfo.firstLevelMax,
    /** Base-currency amount compared against the bands. */
    baseAmount,
  };
}

export class PoApprovalError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

type Notification = { to: string; subject: string; body: string };

async function sendEmailNotification({ to, subject, body }: Notification) {
  console.log("-----------------------------------------");
  console.log(`[EMAIL NOTIFICATION] To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log("-----------------------------------------");
}

export type PoDecisionInput = {
  poId: string;
  action: "approve" | "reject";
  remark?: string | null;
  userId: string;
  role: string | null | undefined;
  /** updatedAt of the PO as the approver loaded it; when given, a later change refuses the decision. */
  expectedUpdatedAt?: string | null;
};

/**
 * The single code path for approving / rejecting a PO (material and subcon).
 * Re-evaluates the rules inside a transaction and moves the status with a
 * conditional update, so a double click, a second approver or a concurrent
 * edit / revise / void cannot also succeed.
 *
 * The approval remark is not written to PurchaseOrder.remark (that is the PO's
 * own remark, printed for the supplier); the schema has no approval-remark
 * field yet, so the remark only travels in the notification.
 */
export async function decidePoApproval(input: PoDecisionInput) {
  const { poId, action } = input;
  const remark = (input.remark || "").trim();
  if (action !== "approve" && action !== "reject") throw new PoApprovalError("Invalid action", 400);

  const { updated, notifications } = await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: poId },
      include: { ...PO_APPROVAL_PARTIES_INCLUDE, supplier: true },
    });
    if (!po) throw new PoApprovalError("Purchase Order not found", 404);

    if (input.expectedUpdatedAt) {
      const seen = new Date(input.expectedUpdatedAt).getTime();
      if (!Number.isFinite(seen) || seen !== po.updatedAt.getTime()) {
        throw new PoApprovalError(
          "This purchase order changed after you opened it. Reload it and review again before deciding.",
          409
        );
      }
    }

    const user = await loadApproverIdentity(input.userId, input.role, tx);
    const evalState = await evaluatePoApprovalState(po, user, tx);
    if (!evalState.stage) {
      throw new PoApprovalError(`Purchase Order is not pending approval (current status: ${po.status})`, 409);
    }
    if (evalState.cannotApproveReason) {
      throw new PoApprovalError(evalState.cannotApproveReason, 403);
    }

    const now = new Date();
    const notes: Notification[] = [];
    const remarkLine = remark ? `\nRemark: ${remark}` : "";
    const purchaserEmail = po.purchaser?.email || "";
    let data: Record<string, unknown>;

    if (action === "reject") {
      data = { status: "Rejected" };
      if (purchaserEmail) {
        notes.push({
          to: purchaserEmail,
          subject: `Purchase Order ${po.poNo} Rejected`,
          body: `Your purchase order ${po.poNo} has been rejected by ${user.name}.${remarkLine}\nPlease revise and amend.`,
        });
      }
    } else {
      const newStatus = poStatusAfterApprove(evalState.stage, evalState.requiredTiers);
      if (evalState.stage === "second") {
        data = {
          status: newStatus,
          secondApproverId: user.userId,
          secondApproverName: user.name,
          secondApprovedAt: now,
          approverName: user.name,
        };
      } else {
        data = {
          status: newStatus,
          approvalTier: evalState.requiredTiers,
          firstApproverId: user.userId,
          firstApproverName: user.name,
          firstApprovedAt: now,
          ...(newStatus === "Issued" ? { approverName: user.name } : {}),
        };
      }

      if (newStatus === "Pending Second Tier Approval") {
        const to = evalState.secondTierApprovers.map((a) => a.email).filter(Boolean).join(", ");
        if (to) {
          notes.push({
            to,
            subject: `Purchase Order ${po.poNo} Requires Second Tier Approval`,
            body: `PO ${po.poNo} (base amount ${evalState.baseAmount.toFixed(2)}) has been approved by first tier (${user.name}) and now requires second tier sign-off.${remarkLine}`,
          });
        }
      } else if (po.type === "SUBCON") {
        // Spec (subcon.md): no auto-email to the supplier; notify the purchaser only.
        if (purchaserEmail) {
          notes.push({
            to: purchaserEmail,
            subject: `Purchase Order ${po.poNo} Approved`,
            body: `Subcon PO ${po.poNo} was approved by ${user.name}. Send it to the supplier manually.${remarkLine}`,
          });
        }
      } else if (po.email) {
        // Spec (purchasing.md): email the supplier, CC the purchaser; skipped when the email is blank.
        notes.push({
          to: `${po.email}${purchaserEmail ? ` (CC ${purchaserEmail})` : ""}`,
          subject: `Purchase Order ${po.poNo} Issued`,
          body: `Please find attached Purchase Order ${po.poNo} approved by ${user.name}.`,
        });
      }
    }

    const res = await tx.purchaseOrder.updateMany({
      where: { id: po.id, status: po.status, updatedAt: po.updatedAt },
      data,
    });
    if (res.count !== 1) {
      throw new PoApprovalError(
        "This purchase order was changed or already decided by someone else. Reload it and try again.",
        409
      );
    }
    const updated = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } });
    return { updated, notifications: notes };
  });

  for (const n of notifications) await sendEmailNotification(n);
  return updated;
}
