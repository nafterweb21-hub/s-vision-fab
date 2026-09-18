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
    
    if (workOrder.status === "Completed") {
      derived = "Completed";
    }

    const overriddenRoutingProcesses = (ip?.routingProcesses || []).map((r: any) => ({
      ...r,
      status: workOrder.status === "Completed" ? "Completed" : r.status
    }));

    return { ...ip, derivedStatus: derived, routingProcesses: overriddenRoutingProcesses };
  })));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/production/work-order"
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Work Order: {workOrder.workOrderNo}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Status: <span className="font-medium">{workOrder.status}</span>
          </p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <Link
            href={`/dashboard/production/work-order/${id}`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 py-4 px-1 text-sm font-medium"
          >
            Order Details
          </Link>
          <div className="border-b-2 border-blue-600 text-blue-600 py-4 px-1 text-sm font-medium">
            In-Process & Routing
          </div>
          <Link
            href={`/dashboard/production/work-order/${id}/timesheets`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 py-4 px-1 text-sm font-medium"
          >
            Timesheets & Parameters
          </Link>
          <Link
            href={`/dashboard/production/work-order/${id}/files`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 py-4 px-1 text-sm font-medium"
          >
            Files
          </Link>
        </nav>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Inprocess Name</h3>
            <p className="text-xs text-slate-500 mt-0.5">
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
          <div className="space-y-4">
            {inProcessRows.map((ip: any) => (
              <div key={ip.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-800">
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
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            IP_STATUS_BADGE[ip.derivedStatus] ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ip.derivedStatus}
                        </span>
                        {ip.allFlag && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">All</span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 space-x-3">
                        <span>Target: {new Date(ip.targetCompletionDate).toLocaleDateString()}</span>
                        {ip.conditionalSn && (
                          <span>Precondition: SN {ip.conditionalSn.sn} ({ip.conditionalSn.description})</span>
                        )}
                      </div>
                      {ip.remark && <div className="mt-2 text-xs text-slate-600">{ip.remark}</div>}
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
                  <div className="px-4 py-8 text-center text-slate-400 text-xs">
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
