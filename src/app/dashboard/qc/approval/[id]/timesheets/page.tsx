import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Clock, Timer } from "lucide-react";
import { Badge, EmptyState, StatusBadge } from "@/components/form-ui";
import { QcShell } from "../../qc-shell";
import ParameterDetailDrawer from "@/app/dashboard/production/work-order/components/ParameterDetailDrawer";

export default async function QcApprovalTimesheetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { workOrderNo: id },
    include: {
      customer: { select: { customerName: true } },
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

  const rows = workOrder.inProcesses.flatMap((ip: any) =>
    ip.routingProcesses.flatMap((rp: any) => {
      let runningSum = 0;
      return rp.productionTimesheets.map((ts: any) => {
        const qty = Number(ts.completedQty) || 0;
        runningSum += qty;
        return {
          ...ts,
          inProcessDescription: `${ip.sn}. ${ip.description}`,
          processName: rp.routingProcess?.routingProcess || rp.mainProcess?.process || "Unknown",
          runningSum,
        };
      });
    }),
  );

  const totalOrderQty = Number(workOrder.quantity) || 0;

  const totalMinutes = Math.round(rows.reduce((n: number, ts: any) => n + (Number(ts.totalMinutes) || 0), 0) * 100) / 100;
  const qcCounts = rows.reduce(
    (c: Record<string, number>, ts: any) => {
      const k = ts.qcStatus === "Approved" || ts.qcStatus === "Rejected" ? ts.qcStatus : "Pending";
      c[k] += 1;
      return c;
    },
    { Approved: 0, Rejected: 0, Pending: 0 } as Record<string, number>,
  );

  return (
    <QcShell wo={workOrder} active="timesheets">
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-2 px-1 text-xs text-slate-500">
          <span className="mr-auto inline-flex items-center gap-1">
            <Timer size={12} /> <span className="font-semibold tabular-nums text-slate-800">{totalMinutes}</span> min logged
          </span>
          <Badge tone="emerald" dot>{qcCounts.Approved} approved</Badge>
          <Badge tone="rose" dot>{qcCounts.Rejected} rejected</Badge>
          <Badge tone="violet" dot>{qcCounts.Pending} pending</Badge>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {rows.length === 0 ? (
          <EmptyState icon={Clock} tone="slate" title="No timesheets yet" description="Entries appear when operators scan in and out at the Production Terminal." />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-2 pl-4 pr-3 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Process</th>
                  <th className="px-3 py-2 font-medium">Time In · Out</th>
                  <th className="px-3 py-2 text-right font-medium">Minutes</th>
                  <th className="px-3 py-2 font-medium">Completed</th>
                  <th className="px-3 py-2 text-right font-medium">Qty · Running</th>
                  <th className="px-3 py-2 font-medium">Machine</th>
                  <th className="px-3 py-2 text-center font-medium">Parameters</th>
                  <th className="px-4 py-2 font-medium">QC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((ts: any) => {
                  const pct = totalOrderQty > 0 ? Math.min(100, (ts.runningSum / totalOrderQty) * 100) : 0;
                  const open = ts.timeIn && !ts.timeOut;
                  const qc = ts.qcStatus === "Approved" || ts.qcStatus === "Rejected" ? ts.qcStatus : "Pending";
                  return (
                    <tr key={ts.id} className={`align-top transition-colors hover:bg-slate-50/60 ${qc === "Rejected" ? "bg-rose-50/40" : ""}`}>
                      <td className="py-2 pl-4 pr-3 font-medium text-slate-800">{ts.employee?.name ?? "—"}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-700">{ts.processName}</p>
                        <p className="text-[11px] text-slate-400">{ts.inProcessDescription}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
                        <p>{fmtDateTime(ts.timeIn)}</p>
                        <p className={open ? "font-medium text-amber-700" : "text-slate-400"}>{open ? "Still scanned in" : fmtDateTime(ts.timeOut)}</p>
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-800">
                        {ts.totalMinutes ? Number(ts.totalMinutes) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={ts.completed ? "Yes" : "No"} tone={ts.completed ? "emerald" : "amber"} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="ml-auto w-28">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold tabular-nums text-slate-900">{ts.completedQty ? Number(ts.completedQty) : "—"}</span>
                            {totalOrderQty > 0 && <span className="text-[11px] tabular-nums text-slate-400">{Math.round(pct)}%</span>}
                          </div>
                          {ts.completedQty != null && totalOrderQty > 0 && (
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                          )}
                          {Number(ts.rejectedQty) > 0 && <p className="mt-0.5 text-[11px] font-medium text-rose-600">{Number(ts.rejectedQty)} rejected</p>}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{ts.machineCodes || <span className="font-sans text-slate-300">—</span>}</td>
                      <td className="px-3 py-2 text-center">
                        <ParameterDetailDrawer
                          welding={ts.weldingParameter ? JSON.parse(JSON.stringify(ts.weldingParameter)) : null}
                          spray={ts.sprayParameter ? JSON.parse(JSON.stringify(ts.sprayParameter)) : null}
                          machining={ts.machiningParameter ? JSON.parse(JSON.stringify(ts.machiningParameter)) : null}
                          expectedType={ts.processName}
                          targetTimesheetId={ts.id}
                        />
                      </td>
                      <td className="max-w-[180px] px-4 py-2">
                        <StatusBadge status={qc} tone={qc === "Approved" ? "emerald" : qc === "Rejected" ? "rose" : "violet"} />
                        {ts.qcRemark && (
                          <p className="mt-0.5 truncate text-[11px] text-slate-500" title={ts.qcRemark}>
                            {ts.qcRemark}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </QcShell>
  );
}

/** Deterministic "21 Sep 2026, 14:05" (rendered on the server, so avoid locale-dependent output). */
function fmtDateTime(d?: Date | string | null): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.getMonth()];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(dt.getDate())} ${mon} ${dt.getFullYear()}, ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
