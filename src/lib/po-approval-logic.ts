import { prisma } from "@/lib/prisma";

export interface ApprovalTierInfo {
  requiredTiers: number;
  initialStatus: string;
  firstTierApprovers: { id: string; name: string; email: string }[];
  secondTierApprovers: { id: string; name: string; email: string }[];
  /** First level value band from the ApprovalLevelProfile (null when not configured). */
  firstLevelMin: number | null;
  firstLevelMax: number | null;
}

/**
 * Determines whether a PO needs 1 or 2 tiers of approval based on the active ApprovalLevelProfile value bands.
 */
export async function determineApprovalRequirement(
  moduleName: string,
  amount: number,
  dbClient: any = prisma
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

  const firstLevel = profiles.find((p: any) =>
    (p.actionButton || "").toLowerCase().includes("first")
  ) || profiles[0];

  const secondLevel = profiles.find((p: any) =>
    (p.actionButton || "").toLowerCase().includes("second")
  ) || (profiles.length > 1 ? profiles[1] : null);

  const firstTierApprovers = (firstLevel?.approvers || []).map((a: any) => ({
    id: a.user.id,
    name: a.user.name || a.user.email,
    email: a.user.email,
  }));

  const secondTierApprovers = (secondLevel?.approvers || []).map((a: any) => ({
    id: a.user.id,
    name: a.user.name || a.user.email,
    email: a.user.email,
  }));

  // If there's only 1 level configured or amount is within first level ceiling
  const firstLevelCeiling = firstLevel?.maxRange ? Number(firstLevel.maxRange) : 499.99;
  const requiresTwoTiers = secondLevel && amount > firstLevelCeiling;

  return {
    requiredTiers: requiresTwoTiers ? 2 : 1,
    initialStatus: requiresTwoTiers ? "Pending First Tier Approval" : "Pending For Approval",
    firstTierApprovers,
    secondTierApprovers,
    firstLevelMin: firstLevel?.minRange != null ? Number(firstLevel.minRange) : null,
    firstLevelMax: firstLevel?.maxRange ? firstLevelCeiling : null,
  };
}

/**
 * Evaluates the current state of a PO to determine who can approve it.
 */
export async function evaluatePoApprovalState(
  po: any,
  currentUserId: string,
  currentUserRole: string,
  moduleName: string = "Purchase Order - Material"
) {
  const amount = Number(po.amountAfterTax || 0);
  const tierInfo = await determineApprovalRequirement(moduleName, amount);

  const isSuper = currentUserRole === "ADMIN";

  // Determine current pending stage
  const isSecondTierPending =
    po.status === "Pending Second Tier Approval" ||
    (po.approvalTier === 2 && (po.status === "Pending For Approval" || po.status === "Pending First Tier Approval") && !!po.firstApproverName);

  const isFirstTierPending =
    po.status === "Pending First Tier Approval" ||
    (!isSecondTierPending && (po.status === "Pending For Approval" || po.status === "Draft"));

  const isFirstTierApprover = tierInfo.firstTierApprovers.some(
    (a) => a.id === currentUserId
  );
  const isSecondTierApprover = tierInfo.secondTierApprovers.some(
    (a) => a.id === currentUserId
  );

  let canApprove = false;
  let canReject = false;
  let currentStageTitle = "Approval";
  let cannotApproveReason = "";

  if (isSecondTierPending) {
    currentStageTitle = "Second Tier Approval";
    if (isSuper || isSecondTierApprover) {
      canApprove = true;
      canReject = true;
    } else {
      const names = tierInfo.secondTierApprovers.map((a) => a.name).join(" or ") || "Second Tier Approver";
      cannotApproveReason = `First Tier is approved. Second Tier approval is required from ${names}.`;
    }
  } else if (isFirstTierPending) {
    currentStageTitle = tierInfo.requiredTiers === 2 ? "First Tier Approval" : "Single Tier Approval";
    if (isSuper || isFirstTierApprover) {
      canApprove = true;
      canReject = true;
    } else {
      const names = tierInfo.firstTierApprovers.map((a) => a.name).join(" or ") || "First Tier Approver";
      cannotApproveReason = `First Tier approval is required from ${names}.`;
    }
  }

  return {
    requiredTiers: tierInfo.requiredTiers,
    isFirstTierPending,
    isSecondTierPending,
    currentStageTitle,
    canApprove,
    canReject,
    cannotApproveReason,
    firstTierApprovers: tierInfo.firstTierApprovers,
    secondTierApprovers: tierInfo.secondTierApprovers,
    firstLevelMin: tierInfo.firstLevelMin,
    firstLevelMax: tierInfo.firstLevelMax,
  };
}
