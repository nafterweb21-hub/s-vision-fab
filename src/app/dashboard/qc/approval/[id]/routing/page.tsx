import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, GitBranch, Layers, Link2 } from "lucide-react";
import { Badge, EmptyState, StatusBadge, type Tone } from "@/components/form-ui";
import { fmtWoDate } from "@/app/dashboard/production/work-order/components/WorkOrderShell";
import { QcShell } from "../../qc-shell";

const STEP_TONE: Record<string, Tone> = { New: "slate", Pending: "slate", WIP: "amber", "Pending for QC": "violet", Completed: "emerald" };

export default async function QcApprovalRoutingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const wo = await prisma.workOrder.findUnique({
    where: { workOrderNo: id },
    include: {
      customer: { select: { customerName: true } },
      inProcesses: {
        orderBy: { sn: "asc" },
        include: {
          conditionalSn: { select: { sn: true, description: true } },
          routingProcesses: {
            orderBy: { sequence: "asc" },
            include: {
              mainProcess: { select: { process: true } },
              routingProcess: { select: { routingProcess: true } },
              assignedEmployee: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!wo) notFound();

  // Roll each in-process status up from its routing rows.
  const inProcesses = wo.inProcesses.map((ip) => {
    const statuses = ip.routingProcesses.map((r) => r.status);
    let derived = ip.status;
    if (statuses.length > 0) {
      if (statuses.every((s) => s === "Completed")) derived = "Completed";
      else if (statuses.some((s) => s === "WIP" || s === "Completed")) derived = "WIP";
      else derived = "New";
    }
    return { ...ip, derivedStatus: derived };
  });
  const total = inProcesses.reduce((n, ip) => n + ip.routingProcesses.length, 0);
  const done = inProcesses.reduce((n, ip) => n + ip.routingProcesses.filter((r) => r.status === "Completed").length, 0);

  return (
    <QcShell wo={wo} active="routing">
      {total > 0 && (
        <p className="px-1 text-right text-xs text-slate-500">
          <span className="font-semibold tabular-nums text-slate-800">{done}</span> of{" "}
          <span className="font-semibold tabular-nums text-slate-800">{total}</span> routing steps completed
          {done < total && <span className="text-amber-700"> · final QC needs every step Completed</span>}
        </p>
      )}

      {inProcesses.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <EmptyState icon={Layers} tone="slate" title="No in-process steps defined" />
        </div>
      ) : (
        <div className="space-y-4">
          {inProcesses.map((ip) => {
            const steps = ip.routingProcesses.length;
            const stepsDone = ip.routingProcesses.filter((r) => r.status === "Completed").length;
            return (
              <section key={ip.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <header className="flex items-start gap-2.5 border-b border-slate-100 px-4 py-2.5">
                  <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 px-1.5 text-[12px] font-semibold tabular-nums text-indigo-700 ring-1 ring-inset ring-indigo-600/15">
                    {ip.sn}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="truncate text-[13px] font-semibold leading-tight text-slate-800">{ip.description}</h2>
                      <StatusBadge status={ip.derivedStatus} tone={STEP_TONE[ip.derivedStatus] ?? "slate"} />
                      {ip.allFlag && <Badge tone="sky">All</Badge>}
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
                          <GitBranch size={11} /> {stepsDone}/{steps} steps done
                        </span>
                      )}
                    </div>
                    {ip.remark && <p className="mt-1 text-xs text-slate-600">{ip.remark}</p>}
                  </div>
                </header>

                {steps === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-400">No routing processes yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          <th className="w-10 py-2 pl-4 pr-2 font-medium">SN</th>
                          <th className="px-3 py-2 font-medium">Main · Routing Process</th>
                          <th className="px-3 py-2 font-medium">Assigned</th>
                          <th className="px-3 py-2 font-medium">Target</th>
                          <th className="px-3 py-2 text-center font-medium">Subcon recv.</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ip.routingProcesses.map((rp) => (
                          <tr key={rp.id} className="align-top hover:bg-slate-50/60">
                            <td className="py-2 pl-4 pr-2">
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1 text-[11px] font-semibold tabular-nums text-slate-600">
                                {rp.sequence}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium text-slate-800">{rp.routingProcess?.routingProcess ?? "—"}</p>
                              <p className="text-[11px] text-slate-400">{rp.mainProcess?.process ?? "—"}</p>
                            </td>
                            <td className="px-3 py-2 text-slate-600">{rp.assignedEmployee?.name ?? <span className="text-slate-400">Anyone</span>}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{fmtWoDate(rp.targetCompletionDate)}</td>
                            <td className="px-3 py-2 text-center">
                              {rp.fullyReceived ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                  <CheckCircle2 size={12} /> Yes
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <StatusBadge status={rp.status} tone={STEP_TONE[rp.status] ?? "slate"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </QcShell>
  );
}
