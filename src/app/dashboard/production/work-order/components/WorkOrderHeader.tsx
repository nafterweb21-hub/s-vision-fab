"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { customConfirm } from "@/lib/customConfirm";
import { AlertCircle, AlertTriangle, Check, FileText, Loader2, Lock, Save, ShoppingCart, Workflow } from "lucide-react";
import { Card, Field, buttonClass, inputClass, readOnlyClass, textareaClass, type ButtonVariant } from "@/components/form-ui";
import { transitionWorkOrderStatus, updateWorkOrderEditable } from "../actions";
import { fmtWoDate } from "./WorkOrderShell";

type Props = {
  wo: any;
  /** Completed on paper, but some routing steps are still open. */
  openStepsWhileCompleted?: boolean;
};

/** Allowed moves per status (mirrors ALLOWED in ../actions.ts). */
const NEXT: Record<string, { label: string; to: string; variant: ButtonVariant; confirm?: string }[]> = {
  Draft: [
    { label: "Proceed", to: "Proceed", variant: "primary" },
    { label: "Void", to: "Void", variant: "danger", confirm: "Void this work order? This can't be undone." },
  ],
  Proceed: [
    { label: "Mark WIP", to: "WIP", variant: "primary" },
    { label: "Cancel WO", to: "Cancelled", variant: "danger", confirm: "Cancel this work order? This can't be undone." },
  ],
  WIP: [
    { label: "Put On Hold", to: "On Hold", variant: "warn" },
    { label: "Cancel WO", to: "Cancelled", variant: "danger", confirm: "Cancel this work order? This can't be undone." },
  ],
  "On Hold": [
    { label: "Resume (WIP)", to: "WIP", variant: "primary" },
    { label: "Cancel WO", to: "Cancelled", variant: "danger", confirm: "Cancel this work order? This can't be undone." },
  ],
  "Pending for QC": [
    { label: "QC Approve → Complete", to: "Completed", variant: "success" },
    { label: "Send back On Hold", to: "On Hold", variant: "warn" },
  ],
  Completed: [{ label: "Revert to WIP", to: "WIP", variant: "warn", confirm: "Revert this completed work order to WIP?" }],
  Void: [],
  Cancelled: [],
};

/** Main path through the statuses, shown as a stepper. */
const FLOW = ["Draft", "Proceed", "WIP", "Pending for QC", "Completed"] as const;

export default function WorkOrderHeader({ wo, openStepsWhileCompleted }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [date, setDate] = useState(() => new Date(wo.date).toISOString().split("T")[0]);
  const [remark, setRemark] = useState<string>(wo.remark ?? "");
  const [partName, setPartName] = useState<string>(wo.partName ?? "");
  const [uploadUrl, setUploadUrl] = useState<string>(wo.uploadUrl ?? "");
  const [stageQc, setStageQc] = useState<boolean>(wo.stageQc ?? true);

  const editable = !["Void", "Cancelled", "Completed"].includes(wo.status);
  const dirty =
    date !== new Date(wo.date).toISOString().split("T")[0] ||
    remark !== (wo.remark ?? "") ||
    partName !== (wo.partName ?? "") ||
    uploadUrl !== (wo.uploadUrl ?? "") ||
    stageQc !== (wo.stageQc ?? true);

  function save() {
    setError("");
    startTransition(async () => {
      const res = await updateWorkOrderEditable(wo.workOrderNo, {
        date,
        remark,
        partName,
        uploadUrl: uploadUrl || null,
        stageQc,
      });
      if (!res.success) setError(res.error || "Failed to save");
      else router.refresh();
    });
  }

  async function transition(to: string, confirm?: string) {
    if (confirm && !(await customConfirm(confirm))) return;
    setError("");
    setPendingTo(to);
    startTransition(async () => {
      const res = await transitionWorkOrderStatus(wo.workOrderNo, to);
      setPendingTo(null);
      if (!res.success) setError(res.error || "Failed to update status");
      else router.refresh();
    });
  }

  const actions = NEXT[wo.status] ?? [];
  const flowIndex = FLOW.indexOf(wo.status as (typeof FLOW)[number]);
  // On Hold sits between WIP and QC; Void / Cancelled end the flow early.
  const reached = flowIndex >= 0 ? flowIndex : wo.status === "On Hold" ? 2 : wo.status === "Void" ? 0 : wo.status === "Cancelled" ? 1 : -1;
  const offPath = flowIndex < 0;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Workflow */}
      <Card
        icon={Workflow}
        tone="indigo"
        title="Workflow"
        description="Draft → Proceed → WIP → Pending for QC → Completed"
        actions={
          actions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {actions.map((a) => (
                <button
                  key={a.to}
                  type="button"
                  onClick={() => transition(a.to, a.confirm)}
                  disabled={isPending}
                  className={buttonClass(a.variant, "sm")}
                >
                  {pendingTo === a.to && <Loader2 size={12} className="animate-spin" />}
                  {a.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Lock size={12} /> No further moves
            </span>
          )
        }
      >
        <ol className="grid grid-cols-5 gap-1">
          {FLOW.map((s, i) => {
            const done = i < reached || (i === reached && s === "Completed");
            const current = i === reached && !offPath;
            return (
              <li key={s} className="min-w-0">
                <div
                  className={`h-1.5 rounded-full ${
                    done ? "bg-emerald-500" : current ? "bg-indigo-500" : i === reached && offPath ? (wo.status === "On Hold" ? "bg-amber-400" : "bg-rose-400") : "bg-slate-200"
                  }`}
                />
                <p className={`mt-1 flex items-center gap-1 truncate text-[11px] ${current ? "font-semibold text-indigo-700" : done ? "text-emerald-700" : "text-slate-400"}`}>
                  {done && <Check size={11} className="shrink-0" />}
                  {s}
                </p>
              </li>
            );
          })}
        </ol>
        {offPath && (
          <p className="mt-2 text-[11px] text-slate-500">
            Currently <strong className="font-semibold text-slate-700">{wo.status}</strong>
            {wo.status === "On Hold" ? ": workers may scan out but not in." : "."}
          </p>
        )}
        {openStepsWhileCompleted && (
          <p className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[12px] text-amber-800">
            <AlertTriangle size={13} className="shrink-0" />
            Marked Completed, but some routing processes are not Completed yet.
          </p>
        )}
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        {/* From Sales Order (read-only) */}
        <Card icon={ShoppingCart} tone="sky" title="From Sales Order" description="Fixed by the sales order batch — quantity can't change" className="h-full">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-2">
            <Info label="Work Order No" value={wo.workOrderNo} mono />
            <Info label="Customer" value={wo.customer?.customerName} />
            <Info label="Internal Quotation No" value={wo.internalQuotationNo} mono />
            <Info label="Customer PO Ref" value={wo.customerPoRef} mono />
            <Info label="Project Code" value={wo.projectCode} mono />
            <Info label="Delivery Date" value={fmtWoDate(wo.deliveryDate)} />
            <Info label="Quantity" value={wo.quantity != null ? `${Number(wo.quantity)} ${wo.uom || ""}` : null} />
            <Info label="Amount" value={wo.amount != null ? Number(wo.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null} />
            <Info label="Job Description" value={wo.jobDescription} wide />
          </dl>
        </Card>

        {/* Editable */}
        <Card
          icon={FileText}
          tone="indigo"
          title="Work order details"
          description={editable ? "Editable until the work order is Completed" : `Read-only while ${wo.status}`}
          className="h-full"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field label="Date" required help={editable ? "Forward dates only" : undefined}>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!editable} className={inputClass} />
              </Field>
              <Field label="Part Name">
                <input type="text" value={partName} onChange={(e) => setPartName(e.target.value)} disabled={!editable} className={inputClass} />
              </Field>
            </div>
            <Field label="Remark">
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} disabled={!editable} rows={2} className={textareaClass} />
            </Field>
            <Field label="Upload (link)" help="Files can also be attached on the Files tab">
              {editable ? (
                <input value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} placeholder="https://..." className={inputClass} />
              ) : uploadUrl ? (
                <a href={uploadUrl} target="_blank" rel="noopener noreferrer" className={`${readOnlyClass} flex items-center text-indigo-600 hover:underline`}>
                  {uploadUrl}
                </a>
              ) : (
                <div className={`${readOnlyClass} flex items-center`}>—</div>
              )}
            </Field>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-800">QC at every stage</p>
                <p className="text-[11px] text-slate-500">
                  {stageQc
                    ? "On: QC approves each stage before the next can start. Final QC still happens at the end."
                    : "Off: stages flow one after another; QC checks once at the end."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={stageQc}
                aria-label="QC at every stage"
                onClick={() => setStageQc((v) => !v)}
                disabled={!editable}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${stageQc ? "bg-emerald-600" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${stageQc ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>

            {editable && (
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                {dirty && <span className="text-[11px] text-amber-700">Unsaved changes</span>}
                <button type="button" onClick={save} disabled={isPending || !dirty} className={buttonClass("primary", "md")}>
                  {isPending && !pendingTo ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {isPending && !pendingTo ? "Saving…" : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value, mono, wide }: { label: string; value?: string | null; mono?: boolean; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className={`mt-0.5 break-words text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}
