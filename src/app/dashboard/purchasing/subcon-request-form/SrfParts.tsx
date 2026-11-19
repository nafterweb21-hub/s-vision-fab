"use client";

import React from "react";
import { ClipboardList, FileText } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Card, Field, inputClass, readOnlyClass, selectTriggerClass, textareaClass, type Tone } from "@/components/form-ui";

// Pieces shared by the New and Detail Subcon Request Form screens.

/** Submitted is the final state of an SRF, so it reads as done (green). */
export const SRF_TONE: Record<string, Tone> = { Draft: "amber", Submitted: "emerald", Void: "rose" };

/** Receive status against Subcon Return Tracking. */
export const SRF_RECEIVE_TONE: Record<string, Tone> = {
  "N/A": "slate",
  "Partially Received": "sky",
  "Fully Received": "emerald",
};

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

const fmtNum = (v: unknown, digits = 2) =>
  v == null || v === "" ? "—" : Number(v).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: 4 });

/** The PO-Subcon line the form is raised against. Everything here is imported and read-only. */
export function PoLineCard({ item }: { item: any }) {
  const po = item?.purchaseOrder ?? {};
  const rows: { label: string; value: React.ReactNode; mono?: boolean; wide?: boolean }[] = [
    { label: "Company", value: po.company?.companyName },
    { label: "Supplier", value: po.supplier?.supplierName },
    { label: "PO No", value: po.poNo, mono: true },
    { label: "PO Date", value: fmtDate(po.date) },
    { label: "Work Order No", value: po.workOrderNo, mono: true },
    { label: "In-Process Description", value: item?.woRoutingProcess?.inProcess?.description },
    { label: "Main Process", value: item?.masterMainProcess?.process },
    { label: "Routing Process", value: item?.masterRoutingProcess?.routingProcess },
    { label: "Part Description", value: item?.description, wide: true },
    { label: "PO Qty", value: item?.quantity != null ? `${fmtNum(item.quantity, 0)} ${item?.poUom?.uomName ?? ""}`.trim() : null },
    { label: "Unit Price", value: item?.unitPrice != null ? `${po.currency?.code ?? ""} ${fmtNum(item.unitPrice, 4)}`.trim() : null },
    { label: "Amount", value: item?.amount != null ? `${po.currency?.code ?? ""} ${fmtNum(item.amount)}`.trim() : null },
    { label: "Hardness", value: item?.hardness },
    { label: "Thickness", value: item?.thickness },
  ];
  return (
    <Card icon={ClipboardList} tone="sky" title="PO-Subcon line" description="Imported from the purchase order — read-only" className="h-full">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className={`min-w-0 ${r.wide ? "sm:col-span-2" : ""}`}>
            <dt className="text-[11px] font-medium text-slate-500">{r.label}</dt>
            <dd className={`mt-0.5 break-words text-slate-800 ${r.mono ? "font-mono text-xs" : ""}`}>
              {r.value || <span className="text-slate-400">—</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export type SrfFieldValues = {
  srfDate: string;
  outsourcedById: string;
  dateRequired: string;
  receivedById: string;
  quantity: number;
  remark: string;
};

/** The fields the user fills in. */
export function SrfFieldsCard({
  values,
  onChange,
  readOnly,
  srfNo,
  employees,
  contactPersons,
  available,
  uom,
  readOnlyNames,
}: {
  values: SrfFieldValues;
  onChange: (patch: Partial<SrfFieldValues>) => void;
  readOnly?: boolean;
  srfNo?: string;
  employees: { id: string; name: string }[];
  contactPersons: { id: string; contactPersonName: string }[];
  /** Most this form may take (PO line qty less other live forms). */
  available: number | null;
  uom?: string;
  /** Names to show when read-only (the selects aren't rendered then). */
  readOnlyNames?: { outsourcedBy?: string; receivedBy?: string };
}) {
  const over = available != null && values.quantity > available;
  return (
    <Card icon={FileText} tone="indigo" title="Request details" description="Who hands the items over, when they're needed and how many" className="h-full">
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <Field label="SRF No">
          <div className={`${readOnlyClass} flex items-center font-mono`}>{srfNo || "Assigned on save"}</div>
        </Field>

        <Field label="SRF Date" required>
          <input
            type="date"
            value={values.srfDate}
            onChange={(e) => onChange({ srfDate: e.target.value })}
            disabled={readOnly}
            className={inputClass}
          />
        </Field>

        <Field label="Outsourced By" required help={readOnly ? undefined : "Defaults to the PO purchaser"}>
          {readOnly ? (
            <div className={`${readOnlyClass} flex items-center`}>{readOnlyNames?.outsourcedBy || "—"}</div>
          ) : (
            <SearchableSelect
              value={values.outsourcedById}
              onChange={(e) => onChange({ outsourcedById: e.target.value })}
              className={selectTriggerClass}
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </SearchableSelect>
          )}
        </Field>

        <Field label="Date Required" required help={readOnly ? undefined : "Defaults to the PO delivery date"}>
          <input
            type="date"
            value={values.dateRequired}
            onChange={(e) => onChange({ dateRequired: e.target.value })}
            disabled={readOnly}
            className={inputClass}
          />
        </Field>

        <Field label="Received By" help={readOnly ? undefined : "Supplier contact person"}>
          {readOnly ? (
            <div className={`${readOnlyClass} flex items-center`}>{readOnlyNames?.receivedBy || "—"}</div>
          ) : (
            <SearchableSelect
              value={values.receivedById}
              onChange={(e) => onChange({ receivedById: e.target.value })}
              className={selectTriggerClass}
            >
              <option value="">Select contact person</option>
              {contactPersons.map((cp) => (
                <option key={cp.id} value={cp.id}>{cp.contactPersonName}</option>
              ))}
            </SearchableSelect>
          )}
        </Field>

        <Field
          label={uom ? `Quantity (${uom})` : "Quantity"}
          required
          error={over ? `Only ${available} available on this PO line.` : undefined}
          help={!readOnly && available != null ? `Up to ${available} — PO line quantity not yet on other forms` : undefined}
        >
          <input
            type="number"
            min={1}
            step={1}
            max={available ?? undefined}
            value={values.quantity}
            onChange={(e) => onChange({ quantity: Number(e.target.value) })}
            disabled={readOnly}
            aria-invalid={over}
            className={`${inputClass} text-right tabular-nums ${over ? "border-rose-400 bg-rose-50" : ""}`}
          />
        </Field>

        <Field label="Remark" className="sm:col-span-2">
          <textarea
            value={values.remark}
            onChange={(e) => onChange({ remark: e.target.value })}
            rows={3}
            disabled={readOnly}
            className={textareaClass}
          />
        </Field>
      </div>
    </Card>
  );
}

/** Client-side check matching the server rule (whole number, 1..available). */
export function srfQuantityError(quantity: number, available: number | null): string | null {
  if (!Number.isInteger(quantity) || quantity <= 0) return "Quantity must be a whole number greater than 0.";
  if (available != null && quantity > available) return `Quantity can't exceed ${available}.`;
  return null;
}
