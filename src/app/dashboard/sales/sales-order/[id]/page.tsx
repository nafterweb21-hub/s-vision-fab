/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileClock,
  FileText,
  Layers,
  Loader2,
  Lock,
  Package,
  Paperclip,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  Truck,
  Users,
  Wallet,
  X,
  XCircle,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { ProfileOrFreeText } from "@/components/ProfileOrFreeText";
import { customConfirm } from "@/lib/customConfirm";
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
import { isSoReadOnly, normalizeSoStatus, soStatusTone, soTransitions, type SoStatus, type SoTransition } from "../so-status";
import { getFormData } from "./actions";

const ACTION_ICON: Partial<Record<SoStatus, LucideIcon>> = {
  Draft: Save,
  Confirmed: CheckCircle2,
  Revised: RotateCcw,
  Closed: Lock,
  Void: XCircle,
  "Old Version": FileClock,
};

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function SalesOrderFormPage() {
  const params = useParams();
  const id = params?.id as string;

  const router = useRouter();
  const isNew = id === "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [formDataCache, setFormDataCache] = useState<any>(null);
  const [headerQuotationRef, setHeaderQuotationRef] = useState("");

  // Form State
  const [order, setOrder] = useState<any>({
    date: new Date().toISOString().split("T")[0],
    orderType: "Direct",
    salespersonId: "",
    customerId: "",
    customerPoRef: "",
    projectCode: "",
    paymentTermId: "",
    otherPaymentDetail: "",
    refContract: "",
    currencyId: "",
    exchangeRate: 1,
    taxTypeId: "",
    taxRate: 0,
    contactPersonId: "",
    fax: "",
    tel: "",
    email: "",
    deliverToId: "",
    billToId: "",
    remark: "",
    status: "Draft",
    items: [],
  });

  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    async function loadData() {
      try {
        setLoading(true);
        const data = await getFormData();
        setFormDataCache(data);

        if (!isNew) {
          const res = await fetch(`/api/sales/sales-order/${id}`);
          if (!res.ok) throw new Error("Failed to fetch order");
          const orderData = await res.json();
          setOrder({
            ...orderData,
            date: new Date(orderData.date).toISOString().split("T")[0],
            customerId: orderData.customerId || "",
            customerSelection: { type: "profile", profileId: orderData.customerId || "" },
          });
          setItems(
            orderData.items.map((item: any) => ({
              ...item,
              // Items without a delivery batch (e.g. converted from a quotation) get a visible
              // one so the delivery date can be reviewed instead of silently defaulting server-side.
              batches: (item.batches?.length ? item.batches : [{
                quantity: item.quantity,
                deliveryDate: new Date(),
                noRoutingProcess: false,
                remark: "",
                uploadUrl: "",
              }]).map((b: any) => ({
                ...b,
                deliveryDate: new Date(b.deliveryDate).toISOString().split("T")[0],
              }))
            }))
          );
          // Header reference mirrors the items' quotation ref when they all agree.
          const quotationRefs = new Set<string>(orderData.items.map((i: any) => i.internalQuotationNo).filter(Boolean));
          setHeaderQuotationRef(quotationRefs.size === 1 ? [...quotationRefs][0] : "");
        } else {
          // Defaults
          if (data.currencies.length > 0) {
            const defCurr = data.currencies.find((c: any) => c.isDefault) || data.currencies[0];
            setOrder((prev: any) => ({ ...prev, currencyId: defCurr.id, exchangeRate: defCurr.exchangeRate }));
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, isNew]);

  // Derived state for dependent dropdowns
  const selectedCustomer = formDataCache?.customers?.find((c: any) => c.id === (order.customerSelection?.profileId || order.customerId));

  // Handlers
  const handleOrderChange = (field: string, value: any) => {
    setOrder((prev: any) => {
      const next = { ...prev, [field]: value };
      
      // Auto-fill logic
      if (field === "currencyId") {
        const curr = formDataCache?.currencies.find((c: any) => c.id === value);
        if (curr) next.exchangeRate = curr.exchangeRate;
      }
      if (field === "taxTypeId") {
        const tax = formDataCache?.taxes.find((t: any) => t.id === value);
        const isSez = selectedCustomer?.isSez;
        if (!isSez) {
          next.taxRate = tax ? tax.taxRate : 0;
        }
      }
      if (field === "customerSelection") {
        if (next.customerSelection.type === "freetext" || next.customerSelection.profileId !== prev.customerSelection?.profileId) {
          next.contactPersonId = "";
          next.deliverToId = "";
          next.billToId = "";
          next.fax = "";
          next.tel = "";
          next.email = "";
        }
      }
      if (field === "contactPersonId") {
        const cp = selectedCustomer?.contactPersons.find((c: any) => c.id === value);
        if (cp) {
          next.fax = cp.faxNo || "";
          next.tel = cp.mobileNo || cp.telNo || "";
          next.email = cp.email || "";
        }
      }
      return next;
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const handleHeaderQuotationChange = (val: string) => {
    setHeaderQuotationRef(val);
    setItems((prev) => prev.map(item => ({ ...item, internalQuotationNo: val })));
  };

  const handleBatchChange = (itemIndex: number, batchIndex: number, field: string, value: any) => {
    setItems((prev) => {
      const newItems = [...prev];
      const newBatches = [...newItems[itemIndex].batches];
      newBatches[batchIndex] = { ...newBatches[batchIndex], [field]: value };
      newItems[itemIndex] = { 
        ...newItems[itemIndex], 
        batches: newBatches,
      };
      if (field === "quantity") {
        newItems[itemIndex].quantity = newBatches.reduce((sum: number, b: any) => sum + (Number(b.quantity) || 0), 0);
      }
      return newItems;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        partId: "",
        internalQuotationNo: headerQuotationRef,
        vendorMaterialNo: "",
        materialSpecification: "",
        estimateNo: "",
        remark: "",
        uploadUrl: "",
        quantity: 1,
        uomId: "",
        unitPrice: 0,
        batches: [
          {
            quantity: 1,
            deliveryDate: new Date().toISOString().split("T")[0],
            noRoutingProcess: false,
            remark: "",
            uploadUrl: "",
          }
        ]
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addBatch = (itemIndex: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const newBatches = [
        ...newItems[itemIndex].batches,
        {
          quantity: 1,
          deliveryDate: new Date().toISOString().split("T")[0],
          noRoutingProcess: false,
          remark: "",
          uploadUrl: "",
        }
      ];
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        batches: newBatches,
        quantity: newBatches.reduce((sum: number, b: any) => sum + (Number(b.quantity) || 0), 0)
      };
      return newItems;
    });
  };

  const removeBatch = (itemIndex: number, batchIndex: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const newBatches = newItems[itemIndex].batches.filter((_: any, i: number) => i !== batchIndex);
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        batches: newBatches,
        quantity: newBatches.reduce((sum: number, b: any) => sum + (Number(b.quantity) || 0), 0)
      };
      return newItems;
    });
  };

  // Calculations
  const amountBeforeTax = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice || 0)), 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    const isSez = selectedCustomer?.isSez;
    const company = formDataCache?.companies?.[0];
    const effectiveTaxRate = isSez ? (Number(company?.sezTaxRate) || 0) : Number(order.taxRate);
    return (Number(amountBeforeTax) * effectiveTaxRate) / 100;
  }, [amountBeforeTax, order.taxRate, selectedCustomer, formDataCache?.companies]);

  const amountAfterTax = useMemo(() => {
    let finalTotal = Number(amountBeforeTax) + taxAmount;
    const currency = formDataCache?.currencies?.find((c: any) => c.id === order.currencyId);
    if (currency?.roundingMode === "UP") {
      finalTotal = Math.ceil(finalTotal);
    } else if (currency?.roundingMode === "DOWN") {
      finalTotal = Math.floor(finalTotal);
    }
    return finalTotal;
  }, [amountBeforeTax, taxAmount, order.currencyId, formDataCache?.currencies]);

  const handleSave = async (status: string) => {
    if (items.length === 0) {
      setShowValidationModal(true);
      return;
    }

    setSaving(true);
    setErrorMsg("");
    try {
      const isSez = selectedCustomer?.isSez;
      const company = formDataCache?.companies?.[0];
      const effectiveTaxRate = isSez ? (Number(company?.sezTaxRate) || 0) : Number(order.taxRate);

      const payload = {
        ...order,
        status, // Update the status to the one passed to handleSave
        taxTypeId: isSez ? null : (order.taxTypeId || null),
        taxRate: effectiveTaxRate,
        amountBeforeTax: Number(amountBeforeTax),
        taxAmount: Number(taxAmount),
        amountAfterTax: Number(amountAfterTax),
        items,
      };

      const url = isNew ? `/api/sales/sales-order` : `/api/sales/sales-order/${id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const saved = await res.json();
      router.push(`/dashboard/saved?module=Sales Order&id=${saved.orderNo || saved.id}&viewUrl=/dashboard/sales/sales-order/${saved.id}&backUrl=/dashboard/sales/sales-order`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const readOnly = !isNew && isSoReadOnly(order.status);

  const handleAction = async (t: SoTransition) => {
    if (saving || readOnly) return;
    if (t.confirm && !(await customConfirm(t.confirm))) return;
    await handleSave(t.to);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={22} />
      </div>
    );
  }

  const currencyCode = formDataCache?.currencies?.find((c: any) => c.id === order.currencyId)?.code || "$";
  const status = normalizeSoStatus(order.status);
  const isFreeText = order.customerSelection?.type === "freetext";
  const transitions = soTransitions(status, { isNew, orderNo: order.orderNo });
  const customerName = isFreeText
    ? order.customerSelection?.freeTextPayload?.customerName || ""
    : selectedCustomer?.customerName || "";
  const effectiveTaxRate = selectedCustomer?.isSez
    ? Number(formDataCache?.companies?.[0]?.sezTaxRate) || 0
    : Number(order.taxRate) || 0;
  const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const partLabel = (partId: string) => {
    const fg = formDataCache?.finishedGoods?.find((f: any) => f.id === partId);
    return fg ? `${fg.partNo}${fg.description ? ` · ${fg.description}` : ""}` : "";
  };

  return (
    <div className="w-full space-y-4">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/sales/sales-order" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Sales Orders
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {isNew ? (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">New Sales Order</h1>
              ) : (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">SO</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">{order.orderNo}</span>
                  {order.revision > 0 && (
                    <span className="rounded bg-slate-100 px-1 py-px font-mono text-[11px] font-medium text-slate-500">R{order.revision}</span>
                  )}
                </h1>
              )}
              <StatusBadge status={isNew ? "Draft" : status} tone={soStatusTone(isNew ? "Draft" : status)} size="md" label={isNew ? "New · Draft" : status} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Customer">{customerName || "No customer yet"}</MetaChip>
              <MetaChip icon={CalendarDays} title="Order date">{fmtDate(order.date)}</MetaChip>
              <MetaChip icon={order.orderType === "Sub-contract" ? Layers : Truck} title="Order type">{order.orderType || "Direct"}</MetaChip>
              <MetaChip icon={Wallet} title="Total after tax">
                <span className="tabular-nums">{currencyCode} {fmt(amountAfterTax)}</span>
              </MetaChip>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button onClick={() => router.push("/dashboard/sales/sales-order")} className={buttonClass("ghost", "md")}>
              Back
            </button>
            {readOnly ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            ) : (
              transitions.map((t) => {
                const Icon = ACTION_ICON[t.to];
                return (
                  <button key={t.to} onClick={() => handleAction(t)} disabled={saving} className={buttonClass(t.variant, "md")}>
                    {saving && t.variant === "primary" ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} /> : null}
                    {t.label}
                  </button>
                );
              })
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
          This order is <span className="font-semibold text-slate-800">{status}</span> and can no longer be edited.
        </div>
      )}

      <fieldset disabled={readOnly} className="m-0 grid min-w-0 grid-cols-1 gap-4 border-0 p-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">

          {/* Order details */}
          <Card icon={FileText} tone="indigo" title="Order details" description="Type, owner and customer references">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Date" required>
                <input
                  type="date"
                  value={order.date}
                  onChange={(e) => handleOrderChange("date", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Order Type" required>
                <SearchableSelect
                  compact
                  value={order.orderType || "Direct"}
                  onChange={(e) => handleOrderChange("orderType", e.target.value)}
                  disabled={readOnly}
                  className={selectTriggerClass}
                >
                  <option value="Direct">Direct</option>
                  <option value="Sub-contract">Sub-contract</option>
                </SearchableSelect>
              </Field>
              <Field label="Salesperson" required>
                <SearchableSelect
                  compact
                  value={order.salespersonId}
                  onChange={(e) => handleOrderChange("salespersonId", e.target.value)}
                  disabled={readOnly}
                  className={selectTriggerClass}
                >
                  <option value="">Select Salesperson</option>
                  {formDataCache?.employees?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="Quotation Reference" help="Applied to every line item.">
                <input
                  type="text"
                  placeholder="Auto-fill items Int. Quotation"
                  value={headerQuotationRef}
                  onChange={(e) => handleHeaderQuotationChange(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Customer PO Ref">
                <input
                  type="text"
                  value={order.customerPoRef || ""}
                  onChange={(e) => handleOrderChange("customerPoRef", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Project Code">
                <input
                  type="text"
                  value={order.projectCode || ""}
                  onChange={(e) => handleOrderChange("projectCode", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Ref Contract">
                <input
                  type="text"
                  value={order.refContract || ""}
                  onChange={(e) => handleOrderChange("refContract", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>

          {/* Customer & delivery */}
          <Card icon={Users} tone="sky" title="Customer & delivery" description="Who is buying and where it ships">
            <div className="space-y-3">
              <ProfileOrFreeText
                disabled={readOnly}
                label="Customer"
                required={true}
                options={(formDataCache?.customers || []).map((c: any) => ({ id: c.id, label: c.customerName }))}
                fields={[
                  { name: "customerName", label: "Customer Name", required: true },
                  { name: "gstin", label: "GSTIN", required: true },
                  { name: "address", label: "Address" },
                  { name: "contactPerson", label: "Contact Person" },
                  { name: "email", label: "Email" },
                  { name: "phone", label: "Phone" }
                ]}
                value={order.customerSelection}
                onChange={(val) => handleOrderChange("customerSelection", val)}
              />

              <div className="grid gap-x-4 gap-y-3 border-t border-dashed border-slate-200 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Contact Person">
                  {isFreeText ? (
                    <input
                      type="text"
                      readOnly
                      value={order.customerSelection?.freeTextPayload?.contactPerson || ""}
                      className={readOnlyClass}
                    />
                  ) : (
                    <SearchableSelect
                      compact
                      value={order.contactPersonId || ""}
                      onChange={(e) => handleOrderChange("contactPersonId", e.target.value)}
                      disabled={readOnly || !selectedCustomer}
                      className={selectTriggerClass}
                    >
                      <option value="">Select Contact</option>
                      {selectedCustomer?.contactPersons?.map((cp: any) => (
                        <option key={cp.id} value={cp.id}>{cp.contactPersonName}</option>
                      ))}
                    </SearchableSelect>
                  )}
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    value={order.email || ""}
                    onChange={(e) => handleOrderChange("email", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Tel">
                  <input
                    type="text"
                    value={order.tel || ""}
                    onChange={(e) => handleOrderChange("tel", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Fax">
                  <input
                    type="text"
                    value={order.fax || ""}
                    onChange={(e) => handleOrderChange("fax", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="GST Number">
                  <input
                    type="text"
                    readOnly
                    value={isFreeText ? (order.customerSelection?.freeTextPayload?.gstin || "") : (selectedCustomer?.gstin || "")}
                    className={readOnlyClass}
                  />
                </Field>
                <Field label="RO Number">
                  <input
                    type="text"
                    readOnly
                    value={selectedCustomer?.roNumber || ""}
                    className={readOnlyClass}
                  />
                </Field>
                <Field label="Deliver To" className="sm:col-span-2 lg:col-span-1">
                  {isFreeText ? (
                    <input
                      type="text"
                      readOnly
                      value={order.customerSelection?.freeTextPayload?.address || ""}
                      className={readOnlyClass}
                    />
                  ) : (
                    <SearchableSelect
                      compact
                      value={order.deliverToId || ""}
                      onChange={(e) => handleOrderChange("deliverToId", e.target.value)}
                      disabled={readOnly || !selectedCustomer}
                      className={selectTriggerClass}
                    >
                      <option value="">Select Address</option>
                      {selectedCustomer?.addresses?.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.address}</option>
                      ))}
                    </SearchableSelect>
                  )}
                </Field>
                <Field label="Bill To" className="sm:col-span-2 lg:col-span-1">
                  {isFreeText ? (
                    <input
                      type="text"
                      readOnly
                      value={order.customerSelection?.freeTextPayload?.address || ""}
                      className={readOnlyClass}
                    />
                  ) : (
                    <SearchableSelect
                      compact
                      value={order.billToId || ""}
                      onChange={(e) => handleOrderChange("billToId", e.target.value)}
                      disabled={readOnly || !selectedCustomer}
                      className={selectTriggerClass}
                    >
                      <option value="">Select Address</option>
                      {selectedCustomer?.addresses?.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.address}</option>
                      ))}
                    </SearchableSelect>
                  )}
                </Field>
              </div>
            </div>
          </Card>

          {/* Line items */}
          <Card
            icon={Package}
            tone="amber"
            title={
              <span className="inline-flex items-center gap-1.5">
                Order items
                {items.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-1.5 text-[11px] font-semibold tabular-nums text-amber-700 ring-1 ring-inset ring-amber-600/15">
                    {items.length}
                  </span>
                )}
              </span>
            }
            description="Parts, pricing and delivery batches"
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
                description="Add the parts this customer is ordering. Each item can ship in one or more delivery batches."
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
                {items.map((item, index) => {
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                  const label = partLabel(item.partId);
                  return (
                    <div key={index} className="overflow-hidden rounded-lg border border-slate-200 border-l-2 border-l-indigo-500 bg-white">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-1.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold tabular-nums text-white">
                            {index + 1}
                          </span>
                          <span className={`truncate text-xs ${label ? "font-semibold text-slate-800" : "italic text-slate-400"}`}>
                            {label || "Select a part"}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="hidden text-[11px] text-slate-500 sm:inline">
                            Qty <span className="ml-0.5 font-semibold tabular-nums text-slate-800">{item.quantity}</span>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            <span className="mr-1 text-slate-400">{currencyCode}</span>
                            <span className="text-[13px] font-semibold tabular-nums text-slate-900">{fmt(lineTotal)}</span>
                          </span>
                          {!readOnly && (
                            <button type="button" onClick={() => removeItem(index)} title="Remove item" className={iconButtonDangerClass}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 p-3">
                        {/* Item Level Info */}
                        <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-6">
                          <Field size="sm" label="Part" required className="sm:col-span-2">
                            <SearchableSelect
                              compact
                              value={item.partId}
                              onChange={(e) => handleItemChange(index, "partId", e.target.value)}
                              disabled={readOnly}
                              className={selectTriggerSmClass}
                            >
                              <option value="">Select Part</option>
                              {formDataCache?.finishedGoods?.map((fg: any) => (
                                <option key={fg.id} value={fg.id}>{fg.partNo} - {fg.description}</option>
                              ))}
                            </SearchableSelect>
                          </Field>
                          <Field size="sm" label="Unit Price" required>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice || ""}
                              onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
                              className={`${inputSmClass} text-right tabular-nums`}
                            />
                          </Field>
                          <Field size="sm" label="UOM" required>
                            <SearchableSelect
                              compact
                              value={item.uomId}
                              onChange={(e) => handleItemChange(index, "uomId", e.target.value)}
                              disabled={readOnly}
                              className={selectTriggerSmClass}
                            >
                              <option value="">Select UOM</option>
                              {formDataCache?.uoms?.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.uomName}</option>
                              ))}
                            </SearchableSelect>
                          </Field>
                          <Field size="sm" label="Int. Quotation">
                            <input
                              type="text"
                              value={item.internalQuotationNo || ""}
                              onChange={(e) => handleItemChange(index, "internalQuotationNo", e.target.value)}
                              className={inputSmClass}
                            />
                          </Field>
                          <Field size="sm" label="Estimate No">
                            <input
                              type="text"
                              value={item.estimateNo || ""}
                              onChange={(e) => handleItemChange(index, "estimateNo", e.target.value)}
                              className={inputSmClass}
                            />
                          </Field>
                          <Field size="sm" label="Vendor Material No" className="sm:col-span-2">
                            <input
                              type="text"
                              value={item.vendorMaterialNo || ""}
                              onChange={(e) => handleItemChange(index, "vendorMaterialNo", e.target.value)}
                              className={inputSmClass}
                            />
                          </Field>
                          <Field size="sm" label="Item Upload URL" className="sm:col-span-2 lg:col-span-4">
                            <input
                              type="text"
                              value={item.uploadUrl || ""}
                              onChange={(e) => handleItemChange(index, "uploadUrl", e.target.value)}
                              className={inputSmClass}
                            />
                          </Field>
                          <Field size="sm" label="Material Specification" className="sm:col-span-2 lg:col-span-3">
                            <textarea
                              rows={1}
                              value={item.materialSpecification || ""}
                              onChange={(e) => handleItemChange(index, "materialSpecification", e.target.value)}
                              className={`${textareaSmClass} field-sizing-content`}
                            />
                          </Field>
                          <Field size="sm" label="Item Remark" className="sm:col-span-2 lg:col-span-3">
                            <textarea
                              rows={1}
                              value={item.remark || ""}
                              onChange={(e) => handleItemChange(index, "remark", e.target.value)}
                              className={`${textareaSmClass} field-sizing-content`}
                            />
                          </Field>
                        </div>

                        {/* Batches Level Info — visually nested under the item */}
                        <div className="border-l-2 border-slate-200 pl-3 sm:ml-2">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                              <CalendarDays size={12} className="text-slate-400" />
                              Delivery batches
                              <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold tabular-nums text-slate-600">
                                {item.batches?.length || 0}
                              </span>
                            </span>
                            {!readOnly && (
                              <button type="button" onClick={() => addBatch(index)} className={buttonClass("link", "xs")}>
                                <Plus size={12} /> Add Batch
                              </button>
                            )}
                          </div>
                          <div className="overflow-x-auto rounded-md bg-slate-50/70 ring-1 ring-inset ring-slate-200/70">
                            <table className="w-full min-w-[520px] text-[13px]">
                              <thead>
                                <tr className="text-left text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                  <th className="w-24 px-2.5 pb-1 pt-1.5 font-medium">Qty</th>
                                  <th className="w-40 px-2.5 pb-1 pt-1.5 font-medium">Delivery Date</th>
                                  <th className="px-2.5 pb-1 pt-1.5 font-medium">Remark</th>
                                  <th className="w-28 px-2.5 pb-1 pt-1.5 font-medium">Routing</th>
                                  <th className="w-9 px-2 pb-1 pt-1.5" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/60">
                                {item.batches?.map((batch: any, bIndex: number) => (
                                  <tr key={bIndex}>
                                    <td className="px-2.5 py-1">
                                      <input
                                        type="number"
                                        min="1"
                                        value={batch.quantity}
                                        onChange={(e) => handleBatchChange(index, bIndex, "quantity", parseInt(e.target.value) || 0)}
                                        className={`${inputSmClass} text-right tabular-nums`}
                                      />
                                    </td>
                                    <td className="px-2.5 py-1">
                                      <input
                                        type="date"
                                        value={batch.deliveryDate}
                                        onChange={(e) => handleBatchChange(index, bIndex, "deliveryDate", e.target.value)}
                                        className={inputSmClass}
                                      />
                                    </td>
                                    <td className="px-2.5 py-1">
                                      <input
                                        type="text"
                                        value={batch.remark || ""}
                                        onChange={(e) => handleBatchChange(index, bIndex, "remark", e.target.value)}
                                        className={inputSmClass}
                                      />
                                    </td>
                                    <td className="px-2.5 py-1">
                                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                                        <input
                                          type="checkbox"
                                          checked={batch.noRoutingProcess}
                                          onChange={(e) => handleBatchChange(index, bIndex, "noRoutingProcess", e.target.checked)}
                                          className={checkboxClass}
                                        />
                                        No Routing
                                      </label>
                                    </td>
                                    <td className="px-2 py-1 text-right">
                                      {!readOnly && (
                                        <button type="button" onClick={() => removeBatch(index, bIndex)} title="Remove batch" className={iconButtonDangerClass}>
                                          <X size={13} />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 text-xs font-medium text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
                  >
                    <Plus size={14} /> Add another item
                  </button>
                )}
              </div>
            )}
          </Card>

          {/* Remarks & attachments */}
          <Card icon={Paperclip} tone="violet" title="Remarks & attachments" description="Notes and supporting documents">
            <div className="grid gap-x-4 gap-y-3 lg:grid-cols-2">
              <Field label="Remark">
                <textarea
                  value={order.remark || ""}
                  onChange={(e) => handleOrderChange("remark", e.target.value)}
                  rows={3}
                  className={textareaClass}
                />
              </Field>
              <Field label="Upload (File URL)" help="Link to the customer PO or supporting document.">
                <input
                  type="text"
                  value={order.uploadUrl || ""}
                  onChange={(e) => handleOrderChange("uploadUrl", e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4">
          <Card icon={Receipt} tone="emerald" title="Commercial terms" description="Currency, tax and payment">
            <div className="space-y-3">
              <Field label="Currency" required>
                <SearchableSelect
                  compact
                  value={order.currencyId}
                  onChange={(e) => handleOrderChange("currencyId", e.target.value)}
                  disabled={readOnly}
                  className={selectTriggerClass}
                >
                  <option value="">Select Currency</option>
                  {formDataCache?.currencies?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.code}</option>
                  ))}
                </SearchableSelect>
              </Field>

              <Field label="Tax Type">
                {selectedCustomer?.isSez ? (
                  <div className={`${readOnlyClass} flex items-center`}>
                    SEZ Tax ({Number(formDataCache?.companies?.[0]?.sezTaxRate) || 0}%) Auto-applied
                  </div>
                ) : (
                  <SearchableSelect
                    compact
                    value={order.taxTypeId || ""}
                    onChange={(e) => handleOrderChange("taxTypeId", e.target.value)}
                    disabled={readOnly || order.status !== "Draft"}
                    className={selectTriggerClass}
                  >
                    <option value="">— Select Tax Type —</option>
                    {formDataCache?.taxes.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.taxType} ({t.taxRate}%)</option>
                    ))}
                  </SearchableSelect>
                )}
              </Field>

              <Field label="Payment Term" required>
                <SearchableSelect
                  compact
                  value={order.paymentTermId}
                  onChange={(e) => handleOrderChange("paymentTermId", e.target.value)}
                  disabled={readOnly}
                  className={selectTriggerClass}
                >
                  <option value="">Select Payment Term</option>
                  {formDataCache?.paymentTerms?.map((pt: any) => (
                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                  ))}
                </SearchableSelect>
              </Field>

              <Field label="Other Payment Detail">
                <input
                  type="text"
                  value={order.otherPaymentDetail || ""}
                  onChange={(e) => handleOrderChange("otherPaymentDetail", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>

          {/* Summary — dark anchor echoing the sidebar */}
          <section className="overflow-hidden rounded-xl bg-[#111827] text-slate-300 shadow-lg shadow-slate-900/10 ring-1 ring-white/5">
            <header className="flex items-center gap-2.5 border-b border-white/10 px-4 py-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/20">
                <Wallet size={15} />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold leading-tight text-white">Summary</h2>
                <p className="text-[11px] leading-tight text-slate-400">Live totals for this order</p>
              </div>
            </header>
            <dl className="space-y-2 px-4 py-3 text-[13px]">
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Items</dt>
                <dd className="tabular-nums text-slate-200">
                  {items.length}
                  <span className="ml-1.5 text-[11px] text-slate-500">· {totalQty} qty</span>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Amount before tax</dt>
                <dd className="tabular-nums text-slate-200">{fmt(amountBeforeTax)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">
                  Tax <span className="text-[11px] text-slate-500">({effectiveTaxRate}%{selectedCustomer?.isSez ? " SEZ" : ""})</span>
                </dt>
                <dd className="tabular-nums text-slate-200">{fmt(taxAmount)}</dd>
              </div>
            </dl>
            <div className="relative border-t border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-gradient-to-b from-indigo-400 to-violet-500" />
              <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-300">Total after tax</p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-indigo-300">{currencyCode}</span>
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">{fmt(amountAfterTax)}</span>
              </p>
            </div>
          </section>
        </div>
      </fieldset>

      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 ring-1 ring-inset ring-rose-600/15">
                <AlertCircle className="text-rose-600" size={18} />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">Add an item first</h3>
              <p className="mb-4 text-[13px] text-slate-600">
                Please add at least one item before saving the Sales Order.
              </p>
              <button onClick={() => setShowValidationModal(false)} className={buttonClass("primary", "md", "w-full")}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
