import { prisma } from "@/lib/prisma";
import { isStageQcCleared } from "@/lib/routing-gating";

/**
 * Names of routing processes on a work order that are not yet Completed (or, with Stage QC ON,
 * not yet stage-QC approved), in serial order
 * (e.g. ["WELDING / ARC WELDING", "PAINTING / FINAL PAINTING"]). Empty when every step is done.
 * A work order must not pass final QC (status "Completed") while any step is still open:
 * the Production Terminal only lists Proceed/WIP work orders, so the remaining steps would vanish.
 */
export async function getUnfinishedRoutingSteps(workOrderNo: string): Promise<string[]> {
  const wo = await prisma.workOrder.findUnique({ where: { workOrderNo }, select: { stageQc: true } });
  const rows = await prisma.routingProcess.findMany({
    where: { inProcess: { workOrderNo } },
    select: {
      status: true,
      productionTimesheets: { select: { timeOut: true, completedQty: true, qcStatus: true } },
      sequence: true,
      inProcess: { select: { sn: true } },
      mainProcess: { select: { process: true } },
      routingProcess: { select: { routingProcess: true } },
    },
  });
  return rows
    .sort((a, b) => (a.inProcess.sn ?? 0) - (b.inProcess.sn ?? 0) || a.sequence - b.sequence)
    .flatMap((r) => {
      const name = [r.mainProcess?.process, r.routingProcess?.routingProcess].filter(Boolean).join(" / ");
      if (r.status !== "Completed") return [name];
      if (!isStageQcCleared(!!wo?.stageQc, r.status, r.productionTimesheets)) return [`${name} (stage QC)`];
      return [];
    });
}

export function unfinishedStepsError(steps: string[]): string {
  return `Cannot approve QC: production is not finished. Pending step(s): ${steps.join(", ")}.`;
}
