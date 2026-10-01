import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AddInProcessModal from "../../components/AddInProcessModal";
import EditInProcessModal from "../../components/EditInProcessModal";
import AddRoutingProcessModal from "../../components/AddRoutingProcessModal";
import RoutingProcessTable from "../../components/RoutingProcessTable";
import { getRoutingDropdownData } from "../../actions";
import { auth } from "@/lib/auth";

import { RecordStatus } from "@/lib/status";
const IP_STATUS_BADGE: Record<string, string> = {
  New: "bg-slate-100 text-slate-700",
  WIP: "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

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

  console.log("Rendering routing processes. In-processes count:", workOrder?.inProcesses?.length);

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

  let topDerivedStatus = workOrder.status || "Unknown";
  if (topDerivedStatus === "Completed" && workOrder.inProcesses && workOrder.inProcesses.length > 0) {
    const allCompleted = workOrder.inProcesses.every((ip: any) => 
      ip.routingProcesses.length > 0 && ip.routingProcesses.every((rp: any) => rp.status === "Completed")
    );
    if (!allCompleted) topDerivedStatus = "WIP";
  }

  return (
    <div className="p-0 sm:p-4 max-w-6xl mx-auto space-y-1 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-1 justify-between px-1 sm:px-0 mt-1 sm:mt-0">
        <div className="flex items-start md:items-center gap-1 w-full md:w-auto">
          <Link
            href="/dashboard/production/work-order"
            className="p-0.5 sm:p-2 shrink-0 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors mt-0.5 md:mt-0"
          >
            <ArrowLeft size={12} className="sm:w-5 sm:h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-xl md:text-2xl font-bold text-slate-800 break-words leading-tight">Work Order: {workOrder.workOrderNo}</h1>
            <p className="text-[9px] sm:text-xs md:text-sm text-slate-500 mt-0.5">
              Status: <span className="font-medium">{topDerivedStatus}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto no-scrollbar">
        <nav className="-mb-px flex space-x-1 sm:space-x-8 min-w-max px-1 sm:px-0">
          <Link
            href={`/dashboard/production/work-order/${id}`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium whitespace-nowrap"
          >
            Order Details
          </Link>
          <div className="border-b-2 border-blue-600 text-blue-600 py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium whitespace-nowrap">
            In-Process & Routing
          </div>
          <Link
            href={`/dashboard/production/work-order/${id}/timesheets`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium whitespace-nowrap"
          >
            Timesheets & Parameters
          </Link>
          <Link
            href={`/dashboard/production/work-order/${id}/files`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium whitespace-nowrap"
          >
            Files
          </Link>
        </nav>
      </div>

      <div className="bg-white rounded-md sm:rounded-xl shadow-sm border-y sm:border border-slate-200 p-1.5 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 sm:gap-4 mb-2 sm:mb-4">
          <div>
            <h3 className="text-[11px] sm:text-lg font-semibold text-slate-800">Inprocess Name</h3>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
              Within an in-process, routing runs strictly in sequence. New items can only be appended after existing Completed / WIP rows.
            </p>
          </div>
          <AddInProcessModal
            workOrderNo={id}
            existingSteps={existingSteps}
            disabled={!editable}
          />
        </div>

        {inProcessRows.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
            <p className="text-sm">No in-process steps defined yet.</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-4">
            {inProcessRows.map((ip: any) => (
              <div key={ip.id} className="border border-slate-200 rounded-md sm:rounded-lg overflow-hidden">
                <div className="p-2 sm:p-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 sm:gap-4">
                    <div className="min-w-0 w-full sm:w-auto">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-[11px] sm:text-base font-semibold text-slate-800">
                          {ip.sn}. {ip.description}
                        </h4>
                        {editable && ip.derivedStatus === "New" && (
                          <EditInProcessModal
                            inProcess={ip}
                            existingSteps={existingSteps}
                            disabled={!editable}
                          />
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded sm:rounded-full text-[9px] sm:text-xs font-medium ${
                            IP_STATUS_BADGE[ip.derivedStatus] ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ip.derivedStatus}
                        </span>
                        {ip.allFlag && (
                          <span className="px-1.5 py-0.5 rounded sm:rounded-full text-[9px] sm:text-xs bg-blue-50 text-blue-700">All</span>
                        )}
                      </div>
                      <div className="mt-0.5 sm:mt-1 text-[9px] sm:text-xs text-slate-500 space-x-2 sm:space-x-3">
                        <span>Target: {new Date(ip.targetCompletionDate).toLocaleDateString("en-GB")}</span>
                        {ip.conditionalSn && (
                          <span>Precondition: SN {ip.conditionalSn.sn} ({ip.conditionalSn.description})</span>
                        )}
                      </div>
                      {ip.remark && <div className="mt-1 sm:mt-2 text-[9px] sm:text-xs text-slate-600">{ip.remark}</div>}
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
                  </div>
                </div>

                {ip.routingProcesses.length === 0 ? (
                  <div className="px-2 py-4 sm:px-4 sm:py-8 text-center text-slate-400 text-[10px] sm:text-xs">
                    No routing processes yet.
                  </div>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
