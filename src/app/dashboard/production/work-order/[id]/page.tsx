import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Printer, ShieldCheck, RotateCcw } from "lucide-react";
import { Card, EmptyState, StatusBadge, buttonClass, type Tone } from "@/components/form-ui";
import WorkOrderHeader from "../components/WorkOrderHeader";
import WorkOrderShell, { fmtWoDate } from "../components/WorkOrderShell";
import { getUomList } from "../actions";
import DeliveryLabelModal from "./DeliveryLabelModal";

const QC_TONE: Record<string, Tone> = { Approved: "emerald", Rejected: "rose" };

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { workOrderNo: id },
    include: {
      customer: true,
      labelUom: true,
      qcBy: true,
      reworks: {
        orderBy: { createdAt: "desc" },
        include: { rejectedBy: true, reInspectedBy: true },
      },
      inProcesses: { include: { routingProcesses: true } },
    },
  });

  if (!workOrder) notFound();

  const uoms = await getUomList();

  // The real status drives the workflow buttons. Flag (rather than hide) a WO that is Completed
  // while some routing steps are still open, so its actions still match what the server allows.
  const openStepsWhileCompleted =
    workOrder.status === "Completed" &&
    workOrder.inProcesses.length > 0 &&
    !workOrder.inProcesses.every((ip) => ip.routingProcesses.length > 0 && ip.routingProcesses.every((rp) => rp.status === "Completed"));

  // Decimals / Dates → plain JSON for the client components.
  const wo = JSON.parse(JSON.stringify(workOrder));
  const qty = Number(workOrder.quantity || 0);
  const qcTiles: { label: string; value: number; tone: string }[] = [
    { label: "Accepted", value: Number(workOrder.acceptedQty || 0), tone: "text-emerald-700" },
    { label: "Rejected", value: Number(workOrder.rejectedQty || 0), tone: "text-rose-700" },
    { label: "Reworked", value: Number(workOrder.reworkedQty || 0), tone: "text-amber-700" },
    { label: "Final approved", value: Number(workOrder.finalApprovedQty || 0), tone: "text-indigo-700" },
  ];

  return (
    <WorkOrderShell
      wo={{
        workOrderNo: workOrder.workOrderNo,
        status: workOrder.status,
        customerName: workOrder.customer?.customerName,
        projectCode: workOrder.projectCode,
        deliveryDate: wo.deliveryDate,
        quantity: wo.quantity,
        uom: workOrder.uom,
      }}
      active="details"
      actions={
        <>
          <a href={`/print/work-order/${encodeURIComponent(id)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
            <Printer size={14} /> Print
          </a>
          <DeliveryLabelModal
            workOrderNo={workOrder.workOrderNo}
            defaultQty={workOrder.quantity?.toString() || "1"}
            defaultUom={workOrder.labelUom?.uomName || workOrder.uom || ""}
            uoms={uoms}
          />
        </>
      }
    >
      <WorkOrderHeader wo={wo} openStepsWhileCompleted={openStepsWhileCompleted} />

      <Card
        icon={ShieldCheck}
        tone={QC_TONE[workOrder.qcAcceptance ?? ""] ?? "violet"}
        title="Quality control & rework"
        description="Set by QC Approval; rework tasks come from QC rejections"
        actions={
          workOrder.qcAcceptance ? (
            <StatusBadge status={workOrder.qcAcceptance} tone={QC_TONE[workOrder.qcAcceptance] ?? "slate"} />
          ) : (
            <span className="text-xs text-slate-400">Not inspected yet</span>
          )
        }
        bodyClassName="p-0"
      >
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100 sm:grid-cols-4 sm:divide-y-0">
          {qcTiles.map((t) => (
            <div key={t.label} className="px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t.label}</p>
              <p className={`text-xl font-semibold tabular-nums ${t.value ? t.tone : "text-slate-300"}`}>
                {t.value}
                <span className="ml-1 text-xs font-normal text-slate-400">/ {qty}</span>
              </p>
            </div>
          ))}
        </div>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-medium text-slate-500">QC Acceptance</dt>
            <dd className="text-slate-800">{workOrder.qcAcceptance ?? "N/A"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-slate-500">QC By</dt>
            <dd className="text-slate-800">{workOrder.qcBy?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-slate-500">QC Date</dt>
            <dd className="text-slate-800">{fmtWoDate(wo.qcDate)}</dd>
          </div>
        </dl>

        <div className="px-4 pb-1 pt-3">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            <RotateCcw size={12} /> Rework history
          </p>
        </div>
        {wo.reworks.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState boxed icon={RotateCcw} tone="slate" title="No rework tasks" description="Rework tasks are created when QC rejects quantity on this work order." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-2 pl-4 pr-3 font-medium">Rework Task</th>
                  <th className="px-3 py-2 text-right font-medium">Rejected</th>
                  <th className="px-3 py-2 text-right font-medium">Reworked</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium">Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wo.reworks.map((rwk: any) => (
                  <tr key={rwk.id} className="align-top hover:bg-slate-50/60">
                    <td className="whitespace-nowrap py-2 pl-4 pr-3 font-mono text-xs font-semibold text-slate-800">{rwk.reworkNo}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-rose-700">{Number(rwk.rejectedQty)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-700">{Number(rwk.reworkedQty)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={rwk.status} />
                    </td>
                    <td className="max-w-[260px] px-3 py-2">
                      <p className="truncate text-slate-600" title={rwk.rejectionReason || ""}>{rwk.rejectionReason || "—"}</p>
                      {rwk.rejectedBy?.name && <p className="text-[11px] text-slate-400">by {rwk.rejectedBy.name}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                      <p>Rejected {fmtWoDate(rwk.rejectedAt)}</p>
                      {rwk.reInspectedAt && (
                        <p>
                          Re-inspected {fmtWoDate(rwk.reInspectedAt)}
                          {rwk.reInspectedBy?.name ? ` · ${rwk.reInspectedBy.name}` : ""}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </WorkOrderShell>
  );
}
