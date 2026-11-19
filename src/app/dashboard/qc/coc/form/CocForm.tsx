"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileCheck,
  Flame,
  Gauge,
  Loader2,
  Lock,
  PaintBucket,
  Printer,
  Save,
  Truck,
  Wrench,
} from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";
import { Card, Field, MetaChip, Segmented, StatusBadge, buttonClass, inputClass, readOnlyClass, selectTriggerClass } from "@/components/form-ui";
import { COC_TYPES, type CocType } from "@/lib/coc-types";
import { COC_STATUS_TONE } from "../coc-status";

type Person = { id: string; name: string; code: string; idNo: string | null; routings: string[] };
type Context = {
  wo: { description: string | null; partName: string | null; customerPoRef: string | null; quantity: number | null; uom: string | null };
  doItem: { quantity: number; uomId: string | null; uomName: string | null } | null;
  soPartNo: string | null;
  welders: Person[];
  painters: Person[];
  weldingMachines: { id: string; machineNo: string; brand: string | null }[];
  weldingProcesses: string[];
  topCoats: { employeeId: string; dft: string | null; batchNo: string | null }[];
};
type Meta = {
  employees: { id: string; name: string; code: string }[];
  machines: { id: string; machineNo: string; brand: string | null; machineCategory: string | null }[];
  uoms: { id: string; uomName: string }[];
  paintingMethods: { id: string; method: string }[];
  customers: { id: string; customerName: string }[];
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const toYmd = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

const EMPTY = {
  date: today(),
  type: "" as CocType | "",
  customerId: "",
  deliveryOrderId: "",
  workOrderNo: "",
  drawingNo: "",
  cocQuantity: "" as string | number,
  cocUomId: "",
  sanNo: "",
  welderId: "",
  weldingProcess: "",
  weldingMachineId: "",
  partName: "",
  partNumber: "",
  paintingSanNo: "",
  painterId: "",
  paintingMethodId: "",
  paintingSpecification: "",
  paintThicknessSpecification: "",
  measuredTotalPaintThickness: "",
  paintBatchNo: "",
  inspectionEquipment: "",
};
type FormState = typeof EMPTY;

const TYPE_ICON = { Final: BadgeCheck, Pressure: Gauge, "Spray Painting": PaintBucket, Welding: Flame } as const;

export default function CocForm({ id }: { id: string | null }) {
  const router = useRouter();
  const isEdit = !!id;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saved, setSaved] = useState<string>(JSON.stringify(EMPTY));
  const [record, setRecord] = useState<any>(null);
  const [meta, setMeta] = useState<Meta>({ employees: [], machines: [], uoms: [], paintingMethods: [], customers: [] });
  const [customerDOs, setCustomerDOs] = useState<any[]>([]);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [pending, setPending] = useState<"save" | "check" | "approve" | null>(null);
  const [error, setError] = useState("");
  /** Set when the user picks a WO, so the next context load fills qty / UOM / part name defaults. */
  const applyDefaults = useRef(false);
  /** Set when the user picks a painter, WO or the Spray Painting type, so top-coat readings get prefilled once. */
  const prefillTopCoat = useRef(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const loadRecord = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/qc/coc/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the certificate.");
      const next: FormState = { ...EMPTY };
      for (const k of Object.keys(EMPTY) as (keyof FormState)[]) {
        const v = data[k];
        (next as any)[k] = v == null ? "" : k === "date" ? toYmd(v) : k === "cocQuantity" ? Number(v) : v;
      }
      setForm(next);
      setSaved(JSON.stringify(next));
      setRecord(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch("/api/qc/coc/form-data")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMeta(d))
      .catch(() => setError("Could not load dropdown options."));
    loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    if (!form.customerId) {
      setCustomerDOs([]);
      return;
    }
    let live = true;
    fetch(`/api/sales/delivery-order/customer/${form.customerId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => live && setCustomerDOs(Array.isArray(d) ? d : []))
      .catch(() => live && setCustomerDOs([]));
    return () => {
      live = false;
    };
  }, [form.customerId]);

  useEffect(() => {
    if (!form.deliveryOrderId || !form.workOrderNo) {
      setCtx(null);
      return;
    }
    let live = true;
    setCtxLoading(true);
    fetch(`/api/qc/coc/context?deliveryOrderId=${encodeURIComponent(form.deliveryOrderId)}&workOrderNo=${encodeURIComponent(form.workOrderNo)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Context | null) => {
        if (!live) return;
        setCtx(d);
        if (d && applyDefaults.current) {
          applyDefaults.current = false;
          setForm((f) => {
            const uomId = d.doItem?.uomId || meta.uoms.find((u) => u.uomName.toLowerCase() === (d.wo.uom || "").toLowerCase())?.id || f.cocUomId;
            return {
              ...f,
              cocQuantity: d.doItem ? d.doItem.quantity : f.cocQuantity,
              cocUomId: uomId,
              partName: f.partName || d.wo.partName || "",
            };
          });
        }
      })
      .finally(() => live && setCtxLoading(false));
    return () => {
      live = false;
    };
  }, [form.deliveryOrderId, form.workOrderNo, meta.uoms]);

  const status: string = record?.status ?? "Draft";
  const doLocked = !!record && record.deliveryOrder?.status !== "Draft";
  const readOnly = status !== "Draft" || doLocked;
  const dirty = JSON.stringify(form) !== saved;
  const type = form.type;

  // DO options: Draft + COC Required DOs for the customer, plus the saved DO so an existing COC always shows it.
  const doOptions = useMemo(() => {
    const list = [...customerDOs];
    if (record?.deliveryOrderId && !list.some((d) => d.id === record.deliveryOrderId) && form.customerId === record.customerId) {
      list.unshift({ id: record.deliveryOrderId, doNo: record.deliveryOrder?.doNo, items: [{ workOrderNo: record.workOrderNo, workOrder: { workOrderNo: record.workOrderNo } }] });
    }
    return list;
  }, [customerDOs, record, form.customerId]);
  const selectedDO = doOptions.find((d) => d.id === form.deliveryOrderId);
  const woOptions: string[] = useMemo(() => {
    const seen = new Set<string>();
    for (const it of selectedDO?.items ?? []) if (it.workOrderNo) seen.add(it.workOrderNo);
    return [...seen];
  }, [selectedDO]);

  const customerName = meta.customers.find((c) => c.id === form.customerId)?.customerName ?? record?.customer?.customerName ?? "";

  // Scanning Terminal sourced people; fall back to all employees when nothing was recorded on this WO.
  const welderList: Person[] = ctx?.welders.length ? ctx.welders : meta.employees.map((e) => ({ ...e, idNo: null, routings: [] }));
  const painterList: Person[] = ctx?.painters.length ? ctx.painters : meta.employees.map((e) => ({ ...e, idNo: null, routings: [] }));
  const machineList = ctx?.weldingMachines.length ? ctx.weldingMachines : meta.machines.filter((m) => m.machineCategory === "Welding Machine");
  const idNoFor = (list: Person[], personId: string, savedPerson?: { aadharNumber?: string | null } | null, savedId?: string) =>
    list.find((p) => p.id === personId)?.idNo ?? (personId && personId === savedId ? savedPerson?.aadharNumber : null) ?? "";

  // Prefill paint thickness / batch from the WO's Spray Paint top coat (prefer the chosen painter's sheet).
  useEffect(() => {
    if (!prefillTopCoat.current || readOnly || type !== "Spray Painting" || !ctx?.topCoats.length) return;
    prefillTopCoat.current = false;
    const tc = ctx.topCoats.find((t) => t.employeeId === form.painterId) ?? ctx.topCoats[0];
    setForm((f) => ({
      ...f,
      measuredTotalPaintThickness: f.measuredTotalPaintThickness || tc.dft || "",
      paintBatchNo: f.paintBatchNo || tc.batchNo || "",
    }));
  }, [ctx, form.painterId, type, readOnly]);

  const drawingNo = type === "Final" ? (ctx ? ctx.soPartNo ?? "" : form.drawingNo) : form.drawingNo;

  async function save() {
    setError("");
    const missing = [
      !type && "Type",
      !form.date && "Date",
      !form.customerId && "Customer",
      !form.deliveryOrderId && "DO No",
      !form.workOrderNo && "WO No",
      !(Number(form.cocQuantity) > 0) && "COC Quantity",
      !form.cocUomId && "COC UOM",
    ].filter(Boolean);
    if (missing.length) {
      setError(`Fill in: ${missing.join(", ")}.`);
      return;
    }
    setPending("save");
    try {
      const res = await fetch(isEdit ? `/api/qc/coc/${id}` : "/api/qc/coc", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, drawingNo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the certificate.");
      router.push(
        `/dashboard/saved?module=Certificate Of Conformity&id=${data.cocNo || data.id || ""}&viewUrl=/dashboard/qc/coc/form?id=${data.id}&backUrl=/dashboard/qc/coc`,
      );
    } catch (e: any) {
      setError(e.message);
      setPending(null);
    }
  }

  async function transition(kind: "check" | "approve") {
    const msg =
      kind === "check"
        ? `Mark ${record?.cocNo} as checked? It moves to Require Approval and can no longer be edited.`
        : `Approve ${record?.cocNo}? This is recorded under your name.`;
    if (!(await customConfirm(msg))) return;
    setError("");
    setPending(kind);
    try {
      const res = await fetch(`/api/qc/coc/${id}/${kind}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Could not ${kind} the certificate.`);
      await loadRecord();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPending(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin text-indigo-600" /> Loading certificate…
      </div>
    );
  }
  if (isEdit && !record) {
    return (
      <div className="space-y-3">
        <Link href="/dashboard/qc/coc" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={12} /> Certificate Of Conformity
        </Link>
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} /> {error || "Certificate not found."}
        </div>
      </div>
    );
  }

  const busy = pending !== null;
  const text = (k: keyof FormState, placeholder?: string) => (
    <input type="text" value={form[k] as string} onChange={(e) => set(k, e.target.value as any)} disabled={readOnly} placeholder={placeholder} className={inputClass} />
  );
  const ro = (v: React.ReactNode, mono = false) => (
    <div className={`${readOnlyClass} flex items-center ${mono ? "font-mono text-xs" : ""}`} title={typeof v === "string" ? v : undefined}>
      <span className="truncate">{v === "" || v == null ? "—" : v}</span>
    </div>
  );
  const personSelect = (value: string, onChange: (v: string) => void, list: Person[], placeholder: string) => (
    <SearchableSelect value={value} onChange={(e) => onChange(e.target.value)} disabled={readOnly} className={selectTriggerClass}>
      <option value="">{placeholder}</option>
      {list.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.code ? ` (${p.code})` : ""}
          {p.routings.length ? ` · ${p.routings.join(", ")}` : ""}
        </option>
      ))}
    </SearchableSelect>
  );

  return (
    <div className="w-full space-y-4">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md print:hidden">
        <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/qc/coc" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Certificate Of Conformity
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {isEdit ? (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">COC</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">{record.cocNo}</span>
                </h1>
              ) : (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">New Certificate Of Conformity</h1>
              )}
              <StatusBadge status={status} tone={COC_STATUS_TONE[status] ?? "slate"} size="md" label={isEdit ? status : "New · Draft"} />
              {dirty && !readOnly && <span className="text-[11px] font-medium text-amber-700">Unsaved changes</span>}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Customer">{customerName || "No customer yet"}</MetaChip>
              <MetaChip icon={Truck} label="DO" title="Delivery order">{selectedDO?.doNo || record?.deliveryOrder?.doNo || "Not selected"}</MetaChip>
              <MetaChip icon={Wrench} label="WO" title="Work order">{form.workOrderNo || "Not selected"}</MetaChip>
              <MetaChip icon={CalendarDays} label="COC" title="COC date">{form.date || "—"}</MetaChip>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => router.push("/dashboard/qc/coc")} className={buttonClass("ghost", "md")}>
              Back
            </button>
            {isEdit && (
              <a href={`/print/coc/${id}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
                <Printer size={14} /> Print
              </a>
            )}
            {isEdit && status === "Draft" && !doLocked && (
              <button
                type="button"
                onClick={() => transition("check")}
                disabled={busy || dirty}
                title={dirty ? "Save your changes before checking" : "Record the check and send for approval"}
                className={buttonClass("secondary", "md")}
              >
                {pending === "check" ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />} Mark Checked
              </button>
            )}
            {isEdit && status === "Require Approval" && !doLocked && (
              <button type="button" onClick={() => transition("approve")} disabled={busy} className={buttonClass("primary", "md")}>
                {pending === "approve" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve COC
              </button>
            )}
            {readOnly ? (
              status !== "Require Approval" || doLocked ? (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                  <Lock size={13} /> View only
                </span>
              ) : null
            ) : (
              <button type="button" onClick={save} disabled={busy} className={buttonClass(isEdit ? "secondary" : "primary", "md")}>
                {pending === "save" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {pending === "save" ? "Saving…" : isEdit ? "Save" : "Create COC"}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] text-rose-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {doLocked && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-600">
          <Lock size={15} className="mt-0.5 shrink-0" /> Delivery order {record.deliveryOrder?.doNo} is {record.deliveryOrder?.status}; this COC can no longer be changed, checked or approved.
        </div>
      )}

      {/* Type */}
      <Card icon={FileCheck} tone="emerald" title="Certificate type" description="Drives the printout. Pressure and Final share one layout.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Type" required className="min-w-0">
            <Segmented<CocType>
              options={COC_TYPES.map((t) => ({ value: t, label: t, icon: TYPE_ICON[t] }))}
              value={(type || "") as CocType}
              onChange={(v) => { if (v === "Spray Painting") prefillTopCoat.current = true; set("type", v); }}
              variant="primary"
              size="md"
              disabled={readOnly}
              ariaLabel="COC type"
            />
          </Field>
          <Field label="Date" required className="sm:w-44">
            <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} disabled={readOnly} className={inputClass} />
          </Field>
        </div>
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        {/* DO / WO */}
        <Card icon={Truck} tone="sky" title="Delivery order & work order" description="Only Draft DOs with COC Required ticked can take a COC." className="h-full">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Customer" required className="sm:col-span-2">
              <SearchableSelect
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value, deliveryOrderId: "", workOrderNo: "" }))}
                disabled={readOnly}
                className={selectTriggerClass}
              >
                <option value="">Select customer</option>
                {meta.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerName}
                  </option>
                ))}
              </SearchableSelect>
            </Field>
            <Field
              label="DO No"
              required
              help={form.customerId && !readOnly && doOptions.length === 0 ? "This customer has no Draft DO with COC Required ticked." : undefined}
            >
              <SearchableSelect
                value={form.deliveryOrderId}
                onChange={(e) => setForm((f) => ({ ...f, deliveryOrderId: e.target.value, workOrderNo: "" }))}
                disabled={readOnly || !form.customerId}
                className={selectTriggerClass}
              >
                <option value="">{form.customerId ? "Select DO" : "Select a customer first"}</option>
                {doOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.doNo}
                  </option>
                ))}
              </SearchableSelect>
            </Field>
            <Field label="WO No" required>
              <SearchableSelect
                value={form.workOrderNo}
                onChange={(e) => {
                  applyDefaults.current = true;
                  prefillTopCoat.current = true;
                  set("workOrderNo", e.target.value);
                }}
                disabled={readOnly || !form.deliveryOrderId}
                className={selectTriggerClass}
              >
                <option value="">{form.deliveryOrderId ? "Select WO" : "Select a DO first"}</option>
                {woOptions.map((wo) => (
                  <option key={wo} value={wo}>
                    {wo}
                  </option>
                ))}
              </SearchableSelect>
            </Field>

            <Field label="Description" className="sm:col-span-2">
              {ro(ctx?.wo.description)}
            </Field>
            <Field label="Customer Ref No">{ro(ctx?.wo.customerPoRef, true)}</Field>
            <Field label="Drawing No" help={type === "Final" ? "Final COC: always the SO Part No." : undefined}>
              {type === "Final" ? ro(ctxLoading ? "Loading…" : drawingNo, true) : text("drawingNo")}
            </Field>
            <Field label="WO Quantity">{ro(ctx?.wo.quantity ?? "")}</Field>
            <Field label="DO Quantity">{ro(ctx?.doItem?.quantity ?? "")}</Field>
            <Field label="WO / DO UOM">{ro(ctx?.wo.uom || ctx?.doItem?.uomName || "")}</Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="COC Quantity" required help={!readOnly && ctx?.doItem ? `DO: ${ctx.doItem.quantity}` : undefined}>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={form.cocQuantity}
                  onChange={(e) => set("cocQuantity", e.target.value)}
                  disabled={readOnly}
                  className={`${inputClass} text-right tabular-nums`}
                />
              </Field>
              <Field label="COC UOM" required>
                <SearchableSelect value={form.cocUomId} onChange={(e) => set("cocUomId", e.target.value)} disabled={readOnly} className={selectTriggerClass}>
                  <option value="">UOM</option>
                  {meta.uoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.uomName}
                    </option>
                  ))}
                </SearchableSelect>
              </Field>
            </div>
          </div>
        </Card>

        {/* Type-specific section */}
        {type === "Welding" ? (
          <Card
            icon={Flame}
            tone="amber"
            title="Welding"
            description={ctx && !ctx.welders.length ? "No welding timesheets on this WO yet, so all employees are listed." : "Welders, processes and machines recorded at the Scanning Terminal for this WO."}
            className="h-full"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="SAN No">{text("sanNo")}</Field>
              <div className="hidden sm:block" />
              <Field label="Welder Name">{personSelect(form.welderId, (v) => set("welderId", v), welderList, "Select welder")}</Field>
              <Field label="Welder ID No">{ro(idNoFor(welderList, form.welderId, record?.welder, record?.welderId), true)}</Field>
              <Field label="Welding Process">
                {ctx?.weldingProcesses.length ? (
                  <SearchableSelect value={form.weldingProcess} onChange={(e) => set("weldingProcess", e.target.value)} disabled={readOnly} className={selectTriggerClass}>
                    <option value="">Select process</option>
                    {[...new Set([...ctx.weldingProcesses, ...(form.weldingProcess ? [form.weldingProcess] : [])])].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </SearchableSelect>
                ) : (
                  text("weldingProcess", "e.g. GTAW")
                )}
              </Field>
              <Field label="Welding Machine Serial No">
                <SearchableSelect value={form.weldingMachineId} onChange={(e) => set("weldingMachineId", e.target.value)} disabled={readOnly} className={selectTriggerClass}>
                  <option value="">Select machine</option>
                  {machineList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.machineNo}
                      {m.brand ? ` · ${m.brand}` : ""}
                    </option>
                  ))}
                </SearchableSelect>
              </Field>
            </div>
          </Card>
        ) : type === "Spray Painting" ? (
          <Card
            icon={PaintBucket}
            tone="rose"
            title="Spray painting"
            description={ctx && !ctx.painters.length ? "No spray-painting timesheets on this WO yet, so all employees are listed." : "Painters and top-coat readings come from the Scanning Terminal."}
            className="h-full"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Part Name" help="Prefilled from the work order.">{text("partName")}</Field>
              <Field label="Part Number">{text("partNumber")}</Field>
              <Field label="Painting SAN No">{text("paintingSanNo")}</Field>
              <Field label="Painting Method">
                <SearchableSelect value={form.paintingMethodId} onChange={(e) => set("paintingMethodId", e.target.value)} disabled={readOnly} className={selectTriggerClass}>
                  <option value="">Select method</option>
                  {meta.paintingMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.method}
                    </option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="Painter Name">{personSelect(form.painterId, (v) => { prefillTopCoat.current = true; set("painterId", v); }, painterList, "Select painter")}</Field>
              <Field label="Painter ID No">{ro(idNoFor(painterList, form.painterId, record?.painter, record?.painterId), true)}</Field>
              <Field label="Painting Specification" className="sm:col-span-2">{text("paintingSpecification")}</Field>
              <Field label="Paint Thickness Specification">{text("paintThicknessSpecification")}</Field>
              <Field label="Measured Total Paint Thickness" help={ctx?.topCoats.length ? "From the WO's top-coat DFT." : undefined}>
                {text("measuredTotalPaintThickness")}
              </Field>
              <Field label="Paint Batch No" help={ctx?.topCoats.length ? "From the WO's top coat." : undefined}>
                {text("paintBatchNo")}
              </Field>
              <Field label="Inspection Equipment">{text("inspectionEquipment")}</Field>
            </div>
          </Card>
        ) : (
          <Card icon={type ? TYPE_ICON[type] : FileCheck} tone="slate" title={type ? `${type} COC` : "Type details"} className="h-full">
            <p className="py-6 text-center text-[13px] text-slate-500">
              {type ? `${type} certificates have no extra fields. The printout uses the details on the left.` : "Pick a type to see its fields."}
            </p>
          </Card>
        )}
      </div>

      {/* Check & approval */}
      <Card icon={ClipboardCheck} tone="violet" title="Check & approval" description="One check, then one approval. Approval can only follow a check.">
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Draft", done: isEdit, who: isEdit ? "Saved" : "Not saved yet", when: fmtDateTime(record?.createdAt) },
            { label: "Checked", done: !!record?.checkedBy, who: record?.checkedBy?.name ?? "Waiting", when: fmtDateTime(record?.checkedDate) },
            { label: "Approved", done: !!record?.approvedBy, who: record?.approvedBy?.name ?? "Waiting", when: fmtDateTime(record?.approvedDate) },
          ].map((s, i) => (
            <li key={s.label} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 ${s.done ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  s.done ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {s.done ? <CheckCircle2 size={12} /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-800">{s.label}</p>
                <p className={`truncate text-xs ${s.done ? "text-slate-600" : "text-slate-400"}`}>{s.who}</p>
                {s.when && <p className="text-[11px] text-slate-400">{s.when}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
