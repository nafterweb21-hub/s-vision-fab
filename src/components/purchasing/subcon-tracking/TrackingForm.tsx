"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ClipboardList,
  FileText,
  Lock,
  Send,
  Ban,
  Building2,
  CalendarDays,
  Wrench,
} from "lucide-react";
import {
  Card,
  EmptyState,
  Field,
  MetaChip,
  StatusBadge,
  buttonClass,
  inputClass,
  readOnlyClass,
  selectTriggerClass,
  textareaClass,
} from "@/components/form-ui";
import { fmtDate } from "@/components/purchasing/DocListParts";
import { TRACKING_KINDS, TRACKING_STATUS_TONE, type TrackingKind } from "./kinds";

type Values = {
  companyId: string;
  date: string;
  supplierId: string;
  purchaseOrderId: string;
  subconRequestFormId: string;
  qty: number;
  remark: string;
};

const today = () => new Date().toISOString().split("T")[0];

/** Create / edit screen shared by Subcon Return Tracking and Subcon Reject Tracking. */
export default function TrackingForm({ kind }: { kind: TrackingKind }) {
  const cfg = TRACKING_KINDS[kind];
  const Icon = cfg.icon;
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [values, setValues] = useState<Values>({
    companyId: "",
    date: today(),
    supplierId: "",
    purchaseOrderId: "",
    subconRequestFormId: "",
    qty: 0,
    remark: "",
  });
  const [status, setStatus] = useState("Draft");
  const [docNo, setDocNo] = useState("");
  /** Quantity this record held when loaded, so it isn't counted twice against the SRF totals. */
  const [savedQty, setSavedQty] = useState(0);
  const [formData, setFormData] = useState<any>({ companies: [], suppliers: [], pos: [], srfs: [] });
  const [fetchingData, setFetchingData] = useState(true);
  const [pending, setPending] = useState<"save" | "Submitted" | "Void" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const readOnly = !isNew && status !== "Draft";
  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));

  useEffect(() => {
    async function loadData() {
      try {
        const [formRes, recRes] = await Promise.all([
          fetch(`${cfg.api}/form-data`),
          isNew ? Promise.resolve(null) : fetch(`${cfg.api}/${id}`),
        ]);
        if (!formRes.ok) throw new Error("Failed to load form dependencies");
        const fData = await formRes.json();

        if (!isNew && recRes) {
          if (!recRes.ok) throw new Error(`Failed to load ${cfg.short}`);
          const rec = await recRes.json();
          setDocNo(rec[cfg.noField]);
          setStatus(rec.status);
          const qty = Number(rec[cfg.qtyField]) || 0;
          setSavedQty(rec.status === "Void" ? 0 : qty);
          setValues({
            companyId: rec.companyId,
            date: new Date(rec[cfg.dateField]).toISOString().split("T")[0],
            supplierId: rec.supplierId,
            purchaseOrderId: rec.purchaseOrderId,
            subconRequestFormId: rec.subconRequestFormId,
            qty,
            remark: rec.remark || "",
          });

          // Keep the record's own PO / SRF selectable even if they no longer qualify for new entries.
          if (!fData.pos.some((p: any) => p.id === rec.purchaseOrderId) && rec.purchaseOrder) {
            fData.pos.push(rec.purchaseOrder);
          }
          if (!fData.srfs.some((s: any) => s.id === rec.subconRequestFormId) && rec.subconRequestForm) {
            const srf = rec.subconRequestForm;
            const item = srf.purchaseOrderItem;
            fData.srfs.push({
              id: srf.id,
              srfNo: srf.srfNo,
              purchaseOrderId: rec.purchaseOrderId,
              purchaseOrderItemId: srf.purchaseOrderItemId,
              poNo: rec.purchaseOrder?.poNo,
              woNo: rec.purchaseOrder?.workOrderNo,
              inProcessDescription: item?.woRoutingProcess?.inProcess?.description || "",
              mainProcess: item?.woRoutingProcess?.mainProcess?.process || "",
              routingProcess: item?.woRoutingProcess?.routingProcess?.routingProcess || "",
              partDescription: item?.description || "",
              dateRequired: srf.dateRequired,
              acknowledgedQuantity: srf.quantity,
              uom: item?.poUom?.uomName,
              unitPrice: item?.unitPrice,
              amount: item?.amount,
              hardness: item?.hardness || "",
              thickness: item?.thickness || "",
            });
          }
        }
        setFormData({ ...fData });
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setFetchingData(false);
      }
    }
    loadData();
  }, [isNew, id, cfg]);

  const srf = useMemo(
    () => formData.srfs.find((s: any) => s.id === values.subconRequestFormId) || null,
    [values.subconRequestFormId, formData.srfs],
  );

  /**
   * Most this record may hold. Return: SRF qty less other live returns (spec: Σ SRT ≤ SRF qty).
   * Reject: submitted returns less other live rejects (checked again by the server on submit).
   * Null when the totals aren't known (an SRF loaded only from the record itself).
   */
  const limit = useMemo(() => {
    if (!srf || srf.returnedQty === undefined) return null;
    if (kind === "RETURN") return Math.max(0, Number(srf.acknowledgedQuantity) - (Number(srf.returnedQty) - savedQty));
    return Math.max(0, Number(srf.returnedSubmittedQty) - (Number(srf.rejectedQty) - savedQty));
  }, [srf, kind, savedQty]);

  const filteredPOs = formData.pos.filter((p: any) => p.supplierId === values.supplierId && p.companyId === values.companyId);
  const filteredSRFs = formData.srfs.filter((s: any) => s.purchaseOrderId === values.purchaseOrderId);
  const supplierName = formData.suppliers.find((s: any) => s.id === values.supplierId)?.supplierName || "";
  const poNo = formData.pos.find((p: any) => p.id === values.purchaseOrderId)?.poNo || "";
  const over = limit != null && values.qty > limit;

  function selectSrf(srfId: string) {
    const next = formData.srfs.find((s: any) => s.id === srfId);
    let qty = values.qty;
    if (next) {
      // Default to what's left on the SRF.
      qty =
        kind === "RETURN"
          ? Math.max(0, Number(next.acknowledgedQuantity) - Number(next.returnedQty ?? 0))
          : Math.max(0, Number(next.returnedSubmittedQty ?? 0) - Number(next.rejectedQty ?? 0));
    }
    set({ subconRequestFormId: srfId, qty });
  }

  function validate(): string | null {
    if (!values.companyId) return "Company is required";
    if (!values.supplierId) return "Supplier is required";
    if (!values.purchaseOrderId) return "PO No is required";
    if (!values.subconRequestFormId) return "SRF No is required";
    if (!values.date) return `${cfg.short} Date is required`;
    if (!(values.qty > 0)) return `${cfg.qtyLabel} must be greater than 0`;
    if (limit != null && values.qty > limit) {
      return kind === "RETURN"
        ? `Only ${limit} left to return on this SRF.`
        : `Only ${limit} returned and not yet rejected on this SRF.`;
    }
    return null;
  }

  async function onSave() {
    if (readOnly) return;
    const problem = validate();
    if (problem) {
      setErrorMsg(problem);
      return;
    }
    setPending("save");
    setErrorMsg("");
    try {
      const payload = {
        companyId: values.companyId,
        supplierId: values.supplierId,
        purchaseOrderId: values.purchaseOrderId,
        subconRequestFormId: values.subconRequestFormId,
        [cfg.dateField]: values.date,
        [cfg.qtyField]: Number(values.qty),
        remark: values.remark,
      };
      const res = await fetch(isNew ? cfg.api : `${cfg.api}/${id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save form");
      }
      const saved = await res.json();
      router.push(
        `/dashboard/saved?module=${cfg.noun}&id=${saved[cfg.noField] || saved.id || docNo}&viewUrl=${cfg.base}/${saved.id || id}&backUrl=${cfg.base}`,
      );
    } catch (err: any) {
      setErrorMsg(err.message);
      setPending(null);
    }
  }

  async function changeStatus(next: "Submitted" | "Void") {
    const msg =
      next === "Submitted"
        ? `Submit ${docNo}? Unsaved changes on this page are not included.`
        : `Void ${docNo}? This can't be undone.`;
    if (!await customConfirm(msg)) return;
    setPending(next);
    setErrorMsg("");
    try {
      const res = await fetch(`${cfg.api}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Failed to change status to ${next}`);
      }
      hotToast.success(next === "Submitted" ? `${docNo} submitted` : `${docNo} is now Void`);
      setStatus(next);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setPending(null);
    }
  }

  if (fetchingData) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-12">
        <Loader2 size={20} className="animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500">Loading…</p>
      </div>
    );
  }

  const busy = pending !== null;

  return (
    <div className="w-full space-y-4">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className={`h-0.5 bg-gradient-to-r ${cfg.headerGradient}`} />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href={cfg.base} className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> {cfg.noun}
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {isNew ? (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">New {cfg.noun}</h1>
              ) : (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{cfg.short}</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">{docNo}</span>
                </h1>
              )}
              <StatusBadge status={status} tone={TRACKING_STATUS_TONE[status] ?? "slate"} size="md" label={isNew ? "New · Draft" : status} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Supplier">{supplierName || "No supplier yet"}</MetaChip>
              <MetaChip icon={CalendarDays} label={cfg.short} title={`${cfg.short} date`}>{fmtDate(values.date)}</MetaChip>
              <MetaChip icon={ClipboardList} label="PO" title="Purchase order">{poNo || "Not selected"}</MetaChip>
              <MetaChip icon={FileText} label="SRF" title="Subcon Request Form">{srf?.srfNo || "Not selected"}</MetaChip>
              {srf?.woNo && <MetaChip icon={Wrench} label="WO" title="Work order">{srf.woNo}</MetaChip>}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => router.push(cfg.base)} className={buttonClass("ghost", "md")}>
              Back
            </button>
            {!isNew && status !== "Void" && (
              <button type="button" onClick={() => changeStatus("Void")} disabled={busy} className={buttonClass("danger", "md")}>
                {pending === "Void" ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} Void
              </button>
            )}
            {readOnly ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            ) : (
              <>
                <button type="button" onClick={onSave} disabled={busy} className={buttonClass(isNew ? "primary" : "secondary", "md")}>
                  {pending === "save" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {pending === "save" ? "Saving…" : isNew ? "Save Draft" : "Save Changes"}
                </button>
                {!isNew && (
                  <button type="button" onClick={() => changeStatus("Submitted")} disabled={busy} className={buttonClass("primary", "md")}>
                    {pending === "Submitted" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          {errorMsg}
        </div>
      )}
      {readOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
          <Lock size={14} className="shrink-0 text-slate-400" />
          <span>
            This tracking is <strong className="font-semibold text-slate-800">{status}</strong> — read-only.
          </span>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <Card icon={FileText} tone="indigo" title="Tracking details" description="Pick the supplier, then the PO and the Submitted SRF">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field label="Company" required>
                <SearchableSelect
                  value={values.companyId}
                  onChange={(e) => set({ companyId: e.target.value, ...(isNew ? { purchaseOrderId: "", subconRequestFormId: "" } : {}) })}
                  disabled={readOnly || !isNew}
                  className={selectTriggerClass}
                >
                  <option value="">Select Company</option>
                  {formData.companies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </SearchableSelect>
              </Field>

              <Field label={`${cfg.short} Date`} required>
                <input
                  type="date"
                  value={values.date}
                  onChange={(e) => set({ date: e.target.value })}
                  disabled={readOnly}
                  max={today()}
                  className={inputClass}
                />
              </Field>

              <Field label="Supplier" required className="sm:col-span-2">
                <SearchableSelect
                  value={values.supplierId}
                  onChange={(e) => set({ supplierId: e.target.value, ...(isNew ? { purchaseOrderId: "", subconRequestFormId: "" } : {}) })}
                  disabled={readOnly || !isNew}
                  className={selectTriggerClass}
                >
                  <option value="">Select Supplier</option>
                  {formData.suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.supplierCode} - {s.supplierName}</option>
                  ))}
                </SearchableSelect>
              </Field>

              <Field label="PO No" required help={isNew && (!values.companyId || !values.supplierId) ? "Pick the company and supplier first" : undefined}>
                <SearchableSelect
                  value={values.purchaseOrderId}
                  onChange={(e) => set({ purchaseOrderId: e.target.value, ...(isNew ? { subconRequestFormId: "" } : {}) })}
                  disabled={readOnly || !isNew || !values.supplierId || !values.companyId}
                  className={selectTriggerClass}
                >
                  <option value="">Select PO</option>
                  {filteredPOs.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.poNo}</option>
                  ))}
                </SearchableSelect>
              </Field>

              <Field label="SRF No" required help={isNew ? "Only Submitted request forms are listed" : undefined}>
                <SearchableSelect
                  value={values.subconRequestFormId}
                  onChange={(e) => selectSrf(e.target.value)}
                  disabled={readOnly || !isNew || !values.purchaseOrderId}
                  className={selectTriggerClass}
                >
                  <option value="">Select SRF</option>
                  {filteredSRFs.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.srfNo} - {s.partDescription}</option>
                  ))}
                </SearchableSelect>
              </Field>
            </div>
          </Card>

          <Card icon={Icon} tone={cfg.tone} title={kind === "RETURN" ? "Return details" : "Reject details"} description={`How many were ${cfg.verbPast}, and any notes`}>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field
                label={srf?.uom ? `${cfg.qtyLabel} (${srf.uom})` : cfg.qtyLabel}
                required
                error={over ? (kind === "RETURN" ? `Only ${limit} left to return on this SRF.` : `Only ${limit} returned and not yet rejected.`) : undefined}
                help={
                  !readOnly && limit != null
                    ? kind === "RETURN"
                      ? `Up to ${limit} — SRF quantity not yet on other returns`
                      : `Up to ${limit} — submitted returns not yet rejected`
                    : undefined
                }
              >
                <input
                  type="number"
                  min={0}
                  step={1}
                  max={limit ?? undefined}
                  value={values.qty}
                  onChange={(e) => set({ qty: Number(e.target.value) })}
                  disabled={readOnly}
                  aria-invalid={over}
                  className={`${inputClass} text-right tabular-nums ${over ? "border-rose-400 bg-rose-50" : ""}`}
                />
              </Field>
              <Field label="UOM" help="Always the PO UOM">
                <div className={`${readOnlyClass} flex items-center`}>{srf?.uom || "—"}</div>
              </Field>
              <Field label="Remark" className="sm:col-span-2">
                <textarea
                  value={values.remark}
                  onChange={(e) => set({ remark: e.target.value })}
                  disabled={readOnly}
                  rows={3}
                  className={textareaClass}
                  placeholder="Enter remarks..."
                />
              </Field>
            </div>
          </Card>
        </div>

        <Card icon={ClipboardList} tone="sky" title="Subcon Request Form" description="Imported from the selected SRF — read-only" className="h-full">
          {srf ? (
            <div className="space-y-4">
              <QtyStrip kind={kind} srf={srf} />
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-2">
                <Detail label="WO No" value={srf.woNo} mono />
                <Detail label="Date Required" value={srf.dateRequired ? fmtDate(srf.dateRequired) : ""} />
                <Detail label="Part Description" value={srf.partDescription} wide />
                <Detail label="Main Process" value={srf.mainProcess} />
                <Detail label="Routing Process" value={srf.routingProcess} />
                <Detail label="In-Process Description" value={srf.inProcessDescription} wide />
                <Detail label="Unit Price" value={srf.unitPrice != null ? Number(srf.unitPrice).toFixed(2) : ""} />
                <Detail label="Amount" value={srf.amount != null ? Number(srf.amount).toFixed(2) : ""} />
                <Detail label="Hardness" value={srf.hardness} />
                <Detail label="Thickness" value={srf.thickness} />
              </dl>
            </div>
          ) : (
            <EmptyState boxed icon={ClipboardList} tone="sky" title="No SRF selected" description="Pick the supplier, PO and SRF to see its details." />
          )}
        </Card>
      </div>
    </div>
  );
}

/** SRF quantity, returned and rejected at a glance. */
function QtyStrip({ kind, srf }: { kind: TrackingKind; srf: any }) {
  const known = srf.returnedQty !== undefined;
  const cells: { label: string; value: React.ReactNode; strong?: boolean }[] = [
    { label: "SRF Qty", value: Number(srf.acknowledgedQuantity), strong: kind === "RETURN" },
    { label: "Returned", value: known ? Number(srf.returnedSubmittedQty) : "—", strong: kind === "REJECT" },
    { label: "Rejected", value: known ? Number(srf.rejectedQty) : "—" },
  ];
  return (
    <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/60">
      {cells.map((c) => (
        <div key={c.label} className="px-3 py-2">
          <p className="text-[11px] font-medium text-slate-500">{c.label}</p>
          <p className={`text-base font-semibold tabular-nums ${c.strong ? "text-indigo-700" : "text-slate-800"}`}>
            {c.value} <span className="text-[11px] font-normal text-slate-400">{srf.uom}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function Detail({ label, value, mono, wide }: { label: string; value: React.ReactNode; mono?: boolean; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className={`mt-0.5 break-words text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}
