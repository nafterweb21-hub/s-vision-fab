"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  FileText,
  AlertCircle,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Lock,
  Package,
  ShoppingCart,
  StickyNote,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  Badge,
  Card,
  EmptyState,
  Field,
  MetaChip,
  StatusBadge,
  buttonClass,
  iconButtonDangerClass,
  inputClass,
  inputSmClass,
  readOnlyClass,
  selectTriggerClass,
  selectTriggerSmClass,
  textareaClass,
} from "@/components/form-ui";
import {
  linkedPoNos,
  poQtyInPrUom,
  prLineBalance,
  prLineRemoveBlockReason,
  prLineUomChangeBlockReason,
  prPoStatusTone,
  prStatusTone,
} from "../pr-status";
type FormData = {
  companies: { id: string; companyName: string; allowPoForWo: boolean }[];
  employees: { id: string; name: string; email: string; code: string }[];
  workOrders: { workOrderNo: string; jobDescription: string | null }[];
  materials: { id: string; partNo: string | null; description: string; shape: string; size: string | null }[];
  uoms: { id: string; uomName: string }[];
};

type Item = {
  id?: string;
  fromMaterialProfile: boolean;
  materialProfileId: string;
  material: string;
  description: string;
  shape: string;
  size: string;
  uomId: string;
  quantity: string;
  cancelQuantity: string;
  deliveryDate: string;
  remark: string;
  poQuantityIssued: string;
  /** POs (not Void / Old Version) holding quantity on this line; such a line can't be removed or change UOM. */
  linkedPoNos?: string[];
  /** POs whose line UOM can't be converted to this line's UOM; left out of PO Qty. */
  uomMismatchPoNos?: string[];
};

export default function PurchaseRequisitionEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";

  const [data, setData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [meta, setMeta] = useState<{ prNo?: string; revision?: number; status?: string; poStatus?: string }>({});

  const [companyId, setCompanyId] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [workOrderNo, setWorkOrderNo] = useState("");
  const [requestedById, setRequestedById] = useState("");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<Item[]>([
    {
      fromMaterialProfile: true,
      materialProfileId: "",
      material: "",
      description: "",
      shape: "",
      size: "",
      uomId: "",
      quantity: "1.00",
      cancelQuantity: "0.00",
      deliveryDate: new Date().toISOString().slice(0, 10),
      remark: "",
      poQuantityIssued: "0.00",
    },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const fd = await fetch("/api/purchasing/purchase-requisition/form-data").then((r) => r.json());
        setData(fd);

        if (!isNew) {
          const pr = await fetch(`/api/purchasing/purchase-requisition/${id}`).then((r) => r.json());
          if (pr.error) throw new Error(pr.error);
          setMeta({ prNo: pr.prNo, revision: pr.revision, status: pr.status, poStatus: pr.poStatus });
          setReadOnly(pr.status !== "Draft");
          setCompanyId(pr.companyId);
          setDate(new Date(pr.date).toISOString().slice(0, 10));
          setWorkOrderNo(pr.workOrderNo || "");
          setRequestedById(pr.requestedById);
          setRemark(pr.remark || "");
          setItems(
            pr.items.map((it: any) => ({
              id: it.id,
              fromMaterialProfile: it.fromMaterialProfile,
              materialProfileId: it.materialProfileId || "",
              material: it.material || "",
              description: it.description,
              shape: it.shape || "",
              size: it.size || "",
              uomId: it.uomId,
              quantity: Number(it.quantity).toFixed(2),
              cancelQuantity: Number(it.cancelQuantity || 0).toFixed(2),
              deliveryDate: new Date(it.deliveryDate).toISOString().slice(0, 10),
              remark: it.remark || "",
              poQuantityIssued: Number(it.poQuantityIssued || 0).toFixed(2),
              linkedPoNos: linkedPoNos(it),
              uomMismatchPoNos: linkedPoNos({
                purchaseOrderItems: (it.purchaseOrderItems ?? []).filter((po: Parameters<typeof poQtyInPrUom>[1]) => poQtyInPrUom(it.uomId, po) === null),
              }),
            })),
          );
        } else {
          // Defaults
          if (fd.companies.length > 0) setCompanyId(fd.companies[0].id);
          if (fd.employees.length > 0) setRequestedById(fd.employees[0].id);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const selectedCompany = useMemo(
    () => data?.companies.find((c) => c.id === companyId) || null,
    [data, companyId],
  );

  const selectedWorkOrder = useMemo(
    () => data?.workOrders.find((w) => w.workOrderNo === workOrderNo) || null,
    [data, workOrderNo],
  );

  // If company doesn't allow WO, clear selection
  useEffect(() => {
    if (selectedCompany && !selectedCompany.allowPoForWo) {
      setWorkOrderNo("");
    }
  }, [selectedCompany]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((cur) =>
      cur.map((it, i) => {
        if (i !== idx) return it;

        const updated = { ...it, ...patch };

        // Auto-populate from profile
        if (patch.fromMaterialProfile !== undefined) {
          // Toggle profile/freetext
          updated.materialProfileId = "";
          updated.material = "";
          updated.description = "";
          updated.shape = "";
          updated.size = "";
        } else if (updated.fromMaterialProfile && patch.materialProfileId) {
          const profile = data?.materials.find((m) => m.id === patch.materialProfileId);
          if (profile) {
            updated.material = profile.partNo || "";
            updated.description = profile.description;
            updated.shape = profile.shape;
            updated.size = profile.size || "";
          }
        }

        return updated;
      }),
    );
  }

  function addItem() {
    setItems((cur) => [
      ...cur,
      {
        fromMaterialProfile: true,
        materialProfileId: "",
        material: "",
        description: "",
        shape: "",
        size: "",
        uomId: "",
        quantity: "1.00",
        cancelQuantity: "0.00",
        deliveryDate: new Date().toISOString().slice(0, 10),
        remark: "",
        poQuantityIssued: "0.00",
      },
    ]);
  }

  function removeItem(idx: number) {
    setItems((cur) => cur.filter((_, i) => i !== idx));
  }

  async function onSave() {
    setError("");

    // Date validations
    const inputDate = new Date(date);
    inputDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (inputDate < today) {
      return setError("Backdate is not allowed for Purchase Requisition Date.");
    }

    if (!companyId) return setError("Company is required");
    if (!requestedById) return setError("Requested By (Requisitioner) is required");
    if (!items.length) return setError("At least one item is required");

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const ln = i + 1;
      if (it.fromMaterialProfile && !it.materialProfileId) {
        return setError(`Line ${ln}: Material Profile is required`);
      }
      if (!it.fromMaterialProfile && !it.description.trim()) {
        return setError(`Line ${ln}: Description is required for free-text items`);
      }
      if (!it.uomId) {
        return setError(`Line ${ln}: UOM is required`);
      }
      const qty = Number(it.quantity);
      if (isNaN(qty) || qty <= 0) {
        return setError(`Line ${ln}: Quantity must be a positive number`);
      }
      const cancel = Number(it.cancelQuantity || 0);
      if (isNaN(cancel) || cancel < 0) {
        return setError(`Line ${ln}: Cancel Quantity cannot be negative`);
      }
      if (cancel > qty) {
        return setError(`Line ${ln}: Cancel Quantity cannot exceed Quantity`);
      }
      if (!it.deliveryDate) {
        return setError(`Line ${ln}: Delivery Date is required`);
      }
    }

    setSaving(true);
    try {
      const payload = {
        companyId,
        date,
        workOrderNo: workOrderNo || null,
        requestedById,
        remark,
        items: items.map((it, idx) => ({
          id: it.id,
          fromMaterialProfile: it.fromMaterialProfile,
          materialProfileId: it.fromMaterialProfile ? it.materialProfileId : null,
          material: it.material || null,
          description: it.description,
          shape: it.shape || null,
          size: it.size || null,
          uomId: it.uomId,
          quantity: Number(it.quantity),
          cancelQuantity: Number(it.cancelQuantity || 0),
          deliveryDate: it.deliveryDate,
          remark: it.remark || null,
          sortOrder: idx,
        })),
      };

      const url = isNew ? `/api/purchasing/purchase-requisition` : `/api/purchasing/purchase-requisition/${id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }

      const saved = await res.json();
      router.push(`/dashboard/saved?module=Purchase Requisition&id=${saved.prNo || saved.id}&viewUrl=/dashboard/purchasing/purchase-requisition/${saved.id}&backUrl=/dashboard/purchasing/purchase-requisition`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-12">
        <Loader2 className="animate-spin text-indigo-600" size={22} />
        <p className="text-xs text-slate-500">Loading…</p>
      </div>
    );
  }

  // ---- Display-only derived values (no effect on the payload) ----
  const status = isNew ? "Draft" : meta.status || "Draft";
  const poStatus = isNew ? "N/A" : meta.poStatus || "N/A";
  const requesterName = data?.employees.find((e) => e.id === requestedById)?.name || "";
  const lineFigures = items.map((it) => {
    const qtyVal = Number(it.quantity) || 0;
    const cancelVal = Number(it.cancelQuantity) || 0;
    // Same rule as the server recompute: balance floors at 0, any excess is shown as over-ordered.
    const { prQty, issued: poQty, balance: balReq, overOrdered } = prLineBalance(qtyVal, cancelVal, it.poQuantityIssued);
    const coverage = prQty > 0 ? Math.min(Math.max(poQty / prQty, 0), 1) * 100 : 0;
    return { qtyVal, cancelVal, prQty, poQty, balReq, overOrdered, coverage };
  });
  const totalQty = lineFigures.reduce((s, f) => s + f.qtyVal, 0);
  const totalCancel = lineFigures.reduce((s, f) => s + f.cancelVal, 0);
  const totalPr = lineFigures.reduce((s, f) => s + f.prQty, 0);
  const totalPo = lineFigures.reduce((s, f) => s + f.poQty, 0);
  const totalBal = lineFigures.reduce((s, f) => s + f.balReq, 0);
  const totalCoverage = totalPr > 0 ? Math.min(Math.max(totalPo / totalPr, 0), 1) * 100 : 0;
  const requiredBy = items
    .map((it) => it.deliveryDate)
    .filter(Boolean)
    .sort()[0];
  const showWorkOrder = !selectedCompany || selectedCompany.allowPoForWo;
  const materialLabel = (it: Item) => {
    if (it.fromMaterialProfile) {
      const m = data?.materials.find((x) => x.id === it.materialProfileId);
      return m ? `${m.partNo ? `${m.partNo} · ` : ""}${m.description}` : "";
    }
    return [it.material, it.description].filter((s) => s && s.trim()).join(" · ");
  };

  return (
    <div className="w-full space-y-4">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/purchasing/purchase-requisition" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Purchase Requisitions
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {isNew || !meta.prNo ? (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">
                  {isNew ? "New Requisition" : "Edit Requisition"}
                </h1>
              ) : (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">PR</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">
                    {meta.prNo}-R{meta.revision}
                  </span>
                </h1>
              )}
              <StatusBadge status={status} tone={prStatusTone(status)} size="md" label={isNew ? "New · Draft" : status} />
              {!isNew && (
                <Badge tone={prPoStatusTone(poStatus)} icon={ShoppingCart} size="md">
                  PO {poStatus}
                </Badge>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={UserRound} title="Requested by">{requesterName || "No requester yet"}</MetaChip>
              {selectedCompany && (
                <MetaChip icon={Building2} title="Company">{selectedCompany.companyName}</MetaChip>
              )}
              <MetaChip icon={CalendarDays} label="PR" title="PR date">{fmtDate(date)}</MetaChip>
              {requiredBy && (
                <MetaChip icon={CalendarClock} label="Needed" title="Earliest line delivery date">{fmtDate(requiredBy)}</MetaChip>
              )}
              <MetaChip icon={Wrench} label="WO" title={selectedWorkOrder?.jobDescription || "Work order"}>
                {workOrderNo || "Non Work Order"}
              </MetaChip>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => router.push("/dashboard/purchasing/purchase-requisition")} className={buttonClass("ghost", "md")}>
              Back
            </button>
            {readOnly && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            )}
            <button type="button" onClick={onSave} disabled={saving || readOnly} className={buttonClass("primary", "md")}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save"}
            </button>
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
            This purchase requisition is <strong className="font-semibold text-slate-800">{meta.status}</strong> — read-only.
          </span>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          {/* Header fields */}
          <Card icon={FileText} tone="indigo" title="Requisition details" description="Company, requester and work order">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Company" required>
                <SearchableSelect
                  value={companyId}
                  disabled={readOnly || !isNew}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className={selectTriggerClass}
                >
                  <option value="">— Select —</option>
                  {data?.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </SearchableSelect>
              </Field>

              <Field label="PR Date" required>
                <input
                  type="date"
                  value={date}
                  disabled={readOnly}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Requested By (Employee)" required>
                <SearchableSelect
                  value={requestedById}
                  disabled={readOnly}
                  onChange={(e) => setRequestedById(e.target.value)}
                  className={selectTriggerClass}
                >
                  <option value="">— Select —</option>
                  {data?.employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.code})
                    </option>
                  ))}
                </SearchableSelect>
              </Field>

              {showWorkOrder && (
                <Field label="Work Order">
                  <SearchableSelect
                    value={workOrderNo}
                    disabled={readOnly}
                    onChange={(e) => setWorkOrderNo(e.target.value)}
                    className={selectTriggerClass}
                  >
                    <option value="">— None (Non Work Order) —</option>
                    {data?.workOrders.map((w) => (
                      <option key={w.workOrderNo} value={w.workOrderNo}>
                        {w.workOrderNo}
                      </option>
                    ))}
                  </SearchableSelect>
                </Field>
              )}

              {workOrderNo && (
                <Field label="Work Description" className="sm:col-span-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedWorkOrder?.jobDescription || ""}
                    placeholder="No description available"
                    className={readOnlyClass}
                  />
                </Field>
              )}
            </div>
          </Card>

          {/* Items */}
          <Card
            icon={Package}
            tone="amber"
            title={
              <span className="inline-flex items-center gap-1.5">
                Requisition Items
                {items.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-1.5 text-[11px] font-semibold tabular-nums text-amber-700 ring-1 ring-inset ring-amber-600/15">
                    {items.length}
                  </span>
                )}
              </span>
            }
            description="Requested quantity vs PO quantity issued"
            actions={
              !readOnly && items.length > 0 ? (
                <button type="button" onClick={addItem} className={buttonClass("link", "sm")}>
                  <Plus size={14} /> Add Item
                </button>
              ) : undefined
            }
          >
            {items.length === 0 ? (
              <EmptyState
                boxed
                icon={Package}
                tone="amber"
                title="No items yet"
                description="Add the materials you need. Pick from the Material Profile or describe a non-profile item in free text."
                action={
                  !readOnly && (
                    <button type="button" onClick={addItem} className={buttonClass("primary", "md")}>
                      <Plus size={14} /> Add first item
                    </button>
                  )
                }
              />
            ) : (
              <div className="space-y-3">
                {items.map((it, idx) => {
                  const { prQty, poQty, balReq, overOrdered, coverage } = lineFigures[idx];
                  const removeBlock = prLineRemoveBlockReason(idx + 1, it.linkedPoNos ?? []);
                  const uomBlock = prLineUomChangeBlockReason(idx + 1, it.linkedPoNos ?? []);
                  const label = materialLabel(it);
                  const full = prQty > 0 && poQty + 1e-9 >= prQty;
                  return (
                    <div key={idx} className="overflow-hidden rounded-lg border border-slate-200 border-l-2 border-l-amber-500 bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-1.5">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-semibold tabular-nums text-white">
                            {idx + 1}
                          </span>
                          <Badge tone={it.fromMaterialProfile ? "indigo" : "violet"}>
                            {it.fromMaterialProfile ? "Profile" : "FreeText"}
                          </Badge>
                          <span className={`truncate text-xs ${label ? "font-semibold text-slate-800" : "italic text-slate-400"}`} title={label || undefined}>
                            {label || (it.fromMaterialProfile ? "Select a material" : "Describe the item")}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="flex items-center gap-2" title={`PO Qty ${poQty.toFixed(2)} of PR Qty ${prQty.toFixed(2)}`}>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 sm:w-24">
                              <div
                                className={`h-full rounded-full ${full ? "bg-emerald-500" : poQty > 0 ? "bg-sky-500" : "bg-slate-300"}`}
                                style={{ width: `${coverage}%` }}
                              />
                            </div>
                            <span className="text-[11px] tabular-nums text-slate-500">
                              <span className="font-semibold text-slate-800">{poQty.toFixed(2)}</span> / {prQty.toFixed(2)}
                            </span>
                          </div>
                          {!readOnly && (
                            <button type="button" onClick={() => removeItem(idx)} disabled={!!removeBlock} title={removeBlock ?? "Remove"} className={iconButtonDangerClass}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-3 lg:grid-cols-6">
                        <Field size="sm" label="Type">
                          <SearchableSelect
                            compact
                            value={it.fromMaterialProfile ? "Profile" : "Free"}
                            disabled={readOnly}
                            onChange={(e) => updateItem(idx, { fromMaterialProfile: e.target.value === "Profile" })}
                            className={selectTriggerSmClass}
                          >
                            <option value="Profile">Profile</option>
                            <option value="Free">FreeText</option>
                          </SearchableSelect>
                        </Field>

                        <Field size="sm" label={it.fromMaterialProfile ? "Material Profile" : "Material"} required={it.fromMaterialProfile} className="lg:col-span-2">
                          {it.fromMaterialProfile ? (
                            <SearchableSelect
                              compact
                              value={it.materialProfileId}
                              disabled={readOnly}
                              onChange={(e) => updateItem(idx, { materialProfileId: e.target.value })}
                              className={selectTriggerSmClass}
                            >
                              <option value="">— Select —</option>
                              {data?.materials.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.partNo ? `${m.partNo} — ` : ""}{m.description.slice(0, 30)}
                                </option>
                              ))}
                            </SearchableSelect>
                          ) : (
                            <textarea
                              rows={1}
                              value={it.material}
                              disabled={readOnly}
                              onChange={(e) => updateItem(idx, { material: e.target.value.replace(/\n/g, " ") })}
                              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                              className={lineTextareaClass}
                              placeholder="e.g. PART-A"
                            />
                          )}
                        </Field>

                        <Field size="sm" label="Description" required={!it.fromMaterialProfile} className="col-span-2 lg:col-span-3">
                          <textarea
                            rows={1}
                            value={it.description}
                            disabled={readOnly || it.fromMaterialProfile}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            className={lineTextareaClass}
                            placeholder="Material description"
                          />
                        </Field>

                        <Field size="sm" label="Shape">
                          <input
                            type="text"
                            value={it.shape}
                            disabled={readOnly || it.fromMaterialProfile}
                            onChange={(e) => updateItem(idx, { shape: e.target.value })}
                            className={inputSmClass}
                            placeholder="Shape"
                          />
                        </Field>

                        <Field size="sm" label="Size">
                          <input
                            type="text"
                            value={it.size}
                            disabled={readOnly || it.fromMaterialProfile}
                            onChange={(e) => updateItem(idx, { size: e.target.value })}
                            className={inputSmClass}
                            placeholder="Size"
                          />
                        </Field>

                        <Field size="sm" label="Qty" required>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.quantity}
                            disabled={readOnly}
                            onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                            className={`${inputSmClass} text-right tabular-nums`}
                            placeholder="Qty"
                          />
                        </Field>

                        <Field size="sm" label="UOM" required>
                          <div title={uomBlock ?? undefined}>
                          <SearchableSelect
                            compact
                            value={it.uomId}
                            disabled={readOnly || !!uomBlock}
                            onChange={(e) => updateItem(idx, { uomId: e.target.value })}
                            className={selectTriggerSmClass}
                          >
                            <option value="">—</option>
                            {data?.uoms.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.uomName}
                              </option>
                            ))}
                          </SearchableSelect>
                          </div>
                        </Field>

                        <Field size="sm" label="Cancel Qty">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.cancelQuantity}
                            disabled={readOnly}
                            onChange={(e) => updateItem(idx, { cancelQuantity: e.target.value })}
                            className={`${inputSmClass} text-right tabular-nums`}
                            placeholder="Cancel"
                          />
                        </Field>

                        <Field size="sm" label="Delivery Date" required>
                          <input
                            type="date"
                            value={it.deliveryDate}
                            disabled={readOnly}
                            onChange={(e) => updateItem(idx, { deliveryDate: e.target.value })}
                            className={`${inputSmClass} px-1.5`}
                          />
                        </Field>

                        <Field size="sm" label="Remark" className="col-span-2 lg:col-span-3">
                          <textarea
                            rows={1}
                            value={it.remark}
                            disabled={readOnly}
                            onChange={(e) => updateItem(idx, { remark: e.target.value })}
                            className={lineRemarkClass}
                            placeholder="Remark"
                          />
                        </Field>

                        <div className="col-span-2 grid grid-cols-3 gap-1.5 lg:col-span-3">
                          <QtyStat label="PR Qty" value={prQty} tone="slate" />
                          <QtyStat label="PO Qty" value={poQty} tone="sky" />
                          <QtyStat label="Bal Req" value={balReq} tone={balReq > 0 ? "amber" : "emerald"} strong />
                          {overOrdered > 0 && (
                            <p className="col-span-3 text-[11px] text-amber-700">Over-ordered by {overOrdered.toFixed(2)}</p>
                          )}
                          {!!it.uomMismatchPoNos?.length && (
                            <p className="col-span-3 text-[11px] text-rose-700">
                              {it.uomMismatchPoNos.join(", ")}: PO UOM differs from this line&apos;s UOM with no conversion; not counted in PO Qty.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* General remarks */}
          <Card icon={StickyNote} tone="violet" title="Remark / Special Instructions" description="Notes for the purchaser">
            <textarea
              rows={3}
              value={remark}
              disabled={readOnly}
              onChange={(e) => setRemark(e.target.value)}
              className={textareaClass}
              placeholder="Input any additional details for this purchase requisition..."
              aria-label="Remark / Special Instructions"
            />
          </Card>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4 xl:sticky xl:top-28 xl:self-start">
          {/* Summary — dark anchor echoing the sidebar */}
          <section className="overflow-hidden rounded-xl bg-[#111827] text-slate-300 shadow-lg shadow-slate-900/10 ring-1 ring-white/5">
            <header className="flex items-center gap-2.5 border-b border-white/10 px-4 py-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/20">
                <ClipboardList size={15} />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold leading-tight text-white">Summary</h2>
                <p className="text-[11px] leading-tight text-slate-400">Live quantities for this requisition</p>
              </div>
            </header>
            <dl className="space-y-2 px-4 py-3 text-[13px]">
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Lines</dt>
                <dd className="tabular-nums text-slate-200">{items.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Total qty</dt>
                <dd className="tabular-nums text-slate-200">{totalQty.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Cancelled qty</dt>
                <dd className="tabular-nums text-slate-200">{totalCancel.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">PR qty</dt>
                <dd className="tabular-nums text-slate-200">{totalPr.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">PO qty issued</dt>
                <dd className="tabular-nums text-slate-200">{totalPo.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Balance require purchase</dt>
                <dd className="tabular-nums text-slate-200">{totalBal.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Estimated value</dt>
                <dd className="text-[11px] text-slate-500">Priced on the PO</dd>
              </div>
            </dl>
            <div className="relative border-t border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-gradient-to-b from-indigo-400 to-violet-500" />
              <div className="flex items-baseline justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-300">PO coverage</p>
                <p className="text-[11px] text-slate-400">PO {poStatus}</p>
              </div>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-white">
                {totalCoverage.toFixed(0)}
                <span className="ml-0.5 text-sm font-medium text-indigo-300">%</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500"
                  style={{ width: `${totalCoverage}%` }}
                />
              </div>
            </div>
          </section>

          <Card icon={ShoppingCart} tone="sky" title="Purchasing flow" description="What happens after submit">
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                A Submitted PR can be converted to one or more POs.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                Supplier, unit price and amount are captured on the PO, not the PR.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                Use Cancel Qty for items you decide not to buy.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

const QTY_STAT_TONE: Record<"slate" | "sky" | "amber" | "emerald", string> = {
  slate: "bg-slate-50 text-slate-800 ring-slate-500/10",
  sky: "bg-sky-50 text-sky-800 ring-sky-600/15",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/15",
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
};

function QtyStat({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: number;
  tone: "slate" | "sky" | "amber" | "emerald";
  strong?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-col justify-center rounded-md px-2 py-1 ring-1 ring-inset ${QTY_STAT_TONE[tone]}`} title={label}>
      <span className="truncate text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</span>
      <span className={`text-right text-[13px] tabular-nums ${strong ? "font-semibold" : "font-medium"}`}>{value.toFixed(2)}</span>
    </div>
  );
}

const lineTextareaClass =
  "block min-h-7 w-full resize-none break-words rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] leading-snug text-slate-900 placeholder:text-slate-400 transition-colors field-sizing-content focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const lineRemarkClass =
  "block min-h-7 w-full resize-y break-words rounded-md border border-slate-300 bg-white px-2 py-1 text-xs leading-snug text-slate-900 placeholder:text-slate-400 transition-colors field-sizing-content focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
