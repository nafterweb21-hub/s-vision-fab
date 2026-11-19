import { prisma } from "@/lib/prisma";
import QcApprovalList, { type QcRow } from "./QcApprovalList";

export const dynamic = "force-dynamic";

export default async function QcApprovalPage() {
  const workOrders = await prisma.workOrder.findMany({
    where: {
      OR: [
        { status: "Pending for QC" },
        { qcAcceptance: "Rejected", status: { not: "Completed" } },
        { qcAcceptance: "Approved", status: { not: "Completed" } },
        {
          AND: [
            { status: "WIP" },
            { inProcesses: { some: { routingProcesses: { some: { productionTimesheets: { some: { completed: true } } } } } } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { customerName: true } },
      inProcesses: {
        include: {
          routingProcesses: {
            select: { sn: true, status: true, productionTimesheets: { select: { completedQty: true, qcStatus: true } } },
          },
        },
      },
    },
  });

  const rows: QcRow[] = workOrders.map((wo) => {
    const totalQty = Number(wo.quantity) || 0;
    let producedQty = 0;
    let steps = 0;
    let stepsDone = 0;
    let awaitingStageQc = 0;

    if (wo.status === "Completed") {
      producedQty = totalQty;
    } else {
      // Last routing step = highest SN. SN is stored as text, so compare numerically ("10" > "2").
      let last: (typeof wo.inProcesses)[number]["routingProcesses"][number] | null = null;
      let maxSn = -1;
      for (const ip of wo.inProcesses) {
        for (const rp of ip.routingProcesses) {
          const sn = parseInt(String(rp.sn), 10);
          if (!Number.isNaN(sn) && sn > maxSn) {
            maxSn = sn;
            last = rp;
          }
        }
      }
      if (last) producedQty = last.productionTimesheets.reduce((s, ts) => s + (Number(ts.completedQty) || 0), 0);
    }
    for (const ip of wo.inProcesses) {
      for (const rp of ip.routingProcesses) {
        steps += 1;
        if (rp.status === "Completed") stepsDone += 1;
        awaitingStageQc += rp.productionTimesheets.filter((ts) => !ts.qcStatus || ts.qcStatus === "Pending").length;
      }
    }

    // Which queue the WO sits in (mirrors the query above).
    const queue: QcRow["queue"] =
      wo.qcAcceptance === "Rejected" ? "Rejected" : wo.status === "Pending for QC" ? "Final QC" : wo.qcAcceptance === "Approved" ? "Approved" : "Stage QC";

    return {
      workOrderNo: wo.workOrderNo,
      date: wo.date.toISOString(),
      deliveryDate: wo.deliveryDate ? wo.deliveryDate.toISOString() : null,
      customerName: wo.customer?.customerName || "—",
      jobDescription: wo.jobDescription || "—",
      uom: wo.uom || "",
      status: wo.status,
      qcAcceptance: wo.qcAcceptance,
      producedQty: Math.min(producedQty, totalQty),
      totalQty,
      steps,
      stepsDone,
      awaitingStageQc,
      queue,
    };
  });

  return <QcApprovalList rows={rows} />;
}
