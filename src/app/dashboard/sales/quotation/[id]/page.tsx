"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Plus, Trash2, Save, FileText } from "lucide-react";
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
          setReadOnly(q.status !== "Draft");
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
  }, [items, lumpSumDisc, taxTypeId, data, currencyId, isRoundOff]);

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
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="text-sm text-blue-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between pb-6 border-b border-blue-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase mb-1">
            <Link href="/dashboard/sales/quotation" className="hover:text-amber-600 inline-flex items-center gap-1">
              <ArrowLeft size={12} /> Quotations
            </Link>
            {!isNew && meta.quotationNo && (
              <>
                <span>/</span>
                <span className="text-blue-500">
                  {meta.quotationNo} (Rev {meta.revision})
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] border bg-amber-50 text-amber-700 border-amber-200">
                  {meta.status}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <FileText size={20} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-blue-900">
              {isNew ? "New Quotation" : "Edit Quotation"}
            </h2>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={saving || readOnly}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-lg shadow-md active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">{error}</div>
      )}
      {readOnly && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
          This quotation is <strong>{meta.status}</strong> — read-only. Use Revise to create a new editable version.
        </div>
      )}

      {/* Header card */}
      <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Date" required>
          <input
            type="date"
            value={date}
            disabled={readOnly}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Our Contact (Salesperson)" required>
          <SearchableSelect
            value={salespersonId}
            disabled={readOnly}
            onChange={(e) => setSalespersonId(e.target.value)}
            className={inputCls}
          >
            <option value="">— Select —</option>
            {data?.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </SearchableSelect>
        </Field>
        <Field label="Quote Validity (days)">
          <input
            type="number"
            min={1}
            value={quoteValidityDays}
            disabled={readOnly}
            onChange={(e) => setQuoteValidityDays(Number(e.target.value))}
            className={inputCls}
          />
        </Field>

        <Field label="Customer" required>
          <SearchableSelect
            value={customerId}
            disabled={readOnly}
            onChange={(e) => setCustomerId(e.target.value)}
            className={inputCls}
          >
            <option value="">— Select —</option>
            {data?.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customerName}
              </option>
            ))}
          </SearchableSelect>
        </Field>
        <Field label="Customer Contact">
          {(() => {
            const contact = customer?.contactPersons.find((p) => p.id === contactPersonId);
            return (
              <input
                type="text"
                readOnly
                value={
                  contact
                    ? `${contact.contactPersonName}${contact.email ? ` (${contact.email})` : ""}`
                    : ""
                }
                placeholder={customer ? "No default contact" : "Select a customer first"}
                className={inputCls}
              />
            );
          })()}
        </Field>
        <Field label="Customer PO / Ref">
          <input
            type="text"
            value={customerPoRef}
            disabled={readOnly}
            onChange={(e) => setCustomerPoRef(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Ref No">
          <input
            type="text"
            value={refNo}
            disabled={readOnly}
            onChange={(e) => setRefNo(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Payment Terms">
          <SearchableSelect
            value={paymentTermId}
            disabled={readOnly}
            onChange={(e) => setPaymentTermId(e.target.value)}
            className={inputCls}
          >
            <option value="">— Select —</option>
            {data?.paymentTerms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.days} days)
              </option>
            ))}
          </SearchableSelect>
        </Field>
        <Field label="Lead Time">
          <input
            type="text"
            placeholder="e.g. 6 - 8 weeks"
            value={leadTime}
            disabled={readOnly}
            onChange={(e) => setLeadTime(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Currency" required>
          <SearchableSelect
            value={currencyId}
            disabled={readOnly}
            onChange={(e) => setCurrencyId(e.target.value)}
            className={inputCls}
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
            className={inputCls}
          />
        </Field>
        <Field label="Incoterms">
          <input
            type="text"
            value={incoterms}
            disabled={readOnly}
            onChange={(e) => setIncoterms(e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="md:col-span-3">
          <Field label="Title" required>
            <input
              type="text"
              placeholder="e.g. PST_24_0102_COWLING FEEDTHRU COVER PLATE ASSY"
              value={title}
              disabled={readOnly}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-blue-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-blue-900">Quote Items</h3>
          {!readOnly && (
            <button
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-400 rounded-md active:scale-95"
            >
              <Plus size={14} /> Add Item
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Finished Good</th>
                <th className="px-3 py-2 text-left w-32">UOM</th>
                <th className="px-3 py-2 text-right w-32">Unit Price</th>
                <th className="px-3 py-2 text-right w-24">Qty</th>
                <th className="px-3 py-2 text-right w-32">Price</th>
                {!readOnly && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {items.map((it, idx) => {
                const line =
                  Number(it.unitPrice || 0) * Number(it.quantity || 0);
                return (
                  <tr key={idx}>
                    <td className="px-3 py-2 align-top">
                      <SearchableSelect
                        value={it.partId}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { partId: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">— Select —</option>
                        {data?.finishedGoods.map((fg) => (
                          <option key={fg.id} value={fg.id}>
                            {fg.partNo ? `${fg.partNo} — ` : ""}{fg.description}
                          </option>
                        ))}
                      </SearchableSelect>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <SearchableSelect
                        value={it.uomId}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { uomId: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">—</option>
                        {data?.uoms.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.uomName}
                          </option>
                        ))}
                      </SearchableSelect>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        step="0.01"
                        value={it.unitPrice}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                        className={`${inputCls} text-right`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        min={0}
                        value={it.quantity}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                        className={`${inputCls} text-right`}
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-right font-mono text-blue-900">
                      {line.toFixed(2)}
                    </td>
                    {!readOnly && (
                      <td className="px-2 py-2 align-top">
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-rose-500"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals + tax */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-5 md:col-span-2 space-y-4">
          <Field label="Tax Type">
            {customer?.isSez ? (
              <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-sm">
                SEZ Tax ({Number(data?.companies?.[0]?.sezTaxRate) || 0}%) Auto-applied
              </div>
            ) : (
              <SearchableSelect
                value={taxTypeId}
                disabled={readOnly}
                onChange={(e) => setTaxTypeId(e.target.value)}
                className={inputCls}
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
          <Field label="Terms & Conditions Preset">
            <SearchableSelect
              value={termsPresetId}
              disabled={readOnly}
              onChange={(e) => {
                setTermsPresetId(e.target.value);
                const p = data?.termsAndConditionProfiles?.find((x) => x.id === e.target.value);
                if (p) setTermsAndConditions(p.content);
              }}
              className={inputCls}
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
              rows={4}
              value={termsAndConditions}
              disabled={readOnly}
              onChange={(e) => {
                setTermsAndConditions(e.target.value);
                setTermsPresetId(""); // Clear preset if manually edited
              }}
              className={inputCls}
            />
          </Field>
          <Field label="Remark">
            <textarea
              rows={2}
              value={remark}
              disabled={readOnly}
              onChange={(e) => setRemark(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-5 space-y-3 font-mono text-sm">
          <TotalsRow label="Sub Total" value={totals.subTotal} />
          <div className="flex items-center justify-between">
            <span className="text-blue-700">Lump Sum Discount</span>
            <input
              type="number"
              step="0.01"
              value={lumpSumDisc}
              disabled={readOnly}
              onChange={(e) => setLumpSumDisc(e.target.value)}
              className="w-32 px-2 py-1 text-right bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <TotalsRow label="After Discount" value={totals.afterDisc} muted />
          <TotalsRow
            label={`Add${totals.taxRate ? ` (${totals.taxRate}%)` : ""}`}
            value={totals.taxAmount}
          />
          <div className="flex items-center justify-between text-blue-700">
            <span>Round Off Total</span>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setIsRoundOff(!isRoundOff)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-1 ${
                isRoundOff ? "bg-amber-500" : "bg-slate-300"
              } ${readOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  isRoundOff ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="pt-3 border-t border-blue-200 flex items-center justify-between text-base">
            <span className="font-bold text-blue-900">Total Amount</span>
            <span className="font-bold text-blue-900">{totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-500";

function Field({
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
      <label className="block text-xs font-semibold text-blue-700 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function TotalsRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-blue-500" : "text-blue-800"}`}>
      <span>{label}</span>
      <span>{value.toFixed(2)}</span>
    </div>
  );
}
