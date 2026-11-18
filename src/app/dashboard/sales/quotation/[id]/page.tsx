/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarClock,
  CalendarDays,
  Calculator,
  FileText,
  Loader2,
  Lock,
  Package,
  Plus,
  Receipt,
  Save,
  ScrollText,
  Trash2,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import {
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
import { isQtEditable, normalizeQtStatus, qtStatusTone } from "../qt-status";

type FormData = {
  employees: { id: string; name: string; email: string; code: string }[];
  customers: {
    id: string;
    customerName: string;
    customerCode: string;
    isSez?: boolean;
    contactPersons: { id: string; contactPersonName: string; email: string | null; telNo: string | null; faxNo: string | null; isDefault: boolean }[];
    addresses: { id: string; address: string; isDefault: boolean }[];
  }[];
  paymentTerms: { id: string; name: string; days: number }[];
  currencies: { id: string; code: string; exchangeRate: number; isDefault: boolean; roundingMode?: string }[];
  taxes: { id: string; taxType: string; taxRate: number }[];
  finishedGoods: { id: string; partNo: string | null; description: string }[];
  uoms: { id: string; uomName: string }[];
  termsAndConditionProfiles: { id: string; name: string; content: string }[];
  companies?: { id: string; sezTaxRate: number | null }[];
};

type Item = {
  id?: string;
  partId: string;
  uomId: string;
  unitPrice: string;
  quantity: string;
  sortOrder: number;
};

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(value: string | Date | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/** Quote date + validity days (display only). */
function validUntil(date: string, days: number): Date | undefined {
  const d = new Date(date);
  if (Number.isNaN(d.getTime()) || !Number.isFinite(days)) return undefined;
  d.setDate(d.getDate() + days);
  return d;
}

export default function QuotationEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";

  const [data, setData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [meta, setMeta] = useState<{ quotationNo?: string; revision?: number; status?: string }>({});

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [salespersonId, setSalespersonId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [contactPersonId, setContactPersonId] = useState("");
  const [customerPoRef, setCustomerPoRef] = useState("");
  const [refNo, setRefNo] = useState("");
  const [title, setTitle] = useState("");
  const [paymentTermId, setPaymentTermId] = useState("");
  const [quoteValidityDays, setQuoteValidityDays] = useState(60);
  const [leadTime, setLeadTime] = useState("");
  const [incoterms, setIncoterms] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1.000");
  const [taxTypeId, setTaxTypeId] = useState("");
  const [lumpSumDisc, setLumpSumDisc] = useState("0.00");
  const [isRoundOff, setIsRoundOff] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [termsPresetId, setTermsPresetId] = useState("");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<Item[]>([
    { partId: "", uomId: "", unitPrice: "0.00", quantity: "1", sortOrder: 0 },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const fd = await fetch("/api/sales/quotation/form-data").then((r) => r.json());
        setData(fd);

        if (!isNew) {
          const q = await fetch(`/api/sales/quotation/${id}`).then((r) => r.json());
          if (q.error) throw new Error(q.error);
          setMeta({ quotationNo: q.quotationNo, revision: q.revision, status: q.status });
          setReadOnly(!isQtEditable(q.status));
          setDate(new Date(q.date).toISOString().slice(0, 10));
          setSalespersonId(q.salespersonId);
          setCustomerId(q.customerId || "");
          setContactPersonId(q.contactPersonId || "");
          setCustomerPoRef(q.customerPoRef || "");
          setRefNo(q.refNo || "");
          setTitle(q.title);
          setPaymentTermId(q.paymentTermId || "");
          setQuoteValidityDays(q.quoteValidityDays ?? 60);
          setLeadTime(q.leadTime || "");
          setIncoterms(q.incoterms || "");
          setCurrencyId(q.currencyId);
          setExchangeRate(String(q.exchangeRate));
          setTaxTypeId(q.taxTypeId || "");
          setLumpSumDisc(String(q.lumpSumDisc ?? 0));
          setIsRoundOff(q.isRoundOff || false);
          setTermsAndConditions(q.termsAndConditions || "");
          setRemark(q.remark || "");
          setItems(
            q.items.map((it: any, idx: number) => ({
              id: it.id,
              partId: it.partId || "",
              uomId: it.uomId || "",
              unitPrice: String(it.unitPrice),
              quantity: String(it.quantity),
              sortOrder: it.sortOrder ?? idx,
            })),
          );
        } else {
          // sensible defaults
          const def = fd.currencies.find((c: any) => c.isDefault) || fd.currencies[0];
          if (def) {
            setCurrencyId(def.id);
            setExchangeRate(String(def.exchangeRate));
          }
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const customer = useMemo(
    () => data?.customers.find((c) => c.id === customerId) || null,
    [data, customerId],
  );

  useEffect(() => {
    // when customer changes, default contact to that customer's default contact
    if (!customer) {
      setContactPersonId("");
      return;
    }
    const cur = customer.contactPersons.find((p) => p.id === contactPersonId);
    if (!cur) {
      const def = customer.contactPersons.find((p) => p.isDefault) || customer.contactPersons[0];
      setContactPersonId(def?.id || "");
    }
  }, [customer]); // eslint-disable-line react-hooks/exhaustive-deps

  // sync exchange rate when currency changes
  useEffect(() => {
    if (!currencyId || !data) return;
    const c = data.currencies.find((x) => x.id === currencyId);
    if (c) setExchangeRate(String(c.exchangeRate));
  }, [currencyId, data]);

  // sync validity days when payment term changes (one-time default — leave it editable)
  // (skip — quoteValidity is independent of payment term days per spec)

  const totals = useMemo(() => {
    const subTotal = items.reduce(
      (acc, it) => acc + Number(it.unitPrice || 0) * Number(it.quantity || 0),
      0,
    );
    const disc = Number(lumpSumDisc || 0);
    const afterDisc = Math.max(0, subTotal - disc);

    const isSez = customer?.isSez;
    const company = data?.companies?.[0]; // Default company if multiple exist

    let taxRate = 0;
    if (isSez) {
      taxRate = Number(company?.sezTaxRate) || 0;
    } else {
      const tax = data?.taxes.find((t) => t.id === taxTypeId);
      taxRate = tax?.taxRate ?? 0;
    }

    const taxAmount = +(afterDisc * (taxRate / 100)).toFixed(2);

    let total = afterDisc + taxAmount;
    if (isRoundOff) {
      total = Math.round(total);
    } else {
      const currency = data?.currencies.find((c) => c.id === currencyId);
      if (currency?.roundingMode === "UP") {
        total = Math.ceil(total);
      } else if (currency?.roundingMode === "DOWN") {
        total = Math.floor(total);
      } else {
        total = +total.toFixed(2);
      }
    }

    return {
      subTotal: +subTotal.toFixed(2),
      afterDisc: +afterDisc.toFixed(2),
      taxRate,
      taxAmount,
      total,
    };
  }, [items, lumpSumDisc, taxTypeId, data, currencyId, isRoundOff, customer]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((cur) => [
      ...cur,
      { partId: "", uomId: "", unitPrice: "0.00", quantity: "1", sortOrder: cur.length },
    ]);
  }
  function removeItem(idx: number) {
    setItems((cur) => cur.filter((_, i) => i !== idx));
  }

  async function onSave() {
    setError("");
    if (!salespersonId) return setError("Salesperson is required");
    if (!customerId) {
      return setError("Customer is required");
    }
    if (!currencyId) return setError("Currency is required");
    if (!title.trim()) return setError("Title is required");
    if (!items.length || !items.some((it) => it.partId))
      return setError("At least one line item with a Finished Good is required");
    const incomplete = items.findIndex((it) => it.partId && !it.uomId);
    if (incomplete >= 0)
      return setError(`Line ${incomplete + 1}: UOM is required when a Finished Good is selected.`);

    setSaving(true);
    try {
      const payload = {
        date,
        salespersonId,
        customerId,
        contactPersonId: contactPersonId || null,
        customerPoRef,
        refNo,
        title: title.trim(),
        paymentTermId: paymentTermId || null,
        quoteValidityDays: Number(quoteValidityDays) || 60,
        leadTime,
        incoterms,
        currencyId,
        exchangeRate: Number(exchangeRate) || 1,
        lumpSumDisc: Number(lumpSumDisc) || 0,
        isRoundOff,
        taxTypeId: customer?.isSez ? null : (taxTypeId || null),
        termsAndConditions,
        remark,
        items: items
          .filter((it) => it.partId)
          .map((it, idx) => ({
            partId: it.partId || null,
            uomId: it.uomId || null,
            unitPrice: Number(it.unitPrice) || 0,
            quantity: Number(it.quantity) || 0,
            sortOrder: idx,
          })),
      };
      const url = isNew ? `/api/sales/quotation` : `/api/sales/quotation/${id}`;
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
      router.push(`/dashboard/saved?module=Quotation&id=${saved.quotationNo || saved.id}&viewUrl=/dashboard/sales/quotation/${saved.id}&backUrl=/dashboard/sales/quotation`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="animate-spin text-indigo-600" size={22} />
      </div>
    );
  }

  const status = isNew ? "Draft" : normalizeQtStatus(meta.status);
  const currencyCode = data?.currencies.find((c) => c.id === currencyId)?.code || "";
  const contact = customer?.contactPersons.find((p) => p.id === contactPersonId);
  const salespersonName = data?.employees.find((e) => e.id === salespersonId)?.name || "";
  const expiry = validUntil(date, Number(quoteValidityDays));
  const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const pricedLines = items.filter((it) => it.partId).length;
  const discount = Number(lumpSumDisc || 0);
  const rounding = +(totals.total - (totals.afterDisc + totals.taxAmount)).toFixed(2);
  const sezRate = Number(data?.companies?.[0]?.sezTaxRate) || 0;
  const roundingMode = data?.currencies.find((c) => c.id === currencyId)?.roundingMode;

  return (
    <div className="w-full space-y-4">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/sales/quotation" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Quotations
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {isNew || !meta.quotationNo ? (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">{isNew ? "New Quotation" : "Edit Quotation"}</h1>
              ) : (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">QT</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">{meta.quotationNo}</span>
                  <span className="rounded bg-slate-100 px-1 py-px font-mono text-[11px] font-medium text-slate-500" title="Revision">
                    R{meta.revision ?? 0}
                  </span>
                </h1>
              )}
              <StatusBadge status={status} tone={qtStatusTone(status)} size="md" label={isNew ? "New · Draft" : status} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Customer">{customer?.customerName || "No customer yet"}</MetaChip>
              <MetaChip icon={CalendarDays} title="Quotation date">{fmtDate(date)}</MetaChip>
              <MetaChip icon={CalendarClock} label="Valid until" title={`${quoteValidityDays} days validity`}>{fmtDate(expiry)}</MetaChip>
              {salespersonName && <MetaChip icon={UserRound} title="Our contact">{salespersonName}</MetaChip>}
              <MetaChip icon={Wallet} title="Total amount">
                <span className="tabular-nums">{currencyCode} {fmt(totals.total)}</span>
              </MetaChip>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => router.push("/dashboard/sales/quotation")} className={buttonClass("ghost", "md")}>
              Back
            </button>
            {readOnly ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            ) : (
              <button type="button" onClick={onSave} disabled={saving} className={buttonClass("primary", "md")}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Saving…" : "Save"}
              </button>
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
            This quotation is <span className="font-semibold text-slate-800">{status}</span> — read-only. Use Revise to create a new editable version.
          </span>
        </div>
      )}

      <fieldset disabled={readOnly} className="m-0 grid min-w-0 grid-cols-1 gap-4 border-0 p-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          {/* Quotation details */}
          <Card icon={FileText} tone="indigo" title="Quotation details" description="Title, owner, validity and delivery terms">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Title" required className="sm:col-span-2 lg:col-span-4">
                <input
                  type="text"
                  placeholder="e.g. PST_24_0102_COWLING FEEDTHRU COVER PLATE ASSY"
                  value={title}
                  disabled={readOnly}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Date" required>
                <input
                  type="date"
                  value={date}
                  disabled={readOnly}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Our Contact (Salesperson)" required>
                <SearchableSelect
                  compact
                  value={salespersonId}
                  disabled={readOnly}
                  onChange={(e) => setSalespersonId(e.target.value)}
                  className={selectTriggerClass}
                >
                  <option value="">— Select —</option>
                  {data?.employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="Quote Validity (days)" help={expiry ? `Valid until ${fmtDate(expiry)}` : undefined}>
                <input
                  type="number"
                  min={1}
                  value={quoteValidityDays}
                  disabled={readOnly}
                  onChange={(e) => setQuoteValidityDays(Number(e.target.value))}
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
              <Field label="Ref No">
                <input
                  type="text"
                  value={refNo}
                  disabled={readOnly}
                  onChange={(e) => setRefNo(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Lead Time">
                <input
                  type="text"
                  placeholder="e.g. 6 - 8 weeks"
                  value={leadTime}
                  disabled={readOnly}
                  onChange={(e) => setLeadTime(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Incoterms">
                <input
                  type="text"
                  value={incoterms}
                  disabled={readOnly}
                  onChange={(e) => setIncoterms(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>

          {/* Customer */}
          <Card icon={Users} tone="sky" title="Customer" description="Who the quotation is addressed to">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Customer" required>
                <SearchableSelect
                  compact
                  value={customerId}
                  disabled={readOnly}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={selectTriggerClass}
                >
                  <option value="">— Select —</option>
                  {data?.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerName}
                    </option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="Customer Contact" help={customer?.isSez ? "SEZ customer — SEZ tax rate applies." : undefined}>
                <input
                  type="text"
                  readOnly
                  value={contact ? `${contact.contactPersonName}${contact.email ? ` (${contact.email})` : ""}` : ""}
                  placeholder={customer ? "No default contact" : "Select a customer first"}
                  className={readOnlyClass}
                />
              </Field>
              <Field label="Customer PO / Ref" className="sm:col-span-2 lg:col-span-1">
                <input
                  type="text"
                  value={customerPoRef}
                  disabled={readOnly}
                  onChange={(e) => setCustomerPoRef(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>

          {/* Line items */}
          <Card
            icon={Package}
            tone="amber"
            bodyClassName="p-0"
            title={
              <span className="inline-flex items-center gap-1.5">
                Quote items
                {items.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-1.5 text-[11px] font-semibold tabular-nums text-amber-700 ring-1 ring-inset ring-amber-600/15">
                    {items.length}
                  </span>
                )}
              </span>
            }
            description="Finished goods, unit price and quantity"
            actions={
              !readOnly && items.length > 0 ? (
                <button type="button" onClick={addItem} className={buttonClass("link", "sm")}>
                  <Plus size={14} /> Add Item
                </button>
              ) : undefined
            }
          >
            {items.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  boxed
                  icon={Package}
                  tone="amber"
                  title="No items yet"
                  description="Add the finished goods you are quoting for. Each line is priced as unit price × quantity."
                  action={
                    !readOnly && (
                      <button type="button" onClick={addItem} className={buttonClass("primary", "md")}>
                        <Plus size={14} /> Add first item
                      </button>
                    )
                  }
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] table-fixed text-left text-[13px]">
                    <colgroup>
                      <col className="w-10" />
                      <col />
                      <col className="w-28" />
                      <col className="w-28" />
                      <col className="w-24" />
                      <col className="w-32" />
                      {!readOnly && <col className="w-10" />}
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <th className="py-2 pl-4 pr-1 font-medium">#</th>
                        <th className="px-2 py-2 font-medium">Finished Good</th>
                        <th className="px-2 py-2 font-medium">UOM</th>
                        <th className="px-2 py-2 text-right font-medium">Unit Price</th>
                        <th className="px-2 py-2 text-right font-medium">Qty</th>
                        <th className="px-3 py-2 text-right font-medium">Price</th>
                        {!readOnly && <th className="px-2 py-2" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it, idx) => {
                        const line = Number(it.unitPrice || 0) * Number(it.quantity || 0);
                        return (
                          <tr key={idx} className="align-top transition-colors hover:bg-slate-50/60 focus-within:bg-indigo-50/30">
                            <td className="py-1.5 pl-4 pr-1">
                              <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold tabular-nums text-white">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="min-w-0 px-2 py-1.5">
                              <SearchableSelect
                                compact
                                value={it.partId}
                                disabled={readOnly}
                                onChange={(e) => updateItem(idx, { partId: e.target.value })}
                                className={selectTriggerSmClass}
                              >
                                <option value="">— Select —</option>
                                {data?.finishedGoods.map((fg) => (
                                  <option key={fg.id} value={fg.id}>
                                    {fg.partNo ? `${fg.partNo} — ` : ""}{fg.description}
                                  </option>
                                ))}
                              </SearchableSelect>
                            </td>
                            <td className="px-2 py-1.5">
                              <SearchableSelect
                                compact
                                value={it.uomId}
                                disabled={readOnly}
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
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                step="0.01"
                                value={it.unitPrice}
                                disabled={readOnly}
                                onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                                className={`${inputSmClass} text-right tabular-nums`}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                min={0}
                                value={it.quantity}
                                disabled={readOnly}
                                onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                                className={`${inputSmClass} text-right tabular-nums`}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <span className="inline-block pt-1 font-semibold tabular-nums text-slate-900">{fmt(line)}</span>
                            </td>
                            {!readOnly && (
                              <td className="px-2 py-1.5 text-center">
                                <button type="button" onClick={() => removeItem(idx)} title="Remove" className={`${iconButtonDangerClass} mt-0.5`}>
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50/70 text-[13px]">
                        <td colSpan={4} className="py-2 pl-4 pr-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                          Sub Total
                          <span className="ml-1.5 normal-case tracking-normal text-slate-400">
                            · {pricedLines} of {items.length} line{items.length === 1 ? "" : "s"} priced
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right font-medium tabular-nums text-slate-700">{totalQty}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="mr-1 text-[11px] text-slate-400">{currencyCode}</span>
                          <span className="font-semibold tabular-nums text-slate-900">{fmt(totals.subTotal)}</span>
                        </td>
                        {!readOnly && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {!readOnly && (
                  <div className="p-3">
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 text-xs font-medium text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
                    >
                      <Plus size={14} /> Add another item
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Terms & remarks */}
          <Card icon={ScrollText} tone="violet" title="Terms & remarks" description="Printed on the quotation">
            <div className="grid gap-x-4 gap-y-3 lg:grid-cols-2">
              <Field label="Terms & Conditions Preset" className="lg:col-span-2">
                <SearchableSelect
                  compact
                  value={termsPresetId}
                  disabled={readOnly}
                  onChange={(e) => {
                    setTermsPresetId(e.target.value);
                    const p = data?.termsAndConditionProfiles?.find((x) => x.id === e.target.value);
                    if (p) setTermsAndConditions(p.content);
                  }}
                  className={selectTriggerClass}
                >
                  <option value="">— Select to Auto-Fill —</option>
                  {data?.termsAndConditionProfiles?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="Terms & Conditions">
                <textarea
                  rows={5}
                  value={termsAndConditions}
                  disabled={readOnly}
                  onChange={(e) => {
                    setTermsAndConditions(e.target.value);
                    setTermsPresetId(""); // Clear preset if manually edited
                  }}
                  className={textareaClass}
                />
              </Field>
              <Field label="Remark">
                <textarea
                  rows={5}
                  value={remark}
                  disabled={readOnly}
                  onChange={(e) => setRemark(e.target.value)}
                  className={textareaClass}
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4">
          <Card icon={Receipt} tone="emerald" title="Commercial terms" description="Currency and payment">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Currency" required>
                  <SearchableSelect
                    compact
                    value={currencyId}
                    disabled={readOnly}
                    onChange={(e) => setCurrencyId(e.target.value)}
                    className={selectTriggerClass}
                  >
                    <option value="">— Select —</option>
                    {data?.currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </SearchableSelect>
                </Field>
                <Field label="Exchange Rate">
                  <input
                    type="number"
                    step="0.001"
                    value={exchangeRate}
                    disabled={readOnly}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className={`${inputClass} text-right tabular-nums`}
                  />
                </Field>
              </div>
              <Field label="Payment Terms">
                <SearchableSelect
                  compact
                  value={paymentTermId}
                  disabled={readOnly}
                  onChange={(e) => setPaymentTermId(e.target.value)}
                  className={selectTriggerClass}
                >
                  <option value="">— Select —</option>
                  {data?.paymentTerms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.days} days)
                    </option>
                  ))}
                </SearchableSelect>
              </Field>
            </div>
          </Card>

          {/* Costing build-up */}
          <Card icon={Calculator} tone="blue" title="Costing" description="Discount, tax and rounding">
            <div className="space-y-3">
              <Field label="Tax Type">
                {customer?.isSez ? (
                  <div className={`${readOnlyClass} flex items-center`}>SEZ Tax ({sezRate}%) Auto-applied</div>
                ) : (
                  <SearchableSelect
                    compact
                    value={taxTypeId}
                    disabled={readOnly}
                    onChange={(e) => setTaxTypeId(e.target.value)}
                    className={selectTriggerClass}
                  >
                    <option value="">— None —</option>
                    {data?.taxes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.taxType} ({t.taxRate}%)
                      </option>
                    ))}
                  </SearchableSelect>
                )}
              </Field>

              <dl className="space-y-1.5 rounded-lg bg-slate-50/70 px-3 py-2.5 text-[13px] ring-1 ring-inset ring-slate-200/70">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Sub Total</dt>
                  <dd className="tabular-nums text-slate-800">{fmt(totals.subTotal)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">
                    <label htmlFor="qt-lump-sum">Lump Sum Discount</label>
                  </dt>
                  <dd className="w-28">
                    <input
                      id="qt-lump-sum"
                      type="number"
                      step="0.01"
                      value={lumpSumDisc}
                      disabled={readOnly}
                      onChange={(e) => setLumpSumDisc(e.target.value)}
                      className={`${inputSmClass} text-right tabular-nums`}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-200 pt-1.5">
                  <dt className="font-medium text-slate-700">After Discount</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{fmt(totals.afterDisc)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">
                    Add Tax{totals.taxRate ? <span className="ml-1 text-[11px] text-slate-400">({totals.taxRate}%{customer?.isSez ? " SEZ" : ""})</span> : null}
                  </dt>
                  <dd className="tabular-nums text-slate-800">{fmt(totals.taxAmount)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">
                    <label htmlFor="qt-round-off" className="cursor-pointer">Round Off Total</label>
                  </dt>
                  <dd>
                    <button
                      id="qt-round-off"
                      type="button"
                      role="switch"
                      aria-checked={isRoundOff}
                      disabled={readOnly}
                      onClick={() => setIsRoundOff(!isRoundOff)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                        isRoundOff ? "bg-indigo-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                          isRoundOff ? "translate-x-[18px]" : "translate-x-[3px]"
                        }`}
                      />
                    </button>
                  </dd>
                </div>
                {rounding !== 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">
                      Rounding
                      <span className="ml-1 text-[11px] text-slate-400">
                        ({isRoundOff ? "round off" : roundingMode === "UP" ? "currency: up" : roundingMode === "DOWN" ? "currency: down" : "2 dp"})
                      </span>
                    </dt>
                    <dd className="tabular-nums text-slate-800">
                      {rounding > 0 ? "+" : ""}
                      {fmt(rounding)}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-1.5">
                  <dt className="font-semibold text-slate-800">Total Amount</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{fmt(totals.total)}</dd>
                </div>
              </dl>
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
                <p className="text-[11px] leading-tight text-slate-400">Live totals for this quotation</p>
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
                <dt className="text-slate-400">Sub Total</dt>
                <dd className="tabular-nums text-slate-200">{fmt(totals.subTotal)}</dd>
              </div>
              {discount !== 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Discount</dt>
                  <dd className="tabular-nums text-slate-200">−{fmt(discount)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">
                  Tax <span className="text-[11px] text-slate-500">({totals.taxRate}%{customer?.isSez ? " SEZ" : ""})</span>
                </dt>
                <dd className="tabular-nums text-slate-200">{fmt(totals.taxAmount)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Valid until</dt>
                <dd className="text-slate-200">{fmtDate(expiry)}</dd>
              </div>
            </dl>
            <div className="relative border-t border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-gradient-to-b from-indigo-400 to-violet-500" />
              <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-300">Total amount</p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-indigo-300">{currencyCode}</span>
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">{fmt(totals.total)}</span>
              </p>
            </div>
          </section>
        </div>
      </fieldset>
    </div>
  );
}
