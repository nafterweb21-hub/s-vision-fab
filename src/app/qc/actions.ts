"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { nextDocumentNo } from "@/lib/document-numbering";

/**
 * The signed-in inspector. QC sign-offs are attributed to the logged-in user's own employee record
 * (linked id, else matched by email) — never to a client-supplied id or an arbitrary employee.
 * `employeeId` is null for a login with no employee record (e.g. admin).
 */
async function resolveInspector(): Promise<{ ok: true; employeeId: string | null } | { ok: false; error: string }> {
  const user = (await auth())?.user;
  if (!user) return { ok: false, error: "Not signed in" };
  let emp = user.employeeId
    ? await prisma.employee.findUnique({ where: { id: user.employeeId }, select: { id: true } })
    : null;
  if (!emp && user.email) emp = await prisma.employee.findFirst({ where: { email: user.email }, select: { id: true } });
  return { ok: true, employeeId: emp?.id ?? null };
}

const NEEDS_EMPLOYEE = "Link your login to an employee record before rejecting or reworking: the NCR and rework need a named inspector.";

export async function getAwaitingInspection() {
  // Get recently completed production sessions that have Pending parameters
  const timesheets = await prisma.productionTimesheet.findMany({
    where: { 
      timeOut: { not: null },
      qcStatus: "Pending"
    },
    include: {
      employee: true,
      routingProcess: {
        include: {
          routingProcess: true,
          inProcess: {
            include: {
              workOrder: {
                include: { customer: true }
              }
            }
          }
        }
      },
      weldingParameter: true,
      sprayParameter: true,
      machiningParameter: true
    },
    orderBy: { timeOut: 'desc' },
    take: 50
  });

  return JSON.parse(JSON.stringify(timesheets));
}

export async function getActiveWorkOrders() {
  const wos = await prisma.workOrder.findMany({
    where: { status: { in: ["Pending for QC", "Rejected", "Completed", "WIP", "Proceed"] } },
    include: {
      customer: true,
      inProcesses: {
        select: {
          routingProcesses: {
            select: {
              sn: true,
              productionTimesheets: {
                select: {
                  completedQty: true,
                  rejectedQty: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { date: 'desc' },
    take: 50
  });
  
  const enrichedWorkOrders = (wos || []).map((wo: any) => {
    let producedQty = 0;
    let rejectedQty = 0;
    const totalQty = Number(wo.quantity) || 0;
    
    if (wo.status === "Completed") {
      producedQty = totalQty;
    } else if (wo.inProcesses && wo.inProcesses.length > 0) {
      let lastProcess = null;
      let maxSn = -1;
      wo.inProcesses.forEach((ip: any) => {
        ip.routingProcesses?.forEach((rp: any) => {
          const numericSn = parseInt(rp?.sn, 10);
          if (!isNaN(numericSn) && numericSn > maxSn) {
            maxSn = numericSn;
            lastProcess = rp;
          }
          rp.productionTimesheets?.forEach((ts: any) => {
            rejectedQty += (Number(ts.rejectedQty) || 0);
          });
        });
      });
      
      if (lastProcess) {
        producedQty = (lastProcess as any)?.productionTimesheets?.reduce((sum: number, ts: any) => sum + (Number(ts?.completedQty) || 0), 0) || 0;
      }
    }
    
    producedQty = Math.min(producedQty, totalQty);
    
    return {
      ...wo,
      producedQty,
      rejectedQty,
      totalQty
    };
  });

  return JSON.parse(JSON.stringify(enrichedWorkOrders));
}

export async function submitWorkOrderQc(
  workOrderNo: string, 
  qcAcceptance: string, 
  remark?: string, 
  _requestedEmployeeId?: string, // ignored: the inspector is always the signed-in user
  acceptedQty?: number,
  rejectedQty?: number
) {
  let status = "WIP";
  if (qcAcceptance === "Approved") status = "Completed";
  else if (qcAcceptance === "Rejected") status = "Rejected";

  const wo = await prisma.workOrder.findUnique({ where: { workOrderNo } });

  const inspector = await resolveInspector();
  if (!inspector.ok) return { success: false, error: inspector.error };
  const employeeId = inspector.employeeId ?? undefined;
  if (qcAcceptance === "Rejected" && !employeeId) return { success: false, error: NEEDS_EMPLOYEE };

  if (qcAcceptance === "Rejected" && employeeId && wo) {
    const existingNcr = await prisma.ncr.findFirst({
      where: { workOrderNo, ncrDate: { gte: new Date(new Date().setHours(0,0,0,0)) } }
    });
    
    if (!existingNcr) {
      await prisma.$transaction(async (tx) => {
        const ncrNo = await nextDocumentNo(tx, "NCR", {
          isTaken: async (no) => (await tx.ncr.count({ where: { ncrNo: no } })) > 0,
        });
        await tx.ncr.create({
          data: {
            ncrNo,
            ncrDate: new Date(),
            customerId: wo.customerId,
            workOrderNo,
            requestorId: employeeId,
            descriptionOfNonConformance: remark || "Rejected by QC",
            ncrQuantity: rejectedQty || 1,
          }
        });
      });
    }

    // Create Rework Task
    if (rejectedQty && rejectedQty > 0) {
      await prisma.$transaction(async (tx) => {
        const reworkNo = await nextDocumentNo(tx, "REWORK", {
          isTaken: async (no) => (await tx.workOrderRework.count({ where: { reworkNo: no } })) > 0,
        });
        await tx.workOrderRework.create({
          data: {
            reworkNo,
            workOrderNo,
            originalQty: wo.quantity || 0,
            acceptedQty: acceptedQty || 0,
            rejectedQty: rejectedQty,
            rejectedById: employeeId,
            rejectedAt: new Date(),
            rejectionReason: remark || "Rejected by QC",
          }
        });
      });
    }
  }

  const updateData: any = {
    qcAcceptance,
    qcDate: new Date(),
    qcById: employeeId || null,
    remark,
    status
  };

  if (qcAcceptance === "Approved") {
    // If it's a full approval of the initial WO (not a re-inspection of rework)
    const currentFinal = Number(wo?.finalApprovedQty || 0);
    const addedApproved = acceptedQty ?? Number(wo?.quantity || 0);
    updateData.acceptedQty = Number(wo?.acceptedQty || 0) + addedApproved;
    updateData.finalApprovedQty = currentFinal + addedApproved;
  } else if (qcAcceptance === "Rejected") {
    updateData.acceptedQty = Number(wo?.acceptedQty || 0) + (acceptedQty || 0);
    updateData.rejectedQty = Number(wo?.rejectedQty || 0) + (rejectedQty || 0);
    updateData.finalApprovedQty = Number(wo?.finalApprovedQty || 0) + (acceptedQty || 0);
  }

  await prisma.workOrder.update({
    where: { workOrderNo },
    data: updateData
  });
  
  revalidatePath('/qc');
  return { success: true };
}

export async function sendBackToProduction(workOrderNo: string) {
  try {
    const inspector = await resolveInspector();
    if (!inspector.ok) return { success: false, error: inspector.error };
    await prisma.workOrder.update({
      where: { workOrderNo },
      data: {
        status: "WIP",
        qcAcceptance: "Pending",
        qcDate: null,
        qcById: null,
        remark: null,
      }
    });
    revalidatePath('/qc');
    revalidatePath('/dashboard/production/work-order');
    return { success: true };
  } catch (err: any) {
    console.error('sendBackToProduction error:', err);
    return { success: false, error: err.message || 'Failed to send back to production' };
  }
}

export async function submitProcessQc(timesheetId: string, qcAcceptance: string, remark?: string) {
  const inspector = await resolveInspector();
  if (!inspector.ok) return { success: false, error: inspector.error };
  await prisma.productionTimesheet.update({
    where: { id: timesheetId },
    data: {
      qcStatus: qcAcceptance,
      qcRemark: remark || null
    }
  });
  
  revalidatePath('/qc');
  return { success: true };
}

export async function getReworkForReinspection() {
  const reworkTasks = await prisma.workOrderRework.findMany({
    where: { status: "Re-inspection Pending" },
    orderBy: { updatedAt: "desc" },
    include: {
      workOrder: {
        include: {
          customer: true
        }
      },
      rejectedBy: true
    }
  });

  return JSON.parse(JSON.stringify(reworkTasks));
}

export async function approveRework(reworkId: string, remark?: string) {
  const inspector = await resolveInspector();
  if (!inspector.ok) return { success: false, error: inspector.error };
  const employeeId = inspector.employeeId;
  if (!employeeId) return { success: false, error: NEEDS_EMPLOYEE };
  const rework = await prisma.workOrderRework.findUnique({ where: { id: reworkId }, include: { workOrder: true } });
  if (!rework) return { success: false, error: "Rework task not found" };

  await prisma.$transaction(async (tx) => {
    // 1. Update Rework status
    await tx.workOrderRework.update({
      where: { id: reworkId },
      data: {
        status: "Approved",
        reInspectedById: employeeId,
        reInspectedAt: new Date(),
        reInspectionResult: "Approved",
        reInspectionRemark: remark,
      }
    });

    // 2. Update WorkOrder finalApprovedQty
    const wo = rework.workOrder;
    const newFinalApproved = Number(wo.finalApprovedQty || 0) + Number(rework.reworkedQty || 0);
    
    // Check if everything is fully approved now
    const isFullyApproved = newFinalApproved >= Number(wo.quantity || 0);

    await tx.workOrder.update({
      where: { workOrderNo: wo.workOrderNo },
      data: {
        finalApprovedQty: newFinalApproved,
        status: isFullyApproved ? "Completed" : wo.status,
        qcAcceptance: isFullyApproved ? "Approved" : wo.qcAcceptance
      }
    });
  });

  revalidatePath('/qc');
  return { success: true };
}

export async function rejectRework(reworkId: string, rejectedQty: number, remark?: string) {
  const inspector = await resolveInspector();
  if (!inspector.ok) return { success: false, error: inspector.error };
  const employeeId = inspector.employeeId;
  if (!employeeId) return { success: false, error: NEEDS_EMPLOYEE };
  const rework = await prisma.workOrderRework.findUnique({ where: { id: reworkId }, include: { workOrder: true } });
  if (!rework) return { success: false, error: "Rework task not found" };

  await prisma.$transaction(async (tx) => {
    // 1. Mark current rework as Rejected Again
    await tx.workOrderRework.update({
      where: { id: reworkId },
      data: {
        status: "Rejected Again",
        reInspectedById: employeeId,
        reInspectedAt: new Date(),
        reInspectionResult: "Rejected",
        reInspectionRemark: remark,
      }
    });

    // 2. Create a new Rework task for the newly rejected quantity
    const reworkNo = await nextDocumentNo(tx, "REWORK", {
      isTaken: async (no) => (await tx.workOrderRework.count({ where: { reworkNo: no } })) > 0,
    });

    await tx.workOrderRework.create({
      data: {
        reworkNo,
        workOrderNo: rework.workOrderNo,
        originalQty: rework.reworkedQty,
        acceptedQty: Number(rework.reworkedQty) - rejectedQty,
        rejectedQty: rejectedQty,
        rejectedById: employeeId,
        rejectedAt: new Date(),
        rejectionReason: remark || "Rejected again in Re-inspection",
      }
    });

    // 3. Add to overall rejected qty in WorkOrder
    await tx.workOrder.update({
      where: { workOrderNo: rework.workOrderNo },
      data: {
        rejectedQty: { increment: rejectedQty },
        acceptedQty: { increment: Number(rework.reworkedQty) - rejectedQty },
        status: "Rejected",
        qcAcceptance: "Rejected"
      }
    });
  });

  revalidatePath('/qc');
  return { success: true };
}
