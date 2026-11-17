"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getUnfinishedRoutingSteps, unfinishedStepsError } from "@/lib/work-order-completion";

export async function approveQc(workOrderNo: string) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.employeeId) {
      return { success: false, error: "Unauthorized or employee profile missing" };
    }

    const pending = await getUnfinishedRoutingSteps(workOrderNo);
    if (pending.length > 0) return { success: false, error: unfinishedStepsError(pending) };

    await prisma.$transaction(async (tx: any) => {
      // Update Work Order
      await tx.workOrder.update({
        where: { workOrderNo },
        data: {
          qcAcceptance: "Approved",
          qcDate: new Date(),
          qcById: session.user.employeeId,
          status: "Completed",
        },
      });

      // Update Production Timesheets
      const timesheets = await tx.productionTimesheet.findMany({
        where: {
          routingProcess: {
            inProcess: {
              workOrderNo,
            },
          },
        },
      });

      if (timesheets.length > 0) {
        await tx.productionTimesheet.updateMany({
          where: { id: { in: timesheets.map((t: any) => t.id) } },
          data: {
            qcStatus: "Approved",
          },
        });
      }
    });

    revalidatePath("/dashboard/qc/approval");
    revalidatePath(`/dashboard/qc/approval/${workOrderNo}`);
    return { success: true };
  } catch (err: any) {
    console.error("approveQc:", err);
    return { success: false, error: err.message || "Failed to approve QC" };
  }
}

export async function rejectQc(workOrderNo: string, remark?: string) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.employeeId) {
      return { success: false, error: "Unauthorized or employee profile missing" };
    }

    await prisma.$transaction(async (tx: any) => {
      // Update Work Order
      await tx.workOrder.update({
        where: { workOrderNo },
        data: {
          qcAcceptance: "Rejected",
          qcDate: new Date(),
          qcById: session.user.employeeId,
        },
      });

      // Update Production Timesheets
      const timesheets = await tx.productionTimesheet.findMany({
        where: {
          routingProcess: {
            inProcess: {
              workOrderNo,
            },
          },
        },
      });

      if (timesheets.length > 0) {
        await tx.productionTimesheet.updateMany({
          where: { id: { in: timesheets.map((t: any) => t.id) } },
          data: {
            qcStatus: "Rejected",
            ...(remark ? { qcRemark: remark } : {}),
          },
        });
      }
    });

    revalidatePath("/dashboard/qc/approval");
    revalidatePath(`/dashboard/qc/approval/${workOrderNo}`);
    return { success: true };
  } catch (err: any) {
    console.error("rejectQc:", err);
    return { success: false, error: err.message || "Failed to reject QC" };
  }
}
