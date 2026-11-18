/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  Hash,
  Loader2,
  Lock,
  Package,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
import {
  Card,
  EmptyState,
  Field,
  MetaChip,
  StatusBadge,
  buttonClass,
  checkboxClass,
  iconButtonDangerClass,
  inputClass,
  inputSmClass,
  readOnlyClass,
  selectTriggerClass,
  selectTriggerSmClass,
  textareaClass,
  textareaSmClass,
} from "@/components/form-ui";
import { doStatusTone, isDoDraft, normalizeDoStatus } from "../do-status";

const DEFAULT_RETURNABLE_NOTE = "Not for sale\nSend for testing and return";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function DeliveryOrderFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [formData, setFormData] = useState<any>({
    doNo: "",
    date: new Date().toISOString().split("T")[0],
    customerId: "",
    salesOrderId: "",
    cocRequired: false,
    poNo: "",
    vehicleNo: "",
    modeOfTransport: "",
    isReturnable: false,
    returnableNote: "",
    items: [],
  });

  const [metadata, setMetadata] = useState<any>({
    customers: [],
    salesOrders: [],
    workOrders: [],
    uoms: [],
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [status, setStatus] = useState("Draft");

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        // Exclude this DO so "already delivered" only counts other non-void DOs.
        const res = await fetch(`/api/sales/delivery-order/form-data${id ? `?excludeDoId=${encodeURIComponent(id)}` : ""}`);
        if (res.ok) {
          const data = await res.json();
          setMetadata(data);
        }
      } catch {
        console.error("Failed to fetch metadata");
      }
    };

    const fetchDeliveryOrder = async () => {
      try {
        const res = await fetch(`/api/sales/delivery-order/${id}`);
        if (!res.ok) throw new Error("Failed to fetch DO details");
        const data = await res.json();
        setFormData({
          ...data,
          date: new Date(data.date).toISOString().split("T")[0],
          poNo: data.poNo || "",
          vehicleNo: data.vehicleNo || "",
          modeOfTransport: data.modeOfTransport || "",
          isReturnable: !!data.isReturnable,
          returnableNote: data.returnableNote || "",
        });
        setStatus(data.status);
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchMetadata();
    if (id) {
      fetchDeliveryOrder();
    }
  }, [id]);

  // Client-side checks shared by Save and Submit; the server re-checks everything.
  const validate = (): string | null => {
    // doNo is assigned by the server on create, so it is not asked for here.
    if (!formData.customerId || !formData.salesOrderId) return "Please fill in Customer and Sales Order.";
    if (formData.items.length === 0) return "Please add at least one work order item.";
    const over = overWorkOrders();
    if (over.length) {
      return `Quantity exceeds the remaining work order balance: ${over
        .map((o) => `${o.workOrderNo} (delivering ${fmtQty(o.delivering)}, only ${fmtQty(o.remaining)} remain)`)
        .join(", ")}.`;
    }
    return null;
  };

  // Saves the current form (POST when new, PUT when editing) and returns the
  // saved record; throws with the server's message on failure.
  const persist = async (): Promise<{ id: string; doNo: string }> => {
    const url = isEdit ? `/api/sales/delivery-order/${id}` : "/api/sales/delivery-order";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "Failed to save Delivery Order");

    const savedId = resData.id || id || "";
    const savedNo = resData.doNo || formData.doNo || savedId;
    return { id: savedId, doNo: savedNo };
  };

  const handleSave = async () => {
    const invalid = validate();
    if (invalid) {
      setErrorMsg(invalid);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const saved = await persist();
      router.push(`/dashboard/saved?module=Delivery Order&id=${saved.doNo}&viewUrl=/dashboard/sales/delivery-order/form?id=${saved.id}&backUrl=/dashboard/sales/delivery-order`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit saves the current form first (so unsaved edits are not lost), then
  // submits the saved record only if the save succeeded.
  const handleSubmit = async () => {
    const invalid = validate();
    if (invalid) {
      setErrorMsg(invalid);
      return;
    }
    if (!await customConfirm("Save and submit this Delivery Order? This action cannot be undone.")) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const saved = await persist();
      // A new DO now exists: point the page at it so a retry updates it instead of creating another.
      if (!isEdit) router.replace(`/dashboard/sales/delivery-order/form?id=${saved.id}`);

      const res = await fetch(`/api/sales/delivery-order/${saved.id}/submit`, { method: "POST" });
      const resData = await res.json();
      if (!res.ok) throw new Error(`Saved, but not submitted: ${resData.error || "Failed to submit"}`);
      const savedId = resData.id || saved.id;
      const savedNo = resData.doNo || saved.doNo || savedId;
      router.push(`/dashboard/saved?module=Delivery Order (Submitted)&id=${savedNo}&viewUrl=/dashboard/sales/delivery-order/form?id=${savedId}&backUrl=/dashboard/sales/delivery-order`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData((prev: any) => ({
      ...prev,
      items: [
        ...prev.items,
        { workOrderNo: "", description: "", quantity: 0, uomId: "", totalValue: "", deliveryDate: "" },
      ],
    }));
  };

  // Total Value defaults to DO qty × the SO line's unit price; the user may overwrite it.
  const unitPriceFor = (workOrderNo: string, salesOrderId = formData.salesOrderId): number | null => {
    const so = metadata.salesOrders.find((s: any) => s.id === salesOrderId);
    const p = so?.woUnitPrices?.[workOrderNo];
    return p == null ? null : Number(p);
  };
  const suggestedValue = (item: any): string => {
    const p = unitPriceFor(item.workOrderNo);
    return p == null ? "" : (Number(item.quantity || 0) * p).toFixed(2);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const prevItem = newItems[index];
    // The value is still "automatic" if it is blank or matches the old qty × price;
    // anything else was typed by the user and is left alone.
    const wasAuto =
      prevItem.totalValue === "" || prevItem.totalValue == null ||
      Number(prevItem.totalValue).toFixed(2) === suggestedValue(prevItem);
    newItems[index] = { ...prevItem, [field]: value };

    // Auto-fill delivery date and quantity from WorkOrder metadata if selected
    if (field === "workOrderNo") {
      const wo = metadata.workOrders.find((w: any) => w.workOrderNo === value);
      if (wo) {
        // Default to what is still left to deliver on this WO (other DOs and other lines of this DO).
        const otherLines = newItems.reduce(
          (s: number, it: any, i: number) => (i !== index && it.workOrderNo === value ? s + (Number(it.quantity) || 0) : s),
          0,
        );
        newItems[index].quantity =
          wo.quantity == null ? 0 : Math.max(Number(wo.quantity) - (Number(wo.deliveredQty) || 0) - otherLines, 0);
        newItems[index].deliveryDate = wo.deliveryDate ? new Date(wo.deliveryDate).toISOString().split("T")[0] : "";
        // Find UOM by name if it exists
        if (wo.uom) {
          const u = metadata.uoms.find((um: any) => um.uomName === wo.uom);
          if (u) newItems[index].uomId = u.id;
        }
      }
    }

    if ((field === "workOrderNo" || field === "quantity") && wasAuto) {
      newItems[index].totalValue = suggestedValue(newItems[index]);
    }

    setFormData((prev: any) => ({ ...prev, items: newItems }));
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData((prev: any) => ({ ...prev, items: newItems }));
  };

  if (initialLoading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={22} />
      </div>
    );
  }

  const statusLabel = normalizeDoStatus(status);
  const isDraft = isDoDraft(status);

  // Filter Sales Orders and Work Orders based on selected Customer
  const filteredSalesOrders = formData.customerId
    ? metadata.salesOrders.filter((so: any) => so.customerId === formData.customerId)
    : metadata.salesOrders;

  // Work orders belong to a sales order line; only offer the selected SO's work orders.
  const selectedSalesOrder = metadata.salesOrders.find((so: any) => so.id === formData.salesOrderId);
  const soWorkOrderNos = new Set<string>(selectedSalesOrder?.workOrderNos || []);
  const metaWorkOrder = (item: any) => metadata.workOrders.find((w: any) => w.workOrderNo === item.workOrderNo);
  const partNameFor = (item: any): string => item.workOrder?.partName || metaWorkOrder(item)?.partName || "";
  // Ordered (WO) quantity for a line, from the loaded DO line or the form metadata. Display only.
  const woQtyFor = (item: any): number | null => {
    if (!item.workOrderNo) return null;
    const q = item.workOrder?.quantity ?? metaWorkOrder(item)?.quantity;
    return q == null || q === "" ? null : Number(q);
  };
  // Qty already on other non-void DOs for the line's WO (form-data excludes this DO).
  const prevDeliveredFor = (item: any): number => Number(metaWorkOrder(item)?.deliveredQty) || 0;
  // This DO's total for a WO, across every line that uses it.
  const thisDoQtyFor = (workOrderNo: string): number =>
    formData.items.reduce((s: number, it: any) => (it.workOrderNo === workOrderNo ? s + (Number(it.quantity) || 0) : s), 0);
  // Per distinct WO on this DO: ordered, previously delivered, delivering now, remaining before this DO.
  const woTotals = (): { workOrderNo: string; ordered: number; prev: number; delivering: number; remaining: number }[] => {
    const seen = new Map<string, { workOrderNo: string; ordered: number; prev: number; delivering: number; remaining: number }>();
    for (const it of formData.items) {
      const woQty = woQtyFor(it);
      if (woQty == null || seen.has(it.workOrderNo)) continue;
      const prev = prevDeliveredFor(it);
      seen.set(it.workOrderNo, {
        workOrderNo: it.workOrderNo,
        ordered: woQty,
        prev,
        delivering: thisDoQtyFor(it.workOrderNo),
        remaining: Math.max(woQty - prev, 0),
      });
    }
    return [...seen.values()];
  };
  const overWorkOrders = () => woTotals().filter((t) => t.delivering > t.remaining);
  const filteredWorkOrders = selectedSalesOrder
    ? metadata.workOrders.filter((wo: any) => soWorkOrderNos.has(wo.workOrderNo))
    : [];

  const selectedCustomer = formData.customerId
    ? metadata.customers.find((c: any) => c.id === formData.customerId)
    : null;

  const items: any[] = formData.items;
  const totalValue = items.reduce((s: number, it: any) => s + (Number(it.totalValue) || 0), 0);
  const totalDelivering = items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0);
  const linesWithWoQty = items.filter((it) => woQtyFor(it) != null);
  // Summed per distinct WO so a WO split over two lines is not counted twice.
  const totalsByWo = woTotals();
  const totalOrdered = totalsByWo.reduce((s, t) => s + t.ordered, 0);
  const totalPrevDelivered = totalsByWo.reduce((s, t) => s + t.prev, 0);
  const totalBalance = totalsByWo.reduce((s, t) => s + (t.ordered - t.prev - t.delivering), 0);
  const overLines = linesWithWoQty.filter((it) => {
    const woQty = woQtyFor(it) || 0;
    return thisDoQtyFor(it.workOrderNo) > Math.max(woQty - prevDeliveredFor(it), 0);
  }).length;
  const cocs: any[] = formData.cocs || [];
  const approvedCocs = cocs.filter((c) => c.status === "Approved").length;

  const checklist: { label: string; done: boolean; hint?: string }[] = [
    { label: "Customer & sales order selected", done: !!formData.customerId && !!formData.salesOrderId },
    { label: "At least one line, each with a work order", done: items.length > 0 && items.every((it) => !!it.workOrderNo) },
    ...(formData.cocRequired
      ? [
          {
            label: "COCs created and approved",
            done: cocs.length > 0 && approvedCocs === cocs.length,
            hint: isEdit ? `${approvedCocs} of ${cocs.length} approved` : "Save the DO, then create its COCs",
          },
        ]
      : []),
    { label: "Saved", done: isEdit },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/sales/delivery-order" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Delivery Orders
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {isEdit ? (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">DO</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">{formData.doNo}</span>
                </h1>
              ) : (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">New Delivery Order</h1>
              )}
              <StatusBadge
                status={statusLabel}
                tone={doStatusTone(statusLabel)}
                size="md"
                label={isEdit ? statusLabel : "New · Draft"}
              />
              {formData.isReturnable && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/15">
                  <RotateCcw size={11} /> Returnable
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Customer">{selectedCustomer?.customerName || "No customer yet"}</MetaChip>
              <MetaChip icon={CalendarDays} title="DO date">{fmtDate(formData.date)}</MetaChip>
              <MetaChip icon={ShoppingCart} label="SO" title="Sales order">
                <span className="font-mono">{selectedSalesOrder?.orderNo || "—"}</span>
              </MetaChip>
              {formData.poNo && (
                <MetaChip icon={Hash} label="PO" title="Customer PO No">{formData.poNo}</MetaChip>
              )}
              {(formData.vehicleNo || formData.modeOfTransport) && (
                <MetaChip icon={Truck} title="Transport / vehicle">
                  {[formData.modeOfTransport, formData.vehicleNo].filter(Boolean).join(" · ")}
                </MetaChip>
              )}
              {formData.cocRequired && (
                <MetaChip icon={ShieldCheck} title="Certificate of Conformity">COC required</MetaChip>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => router.push("/dashboard/sales/delivery-order")} className={buttonClass("ghost", "md")}>
              Back
            </button>
            {isEdit && (
              <Link href={`/print/delivery-order/${id}`} target="_blank" className={buttonClass("secondary", "md")}>
                <Printer size={14} /> Print
              </Link>
            )}
            {!isDraft ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            ) : (
              <>
                <button type="button" onClick={handleSubmit} disabled={loading} className={buttonClass("success", "md")}>
                  <Send size={14} /> Submit DO
                </button>
                <button type="button" onClick={handleSave} disabled={loading} className={buttonClass("primary", "md")}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {!isDraft && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
          <Lock size={14} className="shrink-0 text-slate-400" />
          This delivery order is <span className="font-semibold text-slate-800">{statusLabel}</span> and can no longer be edited.
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          {/* Delivery details */}
          <Card icon={FileText} tone="indigo" title="Delivery details" description="Document number, date and transport">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Assigned on save from the configured format — see Admin → Document Numbering. */}
              <Field label="Delivery Order No" help={isEdit ? undefined : "Assigned on save."}>
                <input
                  type="text"
                  value={isEdit ? formData.doNo : "Auto-generated on save"}
                  readOnly
                  disabled
                  className={`${readOnlyClass} ${isEdit ? "font-mono" : "italic"}`}
                />
              </Field>
              <Field label="Date" required>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={!isDraft}
                  className={inputClass}
                />
              </Field>
              <Field label="Mode of Transport">
                <SearchableSelect
                  compact
                  value={formData.modeOfTransport || ""}
                  onChange={(e) => setFormData({ ...formData, modeOfTransport: e.target.value })}
                  disabled={!isDraft}
                  className={selectTriggerClass}
                >
                  <option value="">Select Mode...</option>
                  {["Road", "Rail", "Air", "Sea", "Courier", "Hand Delivery"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="Vehicle Number">
                <input
                  type="text"
                  value={formData.vehicleNo || ""}
                  onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                  disabled={!isDraft}
                  placeholder="e.g. TN 01 AB 1234"
                  className={`${inputClass} font-mono`}
                />
              </Field>
            </div>
          </Card>

          {/* Customer & sales order */}
          <Card icon={Users} tone="sky" title="Customer & sales order" description="Who receives the goods and which order they fulfil">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Customer" required className="sm:col-span-2">
                <SearchableSelect
                  compact
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value, salesOrderId: "", poNo: "" })} // Reset SO when customer changes
                  disabled={!isDraft}
                  className={selectTriggerClass}
                >
                  <option value="">Select Customer...</option>
                  {metadata.customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.customerName}</option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="GST Number">
                <input type="text" readOnly value={selectedCustomer?.gstin || ""} className={readOnlyClass} placeholder="-" />
              </Field>
              <Field label="RO Number">
                <input type="text" readOnly value={selectedCustomer?.roNumber || ""} className={readOnlyClass} placeholder="-" />
              </Field>
              <Field
                label="Sales Order"
                required
                className="sm:col-span-2"
                help={!formData.customerId && isDraft ? "Select a customer first." : undefined}
              >
                <SearchableSelect
                  compact
                  value={formData.salesOrderId}
                  onChange={(e) => {
                    // Pre-fill the PO No from the sales order's customer PO ref; still editable.
                    const so = metadata.salesOrders.find((s: any) => s.id === e.target.value);
                    // Drop work orders that don't belong to the newly selected sales order.
                    const woNos = new Set<string>(so?.workOrderNos || []);
                    const nextItems = formData.items.map((it: any) =>
                      it.workOrderNo && !woNos.has(it.workOrderNo) ? { ...it, workOrderNo: "" } : it,
                    );
                    setFormData({ ...formData, salesOrderId: e.target.value, poNo: so?.customerPoRef || "", items: nextItems });
                  }}
                  disabled={!isDraft || !formData.customerId}
                  className={selectTriggerClass}
                >
                  <option value="">Select Sales Order...</option>
                  {filteredSalesOrders.map((so: any) => (
                    <option key={so.id} value={so.id}>{so.orderNo} {so.customerPoRef ? `(${so.customerPoRef})` : ""}</option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="PO No" className="sm:col-span-2">
                <input
                  type="text"
                  value={formData.poNo || ""}
                  onChange={(e) => setFormData({ ...formData, poNo: e.target.value })}
                  disabled={!isDraft}
                  placeholder="Customer PO number"
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>

          {/* COC & challan */}
          <Card icon={ShieldCheck} tone="emerald" title="Compliance & challan" description="Certificate of Conformity and returnable challan">
            <div className="space-y-3">
              <label
                htmlFor="cocRequired"
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 px-3 py-2 transition-colors hover:bg-slate-50 has-[:checked]:border-emerald-200 has-[:checked]:bg-emerald-50/40"
              >
                <input
                  type="checkbox"
                  id="cocRequired"
                  checked={formData.cocRequired}
                  onChange={(e) => setFormData({ ...formData, cocRequired: e.target.checked })}
                  disabled={!isDraft}
                  className={`${checkboxClass} mt-0.5`}
                />
                <span className="min-w-0">
                  <span className="block select-none text-[13px] font-medium text-slate-800">
                    Requires Certificate Of Conformity (COC)
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    At least one COC must be created and all COCs approved before this DO can be submitted.
                  </span>
                </span>
              </label>

              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
                <label htmlFor="isReturnable" className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="isReturnable"
                    checked={!!formData.isReturnable}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isReturnable: e.target.checked,
                        // Pre-fill any blank line values from the SO unit price when turned on.
                        items: e.target.checked
                          ? formData.items.map((it: any) =>
                              it.totalValue === "" || it.totalValue == null
                                ? { ...it, totalValue: suggestedValue(it) }
                                : it,
                            )
                          : formData.items,
                        returnableNote:
                          e.target.checked && !formData.returnableNote?.trim()
                            ? DEFAULT_RETURNABLE_NOTE
                            : formData.returnableNote,
                      })
                    }
                    disabled={!isDraft}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="min-w-0">
                    <span className="block select-none text-[13px] font-medium text-slate-800">
                      Returnable Delivery Challan (Not for Sale)
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      For goods sent for testing and return. The printout is retitled and shows line values.
                    </span>
                  </span>
                </label>
                {formData.isReturnable && (
                  <Field label="Note printed on the challan" size="sm">
                    <textarea
                      rows={3}
                      value={formData.returnableNote || ""}
                      onChange={(e) => setFormData({ ...formData, returnableNote: e.target.value })}
                      disabled={!isDraft}
                      placeholder={DEFAULT_RETURNABLE_NOTE}
                      className={`${textareaClass} border-amber-200!`}
                    />
                  </Field>
                )}
              </div>
            </div>
          </Card>

          {/* Delivery lines */}
          <Card
            icon={Package}
            tone="amber"
            title={
              <span className="inline-flex items-center gap-1.5">
                Delivery items (work orders)
                {items.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-1.5 text-[11px] font-semibold tabular-nums text-amber-700 ring-1 ring-inset ring-amber-600/15">
                    {items.length}
                  </span>
                )}
              </span>
            }
            description="QC-approved work orders from the selected sales order"
            actions={
              isDraft && items.length > 0 ? (
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
                title="No items added yet"
                description={
                  selectedSalesOrder
                    ? "Add a line for each work order being delivered on this DO."
                    : "Pick a customer and sales order, then add the work orders being delivered."
                }
                action={
                  isDraft && (
                    <button type="button" onClick={addItem} className={buttonClass("primary", "md")}>
                      <Plus size={14} /> Add Item
                    </button>
                  )
                }
              />
            ) : (
              <div className="space-y-3">
                {items.map((item: any, index: number) => {
                  const partName = partNameFor(item);
                  const qty = Number(item.quantity) || 0;
                  const woQty = woQtyFor(item);
                  const prevDelivered = prevDeliveredFor(item);
                  // Remaining after other non-void DOs and every line of this DO for the same WO.
                  const balance = woQty == null ? null : woQty - prevDelivered - thisDoQtyFor(item.workOrderNo);
                  const price = unitPriceFor(item.workOrderNo);
                  const deliveryState =
                    balance == null ? null : balance < 0 ? "over" : balance === 0 ? "full" : "partial";
                  return (
                    <div
                      key={index}
                      className={`overflow-hidden rounded-lg border border-l-2 border-slate-200 bg-white ${
                        deliveryState === "over" ? "border-l-rose-500" : deliveryState === "partial" ? "border-l-amber-500" : "border-l-indigo-500"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-1.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold tabular-nums text-white">
                            {index + 1}
                          </span>
                          {item.workOrderNo ? (
                            <span className="flex min-w-0 items-baseline gap-1.5">
                              <span className="shrink-0 font-mono text-xs font-semibold text-slate-800">{item.workOrderNo}</span>
                              <span className="truncate text-xs text-slate-500" title={partName}>{partName || "-"}</span>
                            </span>
                          ) : (
                            <span className="truncate text-xs italic text-slate-400">Select a work order</span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {deliveryState === "over" && (
                            <span className="rounded-full bg-rose-50 px-1.5 py-px text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/15">
                              Over by {fmtQty(-(balance as number))}
                            </span>
                          )}
                          {deliveryState === "partial" && (
                            <span className="hidden rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/15 sm:inline">
                              Partial
                            </span>
                          )}
                          {deliveryState === "full" && (
                            <span className="hidden rounded-full bg-emerald-50 px-1.5 py-px text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15 sm:inline">
                              Full qty
                            </span>
                          )}
                          {isDraft && (
                            <button type="button" onClick={() => removeItem(index)} title="Remove item" className={iconButtonDangerClass}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2.5 p-3">
                        {/* Ordered / delivering / balance */}
                        <div className="grid grid-cols-3 divide-x divide-slate-200/70 overflow-hidden rounded-md bg-slate-50/70 text-right ring-1 ring-inset ring-slate-200/70">
                          <div className="px-2.5 py-1">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">WO qty</p>
                            <p className="text-[13px] font-semibold tabular-nums text-slate-700">{woQty == null ? "—" : fmtQty(woQty)}</p>
                            {prevDelivered > 0 && (
                              <p
                                className="text-[10px] tabular-nums text-slate-400"
                                title={`Already on ${(metaWorkOrder(item)?.deliveredOn || []).join(", ")}`}
                              >
                                {fmtQty(prevDelivered)} on other DOs
                              </p>
                            )}
                          </div>
                          <div className="px-2.5 py-1">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Delivering</p>
                            <p className="text-[13px] font-semibold tabular-nums text-indigo-700">{fmtQty(qty)}</p>
                          </div>
                          <div className="px-2.5 py-1" title="WO quantity minus quantity on other non-void DOs and on this DO">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Balance</p>
                            <p
                              className={`text-[13px] font-semibold tabular-nums ${
                                deliveryState === "over" ? "text-rose-600" : deliveryState === "partial" ? "text-amber-600" : deliveryState === "full" ? "text-emerald-600" : "text-slate-400"
                              }`}
                            >
                              {balance == null ? "—" : fmtQty(balance)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-6">
                          <Field size="sm" label="Work Order No" required className="sm:col-span-2">
                            <SearchableSelect
                              compact
                              value={item.workOrderNo}
                              onChange={(e) => updateItem(index, "workOrderNo", e.target.value)}
                              disabled={!isDraft}
                              dropdownPosition="top"
                              className={selectTriggerSmClass}
                            >
                              <option value="">
                                {!selectedSalesOrder
                                  ? "Select a Sales Order first..."
                                  : filteredWorkOrders.length === 0
                                    ? "No QC-approved work orders for this Sales Order"
                                    : "Select Work Order..."}
                              </option>
                              {filteredWorkOrders.map((wo: any) => (
                                <option key={wo.workOrderNo} value={wo.workOrderNo}>
                                  {wo.partName ? `${wo.workOrderNo} — ${wo.partName}` : wo.workOrderNo}
                                </option>
                              ))}
                            </SearchableSelect>
                          </Field>
                          <Field size="sm" label="Quantity" required>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", e.target.value)}
                              disabled={!isDraft}
                              className={`${inputSmClass} text-right tabular-nums ${
                                deliveryState === "over" ? "border-rose-300! bg-rose-50/40!" : ""
                              }`}
                            />
                          </Field>
                          <Field size="sm" label="UOM">
                            <SearchableSelect
                              compact
                              value={item.uomId || ""}
                              onChange={(e) => updateItem(index, "uomId", e.target.value)}
                              disabled={!isDraft}
                              dropdownPosition="top"
                              className={selectTriggerSmClass}
                            >
                              <option value="">Select UOM...</option>
                              {metadata.uoms.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.uomName}</option>
                              ))}
                            </SearchableSelect>
                          </Field>
                          <Field size="sm" label="Delivery Date">
                            <input
                              type="date"
                              value={item.deliveryDate ? item.deliveryDate.split("T")[0] : ""}
                              onChange={(e) => updateItem(index, "deliveryDate", e.target.value)}
                              disabled={!isDraft}
                              className={inputSmClass}
                            />
                          </Field>
                          <Field size="sm" label="Total Value">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.totalValue ?? ""}
                              onChange={(e) => updateItem(index, "totalValue", e.target.value)}
                              disabled={!isDraft}
                              placeholder={suggestedValue(item) || "0.00"}
                              title={
                                price != null
                                  ? `SO unit price ${price.toFixed(2)} × qty`
                                  : "No SO unit price found — enter manually"
                              }
                              className={`${inputSmClass} text-right tabular-nums`}
                            />
                          </Field>
                          <Field size="sm" label="Description" className="sm:col-span-2 lg:col-span-6">
                            <textarea
                              rows={1}
                              value={item.description || ""}
                              onChange={(e) => updateItem(index, "description", e.target.value)}
                              disabled={!isDraft}
                              className={`${textareaSmClass} field-sizing-content`}
                              placeholder="Description (optional, shown on print)"
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isDraft && (
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 text-xs font-medium text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
                  >
                    <Plus size={14} /> Add another item
                  </button>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-2.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Value of Goods</span>
                  <span className="text-[13px] font-semibold tabular-nums text-slate-900">{totalValue.toFixed(2)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4">
          {/* Summary — dark anchor echoing the sidebar */}
          <section className="overflow-hidden rounded-xl bg-[#111827] text-slate-300 shadow-lg shadow-slate-900/10 ring-1 ring-white/5">
            <header className="flex items-center gap-2.5 border-b border-white/10 px-4 py-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/20">
                <Truck size={15} />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold leading-tight text-white">Summary</h2>
                <p className="text-[11px] leading-tight text-slate-400">Live totals for this delivery</p>
              </div>
            </header>
            <dl className="space-y-2 px-4 py-3 text-[13px]">
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Lines</dt>
                <dd className="tabular-nums text-slate-200">{items.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">WO qty</dt>
                <dd className="tabular-nums text-slate-200">{linesWithWoQty.length ? fmtQty(totalOrdered) : "—"}</dd>
              </div>
              {totalPrevDelivered > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">On other DOs</dt>
                  <dd className="tabular-nums text-slate-200">{fmtQty(totalPrevDelivered)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Delivering</dt>
                <dd className="font-semibold tabular-nums text-white">{fmtQty(totalDelivering)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Balance</dt>
                <dd
                  className={`tabular-nums ${
                    !linesWithWoQty.length ? "text-slate-500" : totalBalance < 0 || overLines > 0 ? "text-rose-300" : totalBalance > 0 ? "text-amber-300" : "text-emerald-300"
                  }`}
                >
                  {linesWithWoQty.length ? fmtQty(totalBalance) : "—"}
                </dd>
              </div>
              {overLines > 0 && (
                <p className="rounded-md bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 ring-1 ring-inset ring-rose-400/20">
                  {overLines} line{overLines === 1 ? "" : "s"} exceed{overLines === 1 ? "s" : ""} the remaining work order balance.
                </p>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">COC</dt>
                <dd className="text-slate-200">
                  {formData.cocRequired ? (isEdit ? `${approvedCocs}/${cocs.length} approved` : "Required") : "Not required"}
                </dd>
              </div>
            </dl>
            <div className="relative border-t border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-gradient-to-b from-indigo-400 to-violet-500" />
              <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-300">Value of goods</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-white">{fmt(totalValue)}</p>
            </div>
          </section>

          {isDraft && (
            <Card icon={ClipboardList} tone="violet" title="Before you submit" description="Draft → Submitted">
              <ul className="space-y-1.5">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-start gap-2 text-[13px]">
                    {c.done ? (
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle size={14} className="mt-0.5 shrink-0 text-slate-300" />
                    )}
                    <span className="min-w-0">
                      <span className={c.done ? "text-slate-700" : "text-slate-500"}>{c.label}</span>
                      {c.hint && <span className="block text-[11px] text-slate-400">{c.hint}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
