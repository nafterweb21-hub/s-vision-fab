"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Plus, Trash2, Save, FileText } from "lucide-react";
type FormData = {
  companies: { id: string; companyName: string; allowPoForWo: boolean }[];
  employees: { id: string; name: string; email: string; code: string }[];
  workOrders: { workOrderNo: string; jobDescription: string | null }[];
  suppliers: { id: string; supplierName: string; contactPersons: any[] }[];
  currencies: { id: string; code: string; name: string; exchangeRate: string | number }[];
  taxes: { id: string; taxType: string; taxRate: string | number }[];
  uoms: { id: string; uomName: string }[];
  materials: { id: string; partNo: string | null; description: string; shape: string; size: string | null }[];
  purchaseRequisitions: { id: string; prNo: string; workOrderNo: string | null; items: any[] }[];
};

type Item = {
  id?: string;
  fromMaterialProfile: boolean;
  materialProfileId: string;
  purchaseRequisitionItemId?: string;
  material: string;
  description: string;
  supplierMaterialNo: string;
  shape: string;
  size: string;
  poUomId: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  conversion: string;
  internalUomId: string;
  internalQuantity: string;
  deliveryDate: string;
  remark: string;
  hsnCode: string;
  hsnDescription: string;
  taxTypeId: string;
  taxRate: string;
  taxAmount: string;
};

export default function PurchaseOrderEditPage() {
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
  const [purchaseRequisitionId, setPurchaseRequisitionId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [contactPersonId, setContactPersonId] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierTel, setSupplierTel] = useState("");
  const [supplierFax, setSupplierFax] = useState("");
  const [supplierMobile, setSupplierMobile] = useState("");
  const [purchaserId, setPurchaserId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1.00");
  const [amountBeforeTax, setAmountBeforeTax] = useState("0.00");
  const [taxAmount, setTaxAmount] = useState("0.00");
  const [amountAfterTax, setAmountAfterTax] = useState("0.00");
  const [roundOff, setRoundOff] = useState("0.00");
  const [supplierGst, setSupplierGst] = useState("");
  const [millCertificate, setMillCertificate] = useState(false);
  const [certOfConformance, setCertOfConformance] = useState(false);

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
          setPurchaseRequisitionId(po.purchaseRequisitionId || "");
          setSupplierId(po.supplierId || "");
          setContactPersonId(po.contactPersonId || "");
          setSupplierEmail(po.email || "");
          setSupplierTel(po.telNo || "");
          setSupplierFax(po.faxNo || "");
          setSupplierMobile(po.mobileNo || "");
          setPurchaserId(po.purchaserId);
          setCurrencyId(po.currencyId);
          setExchangeRate(Number(po.exchangeRate || 1).toFixed(4));
          setAmountBeforeTax(Number(po.amountBeforeTax || 0).toFixed(2));
          setTaxAmount(Number(po.taxAmount || 0).toFixed(2));
          setAmountAfterTax(Number(po.amountAfterTax || 0).toFixed(2));
          setRoundOff(Number(po.roundOff || 0).toFixed(2));
          setSupplierGst(po.supplierGst || "");
          setMillCertificate(po.millCertificate || false);
          setCertOfConformance(po.certOfConformance || false);
          setRemark(po.remark || "");
          setItems(
            po.items.map((it: any) => ({
              id: it.id,
              fromMaterialProfile: it.fromMaterialProfile,
              materialProfileId: it.materialProfileId || "",
              purchaseRequisitionItemId: it.purchaseRequisitionItemId || "",
              material: it.material || "",
              description: it.description,
              supplierMaterialNo: it.supplierMaterialNo || "",
              shape: it.shape || "",
              size: it.size || "",
              poUomId: it.poUomId,
              quantity: Number(it.quantity).toFixed(2),
              unitPrice: Number(it.unitPrice).toFixed(4),
              amount: Number(it.amount).toFixed(2),
              conversion: Number(it.conversion).toFixed(4),
              internalUomId: it.internalUomId || "",
              internalQuantity: Number(it.internalQuantity || 0).toFixed(2),
              deliveryDate: new Date(it.deliveryDate).toISOString().slice(0, 10),
              remark: it.remark || "",
              hsnCode: it.hsnCode || "",
              hsnDescription: it.hsnDescription || "",
              taxTypeId: it.taxTypeId || "",
              taxRate: Number(it.taxRate || 0).toFixed(2),
              taxAmount: Number(it.taxAmount || 0).toFixed(2),
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
            fromMaterialProfile: true,
            materialProfileId: "",
            material: "",
            description: "",
            supplierMaterialNo: "",
            shape: "",
            size: "",
            poUomId: "",
            quantity: "1.00",
            unitPrice: "0.00",
            amount: "0.00",
            conversion: "1.00",
            internalUomId: "",
            internalQuantity: "1.00",
            deliveryDate: new Date().toISOString().slice(0, 10),
            remark: "",
            hsnCode: "",
            hsnDescription: "",
            taxTypeId: "",
            taxRate: "0.00",
            taxAmount: "0.00",
          }]);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const selectedSupplier = useMemo(
    () => data?.suppliers?.find((s) => s.id === supplierId) || null,
    [data, supplierId],
  );

  const contactPersons = useMemo(() => selectedSupplier?.contactPersons || [], [selectedSupplier]);

  useEffect(() => {
    if (!supplierId) {
      setContactPersonId("");
      return;
    }
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

  const handlePrChange = (prId: string) => {
    setPurchaseRequisitionId(prId);
    if (prId) {
      const pr = data?.purchaseRequisitions?.find(p => p.id === prId);
      if (pr) {
        const newItems: Item[] = pr.items.map(it => ({
          fromMaterialProfile: it.fromMaterialProfile,
          materialProfileId: it.materialProfileId || "",
          purchaseRequisitionItemId: it.id,
          material: it.material || "",
          description: it.description || "",
          supplierMaterialNo: "",
          shape: it.shape || "",
          size: it.size || "",
          poUomId: it.uomId || "",
          quantity: Number(it.quantity - (it.cancelQuantity || 0) - (it.poQuantityIssued || 0)).toFixed(2),
          unitPrice: "0.00",
          amount: "0.00",
          conversion: "1.00",
          internalUomId: it.uomId || "",
          internalQuantity: Number(it.quantity - (it.cancelQuantity || 0) - (it.poQuantityIssued || 0)).toFixed(2),
          deliveryDate: new Date().toISOString().slice(0, 10),
          remark: it.remark || "",
          hsnCode: "",
          hsnDescription: "",
          taxTypeId: "",
          taxRate: "0.00",
          taxAmount: "0.00",
        })).filter(it => Number(it.quantity) > 0);
        setItems(newItems);
      }
    }
  };

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
          const profile = data?.materials?.find((m) => m.id === patch.materialProfileId);
          if (profile) {
            updated.material = profile.partNo || "";
            updated.description = profile.description;
            updated.shape = profile.shape;
            updated.size = profile.size || "";
          }
        }

        // Recalculations
        if (patch.quantity || patch.unitPrice) {
          const q = Number(updated.quantity) || 0;
          const p = Number(updated.unitPrice) || 0;
          updated.amount = (q * p).toFixed(2);
        }

        if (patch.taxTypeId !== undefined) {
          const tax = data?.taxes?.find((t) => t.id === patch.taxTypeId);
          if (tax) {
            updated.taxRate = Number(tax.taxRate).toFixed(2);
          } else {
            updated.taxRate = "0.00";
          }
        }
        
        const q = Number(updated.quantity) || 0;
        const p = Number(updated.unitPrice) || 0;
        const amt = q * p;
        const tRate = Number(updated.taxRate) || 0;
        updated.taxAmount = (amt * (tRate / 100)).toFixed(2);

        if (patch.quantity || patch.conversion) {
          const q = Number(updated.quantity) || 0;
          const c = Number(updated.conversion) || 1;
          updated.internalQuantity = (q * c).toFixed(2);
        }

        return updated;
      }),
    );
  }

  useEffect(() => {
    let totalItems = 0;
    let totalTax = 0;
    items.forEach((it) => {
      const amt = Number(it.amount) || 0;
      const tRate = Number(it.taxRate) || 0;
      const tAmt = amt * (tRate / 100);
      totalItems += amt;
      totalTax += tAmt;
    });
    setAmountBeforeTax(totalItems.toFixed(2));
    setTaxAmount(totalTax.toFixed(2));
    
    let finalTotal = totalItems + totalTax + (Number(roundOff) || 0);
    const currency = data?.currencies?.find((c: any) => c.id === currencyId);
    if ((currency as any)?.roundingMode === "UP") {
      finalTotal = Math.ceil(finalTotal);
    } else if ((currency as any)?.roundingMode === "DOWN") {
      finalTotal = Math.floor(finalTotal);
    }
    
    setAmountAfterTax(finalTotal.toFixed(2));
  }, [items, roundOff, currencyId, data]);

  function addItem() {
    setItems((cur) => [
      ...cur,
      {
        fromMaterialProfile: true,
        materialProfileId: "",
        material: "",
        description: "",
        supplierMaterialNo: "",
        shape: "",
        size: "",
        poUomId: "",
        quantity: "1.00",
        unitPrice: "0.00",
        amount: "0.00",
        conversion: "1.00",
        internalUomId: "",
        internalQuantity: "1.00",
        deliveryDate: new Date().toISOString().slice(0, 10),
        remark: "",
        hsnCode: "",
        hsnDescription: "",
        taxTypeId: "",
        taxRate: "0.00",
        taxAmount: "0.00",
      },
    ]);
  }

  function removeItem(idx: number) {
    setItems((cur) => cur.filter((_, i) => i !== idx));
  }

  async function onSave() {
    setError("");

    if (!companyId) return setError("Company is required");
    if (!supplierId) {
      return setError("Supplier is required");
    }
    if (!purchaserId) return setError("Purchaser is required");
    if (!currencyId) return setError("Currency is required");
    if (!items.length) return setError("At least one item is required");

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const ln = i + 1;
      if (it.fromMaterialProfile && !it.materialProfileId) {
        return setError(`Line ${ln}: Material Profile is required`);
      }
      if (!it.fromMaterialProfile && !it.description.trim()) {
        return setError(`Line ${ln}: Description is required`);
      }
      if (!it.poUomId) {
        return setError(`Line ${ln}: PO UOM is required`);
      }
    }

    setSaving(true);
    try {
      const payload = {
        companyId,
        supplierId,
        date,
        workOrderNo: workOrderNo || null,
        purchaseRequisitionId: purchaseRequisitionId || null,
        purchaserId,
        contactPersonId: contactPersonId || null,
        email: supplierEmail,
        telNo: supplierTel,
        faxNo: supplierFax,
        mobileNo: supplierMobile,
        currencyId,
        exchangeRate: Number(exchangeRate),
        taxTypeId: null,
        taxRate: 0,
        amountBeforeTax: Number(amountBeforeTax),
        taxAmount: Number(taxAmount),
        amountAfterTax: Number(amountAfterTax),
        roundOff: Number(roundOff),
        supplierGst: supplierGst || null,
        millCertificate,
        certOfConformance,
        remark,
        items: items.map((it, idx) => ({
          fromMaterialProfile: it.fromMaterialProfile,
          materialProfileId: it.fromMaterialProfile ? it.materialProfileId : null,
          purchaseRequisitionItemId: it.purchaseRequisitionItemId || null,
          material: it.material || null,
          description: it.description,
          supplierMaterialNo: it.supplierMaterialNo || null,
          shape: it.shape || null,
          size: it.size || null,
          poUomId: it.poUomId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          amount: Number(it.amount),
          conversion: Number(it.conversion),
          internalUomId: it.internalUomId || null,
          internalQuantity: Number(it.internalQuantity),
          deliveryDate: it.deliveryDate,
          remark: it.remark || null,
          hsnCode: it.hsnCode || null,
          hsnDescription: it.hsnDescription || null,
          taxTypeId: it.taxTypeId || null,
          taxRate: Number(it.taxRate) || 0,
          taxAmount: Number(it.taxAmount) || 0,
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
      router.push(`/dashboard/saved?module=Purchase Order&id=${saved.poNo || saved.id}&viewUrl=/dashboard/purchasing/purchase-order/${saved.id}&backUrl=/dashboard/purchasing/purchase-order`);
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
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between pb-6 border-b border-blue-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase mb-1">
            <Link href="/dashboard/purchasing/purchase-order" className="hover:text-blue-600 inline-flex items-center gap-1">
              <ArrowLeft size={12} /> Purchase Orders
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
              {isNew ? "New Purchase Order" : "Edit Purchase Order"}
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

        <Field label="PR No">
          <SearchableSelect
            value={purchaseRequisitionId}
            disabled={readOnly || !isNew}
            onChange={(e) => handlePrChange(e.target.value)}
            className={inputCls}
          >
            <option value="">— Independent PO —</option>
            {data?.purchaseRequisitions
              ?.filter(pr => !workOrderNo || pr.workOrderNo === workOrderNo)
              .map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.prNo}
                </option>
              ))}
          </SearchableSelect>
        </Field>

        <div className="md:col-span-2">
          <Field label="Supplier" required>
            <SearchableSelect
              value={supplierId}
              disabled={readOnly || !isNew}
              onChange={(e) => setSupplierId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Select —</option>
              {data?.suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.supplierName}
                </option>
              ))}
            </SearchableSelect>
          </Field>
        </div>

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

        <Field label="Supplier GST">
          <input
            type="text"
            value={supplierGst}
            disabled={readOnly}
            onChange={(e) => setSupplierGst(e.target.value)}
            className={inputCls}
          />
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
        
        <Field label="Work Order">
          <SearchableSelect
            value={workOrderNo}
            disabled={readOnly}
            onChange={(e) => setWorkOrderNo(e.target.value)}
            className={inputCls}
          >
            <option value="">— None (Non Work Order) —</option>
            {data?.workOrders?.map((w) => (
              <option key={w.workOrderNo} value={w.workOrderNo}>
                {w.workOrderNo} - {w.jobDescription?.substring(0,20)}...
              </option>
            ))}
          </SearchableSelect>
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

      </div>

      {/* Items Section */}
      <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-blue-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-blue-900">Purchase Order Items</h3>
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
          <table className="w-full text-sm min-w-[2200px]">
            <thead className="text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left w-24">Type</th>
                <th className="px-3 py-2 text-left w-48">Material Profile / Code</th>
                <th className="px-3 py-2 text-left w-56">Description</th>
                <th className="px-3 py-2 text-left w-32">HSN Code</th>
                <th className="px-3 py-2 text-left w-40">Supplier Part No</th>
                <th className="px-3 py-2 text-left w-32">Shape</th>
                <th className="px-3 py-2 text-left w-32">Size</th>
                <th className="px-3 py-2 text-left w-28">PO UOM</th>
                <th className="px-3 py-2 text-right w-24">Qty</th>
                <th className="px-3 py-2 text-right w-32">Unit Price</th>
                <th className="px-3 py-2 text-right w-32">Amount</th>
                <th className="px-3 py-2 text-left w-32">Tax</th>
                <th className="px-3 py-2 text-right w-24">Conv</th>
                <th className="px-3 py-2 text-left w-28">Int UOM</th>
                <th className="px-3 py-2 text-right w-24">Int Qty</th>
                <th className="px-3 py-2 text-left w-40">Delivery Date</th>
                <th className="px-3 py-2 text-left min-w-[150px]">Remark</th>
                {!readOnly && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {items.map((it, idx) => {
                return (
                  <tr key={idx} className="hover:bg-blue-50/10">
                    <td className="px-3 py-2 align-top">
                      <SearchableSelect
                        value={it.fromMaterialProfile ? "Profile" : "Free"}
                        disabled={readOnly || !!it.purchaseRequisitionItemId}
                        onChange={(e) => updateItem(idx, { fromMaterialProfile: e.target.value === "Profile" })}
                        className={inputCls}
                      >
                        <option value="Profile">Profile</option>
                        <option value="Free">FreeText</option>
                      </SearchableSelect>
                    </td>

                    <td className="px-3 py-2 align-top">
                      {it.fromMaterialProfile ? (
                        <SearchableSelect
                          value={it.materialProfileId}
                          disabled={readOnly || !!it.purchaseRequisitionItemId}
                          onChange={(e) => updateItem(idx, { materialProfileId: e.target.value })}
                          className={inputCls}
                        >
                          <option value="">— Select —</option>
                          {data?.materials?.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.partNo ? `${m.partNo} — ` : ""}{m.description.slice(0, 30)}
                            </option>
                          ))}
                        </SearchableSelect>
                      ) : (
                        <input
                          type="text"
                          value={it.material}
                          disabled={readOnly || !!it.purchaseRequisitionItemId}
                          onChange={(e) => updateItem(idx, { material: e.target.value })}
                          className={inputCls}
                          placeholder="e.g. PART-A"
                        />
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
                      <textarea
                        rows={1}
                        value={it.description}
                        disabled={readOnly || !!it.purchaseRequisitionItemId}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        className={inputCls}
                        placeholder="Material description"
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <input
                        type="text"
                        value={it.hsnCode}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { hsnCode: e.target.value })}
                        className={inputCls}
                        placeholder="HSN Code"
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <input
                        type="text"
                        value={it.supplierMaterialNo}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { supplierMaterialNo: e.target.value })}
                        className={inputCls}
                        placeholder="Supplier PN"
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <input
                        type="text"
                        value={it.shape}
                        disabled={readOnly || !!it.purchaseRequisitionItemId}
                        onChange={(e) => updateItem(idx, { shape: e.target.value })}
                        className={inputCls}
                        placeholder="Shape"
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <input
                        type="text"
                        value={it.size}
                        disabled={readOnly || !!it.purchaseRequisitionItemId}
                        onChange={(e) => updateItem(idx, { size: e.target.value })}
                        className={inputCls}
                        placeholder="Size"
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <SearchableSelect
                        value={it.poUomId}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { poUomId: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">—</option>
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
                        min="0"
                        value={it.quantity}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                        className={`${inputCls} text-right`}
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={it.unitPrice}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                        className={`${inputCls} text-right`}
                      />
                    </td>
                    
                    <td className="px-3 py-2 align-top text-right font-mono text-blue-900 font-semibold pt-4">
                      {it.amount}
                    </td>

                    <td className="px-3 py-2 align-top">
                      <SearchableSelect
                        value={it.taxTypeId}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { taxTypeId: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">— Select Tax —</option>
                        {data?.taxes?.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.taxType} ({t.taxRate}%)
                          </option>
                        ))}
                      </SearchableSelect>
                      {Number(it.taxAmount) > 0 && (
                        <div className="text-[10px] text-slate-500 mt-1 text-right">
                          Tax: {it.taxAmount}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={it.conversion}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { conversion: e.target.value })}
                        className={`${inputCls} text-right`}
                      />
                    </td>

                    <td className="px-3 py-2 align-top">
                      <SearchableSelect
                        value={it.internalUomId}
                        disabled={readOnly || !!it.purchaseRequisitionItemId}
                        onChange={(e) => updateItem(idx, { internalUomId: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">—</option>
                        {data?.uoms?.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.uomName}
                          </option>
                        ))}
                      </SearchableSelect>
                    </td>
                    
                    <td className="px-3 py-2 align-top text-right font-mono text-blue-900 pt-4">
                      {it.internalQuantity}
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
                      <input
                        type="text"
                        value={it.remark}
                        disabled={readOnly}
                        onChange={(e) => updateItem(idx, { remark: e.target.value })}
                        className={inputCls}
                        placeholder="Remark"
                      />
                    </td>

                    {!readOnly && (
                      <td className="px-2 py-2 align-top text-center pt-3">
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-rose-500 cursor-pointer"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quality Controls and Remarks */}
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-blue-900 cursor-pointer">
              <input
                type="checkbox"
                checked={millCertificate}
                onChange={(e) => setMillCertificate(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500"
              />
              Mill Certificate
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-blue-900 cursor-pointer">
              <input
                type="checkbox"
                checked={certOfConformance}
                onChange={(e) => setCertOfConformance(e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500"
              />
              Cert. of Conformance
            </label>
          </div>
          <Field label="Remark / Special Instructions">
            <textarea
              rows={3}
              value={remark}
              disabled={readOnly}
              onChange={(e) => setRemark(e.target.value)}
              className={inputCls}
              placeholder="Input any additional details for this purchase order..."
            />
          </Field>
        </div>

        {/* Totals Summary */}
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-6 flex flex-col justify-end space-y-3">
          <div className="flex items-center justify-between text-sm text-blue-700">
            <span>Amount Before Tax:</span>
            <span className="font-mono font-medium">{amountBeforeTax}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-blue-700">
            <span>Tax Amount:</span>
            <span className="font-mono font-medium">{taxAmount}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-blue-700">
            <span className="self-center">Round Off:</span>
            <input
              type="number"
              step="0.01"
              value={roundOff}
              disabled={readOnly}
              onChange={(e) => setRoundOff(e.target.value)}
              className={`${inputCls} w-24 text-right !py-1`}
            />
          </div>
          <div className="flex items-center justify-between text-lg font-bold text-blue-900 border-t border-blue-100 pt-3">
            <span>Amount After Tax:</span>
            <span className="font-mono">{amountAfterTax}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500";

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
