"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { computeGating, isRolePermitted, type GateRow } from "@/lib/routing-gating";

import { RecordStatus } from "@/lib/status";
// ──────────────────────────────────────────────────────────────────────────────
// Lookup work order + active employees + machine lists
// ──────────────────────────────────────────────────────────────────────────────
export async function lookupWorkOrder(woNo: string) {
  const wo = await prisma.workOrder.findUnique({
    where: { workOrderNo: woNo },
    include: {
      customer: true,
      inProcesses: {
        orderBy: { sn: "asc" },
        include: {
          routingProcesses: {
            orderBy: { sequence: "asc" },
            include: {
              mainProcess: true,
              routingProcess: { include: { allowedRoles: { select: { id: true } } } },
            },
          },
        },
      },
    },
  });
  if (!wo) return { ok: false as const, error: `Work Order ${woNo} not found` };
  
  if (wo.status !== "Proceed" && wo.status !== "WIP") {
    return { ok: false as const, error: `Cannot process this Work Order. Status is currently: ${wo.status}` };
  }

  return { ok: true as const, wo: JSON.parse(JSON.stringify(wo)) };
}

export async function getTerminalSupportData() {
  const [employees, weldingMachines, machiningMachines, materialTypes, weldingTypes, joints, elcometers, activeWorkOrders] =
    await Promise.all([
      prisma.employee.findMany({
        where: {
          status: RecordStatus.Active
        },
        select: { id: true, name: true, code: true, roleProfileId: true },
        orderBy: { name: "asc" },
      }),
      prisma.machineProfile.findMany({
        where: { status: "Active", machineCategory: "Welding Machine" },
        select: {
          id: true,
          machineCode: true,
          machineNo: true,
          brand: true,
          model: true,
          current: true,
          serialNo: true,
        },
        orderBy: { machineCode: "asc" },
      }),
      prisma.machineProfile.findMany({
        where: { status: "Active", machineCategory: "Machine" },
        select: {
          id: true,
          machineCode: true,
          machineNo: true,
          brand: true,
          model: true,
          machineType: true,
          operationType: true,
          serialNo: true,
        },
        orderBy: { serialNo: "asc" },
      }),
      prisma.materialType.findMany({
        where: { status: "Active" },
        select: { id: true, type: true },
        orderBy: { type: "asc" },
      }),
      prisma.weldingTypeProfile.findMany({
        where: { status: "Active" },
        select: { id: true, type: true },
        orderBy: { type: "asc" },
      }),
      prisma.jointProfile.findMany({
        where: { status: "Active" },
        select: { id: true, joint: true },
        orderBy: { joint: "asc" },
      }),
      prisma.elcometerProfile.findMany({
        where: { status: "Active" },
        select: { id: true, serialNo: true },
        orderBy: { serialNo: "asc" },
      }),
      prisma.workOrder.findMany({
        where: { status: { in: ["Proceed", "WIP"] } },
        select: { workOrderNo: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  return {
    employees,
    weldingMachines,
    machiningMachines,
    materialTypes,
    weldingTypes,
    joints,
    elcometers,
    activeWorkOrders,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// SCAN IN
// ──────────────────────────────────────────────────────────────────────────────
/**
 * The operator on a scan must be the signed-in user's own employee record. Admins and
 * accounts with no linked employee keep the manual choice, matching the terminal UI.
 */
async function resolveOperatorEmployeeId(
  requestedId: string,
): Promise<{ ok: true; employeeId: string } | { ok: false; error: string }> {
  const user = (await auth())?.user;
  if (!user) return { ok: false, error: "Not signed in" };
  if (user.role === "ADMIN") return { ok: true, employeeId: requestedId };

  let ownId: string | null = user.employeeId ?? null;
  if (!ownId && user.email) {
    const match = await prisma.employee.findFirst({ where: { email: user.email }, select: { id: true } });
    ownId = match?.id ?? null;
  }
  if (!ownId) return { ok: true, employeeId: requestedId };
  if (requestedId !== ownId) return { ok: false, error: "You can only scan in and out as yourself" };
  return { ok: true, employeeId: ownId };
}

export async function scanIn(input: { workOrderNo: string; inProcessId: string; mainProcessId: string; routingProcessProfileId: string; employeeId: string; machineCodes?: string }) {
  try {
    const operator = await resolveOperatorEmployeeId(input.employeeId);
    if (!operator.ok) return { success: false, error: operator.error };
    const wo = await prisma.workOrder.findUnique({
      where: { workOrderNo: input.workOrderNo },
    });
    if (!wo) return { success: false, error: "Work order not found" };
    if (wo.status !== "Proceed" && wo.status !== "WIP") {
      return { success: false, error: `Work order must be Proceed/WIP (currently ${wo.status})` };
    }

    // Find all matching routing rows for this in-process + main + routing combo,
    // ordered by sequence ascending. Spec: pick the earliest non-completed.
    const candidates = await prisma.routingProcess.findMany({
      where: {
        inProcessId: input.inProcessId,
        mainProcessId: input.mainProcessId,
        routingProcessId: input.routingProcessProfileId,
      },
      orderBy: { sequence: "asc" },
    });
    if (candidates.length === 0) {
      return { success: false, error: "No matching routing row found" };
    }
    let target = candidates.find((c: any) => c.status !== "Completed");
    if (!target) {
      return { success: false, error: "This process has already been completed." };
    }

    // ── Sequence + role enforcement ─────────────────────────────────────────
    // Processes run strictly serial across the whole work order. Load every
    // routing row for this WO, compute the gate, and reject scanning into a
    // locked (future) or role-restricted step. Completed rows stay scannable
    // for rework.
    const allRows = await prisma.routingProcess.findMany({
      where: { inProcess: { workOrderNo: input.workOrderNo } },
      select: {
        id: true,
        sequence: true,
        status: true,
        mainProcessId: true,
        inProcess: { select: { sn: true } },
        mainProcess: true,
        routingProcess: { select: { allowedRoles: { select: { id: true } } } },
      },
    });
    const gateRows: GateRow[] = allRows.map((r: any) => ({
      id: r.id,
      inProcessSn: r.inProcess?.sn ?? 0,
      sequence: r.sequence,
      status: r.status,
      mainProcessId: r.mainProcessId,
      allowedRoleIds: (r.routingProcess?.allowedRoles ?? []).map((x: any) => x.id),
    }));

    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: { roleProfileId: true },
    });
    const gated = computeGating(gateRows, employee?.roleProfileId);
    const targetGate = gated.find((g) => g.id === target!.id);

    if (targetGate?.locked) {
      return {
        success: false,
        error: "This process is locked — earlier routing processes must be completed first.",
      };
    }
    const targetAllowedRoleIds = gateRows.find((g) => g.id === target!.id)?.allowedRoleIds ?? [];
    if (!isRolePermitted(targetAllowedRoleIds, employee?.roleProfileId)) {
      return {
        success: false,
        error: "Your role is not permitted to run this process.",
      };
    }

    // Subcon gate
    if (!target.fullyReceived) {
      // Heuristic: only block when explicitly tagged subcon; for now allow.
      // Subcon module will set fullyReceived when SRT completes.
    }

    // Prevent duplicate open scan by the same employee on the same row
    const existingOpen = await prisma.productionTimesheet.findFirst({
      where: {
        routingProcessId: target.id,
        employeeId: input.employeeId,
        timeOut: null,
      },
    });
    if (existingOpen) {
      return { success: false, error: "Employee already has an open scan on this routing process" };
    }

    const ts = await prisma.productionTimesheet.create({
      data: {
        employeeId: input.employeeId,
        routingProcessId: target.id,
        timeIn: new Date(),
        completed: false,
        machineCodes: input.machineCodes || undefined,
      },
    });

    // Roll routing → WIP if currently New
    if (target.status === "New") {
      await prisma.routingProcess.update({
        where: { id: target.id },
        data: { status: "WIP" },
      });
    }
    // Roll WO → WIP if currently Proceed
    if (wo.status === "Proceed") {
      await prisma.workOrder.update({
        where: { workOrderNo: wo.workOrderNo },
        data: { status: "WIP" },
      });
    }

    revalidatePath("/terminal");
    revalidatePath(`/dashboard/production/work-order/${wo.workOrderNo}`);
    return { success: true, timesheetId: ts.id, routingProcessId: target.id, routingSn: target.sn };
  } catch (err: any) {
    console.error("scanIn:", err);
    return { success: false, error: err.message || "Scan IN failed" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
/** The signed-in user's employee record (linked id, else matched by email); admins may have none. */
async function getSignedInEmployee() {
  const user = (await auth())?.user;
  if (!user) return null;
  const select = { id: true, roleProfileId: true } as const;
  let emp = user.employeeId ? await prisma.employee.findUnique({ where: { id: user.employeeId }, select }) : null;
  if (!emp && user.email) emp = await prisma.employee.findFirst({ where: { email: user.email }, select });
  return { user, emp, isAdmin: user.role === "ADMIN" };
}

export type CompletedSessionsQuery = {
  q?: string;
  /** Local calendar dates (YYYY-MM-DD) of the viewer, inclusive. */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  /** Viewer's `Date.getTimezoneOffset()`, so day boundaries are local, not server time. */
  tzOffsetMinutes?: number;
};

/**
 * A worker's finished sessions, newest first, with search, a date range and paging — built so months of
 * history stay navigable. Workers see only their own; an admin with no linked employee sees everyone's.
 */
export async function getCompletedSessions(query: CompletedSessionsQuery = {}) {
  const empty = { rows: [] as any[], total: 0, page: 1, pageCount: 1, pageSize: 15, scope: "none" as "own" | "all" | "none", totals: { sessions: 0, completedQty: 0, rejectedQty: 0, minutes: 0 } };
  try {
    const me = await getSignedInEmployee();
    if (!me) return empty;
    if (!me.emp && !me.isAdmin) return empty;
    const scope: "own" | "all" = me.emp ? "own" : "all";

    const pageSize = Math.min(Math.max(Math.floor(query.pageSize ?? 15), 5), 50);
    const tz = Number.isFinite(query.tzOffsetMinutes) ? Number(query.tzOffsetMinutes) : 0;
    const dayStartUtc = (ymd?: string) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd ?? "");
      return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + tz * 60000) : null;
    };
    const from = dayStartUtc(query.from);
    const toExclusive = dayStartUtc(query.to);
    if (toExclusive) toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

    const q = (query.q ?? "").trim();
    const where: any = {
      timeOut: { not: null, ...(from ? { gte: from } : {}), ...(toExclusive ? { lt: toExclusive } : {}) },
      ...(me.emp ? { employeeId: me.emp.id } : {}),
      ...(q
        ? {
            OR: [
              { routingProcess: { inProcess: { workOrderNo: { contains: q, mode: "insensitive" } } } },
              { routingProcess: { inProcess: { workOrder: { customer: { customerName: { contains: q, mode: "insensitive" } } } } } },
              { routingProcess: { routingProcess: { routingProcess: { contains: q, mode: "insensitive" } } } },
              { routingProcess: { mainProcess: { process: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const [total, agg] = await Promise.all([
      prisma.productionTimesheet.count({ where }),
      prisma.productionTimesheet.aggregate({ where, _sum: { completedQty: true, rejectedQty: true, totalMinutes: true } }),
    ]);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(Math.floor(query.page ?? 1), 1), pageCount);

    const rows = await prisma.productionTimesheet.findMany({
      where,
      orderBy: { timeOut: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        timeIn: true,
        timeOut: true,
        totalMinutes: true,
        totalIdleMinutes: true,
        completedQty: true,
        rejectedQty: true,
        rejectReason: true,
        machineCodes: true,
        qcStatus: true,
        qcRemark: true,
        employee: { select: { name: true, code: true } },
        routingProcess: {
          select: {
            mainProcess: { select: { process: true } },
            routingProcess: { select: { routingProcess: true } },
            inProcess: {
              select: {
                description: true,
                workOrderNo: true,
                workOrder: { select: { jobDescription: true, quantity: true, uom: true, customer: { select: { customerName: true } } } },
              },
            },
          },
        },
      },
    });

    return {
      rows: JSON.parse(JSON.stringify(rows)) as any[],
      total,
      page,
      pageCount,
      pageSize,
      scope,
      totals: {
        sessions: total,
        completedQty: Number(agg._sum.completedQty ?? 0),
        rejectedQty: Number(agg._sum.rejectedQty ?? 0),
        minutes: Number(agg._sum.totalMinutes ?? 0),
      },
    };
  } catch (error) {
    console.error("getCompletedSessions failed:", error);
    return empty;
  }
}

/**
 * Work the signed-in operator can start right now, so they can tap it instead of scanning or typing.
 *
 * It is the current (serial front) step of every Proceed/WIP work order whose routing process allows
 * the operator's role — the same sequence + role gate `scanIn` enforces — minus steps assigned to
 * someone else and steps this operator already has running. An admin with no linked employee is not
 * role-filtered and sees every current step.
 */
export async function getAvailableSessions() {
  try {
    const me = await getSignedInEmployee();
    if (!me) return [];
    const { emp, isAdmin } = me;
    if (!emp && !isAdmin) return [];

    const workOrders = await prisma.workOrder.findMany({
      where: { status: { in: ["Proceed", "WIP"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        workOrderNo: true,
        jobDescription: true,
        quantity: true,
        uom: true,
        deliveryDate: true,
        customer: { select: { customerName: true } },
        inProcesses: {
          orderBy: { sn: "asc" },
          select: {
            id: true,
            sn: true,
            description: true,
            routingProcesses: {
              orderBy: { sequence: "asc" },
              select: {
                id: true,
                sequence: true,
                status: true,
                mainProcessId: true,
                routingProcessId: true,
                assignedEmployeeId: true,
                targetCompletionDate: true,
                mainProcess: { select: { process: true } },
                routingProcess: { select: { routingProcess: true, allowedRoles: { select: { id: true } } } },
                productionTimesheets: { select: { completedQty: true } },
              },
            },
          },
        },
      },
    });

    const running = emp
      ? await prisma.productionTimesheet.findMany({
          where: { employeeId: emp.id, timeOut: null },
          select: { routingProcessId: true },
        })
      : [];
    const runningIds = new Set(running.map((t) => t.routingProcessId));

    const out: any[] = [];
    for (const wo of workOrders) {
      const flat = wo.inProcesses.flatMap((ip) => ip.routingProcesses.map((rp) => ({ ip, rp })));
      const gateRows: GateRow[] = flat.map(({ ip, rp }) => ({
        id: rp.id,
        inProcessSn: ip.sn ?? 0,
        sequence: rp.sequence,
        status: rp.status,
        mainProcessId: rp.mainProcessId,
        allowedRoleIds: (rp.routingProcess?.allowedRoles ?? []).map((r) => r.id),
      }));

      for (const g of computeGating(gateRows, emp?.roleProfileId)) {
        if (!g.available) continue;
        if (emp ? !g.permitted : false) continue; // role gate (admin without an employee skips it)
        const found = flat.find((f) => f.rp.id === g.id);
        if (!found) continue;
        const { ip, rp } = found;
        if (!rp.mainProcessId || !rp.routingProcessId) continue;
        if (emp && rp.assignedEmployeeId && rp.assignedEmployeeId !== emp.id) continue;
        if (runningIds.has(rp.id)) continue;
        // Full quantity already produced (the step is only waiting on parameter confirmation): nothing left to start.
        const doneQty = rp.productionTimesheets.reduce((sum, t) => sum + (t.completedQty ? Number(t.completedQty) : 0), 0);
        if (wo.quantity != null && doneQty >= Number(wo.quantity)) continue;

        out.push({
          key: rp.id,
          workOrderNo: wo.workOrderNo,
          customer: wo.customer?.customerName ?? "",
          jobDescription: wo.jobDescription ?? "",
          quantity: wo.quantity != null ? Number(wo.quantity) : null,
          uom: wo.uom ?? "",
          deliveryDate: wo.deliveryDate ? wo.deliveryDate.toISOString() : null,
          inProcessId: ip.id,
          inProcessName: ip.description,
          mainProcessId: rp.mainProcessId,
          mainProcessName: rp.mainProcess?.process ?? "",
          routingProcessProfileId: rp.routingProcessId,
          routingProcessName: rp.routingProcess?.routingProcess ?? "",
          status: rp.status,
          targetDate: rp.targetCompletionDate.toISOString(),
        });
      }
    }
    return out;
  } catch (error) {
    console.error("getAvailableSessions failed:", error);
    return [];
  }
}

export async function togglePauseSession(timesheetId: string) {
  try {
    const ts = await prisma.productionTimesheet.findUnique({ where: { id: timesheetId } });
    if (!ts) return { success: false, error: "Session not found" };

    if (ts.isPaused) {
      // Resume: calculate idle time
      const now = new Date();
      const idleMs = now.getTime() - (ts.lastPauseTime?.getTime() || now.getTime());
      const idleMinutes = idleMs / 60000;
      
      await prisma.productionTimesheet.update({
        where: { id: timesheetId },
        data: {
          isPaused: false,
          totalIdleMinutes: { increment: idleMinutes },
          lastPauseTime: null,
        }
      });
    } else {
      // Pause
      await prisma.productionTimesheet.update({
        where: { id: timesheetId },
        data: {
          isPaused: true,
          lastPauseTime: new Date(),
        }
      });
    }
    
    revalidatePath("/terminal");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to toggle pause" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Find open scans for OUT (worker selects which to close)
// ──────────────────────────────────────────────────────────────────────────────
export async function getOpenScans(workOrderNo: string, employeeId?: string) {
  const rows = await prisma.productionTimesheet.findMany({
    where: {
      timeOut: null,
      ...(employeeId ? { employeeId } : {}),
      routingProcess: {
        inProcess: { workOrderNo },
      },
    },
    include: {
      employee: { select: { id: true, name: true, code: true } },
      routingProcess: {
        include: {
          mainProcess: true,
          routingProcess: true,
          inProcess: { select: { id: true, sn: true, description: true } },
        },
      },
    },
    orderBy: { timeIn: "asc" },
  });
  return JSON.parse(JSON.stringify(rows));
}

// ──────────────────────────────────────────────────────────────────────────────
// Find open scans for a specific operator across ALL work orders (Terminal view)
// ──────────────────────────────────────────────────────────────────────────────
export async function getTerminalActiveSessions(employeeId?: string) {
  const rows = await prisma.productionTimesheet.findMany({
    where: {
      timeOut: null,
      ...(employeeId ? { employeeId } : {}),
    },
    include: {
      employee: { select: { id: true, name: true, code: true } },
      routingProcess: {
        include: {
          mainProcess: true,
          routingProcess: true,
          inProcess: { include: { workOrder: true } },
          productionTimesheets: {
            select: { completedQty: true }
          }
        },
      },
    },
    orderBy: { timeIn: "desc" },
  });
  return JSON.parse(JSON.stringify(rows));
}

// ──────────────────────────────────────────────────────────────────────────────
// Find recently completed scans (Terminal view)
// ──────────────────────────────────────────────────────────────────────────────
export async function getTerminalRecentCompletes(limit = 10, employeeId?: string) {
  const rows = await prisma.productionTimesheet.findMany({
    where: {
      timeOut: { not: null },
      ...(employeeId ? { employeeId } : {}),
    },
    include: {
      employee: { select: { id: true, name: true, code: true } },
      routingProcess: {
        include: {
          mainProcess: true,
          routingProcess: true,
          inProcess: { include: { workOrder: true } },
        },
      },
    },
    orderBy: { timeOut: "desc" },
    take: limit,
  });
  return JSON.parse(JSON.stringify(rows));
}

// ──────────────────────────────────────────────────────────────────────────────
// SCAN OUT
// ──────────────────────────────────────────────────────────────────────────────
export type ScanOutPayload = {
  timesheetId: string;
  completedQty: number;
  rejectedQty?: number;
  rejectReason?: string;
  machineCodes?: string;
  // Parameter forms — exactly one of welding/spray/machining (or none) per ProcessProfile flag
  welding?: {
    materialTypeIds?: string[];
    weldingTypeIds?: string[];
    weldingMachineId?: string;
    typeOfJointId?: string;
    electrodeType?: string;
    weldingPosition?: string;
    weldingJoint?: number;
    weldingSizeMm?: number;
    voltageVolts?: number;
    currentAmp?: number;
    coolingTimeMins?: number;
    preHeatingC?: number;
    postHeatingC?: number;
    heatTreatmentHrc?: number;
    remark?: string;
  };
  spray?: {
    paintTankPressurePsi?: number;
    sprayNozzleSize?: number;
    typeOfPaint?: string;
    remark?: string;
    surfaceStartDatetime?: string;
    surfaceEndDatetime?: string;
    surfaceGeneralWeather?: string;
    surfaceEnvTemperature?: string;
    surfaceRelativeHumidity?: string;
    surfaceAbrasiveType?: string;
    surfaceSandpaperGrit?: string;
    primerStartDatetime?: string;
    primerEndDatetime?: string;
    primerGeneralWeather?: string;
    primerEnvTemperature?: string;
    primerRelativeHumidity?: string;
    primerPaintBatchNo?: string;
    primerExpiryDate?: string;
    primerDftMeasurement?: string;
    topcoatStartDatetime2?: string;
    topcoatEndDatetime2?: string;
    topcoatGeneralWeather2?: string;
    topcoatEnvTemperature2?: string;
    topcoatRelativeHumidity2?: string;
    topcoatAbrasiveType?: string;
    topcoatSandpaperGrit?: string;
    topcoatPaintBatchNo?: string;
    topcoatExpiryDate?: string;
    topcoatDftMeasurement?: string;
    topcoatAdhesiveTestResult?: string;
    additionalRemark?: string;
  };
  machining?: {
    machineSerialNoId: string;
    cncProgramNo?: string;
    testRun?: string;
    specialTooling?: string;
    partRuntimeHr?: number;
    partRuntimeMins?: number;
    remark?: string;
    toolList?: number[];
  };
};

export async function scanOut(payload: ScanOutPayload) {
  try {
    const ts = await prisma.productionTimesheet.findUnique({
      where: { id: payload.timesheetId },
      include: {
        routingProcess: {
          include: {
            inProcess: { include: { workOrder: true, routingProcesses: true } },
            routingProcess: { select: { welding: true, sprayPainting: true, machining: true } },
          },
        },
      },
    });
    if (!ts) return { success: false, error: "Open scan not found" };
    if (ts.timeOut) return { success: false, error: "Already scanned out" };

    const wo = ts.routingProcess.inProcess.workOrder;

    // Validate overproduction
    if (wo.quantity != null) {
      const existingTimesheets = await prisma.productionTimesheet.findMany({
        where: { routingProcessId: ts.routingProcessId, id: { not: ts.id } }
      });
      const previousGood = existingTimesheets.reduce(
        (acc: number, t: any) => acc + (t.completedQty ? Number(t.completedQty) : 0),
        0
      );
      const newGood = payload.completedQty ? Number(payload.completedQty) : 0;
      const combinedGood = previousGood + newGood;

      if (combinedGood > Number(wo.quantity)) {
        return { 
          success: false, 
          error: `Overproduction error: The target is ${wo.quantity} pieces. You have already completed ${previousGood} pieces. You cannot submit ${newGood} pieces now.`
        };
      }
    }

    const timeOut = new Date();
    const totalMinutes =
      ts.timeIn ? Number(((timeOut.getTime() - ts.timeIn.getTime()) / 60000).toFixed(2)) : null;

    // Close the timesheet
    await prisma.productionTimesheet.update({
      where: { id: ts.id },
      data: {
        timeOut,
        totalMinutes,
        completedQty: payload.completedQty,
        rejectedQty: payload.rejectedQty || null,
        rejectReason: payload.rejectReason || null,
        completed: true,
        machineCodes: payload.machineCodes || null,
      },
    });

    // Create parameter row matching ProcessProfile flag
    const flags = ts.routingProcess.routingProcess;
    if (payload.welding && flags?.welding) {
      const wParam = await prisma.processParameterWelding.create({
        data: {
          timesheetId: ts.id,
          weldingMachineId: payload.welding.weldingMachineId || null,
          typeOfJointId: payload.welding.typeOfJointId || null,
          electrodeType: payload.welding.electrodeType || null,
          weldingPosition: payload.welding.weldingPosition || null,
          weldingJoint: payload.welding.weldingJoint ?? null,
          weldingSizeMm: payload.welding.weldingSizeMm ?? null,
          voltageVolts: payload.welding.voltageVolts ?? null,
          currentAmp: payload.welding.currentAmp ?? null,
          coolingTimeMins: payload.welding.coolingTimeMins ?? null,
          preHeatingC: payload.welding.preHeatingC ?? null,
          postHeatingC: payload.welding.postHeatingC ?? null,
          heatTreatmentHrc: payload.welding.heatTreatmentHrc ?? null,
          remark: payload.welding.remark || null,
          status: "Pending",
        },
      });
      // NOTE: MaterialType / WeldingTypeProfile relations are 1:N (FK on the
      // master tables). Linking a master row to this parameter steals it from
      // any previous parameter — known schema limitation, see schema.prisma.
      if (payload.welding.materialTypeIds?.length) {
        await prisma.materialType.updateMany({
          where: { id: { in: payload.welding.materialTypeIds } },
          data: { processParameterWeldingId: wParam.id },
        });
      }
      if (payload.welding.weldingTypeIds?.length) {
        await prisma.weldingTypeProfile.updateMany({
          where: { id: { in: payload.welding.weldingTypeIds } },
          data: { processParameterWeldingId: wParam.id },
        });
      }
    } else if (payload.spray && flags?.sprayPainting) {
      const s = payload.spray;
      await prisma.processParameterSprayPainting.create({
        data: {
          timesheetId: ts.id,
          paintTankPressurePsi: s.paintTankPressurePsi ?? 0,
          sprayNozzleSize: s.sprayNozzleSize ?? 0,
          typeOfPaint: s.typeOfPaint ?? "",
          remark: s.remark || null,
          surfaceStartDatetime: s.surfaceStartDatetime ? new Date(s.surfaceStartDatetime) : null,
          surfaceEndDatetime: s.surfaceEndDatetime ? new Date(s.surfaceEndDatetime) : null,
          surfaceGeneralWeather: s.surfaceGeneralWeather || null,
          surfaceEnvTemperature: s.surfaceEnvTemperature || null,
          surfaceRelativeHumidity: s.surfaceRelativeHumidity || null,
          surfaceAbrasiveType: s.surfaceAbrasiveType || null,
          surfaceSandpaperGrit: s.surfaceSandpaperGrit || null,
          primerStartDatetime: s.primerStartDatetime ? new Date(s.primerStartDatetime) : null,
          primerEndDatetime: s.primerEndDatetime ? new Date(s.primerEndDatetime) : null,
          primerGeneralWeather: s.primerGeneralWeather || null,
          primerEnvTemperature: s.primerEnvTemperature || null,
          primerRelativeHumidity: s.primerRelativeHumidity || null,
          primerPaintBatchNo: s.primerPaintBatchNo || null,
          primerExpiryDate: s.primerExpiryDate ? new Date(s.primerExpiryDate) : null,
          primerDftMeasurement: s.primerDftMeasurement || null,
          topcoatStartDatetime2: s.topcoatStartDatetime2 ? new Date(s.topcoatStartDatetime2) : null,
          topcoatEndDatetime2: s.topcoatEndDatetime2 ? new Date(s.topcoatEndDatetime2) : null,
          topcoatGeneralWeather2: s.topcoatGeneralWeather2 || null,
          topcoatEnvTemperature2: s.topcoatEnvTemperature2 || null,
          topcoatRelativeHumidity2: s.topcoatRelativeHumidity2 || null,
          topcoatAbrasiveType: s.topcoatAbrasiveType || null,
          topcoatSandpaperGrit: s.topcoatSandpaperGrit || null,
          topcoatPaintBatchNo: s.topcoatPaintBatchNo || null,
          topcoatExpiryDate: s.topcoatExpiryDate ? new Date(s.topcoatExpiryDate) : null,
          topcoatDftMeasurement: s.topcoatDftMeasurement || null,
          topcoatAdhesiveTestResult: s.topcoatAdhesiveTestResult || null,
          additionalRemark: s.additionalRemark || null,
          status: "Confirmed",
        },
      });
    } else if (payload.machining && flags?.machining) {
      const m = payload.machining;
      if (!m.machineSerialNoId) {
        return { success: false, error: "Machine selection is required for machining processes." };
      }
      await prisma.processParameterMachining.create({
        data: {
          timesheetId: ts.id,
          machineSerialNoId: m.machineSerialNoId,
          cncProgramNo: m.cncProgramNo || null,
          testRun: m.testRun || null,
          specialTooling: m.specialTooling || null,
          partRuntimeHr: m.partRuntimeHr ?? null,
          partRuntimeMins: m.partRuntimeMins ?? null,
          remark: m.remark || null,
          status: "Confirmed",
          toolLists: m.toolList?.length
            ? { create: m.toolList.map((v) => ({ toolValue: v })) }
            : undefined,
        },
      });
    }

    await checkAndCompleteRoutingProcess(ts.routingProcessId);

    revalidatePath("/terminal");
    revalidatePath(`/dashboard/production/work-order/${wo.workOrderNo}`);
    revalidatePath(`/dashboard/production/work-order/${wo.workOrderNo}/routing`);
    revalidatePath(`/dashboard/production/work-order/${wo.workOrderNo}/timesheets`);
    return { success: true };
  } catch (err: any) {
    console.error("scanOut:", err);
    return { success: false, error: err.message || "Scan OUT failed" };
  }
}

export async function checkAndCompleteRoutingProcess(routingProcessId: string) {
  const rp = await prisma.routingProcess.findUnique({
    where: { id: routingProcessId },
    include: {
      inProcess: { include: { workOrder: true } },
      routingProcess: true,
      productionTimesheets: {
        include: {
          weldingParameter: true,
          sprayParameter: true,
          machiningParameter: true,
        }
      }
    }
  });

  if (!rp) return;

  const wo = rp.inProcess.workOrder;
  if (wo.quantity == null) return;

  // 1. Check quantity
  const totalCompleted = rp.productionTimesheets.reduce(
    (acc: number, ts: any) => acc + (ts.completedQty ? Number(ts.completedQty) : 0),
    0
  );
  if (totalCompleted < Number(wo.quantity)) {
    return; // Not enough quantity
  }

  // 2. Check parameters
  const flags = rp.routingProcess;
  let allParamsConfirmed = true;

  for (const ts of rp.productionTimesheets) {
    if (flags?.welding && ts.weldingParameter) {
       if (ts.weldingParameter.status !== "Confirmed") allParamsConfirmed = false;
    }
    if (flags?.sprayPainting && ts.sprayParameter) {
       if (ts.sprayParameter.status !== "Confirmed") allParamsConfirmed = false;
    }
    if (flags?.machining && ts.machiningParameter) {
       if (ts.machiningParameter.status !== "Confirmed") allParamsConfirmed = false;
    }
  }

  if (!allParamsConfirmed) {
    return; // Still pending parameters
  }

  // 3. Complete RoutingProcess
  if (rp.status !== "Completed") {
    await prisma.routingProcess.update({
      where: { id: rp.id },
      data: { status: "Completed" },
    });
  }

  // 4. Check if all routing processes for WO are completed
  const inProcessesFull = await prisma.workOrderInProcess.findMany({
    where: { workOrderNo: wo.workOrderNo },
    include: { routingProcesses: true },
  });
  const allDone = inProcessesFull.every(
    (ip: any) =>
      ip.routingProcesses.length > 0 &&
      ip.routingProcesses.every((r: any) => r.status === "Completed")
  );
  
  if (allDone && wo.status !== "Pending for QC") {
    await prisma.workOrder.update({
      where: { workOrderNo: wo.workOrderNo },
      data: { status: "Pending for QC" },
    });
  }
}

export async function scanOutQuick(input: {
  workOrderNo: string;
  inProcessId: string;
  mainProcessId: string;
  routingProcessProfileId: string;
  employeeId: string;
}) {
  try {
    const operator = await resolveOperatorEmployeeId(input.employeeId);
    if (!operator.ok) return { success: false, error: operator.error };

    // Find active timesheet for this combination
    const activeTimesheets = await prisma.productionTimesheet.findMany({
      where: {
        employeeId: input.employeeId,
        timeOut: null,
        routingProcess: {
          inProcessId: input.inProcessId,
          mainProcessId: input.mainProcessId,
          routingProcessId: input.routingProcessProfileId,
        }
      }
    });

    if (activeTimesheets.length === 0) {
      return { success: false, error: "No active session found for this process and employee" };
    }

    const timesheetId = activeTimesheets[0].id;
    return scanOut({ timesheetId, completedQty: 0 });
  } catch (err: any) {
    console.error("scanOutQuick:", err);
    return { success: false, error: err.message || "Scan OUT failed" };
  }
}
