"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transitionWorkOrderStatus, updateWorkOrderEditable } from "../actions";
type Uom = { id: string; uomName: string };

type Props = {
  wo: any;
  uoms: Uom[];
};

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Proceed: "bg-blue-100 text-blue-700",
  WIP: "bg-amber-100 text-amber-700",
  "On Hold": "bg-orange-100 text-orange-700",
  "Pending for QC": "bg-purple-100 text-purple-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Void: "bg-rose-100 text-rose-700",
  Cancelled: "bg-rose-100 text-rose-700",
};

const NEXT: Record<string, { label: string; to: string; tone: string }[]> = {
  Draft: [
    { label: "Proceed", to: "Proceed", tone: "bg-blue-600 hover:bg-blue-700 text-white" },
    { label: "Void", to: "Void", tone: "bg-rose-100 text-rose-700 hover:bg-rose-200" },
  ],
  Proceed: [
    { label: "Mark WIP", to: "WIP", tone: "bg-amber-600 hover:bg-amber-700 text-white" },
    { label: "Cancel", to: "Cancelled", tone: "bg-rose-100 text-rose-700 hover:bg-rose-200" },
  ],
  WIP: [
    { label: "Hold", to: "On Hold", tone: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
    { label: "Cancel", to: "Cancelled", tone: "bg-rose-100 text-rose-700 hover:bg-rose-200" },
  ],
  "On Hold": [
    { label: "Resume", to: "WIP", tone: "bg-amber-600 hover:bg-amber-700 text-white" },
    { label: "Cancel", to: "Cancelled", tone: "bg-rose-100 text-rose-700 hover:bg-rose-200" },
  ],
  "Pending for QC": [
    { label: "QC Approve → Complete", to: "Completed", tone: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    { label: "Send back On Hold", to: "On Hold", tone: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
  ],
  Completed: [
    { label: "Revert to WIP", to: "WIP", tone: "bg-amber-600 hover:bg-amber-700 text-white" }
  ],
  Void: [],
  Cancelled: [],
};

export default function WorkOrderHeader({ wo, uoms }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [date, setDate] = useState(() => new Date(wo.date).toISOString().split("T")[0]);
  const [remark, setRemark] = useState<string>(wo.remark ?? "");
  const [labelExpiryDate, setLabelExpiryDate] = useState<string>(
    wo.labelExpiryDate ? new Date(wo.labelExpiryDate).toISOString().split("T")[0] : "",
  );
  const [labelQty, setLabelQty] = useState<string>(wo.labelQty != null ? String(wo.labelQty) : "");
  const [labelUomId, setLabelUomId] = useState<string>(wo.labelUomId ?? "");
  const [uploadUrl, setUploadUrl] = useState<string>(wo.uploadUrl ?? "");

  const editable = !["Void", "Cancelled", "Completed"].includes(wo.status);

  function save() {
    setError("");
    startTransition(async () => {
      const res = await updateWorkOrderEditable(wo.workOrderNo, {
        date,
        remark,
        labelExpiryDate: labelExpiryDate || null,
        labelQty: labelQty || null,
        labelUomId: labelUomId || null,
        uploadUrl: uploadUrl || null,
      });
      if (!res.success) setError(res.error || "Failed to save");
      else router.refresh();
    });
  }

  function transition(to: string) {
    setError("");
    startTransition(async () => {
      const res = await transitionWorkOrderStatus(wo.workOrderNo, to);
      if (!res.success) setError(res.error || "Failed to update status");
      else router.refresh();
    });
  }

  const actions = NEXT[wo.status] ?? [];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-200">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            STATUS_STYLES[wo.status] ?? "bg-slate-100 text-slate-700"
          }`}
        >
          Status: {wo.status}
        </span>
        <div className="flex gap-2 flex-wrap justify-end">
          {actions.map((a) => (
            <button
              key={a.to}
              onClick={() => transition(a.to)}
              disabled={isPending}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 ${a.tone}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* From Sales Order (read-only) */}
      <Section title="From Sales Order">
        <ReadOnly label="Work Order No" value={wo.workOrderNo} />
        <Editable label="Date" required>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!editable}
            className={inputCls}
          />
        </Editable>
        <ReadOnly label="Customer" value={wo.customer?.customerName} />
        <ReadOnly label="Internal Quotation No" value={wo.internalQuotationNo} />
        <ReadOnly label="Customer PO Ref" value={wo.customerPoRef} />
        <ReadOnly label="Project Code" value={wo.projectCode} />
        <ReadOnly label="Delivery Date" value={fmtDate(wo.deliveryDate)} />
        <ReadOnly label="Quantity" value={wo.quantity != null ? String(wo.quantity) : "-"} />
        <ReadOnly label="UOM" value={wo.uom} />
        <ReadOnly label="Amount" value={wo.amount != null ? Number(wo.amount).toFixed(2) : "-"} />
      </Section>

      <div>
        <label className="text-sm font-medium text-slate-700">Job Description</label>
        <div className="mt-1.5 px-3 py-2 border border-slate-100 rounded-lg text-sm bg-slate-50 text-slate-700">
          {wo.jobDescription || "-"}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Remark</label>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          disabled={!editable}
          rows={2}
          className={`mt-1.5 ${inputCls}`}
        />
      </div>

      {/* Label printing — not saved into system per spec */}
      <Section title="Delivery Label (print-only)">
        <Editable label="Label Expiry Date">
          <input
            type="date"
            value={labelExpiryDate}
            onChange={(e) => setLabelExpiryDate(e.target.value)}
            disabled={!editable}
            className={inputCls}
          />
        </Editable>
        <Editable label="Label Qty" required>
          <input
            type="number"
            step="0.01"
            value={labelQty}
            onChange={(e) => setLabelQty(e.target.value)}
            disabled={!editable}
            className={inputCls}
          />
        </Editable>
        <Editable label="Label UOM" required>
          <SearchableSelect
            value={labelUomId}
            onChange={(e) => setLabelUomId(e.target.value)}
            disabled={!editable}
            className={inputCls}
          >
            <option value="">Select UOM</option>
            {uoms.map((u) => (
              <option key={u.id} value={u.id}>
                {u.uomName}
              </option>
            ))}
          </SearchableSelect>
        </Editable>
      </Section>

      <Section title="Quality Control (from QC Approval)">
        <ReadOnly label="QC Acceptance" value={wo.qcAcceptance ?? "N/A"} />
        <ReadOnly label="QC By" value={wo.qcBy?.name ?? "-"} />
        <ReadOnly label="QC Date" value={fmtDate(wo.qcDate)} />
      </Section>

      <div>
        <label className="text-sm font-medium text-slate-700">Upload File (URL)</label>
        <input
          value={uploadUrl}
          onChange={(e) => setUploadUrl(e.target.value)}
          placeholder="https://..."
          disabled={!editable}
          className={`mt-1.5 ${inputCls}`}
        />
      </div>

      <div className="pt-4 border-t border-slate-200 flex justify-end">
        <button
          onClick={save}
          disabled={!editable || isPending}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium shadow-sm shadow-blue-500/20"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "-";
  // Deterministic dd/MM/yyyy from ISO string to avoid SSR/client locale mismatch.
  const iso = typeof d === "string" ? d : d.toISOString();
  const [y, m, day] = iso.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-500";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-slate-100">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <div className="mt-1 px-3 py-2 border border-slate-100 rounded-lg text-sm bg-slate-50 text-slate-700 min-h-[38px]">
        {value || "-"}
      </div>
    </div>
  );
}

function Editable({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
