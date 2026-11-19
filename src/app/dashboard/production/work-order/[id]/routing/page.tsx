import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { GitBranch, Layers, CalendarClock, Link2 } from "lucide-react";
import { Badge, EmptyState, StatusBadge, type Tone } from "@/components/form-ui";
import WorkOrderShell, { fmtWoDate } from "../../components/WorkOrderShell";
import AddInProcessModal from "../../components/AddInProcessModal";
import EditInProcessModal from "../../components/EditInProcessModal";
import AddRoutingProcessModal from "../../components/AddRoutingProcessModal";
import RoutingProcessTable from "../../components/RoutingProcessTable";
import { getRoutingDropdownData } from "../../actions";
import { auth } from "@/lib/auth";

import { RecordStatus } from "@/lib/status";
const IP_STATUS_TONE: Record<string, Tone> = { New: "slate", WIP: "amber", Completed: "emerald" };

export default async function WorkOrderRoutingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  const userRole = session?.user?.role;
  
  const bypassRoles = ["Admin", "VIEWER", "Production Manager", "QC", "QC Manager"];
  const shouldFilterByRole = userRole && !bypassRoles.some((r) => r.toLowerCase() === userRole.toLowerCase());

  const workOrder = await prisma.workOrder.findUnique({
    where: { workOrderNo: id },
    include: {
      customer: { select: { customerName: true } },
      inProcesses: {
        orderBy: { sn: "asc" },
        include: {
          conditionalSn: { select: { sn: true, description: true } },
          routingProcesses: {
            where: shouldFilterByRole ? {
              routingProcess: {
                allowedRoles: { some: { name: userRole } }
              }
            } : undefined,
            orderBy: { sequence: "asc" },
            include: {
              mainProcess: { select: { process: true } },
              routingProcess: { select: { routingProcess: true, welding: true, sprayPainting: true, machining: true } },
              assignedEmployee: { select: { name: true } },
              productionTimesheets: {
                include: {
                  weldingParameter: {
                    include: {
                      weldingMachine: true,
                      typeOfJoint: true,
                      materialTypes: true,
                      weldingTypes: true,
                      confirmedBy: true,
                    }
                  },
                  sprayParameter: {
                    include: {
                      elcometer: true,
                      confirmedBy: true,
                    }
                  },
                  machiningParameter: {
                    include: {
                      machine: true,
                      toolLists: true,
                      confirmedBy: true,
                    }
                  }
                }
              }
            },
          },
        },
      },
    },
  });

  const employees = await prisma.employee.findMany({
    where: { status: RecordStatus.Active },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const [weldingMachines, machiningMachines, elcometers, joints, materialTypes, weldingTypes] = await Promise.all([
    prisma.machineProfile.findMany({
      where: { status: "Active", machineCategory: "Welding Machine" },
      orderBy: { machineCode: "asc" },
    }),
    prisma.machineProfile.findMany({
      where: { status: "Active", machineCategory: "Machine" },
      orderBy: { serialNo: "asc" },
    }),
    prisma.elcometerProfile.findMany({
      where: { status: "Active" },
      orderBy: { serialNo: "asc" },
    }),
    prisma.jointProfile.findMany({
      where: { status: "Active" },
      orderBy: { joint: "asc" },
    }),
    prisma.materialType.findMany({
      where: { status: "Active" },
      orderBy: { type: "asc" },
    }),
    prisma.weldingTypeProfile.findMany({
      where: { status: "Active" },
      orderBy: { type: "asc" },
    }),
  ]);

  const supportData = {
    weldingMachines: JSON.parse(JSON.stringify(weldingMachines)),
    machiningMachines: JSON.parse(JSON.stringify(machiningMachines)),
    elcometers: JSON.parse(JSON.stringify(elcometers)),
    joints: JSON.parse(JSON.stringify(joints)),
    materialTypes: JSON.parse(JSON.stringify(materialTypes)),
    weldingTypes: JSON.parse(JSON.stringify(weldingTypes)),
  };

  if (!workOrder) notFound();

  const { mainProcesses, processProfiles } = await getRoutingDropdownData();

  const editable = !["Void", "Cancelled", "Completed"].includes(workOrder.status);
  const existingSteps = (workOrder?.inProcesses || []).map((p: any) => ({
    id: p?.id,
    sn: p?.sn,
    description: p?.description,
  }));

  // If filtering by role, remove in-processes that have no routing processes
  // so the welder only sees the sections they are working on
  if (shouldFilterByRole && workOrder?.inProcesses) {
    workOrder.inProcesses = workOrder.inProcesses.filter((ip: any) => ip.routingProcesses.length > 0);
  }

  // Roll the in-process status from its routing rows and serialize to remove Decimal objects
  const inProcessRows = JSON.parse(JSON.stringify((workOrder?.inProcesses || []).map((ip: any) => {
    const statuses = (ip?.routingProcesses || []).map((r: any) => r?.status);
    let derived = ip?.status;
    if (statuses.length > 0) {
      if (statuses.every((s: string) => s === "Completed")) derived = "Completed";
      else if (statuses.some((s: string) => s === "WIP" || s === "Completed")) derived = "WIP";
      else derived = "New";
    }
    
    return { ...ip, derivedStatus: derived, routingProcesses: ip?.routingProcesses || [] };
  })));

  const totalSteps = inProcessRows.reduce((n: number, ip: any) => n + ip.routingProcesses.length, 0);
  const doneSteps = inProcessRows.reduce(
    (n: number, ip: any) => n + ip.routingProcesses.filter((r: any) => r.status === "Completed").length,
    0,
  );

  return (
    <WorkOrderShell
      wo={{
        workOrderNo: workOrder.workOrderNo,
        status: workOrder.status,
        customerName: workOrder.customer?.customerName,
        projectCode: workOrder.projectCode,
        deliveryDate: workOrder.deliveryDate ? workOrder.deliveryDate.toISOString() : null,
        quantity: workOrder.quantity != null ? Number(workOrder.quantity) : null,
        uom: workOrder.uom,
      }}
      active="routing"
      actions={<AddInProcessModal workOrderNo={id} existingSteps={existingSteps} disabled={!editable} />}
    >
      <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Within an in-process, routing runs strictly in sequence. New items can only be appended after existing Completed / WIP rows.
        </p>
        {totalSteps > 0 && (
          <span className="shrink-0 text-xs text-slate-500">
            <span className="font-semibold tabular-nums text-slate-800">{doneSteps}</span> of{" "}
            <span className="font-semibold tabular-nums text-slate-800">{totalSteps}</span> routing steps completed
          </span>
        )}
      </div>

      {inProcessRows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <EmptyState
            icon={Layers}
            tone="indigo"
            title="No in-process steps yet"
            description={editable ? "Add an in-process (e.g. Body Frame Assembly), then plan its routing processes." : undefined}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {inProcessRows.map((ip: any) => {
            const steps = ip.routingProcesses.length;
            const done = ip.routingProcesses.filter((r: any) => r.status === "Completed").length;
            return (
              <section
                key={ip.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <header className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 px-1.5 text-[12px] font-semibold tabular-nums text-indigo-700 ring-1 ring-inset ring-indigo-600/15">
                      {ip.sn}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h2 className="truncate text-[13px] font-semibold leading-tight text-slate-800">{ip.description}</h2>
                        <StatusBadge status={ip.derivedStatus} tone={IP_STATUS_TONE[ip.derivedStatus] ?? "slate"} />
                        {ip.allFlag && <Badge tone="sky">All</Badge>}
                        {editable && ip.derivedStatus === "New" && (
                          <EditInProcessModal inProcess={ip} existingSteps={existingSteps} disabled={!editable} />
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock size={11} /> Target {fmtWoDate(ip.targetCompletionDate)}
                        </span>
                        {ip.conditionalSn && (
                          <span className="inline-flex items-center gap-1">
                            <Link2 size={11} /> After SN {ip.conditionalSn.sn} · {ip.conditionalSn.description}
                          </span>
                        )}
                        {steps > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <GitBranch size={11} /> {done}/{steps} steps done
                          </span>
                        )}
                      </div>
                      {ip.remark && <p className="mt-1 text-xs text-slate-600">{ip.remark}</p>}
                    </div>
                  </div>
                  <AddRoutingProcessModal
                    inProcessId={ip.id}
                    inProcessTargetDate={new Date(ip.targetCompletionDate).toISOString().slice(0, 10)}
                    mainProcesses={mainProcesses}
                    processProfiles={processProfiles}
                    employees={employees}
                    existingPairs={(ip.routingProcesses || []).map((r: any) => ({
                      mainProcessId: r.mainProcessId,
                      routingProcessId: r.routingProcessId,
                    }))}
                    disabled={!editable}
                  />
                </header>

                {steps === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-400">No routing processes yet.</p>
                ) : (
                  <RoutingProcessTable
                    inProcessId={ip.id}
                    inProcessTargetDate={new Date(ip.targetCompletionDate).toISOString().slice(0, 10)}
                    rows={JSON.parse(JSON.stringify(ip.routingProcesses))}
                    woStatus={workOrder.status}
                    employees={employees}
                    supportData={supportData}
                    workOrderNo={id}
                    mainProcesses={mainProcesses}
                    processProfiles={processProfiles}
                  />
                )}
              </section>
            );
          })}
        </div>
      )}
    </WorkOrderShell>
  );
}
