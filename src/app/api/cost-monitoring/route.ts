import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

/** POs whose value is a committed cost on the work order. */
const COMMITTED_PO_STATUSES = new Set(["Approved", "Issued"]);
/** POs on their way to approval: shown as pending, not counted. */
const PENDING_PO_STATUSES = new Set([
  "Draft",
  "Pending For Approval",
  "Pending First Tier Approval",
  "Pending Second Tier Approval",
]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    
    const where: Prisma.WorkOrderWhereInput = {
      status: { not: "Void" },
      OR: search ? [
        { workOrderNo: { contains: search, mode: "insensitive" } },
        { customer: { customerName: { contains: search, mode: "insensitive" } } },
      ] : undefined,
    };

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        customer: true,
        inProcesses: {
          include: {
            routingProcesses: {
              include: {
                routingProcess: true, // ProcessProfile to get costPerMinute
                productionTimesheets: true, // To get totalMinutes
              }
            }
          }
        },
        purchaseOrders: {
          include: {
            items: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const costData = workOrders.map((wo) => {
      // 1. Revenue
      const revenue = Number(wo.amount) || 0;

      // 2. Labor Cost
      let laborCost = 0;
      wo.inProcesses.forEach(inProcess => {
        inProcess.routingProcesses.forEach(rp => {
          const costPerMinute = Number(rp.routingProcess?.costPerMinute) || 0;
          rp.productionTimesheets.forEach(ts => {
            if (ts.totalMinutes) {
              laborCost += Number(ts.totalMinutes) * costPerMinute;
            }
          });
        });
      });

      // 3. Material & Subcon Costs
      // Only committed POs count: superseded revisions ("Old Version") would double-count the
      // same order, and Draft / Pending / Rejected / Void ones aren't a cost yet. Not-yet-approved
      // value is reported separately. Amounts are converted to base currency with the PO's own
      // exchange rate (same as base() in src/lib/kpi.ts); item amounts are before tax.
      let materialCost = 0;
      let subconCost = 0;
      let pendingPoCost = 0;
      let committedPoCount = 0;

      wo.purchaseOrders.forEach(po => {
        const rate = Number(po.exchangeRate) || 1;
        const poAmount = po.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) * rate;

        if (COMMITTED_PO_STATUSES.has(po.status)) {
          committedPoCount += 1;
          if (po.type === "SUBCON") subconCost += poAmount;
          else materialCost += poAmount;
        } else if (PENDING_PO_STATUSES.has(po.status)) {
          pendingPoCost += poAmount;
        }
      });

      const totalCost = laborCost + materialCost + subconCost;
      const profit = revenue - totalCost;
      // No revenue on the WO means there is no meaningful margin.
      const margin = revenue > 0 ? (profit / revenue) * 100 : null;

      return {
        workOrderNo: wo.workOrderNo,
        customerName: wo.customer?.customerName || "Unknown",
        date: wo.date,
        revenue,
        laborCost,
        materialCost,
        subconCost,
        totalCost,
        profit,
        margin,
        pendingPoCost,
        committedPoCount,
        status: wo.status,
      };
    });

    return NextResponse.json(costData);
  } catch (error: any) {
    console.error("Error fetching cost monitoring data:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost monitoring data", details: error.message },
      { status: 500 }
    );
  }
}
