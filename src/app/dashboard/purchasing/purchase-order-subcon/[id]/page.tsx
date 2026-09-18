"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Plus, Trash2, Save, FileText } from "lucide-react";
type FormData = {
  companies: { id: string; companyName: string; allowPoForWo: boolean }[];
  employees: { id: string; name: string; email: string; code: string }[];
  workOrders: {
    workOrderNo: string;
    jobDescription: string | null;
    inProcesses: {
      routingProcesses: {
        id: string;
        mainProcess: { id: string; process: string } | null;
        routingProcess: { id: string; routingProcess: string } | null;
      }[];
    }[];
  }[];
  suppliers: { id: string; supplierName: string; contactPersons: any[] }[];
  currencies: { id: string; code: string; name: string; exchangeRate: string | number }[];
  taxes: { id: string; taxType: string; taxRate: string | number }[];
  uoms: { id: string; uomName: string }[];
  mainProcesses: { id: string; process: string }[];
  processProfiles: { id: string; routingProcess: string; mainProcessId: string; costPerMinute: string }[];
};

type Item = {
  id?: string;
  woRoutingProcessId: string;
  masterMainProcessId: string;
  masterRoutingProcessId: string;
  description: string;
  hardness?: string;
  thickness?: string;
  poUomId: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  deliveryDate: string;
  remark: string;
};

export default function PurchaseOrderSubconEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";

  const [data, setData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [meta, setMeta] = useState<{ poNo?: string; revision?: number; status?: string; receiveStatus?: string }>({});

  const [companyId, setCompanyId] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [workOrderNo, setWorkOrderNo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [contactPersonId, setContactPersonId] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierTel, setSupplierTel] = useState("");
  const [supplierFax, setSupplierFax] = useState("");
  const [supplierMobile, setSupplierMobile] = useState("");
  const [purchaserId, setPurchaserId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1.00");
  const [taxTypeId, setTaxTypeId] = useState("");
  const [taxRate, setTaxRate] = useState("0.00");
  const [amountBeforeTax, setAmountBeforeTax] = useState("0.00");
  const [taxAmount, setTaxAmount] = useState("0.00");
  const [amountAfterTax, setAmountAfterTax] = useState("0.00");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const fd = await fetch("/api/purchasing/purchase-order/form-data").then((r) => r.json());
        setData(fd);

        if (!isNew) {
          const po = await fetch(`/api/purchasing/purchase-order/${id}`).then((r) => r.json());
          if (po.error) throw new Error(po.error);
          setMeta({ poNo: po.poNo, revision: po.revision, status: po.status, receiveStatus: po.receiveStatus });
          setReadOnly(po.status !== "Draft" && po.status !== "Rejected");
          setCompanyId(po.companyId);
          setDate(new Date(po.date).toISOString().slice(0, 10));
          setWorkOrderNo(po.workOrderNo || "");
          setSupplierId(po.supplierId);
          setContactPersonId(po.contactPersonId || "");
          setSupplierEmail(po.email || "");
          setSupplierTel(po.telNo || "");
          setSupplierFax(po.faxNo || "");
          setSupplierMobile(po.mobileNo || "");
          setPurchaserId(po.purchaserId);
          setCurrencyId(po.currencyId);
          setExchangeRate(Number(po.exchangeRate || 1).toFixed(4));
          setTaxTypeId(po.taxTypeId);
          setTaxRate(Number(po.taxRate || 0).toFixed(2));
          setAmountBeforeTax(Number(po.amountBeforeTax || 0).toFixed(2));
          setTaxAmount(Number(po.taxAmount || 0).toFixed(2));
          setAmountAfterTax(Number(po.amountAfterTax || 0).toFixed(2));
          setRemark(po.remark || "");
          setItems(
            po.items.map((it: any) => ({
              id: it.id,
              woRoutingProcessId: it.woRoutingProcessId || "",
              masterMainProcessId: it.masterMainProcessId || "",
              masterRoutingProcessId: it.masterRoutingProcessId || "",
              description: it.description || "",
              poUomId: it.poUomId || "",
              quantity: Number(it.quantity).toFixed(2),
              unitPrice: Number(it.unitPrice).toFixed(4),
              amount: Number(it.amount).toFixed(2),
              deliveryDate: new Date(it.deliveryDate).toISOString().slice(0, 10),
              remark: it.remark || "",
            })),
          );
        } else {
          // Defaults
          if (fd.companies?.length > 0) setCompanyId(fd.companies[0].id);
          if (fd.employees?.length > 0) setPurchaserId(fd.employees[0].id);
          const defCurr = fd.currencies?.find((c: any) => c.isDefault);
          if (defCurr) {
            setCurrencyId(defCurr.id);
            setExchangeRate(Number(defCurr.exchangeRate).toFixed(4));
          }
          // Add default empty item
          setItems([{
            woRoutingProcessId: "",
            masterMainProcessId: "",
            masterRoutingProcessId: "",
            description: "",
            hardness: "",
            thickness: "",
            poUomId: "",
            quantity: "1.00",
            unitPrice: "0.00",
            amount: "0.00",
            deliveryDate: new Date().toISOString().slice(0, 10),
            remark: "",
          }]);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const selectedCompany = useMemo(() => data?.companies?.find(c => c.id === companyId), [data, companyId]);
  const allowPoForWo = selectedCompany?.allowPoForWo ?? true;

  const selectedWorkOrder = useMemo(() => data?.workOrders?.find(w => w.workOrderNo === workOrderNo), [data, workOrderNo]);
  const woRoutingProcesses = useMemo(() => {
    if (!selectedWorkOrder) return [];
    return selectedWorkOrder.inProcesses.flatMap(ip => ip.routingProcesses);
  }, [selectedWorkOrder]);

  const selectedSupplier = useMemo(() => data?.suppliers?.find((s) => s.id === supplierId) || null, [data, supplierId]);
  const contactPersons = useMemo(() => selectedSupplier?.contactPersons || [], [selectedSupplier]);

  useEffect(() => {
    if (selectedSupplier && isNew) {
      const def = contactPersons.find(c => c.isDefault) || contactPersons[0];
      if (def) {
        setContactPersonId(def.id);
        setSupplierEmail(def.email || "");
        setSupplierTel(def.telNo || "");
        setSupplierFax(def.faxNo || "");
        setSupplierMobile(def.mobileNo || "");
      } else {
        setContactPersonId("");
        setSupplierEmail("");
        setSupplierTel("");
        setSupplierFax("");
        setSupplierMobile("");
      }
    }
  }, [selectedSupplier, contactPersons, isNew]);

  const handleContactPersonChange = (cid: string) => {
    setContactPersonId(cid);
    const c = contactPersons.find(cp => cp.id === cid);
    if (c) {
      setSupplierEmail(c.email || "");
      setSupplierTel(c.telNo || "");
      setSupplierFax(c.faxNo || "");
      setSupplierMobile(c.mobileNo || "");
    }
  };

  const handleCurrencyChange = (cid: string) => {
    setCurrencyId(cid);
    const curr = data?.currencies?.find(c => c.id === cid);
    if (curr) {
      setExchangeRate(Number(curr.exchangeRate).toFixed(4));
    }
  };

  const handleTaxTypeChange = (tid: string) => {
    setTaxTypeId(tid);
    const tax = data?.taxes?.find(t => t.id === tid);
    if (tax) {
      setTaxRate(Number(tax.taxRate).toFixed(2));
    }
  };

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((cur) =>
      cur.map((it, i) => {
        if (i !== idx) return it;

        const updated = { ...it, ...patch };

        // Auto-populate description if process selected
        if (patch.woRoutingProcessId && patch.woRoutingProcessId !== it.woRoutingProcessId) {
          const proc = woRoutingProcesses.find(rp => rp.id === patch.woRoutingProcessId);
          if (proc) {
            updated.description = `${proc.mainProcess?.process || ""} - ${proc.routingProcess?.routingProcess || ""}`;
          }
        }
        if (patch.masterRoutingProcessId && patch.masterRoutingProcessId !== it.masterRoutingProcessId) {
          const mProc = data?.processProfiles?.find(p => p.id === patch.masterRoutingProcessId);
          if (mProc) {
            updated.description = mProc.routingProcess;
          }
        }

        // Recalculations
        if (patch.quantity || patch.unitPrice) {
          const q = Number(updated.quantity) || 0;
          const p = Number(updated.unitPrice) || 0;
          updated.amount = (q * p).toFixed(2);
        }

        return updated;
      }),
    );
  }

  useEffect(() => {
    const totalItems = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    setAmountBeforeTax(totalItems.toFixed(2));
    const taxAmt = totalItems * (Number(taxRate) / 100);
    setTaxAmount(taxAmt.toFixed(2));
    
    let finalTotal = totalItems + taxAmt;
    const currency = data?.currencies?.find((c: any) => c.id === currencyId);
    if ((currency as any)?.roundingMode === "UP") {
      finalTotal = Math.ceil(finalTotal);
    } else if ((currency as any)?.roundingMode === "DOWN") {
      finalTotal = Math.floor(finalTotal);
    }
    
    setAmountAfterTax(finalTotal.toFixed(2));
  }, [items, taxRate, currencyId, data]);

  function addItem() {
    setItems((cur) => [
      ...cur,
      {
        woRoutingProcessId: "",
        masterMainProcessId: "",
        masterRoutingProcessId: "",
        description: "",
        hardness: "",
        thickness: "",
        poUomId: "",
        quantity: "1.00",
        unitPrice: "0.00",
        amount: "0.00",
        deliveryDate: new Date().toISOString().slice(0, 10),
        remark: "",
      },
    ]);
  }

  function removeItem(idx: number) {
    setItems((cur) => cur.filter((_, i) => i !== idx));
  }

  async function onSave() {
    setError("");

    if (!companyId) return setError("Company is required");
    if (!allowPoForWo && !workOrderNo) return setError("Work Order is required based on company settings");
    if (!supplierId) return setError("Supplier is required");
    if (!purchaserId) return setError("Purchaser is required");
    if (!currencyId) return setError("Currency is required");
    if (!taxTypeId) return setError("Tax is required");
    if (!items.length) return setError("At least one item is required");

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const ln = i + 1;
      
      if (workOrderNo && !it.woRoutingProcessId) {
        return setError(`Line ${ln}: Work Order Process is required`);
      }
      if (!workOrderNo && (!it.masterMainProcessId || !it.masterRoutingProcessId)) {
        return setError(`Line ${ln}: Main Process and Routing Process are required`);
      }
      if (!it.description.trim()) {
        return setError(`Line ${ln}: Description is required`);
      }
      if (!it.poUomId) {
        return setError(`Line ${ln}: PO UOM is required`);
      }
    }

    setSaving(true);
    try {
      const payload = {
        type: "SUBCON",
        companyId,
        supplierId,
        date,
        workOrderNo: workOrderNo || null,
        purchaserId,
        contactPersonId: contactPersonId || null,
        email: supplierEmail,
        telNo: supplierTel,
        faxNo: supplierFax,
        mobileNo: supplierMobile,
        currencyId,
        exchangeRate: Number(exchangeRate),
        taxTypeId,
        taxRate: Number(taxRate),
        amountBeforeTax: Number(amountBeforeTax),
        taxAmount: Number(taxAmount),
        amountAfterTax: Number(amountAfterTax),
        remark,
        items: items.map((it) => ({
          woRoutingProcessId: workOrderNo ? it.woRoutingProcessId : null,
          masterMainProcessId: !workOrderNo ? it.masterMainProcessId : null,
          masterRoutingProcessId: !workOrderNo ? it.masterRoutingProcessId : null,
          description: it.description,
          hardness: it.hardness || null,
          thickness: it.thickness || null,
          poUomId: it.poUomId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          amount: Number(it.amount),
          deliveryDate: it.deliveryDate,
          remark: it.remark || null,
        })),
      };

      const url = isNew ? `/api/purchasing/purchase-order` : `/api/purchasing/purchase-order/${id}`;
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
      router.push(`/dashboard/saved?module=Purchase Order Subcon&id=${saved.poNo || saved.id}&viewUrl=/dashboard/purchasing/purchase-order-subcon/${saved.id}&backUrl=/dashboard/purchasing/purchase-order-subcon`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-blue-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[90rem] mx-auto">
      <div className="flex items-center justify-between pb-6 border-b border-blue-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase mb-1">
            <Link href="/dashboard/purchasing/purchase-order-subcon" className="hover:text-blue-600 inline-flex items-center gap-1">
              <ArrowLeft size={12} /> Purchase Order Subcon
            </Link>
            {!isNew && meta.poNo && (
              <>
                <span>/</span>
                <span className="text-blue-500">
                  {meta.poNo}-R{meta.revision}
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] border bg-blue-50 text-blue-700 border-blue-200">
                  {meta.status}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <FileText size={20} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-blue-900">
              {isNew ? "New Subcon Purchase Order" : "Edit Subcon Purchase Order"}
            </h2>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={saving || readOnly}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 rounded-lg shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
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
          This purchase order is <strong>{meta.status}</strong> — read-only.
        </div>
      )}

      {/* Header Fields */}
      <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Field label="Company" required>
          <SearchableSelect
            value={companyId}
            disabled={readOnly || !isNew}
            onChange={(e) => setCompanyId(e.target.value)}
            className={inputCls}
          >
            <option value="">— Select —</option>
            {data?.companies?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="PO Date" required>
          <input
            type="date"
            value={date}
            disabled={readOnly}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Purchaser" required>
          <SearchableSelect
            value={purchaserId}
            disabled={readOnly}
            onChange={(e) => setPurchaserId(e.target.value)}
            className={inputCls}
          >
            <option value="">— Select —</option>
            {data?.employees?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.code})
              </option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="Work Order">
          <SearchableSelect
            value={workOrderNo}
            disabled={readOnly || !isNew}
            onChange={(e) => setWorkOrderNo(e.target.value)}
            className={inputCls}
          >
            <option value="">{allowPoForWo ? "— None (Non Work Order) —" : "— Select Work Order —"}</option>
            {data?.workOrders?.map((w) => (
              <option key={w.workOrderNo} value={w.workOrderNo}>
                {w.workOrderNo} - {w.jobDescription?.substring(0,20)}...
              </option>
            ))}
          </SearchableSelect>
          {!allowPoForWo && !workOrderNo && (
            <p className="text-[10px] text-rose-500 mt-1">Required based on company settings.</p>
          )}
        </Field>

        <Field label="Supplier" required>
          <SearchableSelect
            value={supplierId}
            disabled={readOnly || !isNew}
            onChange={(e) => setSupplierId(e.target.value)}
            className={inputCls}
          >
            <option value="">— Select Supplier —</option>
            {data?.suppliers?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.supplierName}
              </option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="Supplier Contact Person">
          <SearchableSelect
            value={contactPersonId}
            disabled={readOnly || !supplierId}
            onChange={(e) => handleContactPersonChange(e.target.value)}
            className={inputCls}
          >
            <option value="">— Select —</option>
            {contactPersons.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.contactPersonName}
              </option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="Supplier Email">
          <input
            type="email"
            value={supplierEmail}
            disabled={readOnly}
            onChange={(e) => setSupplierEmail(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Supplier Tel No">
          <input
            type="text"
            value={supplierTel}
            disabled={readOnly}
            onChange={(e) => setSupplierTel(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Supplier Fax No">
          <input
            type="text"
            value={supplierFax}
            disabled={readOnly}
            onChange={(e) => setSupplierFax(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Supplier Mobile No">
          <input
            type="text"
            value={supplierMobile}
            disabled={readOnly}
            onChange={(e) => setSupplierMobile(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Currency" required>
          <SearchableSelect
            value={currencyId}
            disabled={readOnly}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className={inputCls}
          >
            <option value="">— Select —</option>
            {data?.currencies?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </SearchableSelect>
        </Field>
        <Field label="Exchange Rate" required>
          <input
            type="number"
            step="0.0001"
            value={exchangeRate}
            disabled={true}
            readOnly
            className={inputCls}
          />
        </Field>

        <Field label="Tax Code" required>
          <SearchableSelect
            value={taxTypeId}
            disabled={readOnly}
            onChange={(e) => handleTaxTypeChange(e.target.value)}
            className={inputCls}
          >
            <option value="">— Select —</option>
            {data?.taxes?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.taxType}
              </option>
            ))}
          </SearchableSelect>
        </Field>
        <Field label="Tax Rate %">
          <input
            type="number"
            step="0.01"
            value={taxRate}
            disabled={true}
            readOnly
            className={inputCls}
          />
        </Field>
        <Field label="Remark">
          <textarea
            rows={1}
            value={remark}
            disabled={readOnly}
            onChange={(e) => setRemark(e.target.value)}
            className={inputCls}
          />
        </Field>

      </div>

      {/* Items Section */}
      <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-blue-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-blue-900">Purchase Order Subcon Items</h3>
          {!readOnly && (
            <button
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md active:scale-95 cursor-pointer"
            >
              <Plus size={14} /> Add Item
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider">
              <tr>
                {workOrderNo ? (
                  <th className="px-3 py-2 text-left w-56">WO Process</th>
                ) : (
                  <>
                    <th className="px-3 py-2 text-left w-48">Main Process</th>
                    <th className="px-3 py-2 text-left w-48">Routing Process</th>
                  </>
                )}
                <th className="px-3 py-2 text-left w-56">Description</th>
                <th className="px-3 py-2 text-left w-24">Hardness</th>
                <th className="px-3 py-2 text-left w-24">Thickness</th>
                <th className="px-3 py-2 text-left w-28">PO UOM</th>
                <th className="px-3 py-2 text-right w-24">Qty</th>
                <th className="px-3 py-2 text-right w-32">Unit Price</th>
                <th className="px-3 py-2 text-right w-32">Amount</th>
                <th className="px-3 py-2 text-left w-40">Delivery Date</th>
                <th className="px-3 py-2 text-left min-w-[150px]">Remark</th>
                {!readOnly && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {items.map((it, idx) => {
                return (
                  <tr key={idx} className="hover:bg-blue-50/10">
                    {workOrderNo ? (
                      <td className="px-3 py-2 align-top">
                        <SearchableSelect
                          value={it.woRoutingProcessId}
                          disabled={readOnly}
                          onChange={(e) => updateItem(idx, { woRoutingProcessId: e.target.value })}
                          className={inputCls}
                        >
                          <option value="">— Select WO Process —</option>
                          {woRoutingProcesses.map(rp => (
                            <option key={rp.id} value={rp.id}>
                              {rp.mainProcess?.process} - {rp.routingProcess?.routingProcess}
                            </option>
                          ))}
                        </SearchableSelect>
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2 align-top">
                          <SearchableSelect
                            value={it.masterMainProcessId}
                            disabled={readOnly}
                            onChange={(e) => updateItem(idx, { masterMainProcessId: e.target.value, masterRoutingProcessId: "" })}
                            className={inputCls}
                          >
                            <option value="">— Select Main —</option>
                            {data?.mainProcesses?.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.process}
                              </option>
                            ))}
                          </SearchableSelect>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <SearchableSelect
                            value={it.masterRoutingProcessId}
                            disabled={readOnly || !it.masterMainProcessId}
                            onChange={(e) => updateItem(idx, { masterRoutingProcessId: e.target.value })}
                            className={inputCls}
                          >
                            <option value="">— Select Routing —</option>
                            {data?.processProfiles?.filter(p => p.mainProcessId === it.masterMainProcessId).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.routingProcess}
                              </option>
                            ))}
                          </SearchableSelect>
                        </td>
                      </>
                    )}

                    <td className="px-3 py-2 align-top">
                      <textarea
                        rows={1}
                        value={it.description}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        className={inputCls}
                        placeholder="Description"
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <input
                        type="text"
                        value={it.hardness || ""}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { hardness: e.target.value })}
                        className={inputCls}
                        placeholder="Hardness"
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <input
                        type="text"
                        value={it.thickness || ""}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { thickness: e.target.value })}
                        className={inputCls}
                        placeholder="Thickness"
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <SearchableSelect
                        value={it.poUomId}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { poUomId: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">— UOM —</option>
                        {data?.uoms?.map((u) => (
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
                        value={it.quantity}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                        className={inputCls + " text-right"}
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        step="0.0001"
                        value={it.unitPrice}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                        className={inputCls + " text-right"}
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        step="0.01"
                        value={it.amount}
                        disabled={true}
                        readOnly
                        className={inputCls + " text-right bg-slate-50 opacity-70"}
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <input
                        type="date"
                        value={it.deliveryDate}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { deliveryDate: e.target.value })}
                        className={inputCls}
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <textarea
                        rows={1}
                        value={it.remark}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { remark: e.target.value })}
                        className={inputCls}
                        placeholder="Remark"
                      />
                    </td>

                    {!readOnly && (
                      <td className="px-3 py-2 align-top text-center">
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md cursor-pointer mt-0.5"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-blue-50/30 border-t border-blue-200 text-blue-900 text-xs font-bold">
              <tr>
                <td colSpan={workOrderNo ? 7 : 8} className="px-4 py-3 text-right">Amount Before Tax</td>
                <td className="px-4 py-3 text-right">{amountBeforeTax}</td>
                <td colSpan={3}></td>
              </tr>
              <tr>
                <td colSpan={workOrderNo ? 7 : 8} className="px-4 py-3 text-right">Tax Amount</td>
                <td className="px-4 py-3 text-right">{taxAmount}</td>
                <td colSpan={3}></td>
              </tr>
              <tr className="text-sm">
                <td colSpan={workOrderNo ? 7 : 8} className="px-4 py-3 text-right text-blue-950 font-extrabold">Amount After Tax</td>
                <td className="px-4 py-3 text-right text-blue-950 font-extrabold">{amountAfterTax}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
          {items.length === 0 && !readOnly && (
            <div className="p-8 text-center text-sm text-blue-500">
              No items added. Click &quot;Add Item&quot; to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-blue-900 mb-1.5 uppercase tracking-wider">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm bg-blue-50/50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
