import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AddTimesheetModal from "../../components/AddTimesheetModal";
import ParameterDetailDrawer from "../../components/ParameterDetailDrawer";

import { RecordStatus } from "@/lib/status";
export default async function WorkOrderTimesheetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { workOrderNo: id },
    include: {
      inProcesses: {
        orderBy: { sn: "asc" },
        include: {
          routingProcesses: {
            orderBy: { sequence: "asc" },
            include: {
              mainProcess: true,
              routingProcess: true,
              productionTimesheets: {
                orderBy: { createdAt: "asc" },
                include: {
                  employee: true,
                  weldingParameter: {
                    include: {
                      weldingMachine: true,
                      typeOfJoint: true,
                      materialTypes: true,
                      weldingTypes: true,
                      confirmedBy: true,
                    },
                  },
                  sprayParameter: {
                    include: {
                      elcometer: true,
                      confirmedBy: true,
                    },
                  },
                  machiningParameter: {
                    include: {
                      machine: true,
                      toolLists: true,
                      confirmedBy: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!workOrder) notFound();

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

  console.log("Rendering timesheets. Employee count:", employees?.length);

  const rows = (workOrder?.inProcesses || []).flatMap((ip: any) =>
    (ip?.routingProcesses || []).flatMap((rp: any) => {
      let runningSum = 0;
      return (rp?.productionTimesheets || []).map((ts: any) => {
        const qty = Number(ts?.completedQty) || 0;
        runningSum += qty;
        return {
          ...ts,
          inProcessDescription: `${ip?.sn}. ${ip?.description}`,
          processName: rp?.routingProcess?.routingProcess || rp?.mainProcess?.process || "Unknown",
          runningSum,
        };
      });
    }),
  );

  const totalOrderQty = Number(workOrder?.quantity) || 0;

  const routingProcesses = (workOrder?.inProcesses || []).flatMap((ip: any) =>
    (ip?.routingProcesses || []).map((rp: any) => ({
      id: rp?.id,
      name: rp?.routingProcess?.routingProcess || rp?.mainProcess?.process || "Unknown",
      description: ip?.description,
    })),
  );

  const editable = !["Void", "Cancelled", "Completed"].includes(workOrder.status);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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
          <Link
            href={`/dashboard/production/work-order/${id}/routing`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 py-4 px-1 text-sm font-medium"
          >
            In-Process & Routing
          </Link>
          <div className="border-b-2 border-blue-600 text-blue-600 py-4 px-1 text-sm font-medium">
            Timesheets & Parameters
          </div>
          <Link
            href={`/dashboard/production/work-order/${id}/files`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 py-4 px-1 text-sm font-medium"
          >
            Files
          </Link>
        </nav>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Production Timesheets</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Scan IN / OUT data from Production Terminal. Authorized override only.
            </p>
          </div>
          {editable && (
            <AddTimesheetModal
              workOrderNo={id}
              employees={employees}
              routingProcesses={routingProcesses}
            />
          )}
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">No timesheets recorded for this work order yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Process</th>
                  <th className="px-4 py-3 font-semibold">Time In</th>
                  <th className="px-4 py-3 font-semibold">Time Out</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Min</th>
                  <th className="px-4 py-3 font-semibold text-center">Completed</th>
                  <th className="px-4 py-3 font-semibold text-right">Qty</th>
                  <th className="px-4 py-3 font-semibold">Machine</th>
                  <th className="px-4 py-3 font-semibold text-center">Parameters</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((ts: any) => (
                  <tr key={ts.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{ts.employee.name}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{ts.processName}</div>
                      <div className="text-xs text-slate-500">{ts.inProcessDescription}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {ts.timeIn ? new Date(ts.timeIn).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {ts.timeOut ? new Date(ts.timeOut).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {ts.totalMinutes ? Number(ts.totalMinutes).toString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          ts.completed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {ts.completed ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-medium">
                          {ts.completedQty ? Number(ts.completedQty).toString() : "-"}
                        </span>
                        {ts.completedQty != null && totalOrderQty > 0 && (
                          <div className="w-24 text-[10px]">
                            <div className="flex justify-between text-slate-500 mb-0.5">
                              <span>Rem: {Math.max(0, totalOrderQty - ts.runningSum)}</span>
                              <span>{Math.min(100, Math.round((ts.runningSum / totalOrderQty) * 100))}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${Math.min(100, (ts.runningSum / totalOrderQty) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ts.machineCodes || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <ParameterDetailDrawer
                        welding={ts.weldingParameter ? JSON.parse(JSON.stringify(ts.weldingParameter)) : null}
                        spray={ts.sprayParameter ? JSON.parse(JSON.stringify(ts.sprayParameter)) : null}
                        machining={ts.machiningParameter ? JSON.parse(JSON.stringify(ts.machiningParameter)) : null}
                        expectedType={ts.processName}
                        targetTimesheetId={ts.id}
                        employees={employees}
                        workOrderNo={id}
                        editable={editable}
                        supportData={{
                          weldingMachines: JSON.parse(JSON.stringify(weldingMachines)),
                          machiningMachines: JSON.parse(JSON.stringify(machiningMachines)),
                          elcometers: JSON.parse(JSON.stringify(elcometers)),
                          joints: JSON.parse(JSON.stringify(joints)),
                          materialTypes: JSON.parse(JSON.stringify(materialTypes)),
                          weldingTypes: JSON.parse(JSON.stringify(weldingTypes)),
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editable && (
                        <AddTimesheetModal
                          workOrderNo={id}
                          employees={employees}
                          routingProcesses={routingProcesses}
                          timesheet={{
                            id: ts.id,
                            routingProcessId: ts.routingProcessId,
                            employeeId: ts.employeeId,
                            timeIn: ts.timeIn ? ts.timeIn.toISOString() : null,
                            timeOut: ts.timeOut ? ts.timeOut.toISOString() : null,
                            completed: ts.completed,
                            completedQty: ts.completedQty ? Number(ts.completedQty) : "",
                            machineCodes: ts.machineCodes || "",
                          }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
