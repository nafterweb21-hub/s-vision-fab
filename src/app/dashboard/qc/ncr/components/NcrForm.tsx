"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Loader2,
  Lock,
  Printer,
  Save,
  SearchCheck,
  Wrench,
  Layers,
} from "lucide-react";
import {
  Card,
  Field,
  MetaChip,
  Segmented,
  StatusBadge,
  buttonClass,
  inputClass,
  readOnlyClass,
  selectTriggerClass,
  textareaClass,
  type Tone,
} from "@/components/form-ui";
import { createNcr, updateNcr } from "../actions";

/** Spec status flow: Draft → Closed | Void. */
export const NCR_STATUS_TONE: Record<string, Tone> = { Draft: "amber", Closed: "emerald", Void: "rose" };

/** Routing steps an NCR can be raised against (spec: only completed or WIP). */
const NCR_ROUTING_STATUSES = new Set(["WIP", "Completed", "Pending for QC"]);

const toYmd = (v?: string | Date | null) => (v ? new Date(v).toISOString().split("T")[0] : "");
const today = () => new Date().toISOString().split("T")[0];

type YesNo = "" | "Yes" | "No";
const toYesNo = (v: boolean | null | undefined): YesNo => (v === true ? "Yes" : v === false ? "No" : "");
const fromYesNo = (v: YesNo) => (v === "" ? null : v === "Yes");

export default function NcrForm({ initialData, formData }: { initialData?: any; formData: any }) {
  const router = useRouter();
  const isEditing = !!initialData;
  const status: string = initialData?.status || "Draft";
  const readOnly = isEditing && status !== "Draft";

  const [pending, setPending] = useState<"Draft" | "Closed" | "Void" | null>(null);
  const [error, setError] = useState("");

  const [ncrDate, setNcrDate] = useState(toYmd(initialData?.ncrDate) || today());
  const [customerId, setCustomerId] = useState(initialData?.customerId || "");
  const [workOrderNo, setWorkOrderNo] = useState(initialData?.workOrderNo || "");
  const [inProcessId, setInProcessId] = useState(initialData?.inProcessId || "");
  const [mainProcessId, setMainProcessId] = useState(initialData?.mainProcessId || "");
  const [routingProcessId, setRoutingProcessId] = useState(initialData?.routingProcessId || "");
  const [requestorId, setRequestorId] = useState(initialData?.requestorId || "");
  const [responsiblePartyId, setResponsiblePartyId] = useState(initialData?.responsiblePartyId || "");
  const [description, setDescription] = useState(initialData?.descriptionOfNonConformance || "");

  const [reworkQuantity, setReworkQuantity] = useState<number>(initialData?.reworkQuantity || 0);
  const [useAsIsQuantity, setUseAsIsQuantity] = useState<number>(initialData?.useAsIsQuantity || 0);
  const [scrapQuantity, setScrapQuantity] = useState<number>(initialData?.scrapQuantity || 0);
  const [otherQuantity, setOtherQuantity] = useState<number>(initialData?.otherQuantity || 0);
  const [otherDecisions, setOtherDecisions] = useState(initialData?.otherDecisions || "");
  const [customerAcceptance, setCustomerAcceptance] = useState<YesNo>(toYesNo(initialData?.customerAcceptanceForUseAsIs));

  const [department, setDepartment] = useState(initialData?.department || "");
  const [failureModeIds, setFailureModeIds] = useState<string[]>(
    initialData?.NcrFailureMode ? initialData.NcrFailureMode.map((fm: any) => fm.failureModeId) : [],
  );
  const [correctiveAction, setCorrectiveAction] = useState<YesNo>(toYesNo(initialData?.correctiveAction));
  const [reasonToJustify, setReasonToJustify] = useState(initialData?.reasonToJustify || "");

  const [rootCause, setRootCause] = useState(initialData?.rootCause || "");
  const [rootCauseStaffId, setRootCauseStaffId] = useState(initialData?.rootCauseResponsibleStaffId || "");
  const [rootCauseDate, setRootCauseDate] = useState(toYmd(initialData?.rootCauseDate));
  const [cpa, setCpa] = useState(initialData?.correctivePreventiveAction || "");
  const [cpaStaffId, setCpaStaffId] = useState(initialData?.cpaResponsibleStaffId || "");
  const [cpaDate, setCpaDate] = useState(toYmd(initialData?.cpaDate));

  const [followUp, setFollowUp] = useState(initialData?.followUpVerification || "");
  const [actionTaken, setActionTaken] = useState(initialData?.actionTaken || "");
  const [verifiedById, setVerifiedById] = useState(initialData?.verifiedConfirmedById || "");
  const [verifiedDate, setVerifiedDate] = useState(toYmd(initialData?.verifiedConfirmedDate));

  // Spec: NCR Quantity = Rework + Use-As-Is + Scrap + Other. NCRs raised by a QC rejection start with
  // only the rejected quantity, so the split may be incomplete while drafting; it must match to close.
  const [ncrQuantity, setNcrQuantity] = useState<number>(initialData?.ncrQuantity || 0);
  const allocated = [reworkQuantity, useAsIsQuantity, scrapQuantity, otherQuantity].reduce((a, b) => a + (Number(b) || 0), 0);
  const unallocated = ncrQuantity - allocated;

  // ---- Cascading WO → In-Process → Main → Routing ----
  const workOrders = useMemo(
    () => formData.workOrders.filter((wo: any) => !customerId || wo.customerId === customerId),
    [formData.workOrders, customerId],
  );
  const wo = formData.workOrders.find((w: any) => w.workOrderNo === workOrderNo);
  const inProcess = wo?.inProcesses?.find((ip: any) => ip.id === inProcessId);
  // Keep the saved step selectable even if its status has moved on.
  const eligibleSteps = (inProcess?.routingProcesses ?? []).filter(
    (rp: any) => NCR_ROUTING_STATUSES.has(rp.status) || rp.id === initialData?.routingProcessId,
  );
  const mainOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const rp of eligibleSteps) if (rp.mainProcessId) seen.set(rp.mainProcessId, rp.mainProcess?.process || "—");
    return [...seen.entries()].map(([id, process]) => ({ id, process }));
  }, [eligibleSteps]);
  const routingOptions = eligibleSteps.filter((rp: any) => !mainProcessId || rp.mainProcessId === mainProcessId);
  const overWoQty = wo?.quantity != null && ncrQuantity > Number(wo.quantity);

  const employees: any[] = formData.employees;
  const customerName = formData.customers.find((c: any) => c.id === customerId)?.customerName || "";

  function validate(target: "Draft" | "Closed"): string | null {
    if (!ncrDate) return "NCR Date is required.";
    if (!customerId) return "Customer is required.";
    if (!workOrderNo) return "Work Order No is required.";
    if (!inProcessId) return "In-Process Description is required.";
    if (!mainProcessId) return "Main Process is required.";
    if (!routingProcessId) return "Routing Process is required.";
    if (!requestorId) return "Requestor is required.";
    if (!description.trim()) return "Description of Non-Conformance is required.";
    if ([ncrQuantity, reworkQuantity, useAsIsQuantity, scrapQuantity, otherQuantity].some((q) => !Number.isInteger(Number(q)) || Number(q) < 0)) {
      return "Quantities must be whole numbers, 0 or more.";
    }
    if (target === "Closed") {
      if (ncrQuantity <= 0) return "NCR Quantity must be greater than 0 to close.";
      if (unallocated !== 0) return `Rework + Use-As-Is + Scrap + Other (${allocated}) must equal the NCR Quantity (${ncrQuantity}) to close.`;
      if (!verifiedById || !verifiedDate) return "Verified / Confirmed By and its Date are required before closing.";
    }
    return null;
  }

  async function save(target: "Draft" | "Closed" | "Void") {
    setError("");
    if (target === "Void") {
      if (!await customConfirm(`Void ${initialData.ncrNo}? This can't be undone.`)) return;
    } else {
      const problem = validate(target);
      if (problem) {
        setError(problem);
        return;
      }
      if (target === "Closed" && !await customConfirm("Close this NCR? It can't be edited afterwards.")) return;
    }

    const payload = {
      ncrDate: new Date(ncrDate),
      status: target,
      customerId,
      workOrderNo,
      inProcessId: inProcessId || null,
      mainProcessId: mainProcessId || null,
      routingProcessId: routingProcessId || null,
      requestorId,
      responsiblePartyId: responsiblePartyId || null,
      descriptionOfNonConformance: description,
      ncrQuantity: Number(ncrQuantity) || 0,
      reworkQuantity: Number(reworkQuantity) || 0,
      useAsIsQuantity: Number(useAsIsQuantity) || 0,
      scrapQuantity: Number(scrapQuantity) || 0,
      otherQuantity: Number(otherQuantity) || 0,
      otherDecisions: otherDecisions || null,
      customerAcceptanceForUseAsIs: fromYesNo(customerAcceptance),
      department: department || null,
      correctiveAction: fromYesNo(correctiveAction),
      // Spec: Reason to Justify applies only when Corrective Action = No.
      reasonToJustify: correctiveAction === "No" ? reasonToJustify || null : null,
      rootCause: rootCause || null,
      rootCauseResponsibleStaffId: rootCauseStaffId || null,
      rootCauseDate: rootCauseDate ? new Date(rootCauseDate) : null,
      correctivePreventiveAction: cpa || null,
      cpaResponsibleStaffId: cpaStaffId || null,
      cpaDate: cpaDate ? new Date(cpaDate) : null,
      followUpVerification: followUp || null,
      actionTaken: actionTaken || null,
      verifiedConfirmedById: verifiedById || null,
      verifiedConfirmedDate: verifiedDate ? new Date(verifiedDate) : null,
      failureModeIds,
    };

    setPending(target);
    const res = isEditing ? await updateNcr(initialData.id, payload) : await createNcr(payload);
    if (!res.ok) {
      setError(res.error);
      setPending(null);
      return;
    }
    if (target === "Void") {
      router.push("/dashboard/qc/ncr");
      router.refresh();
      return;
    }
    router.push(`/dashboard/saved?module=NCR&id=${res.ncrNo || res.id}&viewUrl=/dashboard/qc/ncr/${res.id}&backUrl=/dashboard/qc/ncr`);
  }

  const busy = pending !== null;
  const qtyInput = (value: number, set: (n: number) => void, label: string) => (
    <Field label={label}>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        disabled={readOnly}
        className={`${inputClass} text-right tabular-nums`}
      />
    </Field>
  );
  const employeeSelect = (value: string, set: (v: string) => void, placeholder = "Select employee") => (
    <SearchableSelect value={value} onChange={(e) => set(e.target.value)} disabled={readOnly} className={selectTriggerClass}>
      <option value="">{placeholder}</option>
      {employees.map((emp) => (
        <option key={emp.id} value={emp.id}>
          {emp.name}
          {emp.code ? ` (${emp.code})` : ""}
        </option>
      ))}
    </SearchableSelect>
  );

  return (
    <div className="w-full space-y-4">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md print:hidden">
        <div className="h-0.5 bg-gradient-to-r from-rose-500 via-rose-500 to-amber-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/qc/ncr" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Non-Conformance Reports
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {isEditing ? (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">NCR</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">{initialData.ncrNo}</span>
                </h1>
              ) : (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">New Non-Conformance Report</h1>
              )}
              <StatusBadge status={status} tone={NCR_STATUS_TONE[status] ?? "slate"} size="md" label={isEditing ? status : "New · Draft"} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Customer">{customerName || "No customer yet"}</MetaChip>
              <MetaChip icon={Wrench} label="WO" title="Work order">{workOrderNo || "Not selected"}</MetaChip>
              <MetaChip icon={CalendarDays} label="NCR" title="NCR date">{ncrDate || "—"}</MetaChip>
              <MetaChip icon={Layers} label="Qty" title="NCR quantity">{ncrQuantity}</MetaChip>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => router.push("/dashboard/qc/ncr")} className={buttonClass("ghost", "md")}>
              Back
            </button>
            {isEditing && (
              <a href={`/print/ncr/${initialData.id}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
                <Printer size={14} /> Print
              </a>
            )}
            {readOnly ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            ) : (
              <>
                {isEditing && (
                  <button type="button" onClick={() => save("Void")} disabled={busy} className={buttonClass("danger", "md")}>
                    {pending === "Void" ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} Void
                  </button>
                )}
                <button type="button" onClick={() => save("Draft")} disabled={busy} className={buttonClass("secondary", "md")}>
                  {pending === "Draft" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {pending === "Draft" ? "Saving…" : "Save Draft"}
                </button>
                <button type="button" onClick={() => save("Closed")} disabled={busy} className={buttonClass("primary", "md")}>
                  {pending === "Closed" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Close NCR
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
      {readOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
          <Lock size={14} className="shrink-0 text-slate-400" />
          <span>
            This NCR is <strong className="font-semibold text-slate-800">{status}</strong> — read-only.
          </span>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        {/* 1. Where it happened */}
        <Card icon={Wrench} tone="indigo" title="Work order & process" description="The routing step the rejected quantity came from" className="h-full">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <Field label="NCR No">
              <div className={`${readOnlyClass} flex items-center font-mono`}>{initialData?.ncrNo || "Assigned on save"}</div>
            </Field>
            <Field label="NCR Date" required>
              <input type="date" value={ncrDate} onChange={(e) => setNcrDate(e.target.value)} disabled={readOnly} className={inputClass} />
            </Field>
            <Field label="Customer" required>
              <SearchableSelect
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setWorkOrderNo("");
                  setInProcessId("");
                  setMainProcessId("");
                  setRoutingProcessId("");
                }}
                disabled={readOnly}
                className={selectTriggerClass}
              >
                <option value="">Select Customer</option>
                {formData.customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.customerName}</option>
                ))}
              </SearchableSelect>
            </Field>
            <Field label="Work Order No" required>
              <SearchableSelect
                value={workOrderNo}
                onChange={(e) => {
                  const next = formData.workOrders.find((w: any) => w.workOrderNo === e.target.value);
                  setWorkOrderNo(e.target.value);
                  if (next && !customerId) setCustomerId(next.customerId);
                  setInProcessId("");
                  setMainProcessId("");
                  setRoutingProcessId("");
                }}
                disabled={readOnly}
                className={selectTriggerClass}
              >
                <option value="">Select Work Order</option>
                {workOrders.map((w: any) => (
                  <option key={w.workOrderNo} value={w.workOrderNo}>{w.workOrderNo}</option>
                ))}
              </SearchableSelect>
            </Field>

            {wo && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-[13px] sm:col-span-2">
                <Info label="Customer Ref No" value={wo.customerPoRef} />
                <Info label="Project Code" value={wo.projectCode} />
                <Info label="Drawing No" value={wo.partName} />
                <Info label="WO Quantity" value={wo.quantity != null ? String(Number(wo.quantity)) : ""} />
                <Info label="Product Description" value={wo.jobDescription} wide />
              </dl>
            )}

            <Field label="In-Process Description" required className="sm:col-span-2">
              <SearchableSelect
                value={inProcessId}
                onChange={(e) => {
                  setInProcessId(e.target.value);
                  setMainProcessId("");
                  setRoutingProcessId("");
                }}
                disabled={readOnly || !wo}
                className={selectTriggerClass}
              >
                <option value="">{wo ? "Select In-Process" : "Pick a work order first"}</option>
                {wo?.inProcesses?.map((ip: any) => (
                  <option key={ip.id} value={ip.id}>{ip.description}</option>
                ))}
              </SearchableSelect>
            </Field>
            <Field label="Main Process" required help={inProcess && mainOptions.length === 0 ? "No WIP or completed steps on this in-process yet" : undefined}>
              <SearchableSelect
                value={mainProcessId}
                onChange={(e) => {
                  setMainProcessId(e.target.value);
                  setRoutingProcessId("");
                }}
                disabled={readOnly || !inProcess}
                className={selectTriggerClass}
              >
                <option value="">Select Main Process</option>
                {mainOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.process}</option>
                ))}
              </SearchableSelect>
            </Field>
            <Field label="Routing Process" required help={inProcess ? "Only WIP or completed steps" : undefined}>
              <SearchableSelect
                value={routingProcessId}
                onChange={(e) => {
                  const rp = eligibleSteps.find((r: any) => r.id === e.target.value);
                  setRoutingProcessId(e.target.value);
                  if (rp?.mainProcessId) setMainProcessId(rp.mainProcessId);
                }}
                disabled={readOnly || !inProcess}
                className={selectTriggerClass}
              >
                <option value="">Select Routing Process</option>
                {routingOptions.map((rp: any) => (
                  <option key={rp.id} value={rp.id}>
                    {rp.routingProcess?.routingProcess || "—"} · {rp.status}
                  </option>
                ))}
              </SearchableSelect>
            </Field>
            <Field label="Requestor" required>{employeeSelect(requestorId, setRequestorId)}</Field>
            <Field label="Responsible Party">{employeeSelect(responsiblePartyId, setResponsiblePartyId)}</Field>
          </div>
        </Card>

        {/* 2. What went wrong and what to do with it */}
        <Card icon={FileWarning} tone="rose" title="Non-conformance & disposition" description="The problem, and what happens to the rejected quantity" className="h-full">
          <div className="space-y-3">
            <Field label="Description of Non-Conformance / Problem" required>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={readOnly} rows={4} className={textareaClass} />
            </Field>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-end">
              <Field label="NCR Quantity" required help={wo?.quantity != null ? `WO quantity ${Number(wo.quantity)}` : undefined}>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={ncrQuantity}
                  onChange={(e) => setNcrQuantity(Number(e.target.value))}
                  disabled={readOnly}
                  className={`${inputClass} text-right font-semibold tabular-nums`}
                />
              </Field>
              <div
                className={`flex h-8 items-center justify-between gap-3 rounded-md border px-3 text-[13px] ${
                  unallocated === 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : unallocated > 0
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {unallocated === 0 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {unallocated === 0 ? "Fully allocated" : unallocated > 0 ? `${unallocated} not yet allocated` : `${-unallocated} over-allocated`}
                </span>
                <span className="tabular-nums">
                  {allocated} / {ncrQuantity}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {qtyInput(reworkQuantity, setReworkQuantity, "Rework")}
              {qtyInput(useAsIsQuantity, setUseAsIsQuantity, "Use-As-Is")}
              {qtyInput(scrapQuantity, setScrapQuantity, "Scrap")}
              {qtyInput(otherQuantity, setOtherQuantity, "Other")}
            </div>
            {overWoQty && (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
                <AlertTriangle size={12} /> More than the WO quantity. The spec caps one NCR at the WO quantity; raise another NCR for the rest.
              </p>
            )}
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field label="Other Decisions" help={otherQuantity > 0 ? "What the Other quantity is for" : undefined}>
                <input type="text" value={otherDecisions} onChange={(e) => setOtherDecisions(e.target.value)} disabled={readOnly} className={inputClass} />
              </Field>
              <Field label="Customer Acceptance for Use-As-Is">
                <Segmented
                  options={[{ value: "" as YesNo, label: "—" }, { value: "No" as YesNo }, { value: "Yes" as YesNo }]}
                  value={customerAcceptance}
                  onChange={setCustomerAcceptance}
                  disabled={readOnly}
                  ariaLabel="Customer acceptance for use-as-is"
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* 3. Analysis */}
        <Card icon={SearchCheck} tone="amber" title="Analysis" description="Department, failure modes and whether corrective action is needed" className="h-full">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field label="Department">
                <SearchableSelect value={department} onChange={(e) => setDepartment(e.target.value)} disabled={readOnly} className={selectTriggerClass}>
                  <option value="">Select Department</option>
                  {formData.departments?.map((dept: any) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="Corrective Action">
                <Segmented
                  options={[{ value: "" as YesNo, label: "—" }, { value: "No" as YesNo }, { value: "Yes" as YesNo }]}
                  value={correctiveAction}
                  onChange={setCorrectiveAction}
                  disabled={readOnly}
                  ariaLabel="Corrective action"
                />
              </Field>
            </div>
            <Field label="Reason to Justify" help={correctiveAction !== "No" ? "Only when Corrective Action is No" : undefined}>
              <textarea
                value={reasonToJustify}
                onChange={(e) => setReasonToJustify(e.target.value)}
                disabled={readOnly || correctiveAction !== "No"}
                rows={2}
                className={textareaClass}
              />
            </Field>
            <Field label={`Failure Modes${failureModeIds.length ? ` (${failureModeIds.length})` : ""}`}>
              <div className="flex flex-wrap gap-1.5">
                {formData.failureModes.map((fm: any) => {
                  const on = failureModeIds.includes(fm.id);
                  return (
                    <button
                      key={fm.id}
                      type="button"
                      aria-pressed={on}
                      disabled={readOnly}
                      onClick={() => setFailureModeIds(on ? failureModeIds.filter((f) => f !== fm.id) : [...failureModeIds, fm.id])}
                      className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                        on ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {on && <CheckCircle2 size={12} />} {fm.failureMode}
                    </button>
                  );
                })}
                {formData.failureModes.length === 0 && <span className="text-xs text-slate-400">No failure modes in the profile.</span>}
              </div>
            </Field>
          </div>
        </Card>

        {/* 4. Root cause, actions and verification */}
        <Card icon={ClipboardCheck} tone="emerald" title="Root cause, actions & verification" description="Usually filled from the printed NCR; verification is required to close" className="h-full">
          <div className="space-y-4">
            <ActionBlock
              label="Root Cause"
              text={rootCause}
              onText={setRootCause}
              staff={employeeSelect(rootCauseStaffId, setRootCauseStaffId)}
              date={rootCauseDate}
              onDate={setRootCauseDate}
              readOnly={readOnly}
            />
            <ActionBlock
              label="Corrective / Preventive Action"
              text={cpa}
              onText={setCpa}
              staff={employeeSelect(cpaStaffId, setCpaStaffId)}
              date={cpaDate}
              onDate={setCpaDate}
              readOnly={readOnly}
            />
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <Field label="Follow-Up / Verification of Correction">
                <textarea value={followUp} onChange={(e) => setFollowUp(e.target.value)} disabled={readOnly} rows={2} className={textareaClass} />
              </Field>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
                <Field label="Action Taken">
                  <select value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} disabled={readOnly} className={`${selectTriggerClass} w-full`}>
                    <option value="">—</option>
                    <option value="Acceptable">Acceptable</option>
                    <option value="Not Acceptable">Not Acceptable</option>
                  </select>
                </Field>
                <Field label="Verified / Confirmed By" help={readOnly ? undefined : "Required to close"}>
                  {employeeSelect(verifiedById, setVerifiedById)}
                </Field>
                <Field label="Verified Date" help={readOnly ? undefined : "Required to close"}>
                  <input type="date" value={verifiedDate} onChange={(e) => setVerifiedDate(e.target.value)} disabled={readOnly} className={inputClass} />
                </Field>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="truncate text-slate-800" title={value || undefined}>{value || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

function ActionBlock({
  label,
  text,
  onText,
  staff,
  date,
  onDate,
  readOnly,
}: {
  label: string;
  text: string;
  onText: (v: string) => void;
  staff: React.ReactNode;
  date: string;
  onDate: (v: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-2">
      <Field label={label}>
        <textarea value={text} onChange={(e) => onText(e.target.value)} disabled={readOnly} rows={2} className={textareaClass} />
      </Field>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label="Responsible Staff" size="sm">{staff}</Field>
        <Field label="Date" size="sm">
          <input type="date" value={date} onChange={(e) => onDate(e.target.value)} disabled={readOnly} className={inputClass} />
        </Field>
      </div>
    </div>
  );
}
