"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { nextDocumentNo } from "@/lib/document-numbering";

import { RecordStatus } from "@/lib/status";
export async function getNcrFormData() {
  try {
    const [
      customers,
      employees,
      failureModes,
      mainProcesses,
      workOrders,
      departments,
    ] = await Promise.all([
      prisma.customerProfile.findMany({ where: { status: "Active" }, select: { id: true, customerName: true } }),
      prisma.employee.findMany({ where: { status: RecordStatus.Active }, select: { id: true, name: true, code: true } }),
      prisma.failureModeProfile.findMany({ where: { status: "Active", isDeleted: false }, select: { id: true, failureMode: true } }),
      prisma.mainProcess.findMany({ where: { status: "Active" }, select: { id: true, process: true } }),
      prisma.workOrder.findMany({ 
        where: {
          status: { not: "Void" }
        }, 
        select: {
          workOrderNo: true,
          customerId: true,
          quantity: true,
          status: true,
          // Read-only context shown on the NCR (spec: from SO via WO).
          customerPoRef: true,
          projectCode: true,
          partName: true,
          jobDescription: true,
          inProcesses: {
            select: {
              id: true,
              description: true,
              routingProcesses: {
                select: {
                  id: true,
                  sequence: true,
                  status: true,
                  mainProcessId: true,
                  routingProcessId: true,
                  mainProcess: { select: { process: true } },
                  routingProcess: { select: { routingProcess: true } }
                },
                orderBy: { sequence: "asc" },
              }
            }
          }
        },
        orderBy: { workOrderNo: "desc" },
      }),
      prisma.departmentProfile.findMany({ where: { status: "Active" }, select: { id: true, name: true } }),
    ]);

    const data = {
      customers,
      employees,
      failureModes,
      mainProcesses,
      workOrders,
      departments,
    };

    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error("Error fetching NCR form data:", error);
    throw new Error("Failed to load NCR prerequisite data");
  }
}

export async function getNcrList() {
  try {
    return await prisma.ncr.findMany({
      include: {
        CustomerProfile: { select: { customerName: true } },
        WorkOrder: { select: { workOrderNo: true } },
        Employee_Ncr_requestorIdToEmployee: { select: { name: true } },
        MainProcess: { select: { process: true } },
        RoutingProcess: { select: { routingProcess: { select: { routingProcess: true } } } },
        NcrFailureMode: { select: { FailureModeProfile: { select: { failureMode: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching NCR list:", error);
    throw new Error("Failed to load NCR list");
  }
}

export async function getNcr(id: string) {
  try {
    return await prisma.ncr.findUnique({
      where: { id },
      include: {
        NcrFailureMode: true,
      },
    });
  } catch (error) {
    console.error("Error fetching NCR:", error);
    throw new Error("Failed to load NCR details");
  }
}

/** Spec (qc-and-ncr.md): Draft -> Closed | Void. Closed and Void are final. */
const NCR_STATUSES = new Set(["Draft", "Closed", "Void"]);

/** Rules checked on every save; the form checks the same ones first. */
function assertNcrSavable(data: any) {
  if (data.status && !NCR_STATUSES.has(data.status)) throw new Error(`Unknown NCR status "${data.status}".`);
  const qtys = ["reworkQuantity", "useAsIsQuantity", "scrapQuantity", "otherQuantity"].map((k) => Number(data[k] ?? 0));
  if (qtys.some((q) => !Number.isInteger(q) || q < 0)) throw new Error("Disposition quantities must be whole numbers, 0 or more.");
  const ncrQuantity = Number(data.ncrQuantity ?? 0);
  if (!Number.isInteger(ncrQuantity) || ncrQuantity < 0) throw new Error("NCR Quantity must be a whole number, 0 or more.");
  data.ncrQuantity = ncrQuantity;
  if (data.status === "Closed") {
    if (ncrQuantity <= 0) throw new Error("NCR Quantity must be greater than 0 to close.");
    // Spec: NCR Quantity = Rework + Use-As-Is + Scrap + Other. NCRs raised by a QC rejection start
    // with only the rejected quantity, so the split is allowed to be incomplete until closing.
    const allocated = qtys.reduce((a, b) => a + b, 0);
    if (allocated !== ncrQuantity) {
      throw new Error(`Rework + Use-As-Is + Scrap + Other (${allocated}) must equal the NCR Quantity (${ncrQuantity}) to close.`);
    }
    // Mandatory before submission even though the field is optional while drafting.
    if (!data.verifiedConfirmedById || !data.verifiedConfirmedDate) {
      throw new Error("Verified / Confirmed By and its Date are required before closing the NCR.");
    }
  }
}

/** Save result. Errors are returned, not thrown: Next.js hides thrown server-action messages in production. */
export type NcrSaveResult = { ok: true; id: string; ncrNo: string } | { ok: false; error: string };

export async function createNcr(data: any): Promise<NcrSaveResult> {
  try {
    const { failureModeIds, ...ncrData } = data;
    assertNcrSavable(ncrData);

    // The number is taken and the NCR written in one transaction: the counter's
    // row lock only holds for as long as the transaction does.
    const newNcr = await prisma.$transaction(async (tx) => {
      const ncrNo = await nextDocumentNo(tx, "NCR", {
        isTaken: async (no) => (await tx.ncr.count({ where: { ncrNo: no } })) > 0,
      });

      return tx.ncr.create({
        data: {
          ...ncrData,
          id: crypto.randomUUID(), // Assuming cuid/uuid handled by client/DB, but let's provide explicit if @id doesn't default
          ncrNo,
          status: ncrData.status || "Draft",
          NcrFailureMode: {
            create: (failureModeIds || []).map((fmId: string) => ({
              id: crypto.randomUUID(),
              failureModeId: fmId
            }))
          }
        },
      });
    });

    revalidatePath("/dashboard/qc/ncr");
    return { ok: true, id: newNcr.id, ncrNo: newNcr.ncrNo };
  } catch (error: any) {
    console.error("Error creating NCR:", error);
    return { ok: false, error: error.message || "Failed to create NCR" };
  }
}

export async function updateNcr(id: string, data: any): Promise<NcrSaveResult> {
  try {
    const { failureModeIds, ...ncrData } = data;

    const existing = await prisma.ncr.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new Error("NCR not found.");
    if (existing.status !== "Draft") {
      throw new Error(`This NCR is ${existing.status} and can no longer be changed.`);
    }

    if (ncrData.status === "Void") {
      // Voiding only changes the status; the rest of the form isn't validated or saved.
      const voided = await prisma.ncr.update({ where: { id }, data: { status: "Void" } });
      revalidatePath("/dashboard/qc/ncr");
      revalidatePath(`/dashboard/qc/ncr/${id}`);
      return { ok: true, id: voided.id, ncrNo: voided.ncrNo };
    }

    assertNcrSavable(ncrData);

    // Failure modes are replaced in the same transaction, so a failed save keeps the old ones.
    const updatedNcr = await prisma.$transaction(async (tx) => {
      if (failureModeIds) {
        await tx.ncrFailureMode.deleteMany({ where: { ncrId: id } });
        ncrData.NcrFailureMode = {
          create: failureModeIds.map((fmId: string) => ({
            id: crypto.randomUUID(),
            failureModeId: fmId,
          })),
        };
      }
      return tx.ncr.update({ where: { id }, data: ncrData });
    });

    revalidatePath("/dashboard/qc/ncr");
    revalidatePath(`/dashboard/qc/ncr/${id}`);
    return { ok: true, id: updatedNcr.id, ncrNo: updatedNcr.ncrNo };
  } catch (error: any) {
    console.error("Error updating NCR:", error);
    return { ok: false, error: error.message || "Failed to update NCR" };
  }
}

// No deleteNcr: per docs/spec (README "No DELETE anywhere"), an NCR is voided instead,
// so NCR numbers stay contiguous.
