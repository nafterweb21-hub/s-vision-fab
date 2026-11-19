import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ShieldCheck, ShoppingCart, FileText } from "lucide-react";
import { Card } from "@/components/form-ui";
import { fmtWoDate } from "@/app/dashboard/production/work-order/components/WorkOrderShell";
import { QcShell, QcBadge } from "../qc-shell";

export default async function QcApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const wo = await prisma.workOrder.findUnique({
    where: { workOrderNo: id },
    include: { customer: true, qcBy: true },
  });
  if (!wo) notFound();

  const qty = Number(wo.quantity || 0);
  const tiles = [
    { label: "Accepted", value: Number(wo.acceptedQty || 0), tone: "text-emerald-700" },
    { label: "Rejected", value: Number(wo.rejectedQty || 0), tone: "text-rose-700" },
    { label: "Reworked", value: Number(wo.reworkedQty || 0), tone: "text-amber-700" },
    { label: "Final approved", value: Number(wo.finalApprovedQty || 0), tone: "text-indigo-700" },
  ];

  return (
    <QcShell wo={wo} active="details">
      <Card
        icon={ShieldCheck}
        tone={wo.qcAcceptance === "Approved" ? "emerald" : wo.qcAcceptance === "Rejected" ? "rose" : "violet"}
        title="Quality control"
        description="Result recorded by the QC Terminal"
        actions={<QcBadge value={wo.qcAcceptance} />}
        bodyClassName="p-0"
      >
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100 sm:grid-cols-4 sm:divide-y-0">
          {tiles.map((t) => (
            <div key={t.label} className="px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t.label}</p>
              <p className={`text-xl font-semibold tabular-nums ${t.value ? t.tone : "text-slate-300"}`}>
                {t.value}
                <span className="ml-1 text-xs font-normal text-slate-400">/ {qty}</span>
              </p>
            </div>
          ))}
        </div>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 py-3 text-[13px] sm:grid-cols-3">
          <Info label="QC Acceptance" value={wo.qcAcceptance ?? "Pending"} />
          <Info label="QC By" value={wo.qcBy?.name} />
          <Info label="QC Date" value={fmtWoDate(wo.qcDate)} />
        </dl>
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <Card icon={ShoppingCart} tone="sky" title="From Sales Order" className="h-full">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-2">
            <Info label="Work Order No" value={wo.workOrderNo} mono />
            <Info label="Date" value={fmtWoDate(wo.date)} />
            <Info label="Customer" value={wo.customer?.customerName} />
            <Info label="Internal Quotation No" value={wo.internalQuotationNo} mono />
            <Info label="Customer PO Ref" value={wo.customerPoRef} mono />
            <Info label="Project Code" value={wo.projectCode} mono />
            <Info label="Delivery Date" value={fmtWoDate(wo.deliveryDate)} />
            <Info label="Quantity" value={wo.quantity != null ? `${qty} ${wo.uom || ""}` : null} />
            <Info
              label="Amount"
              value={wo.amount != null ? Number(wo.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null}
            />
          </dl>
        </Card>

        <Card icon={FileText} tone="indigo" title="Work order details" className="h-full">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-2">
            <Info label="Part Name" value={wo.partName} />
            <Info label="QC at every stage" value={wo.stageQc ? "On" : "Off"} />
            <Info label="Job Description" value={wo.jobDescription} wide />
            <Info label="Remark" value={wo.remark} wide pre />
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-[11px] font-medium text-slate-500">Upload</dt>
              <dd className="mt-0.5 truncate">
                {wo.uploadUrl ? (
                  <a href={wo.uploadUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                    {wo.uploadUrl}
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </QcShell>
  );
}

function Info({ label, value, mono, wide, pre }: { label: string; value?: string | null; mono?: boolean; wide?: boolean; pre?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className={`mt-0.5 break-words text-slate-800 ${mono ? "font-mono text-xs" : ""} ${pre ? "whitespace-pre-wrap" : ""}`}>
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}
