"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";
import { hasDifferentShipTo } from "@/lib/invoice-ship-to";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Send, AlertCircle, Copy } from "lucide-react";
import { getInvoiceFormData, getPendingDOs, getDOItemsForInvoice, getInvoice, createInvoice, updateInvoice, reviseInvoice, submitInvoice, voidInvoice } from "../invoice.actions";
export default function InvoiceFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<any>({
    invoiceNo: "Auto-generated",
    invoiceDate: new Date().toISOString().split("T")[0],
    companyId: "",
    invoiceType: "Customer Invoice",
    customerId: "",
    contactPersonId: "",
    tel: "",
    fax: "",
    email: "",
    billToId: "",
    shipToId: "",
    consigneeName: "",
    consigneeGstin: "",
    consigneePhone: "",
    consigneeState: "",
    consigneeCountry: "India",
    paymentTermId: "",
    currencyId: "",
    exchangeRate: 1,
    taxTypeId: "",
    taxRate: 0,
    amountBeforeTax: 0,
    taxAmount: 0,
    amountAfterTax: 0,
    roundOff: 0,
    bankDetails: "",
    remark: "",
    doIds: [],
    items: [],
    poNo: "",
    vehicleNumber: "",
  });

  const [metadata, setMetadata] = useState<any>({
    companies: [],
    customers: [],
    paymentTerms: [],
    currencies: [],
    taxes: [],
    employees: [],
    uoms: [],
    parts: [],
  });

  const [pendingDOs, setPendingDOs] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [status, setStatus] = useState("Draft");
  const [revision, setRevision] = useState(0);
  const [differentShipTo, setDifferentShipTo] = useState(false);

  const consigneeReset = {
    consigneeName: "",
    consigneeGstin: "",
    consigneePhone: "",
    consigneeState: "",
    consigneeCountry: "India",
  };

  const handleDifferentShipToToggle = (enabled: boolean) => {
    setDifferentShipTo(enabled);
    // When disabled, ship-to mirrors bill-to; when enabled, start from a blank ship-to
    setFormData((prev: any) => ({ ...prev, shipToId: enabled ? "" : prev.billToId, ...consigneeReset }));
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setInitialLoading(true);
      const metaRes = await getInvoiceFormData();
      if (metaRes.success && metaRes.data) {
        setMetadata(metaRes.data);
      }

      if (isEdit) {
        const invRes = await getInvoice(id);
        if (!invRes.success) throw new Error(invRes.error);
        const data = invRes.data;
        
        setFormData({
          ...data,
          shipToId: data.shipToId || "",
          consigneeName: data.consigneeName || "",
          consigneeGstin: data.consigneeGstin || "",
          consigneePhone: data.consigneePhone || "",
          consigneeState: data.consigneeState || "",
          consigneeCountry: data.consigneeCountry || "India",
          invoiceDate: new Date(data.invoiceDate).toISOString().split("T")[0],
          doIds: data.deliveryOrders.map((doLink: any) => doLink.deliveryOrderId),
          items: data.items.map((item: any) => ({
             ...item,
             description: item.description || item.part?.description || item.part?.partNo || item.workOrder?.jobDescription || "",
             amount: Math.round((Number(item.amount) || 0) * 100) / 100,
             unitPrice: Math.round((Number(item.unitPrice) || 0) * 100) / 100,
             quantity: Number(item.quantity) || 0,
             taxTypeId: item.taxTypeId || "",
             taxRate: Number(item.taxRate || item.gstRate || 0),
             taxAmount: Math.round((Number(item.taxAmount) || 0) * 100) / 100
          }))
        });
        setStatus(data.status);
        setRevision(data.revision);
        setDifferentShipTo(hasDifferentShipTo(data));

        if (data.customerId) {
           const doRes = await getPendingDOs(data.customerId, id);
           const linkedDOs = (data.deliveryOrders || []).map((l: any) => l.deliveryOrder).filter(Boolean);
           const fetchedDOs = doRes.success ? (doRes.data || []) : [];
           const combined = [...fetchedDOs];
           linkedDOs.forEach((ldo: any) => {
             if (!combined.some(c => c.id === ldo.id)) {
               combined.push(ldo);
             }
           });
           setPendingDOs(combined);
        }
      } else {
        // Set defaults
        if (metaRes.data?.companies?.length > 0) {
          setFormData((p: any) => ({ ...p, companyId: metaRes.data.companies[0].id }));
        }
        const defCurr = metaRes.data?.currencies?.find((c: any) => c.isDefault);
        if (defCurr) {
          setFormData((p: any) => ({ ...p, currencyId: defCurr.id, exchangeRate: Number(defCurr.exchangeRate) }));
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCustomerChange = async (customerId: string) => {
    const customer = metadata.customers.find((c: any) => c.id === customerId);
    let contactPersonId = "";
    let tel = "";
    let fax = "";
    let email = "";
    let billToId = "";
    let shipToId = "";

    if (customer) {
      const defaultContact = customer.contactPersons?.find((c: any) => c.isDefault) || customer.contactPersons?.[0];
      if (defaultContact) {
        contactPersonId = defaultContact.id;
        tel = defaultContact.telNo || "";
        fax = defaultContact.faxNo || "";
        email = defaultContact.email || "";
      }
      const defaultAddress = customer.addresses?.find((a: any) => a.isDefault) || customer.addresses?.[0];
      if (defaultAddress) {
        billToId = defaultAddress.id;
        shipToId = defaultAddress.id;
      }
    }

    setFormData((prev: any) => ({
      ...prev,
      customerId,
      contactPersonId,
      tel,
      fax,
      email,
      billToId,
      shipToId,
      consigneeName: "",
      consigneeGstin: "",
      consigneePhone: "",
      consigneeState: "",
      consigneeCountry: "India",
      doIds: [],
      items: [],
      amountBeforeTax: 0,
      taxAmount: 0,
      amountAfterTax: 0,
      roundOff: 0
    }));
    setDifferentShipTo(false);

    // Fetch DOs
    if (customerId) {
      const doRes = await getPendingDOs(customerId, isEdit ? id! : undefined);
      setPendingDOs(doRes.success ? (doRes.data || []) : []);
    } else {
      setPendingDOs([]);
    }
  };

  const handleContactChange = (contactId: string) => {
    const customer = metadata.customers.find((c: any) => c.id === formData.customerId);
    const contact = customer?.contactPersons?.find((c: any) => c.id === contactId);
    if (contact) {
      setFormData((prev: any) => ({
        ...prev,
        contactPersonId: contactId,
        tel: contact.telNo || "",
        fax: contact.faxNo || "",
        email: contact.email || ""
      }));
    }
  };

  const handleCurrencyChange = (currencyId: string) => {
    const currency = metadata.currencies.find((c: any) => c.id === currencyId);
    setFormData((prev: any) => {
      const totals = calculateTotals(prev.items, currencyId);
      return {
        ...prev,
        currencyId,
        exchangeRate: currency ? Number(currency.exchangeRate) : 1,
        ...totals
      };
    });
  };



  const handleBankChange = (bankId: string) => {
    const bank = metadata.banks?.find((b: any) => b.id === bankId);
    if (bank) {
      const text = `Bank Name: ${bank.bankName}
Account Name: ${bank.accountName}
Account No: ${bank.accountNo}
IFSC: ${bank.swiftCode || ""}
Branch: ${bank.branchCode || ""}`;
      setFormData((prev: any) => ({ ...prev, bankDetails: text.trim() }));
    }
  };

  const calculateTotals = (items: any[], overrideCurrencyId?: string, overrideRoundOff?: number) => {
    const customer = metadata.customers?.find((c: any) => c.id === formData.customerId);
    const company = metadata.companies?.find((c: any) => c.id === formData.companyId);
    const effectiveTaxRate = customer?.isSez ? (Number(company?.sezTaxRate) || 0) : 0;

    let amtBefore = 0;
    let totalTax = 0;

    items.forEach(item => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const amt = Math.round((qty * price) * 100) / 100;
        item.amount = amt;
        amtBefore += amt;
        
        let itemTaxRate = Number(item.taxRate) || 0;
        if (!itemTaxRate && item.taxTypeId && metadata.taxes?.length > 0) {
          const tax = metadata.taxes.find((t: any) => t.id === item.taxTypeId);
          if (tax) itemTaxRate = Number(tax.taxRate) || 0;
        }
        if (customer?.isSez) {
          itemTaxRate = effectiveTaxRate;
        }

        const tAmt = Math.round((amt * (itemTaxRate / 100)) * 100) / 100;
        item.taxRate = itemTaxRate;
        item.taxAmount = tAmt;
        totalTax += tAmt;
    });

    amtBefore = Math.round(amtBefore * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;

    const rOff = overrideRoundOff !== undefined ? overrideRoundOff : (Number(formData.roundOff) || 0);
    
    let finalTotal = Math.round((amtBefore + totalTax + rOff) * 100) / 100;
    const cid = overrideCurrencyId || formData.currencyId;
    const currency = metadata.currencies?.find((c: any) => c.id === cid);
    
    if (currency?.roundingMode === "UP") {
      finalTotal = Math.ceil(finalTotal);
    } else if (currency?.roundingMode === "DOWN") {
      finalTotal = Math.floor(finalTotal);
    }

    const firstItemWithTax = items.find((i: any) => Number(i.taxRate) > 0);
    const avgTaxRate = totalTax > 0 && amtBefore > 0 
      ? Math.round((totalTax / amtBefore) * 10000) / 100
      : (customer?.isSez ? effectiveTaxRate : (firstItemWithTax ? Number(firstItemWithTax.taxRate) : 0));

    return {
      taxRate: avgTaxRate,
      amountBeforeTax: amtBefore,
      taxAmount: totalTax,
      amountAfterTax: finalTotal,
      roundOff: rOff
    };
  };

  const handleDoToggle = async (doId: string) => {
    let newDoIds = [...formData.doIds];
    if (newDoIds.includes(doId)) {
      newDoIds = newDoIds.filter(id => id !== doId);
    } else {
      newDoIds.push(doId);
    }

    setLoading(true);
    try {
      const res = await getDOItemsForInvoice(newDoIds);
      if (res.success) {
        const newItems = res.data || [];
        const totals = calculateTotals(newItems);
        setFormData((prev: any) => ({
          ...prev,
          doIds: newDoIds,
          items: newItems,
          ...totals
        }));
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "partId") {
      const part = metadata.parts?.find((p: any) => p.id === value);
      if (part) {
        newItems[index].description = part.description || part.partNo || newItems[index].description;
      }
    }

    if (field === "taxTypeId") {
       const tax = metadata.taxes.find((t: any) => t.id === value);
       newItems[index].taxRate = tax ? Number(tax.taxRate) : 0;
    }

    if (field === "quantity" || field === "unitPrice") {
      const qty = Number(newItems[index].quantity) || 0;
      const price = Number(newItems[index].unitPrice) || 0;
      newItems[index].amount = Math.round((qty * price) * 100) / 100;
    }

    const totals = calculateTotals(newItems);
    setFormData((prev: any) => ({ ...prev, items: newItems, ...totals }));
  };

  const handleAddItem = () => {
    const newItem = {
      lineNo: formData.items.length + 1,
      workOrderNo: "",
      partId: null,
      description: "",
      quantity: 1,
      uomId: "",
      unitPrice: 0,
      amount: 0,
      remark: "",
      hsnCode: "",
      taxTypeId: "",
      taxRate: 0,
      taxAmount: 0,
    };
    const newItems = [...formData.items, newItem];
    const totals = calculateTotals(newItems);
    setFormData((prev: any) => ({ ...prev, items: newItems, ...totals }));
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_: any, i: number) => i !== index);
    newItems.forEach((item: any, idx: number) => {
      item.lineNo = idx + 1;
    });
    const totals = calculateTotals(newItems);
    setFormData((prev: any) => ({ ...prev, items: newItems, ...totals }));
  };

  const handleSave = async () => {
    if (!formData.companyId || !formData.customerId || !formData.paymentTermId || !formData.currencyId || !formData.preparedById) {
      setErrorMsg("Please fill in all mandatory fields.");
      return;
    }
    if (!formData.billToId || !formData.contactPersonId || !formData.email) {
      setErrorMsg("Please complete all mandatory fields in 'Details of Buyer | Billed to' (Bill To Address, Contact Person, Email).");
      return;
    }
    if (differentShipTo && !formData.shipToId) {
      setErrorMsg("Please select a Ship To Address, or turn off 'Different Ship To Address'.");
      return;
    }
    if (formData.items.length === 0) {
      setErrorMsg("Please add at least one item or select a DO.");
      return;
    }
    const isSez = selectedCustomer?.isSez;
    if (!isSez) {
      const itemWithoutTax = formData.items.find((item: any) => !item.taxTypeId);
      if (itemWithoutTax) {
        setErrorMsg(`Please select a Tax for item #${itemWithoutTax.lineNo || 1}.`);
        return;
      }
    }

    const payload = { ...formData };
    if (payload.items?.length > 0) {
      const itemWithTax = payload.items.find((i: any) => i.taxTypeId);
      if (itemWithTax && !payload.taxTypeId) {
        payload.taxTypeId = itemWithTax.taxTypeId;
      }
      if ((!payload.taxRate || Number(payload.taxRate) === 0) && itemWithTax) {
        payload.taxRate = Number(itemWithTax.taxRate) || 0;
      }
    }
    if ((!payload.taxRate || Number(payload.taxRate) === 0) && payload.taxTypeId) {
      const tax = metadata.taxes.find((t: any) => t.id === payload.taxTypeId);
      if (tax) payload.taxRate = Number(tax.taxRate) || 0;
    }
    if (isSez && !payload.taxTypeId && metadata.taxes.length > 0) {
      payload.taxTypeId = metadata.taxes[0].id;
    }
    payload.taxTypeId = payload.taxTypeId || null;

    setLoading(true);
    setErrorMsg("");
    try {
      if (isEdit) {
        const res = await updateInvoice(id!, payload);
        if (!res.success) throw new Error(res.error || "Failed to update invoice");
      } else {
        const res = await createInvoice(payload);
        if (!res.success) throw new Error(res.error || "Failed to create invoice");
      }
      router.push("/dashboard/sales/invoice");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!await customConfirm("Are you sure you want to submit? This action cannot be undone.")) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await submitInvoice(id!);
      if (!res.success) throw new Error(res.error || "Failed to submit");
      router.push("/dashboard/sales/invoice");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevise = async () => {
    if (!await customConfirm("Are you sure you want to create a new revision? This will mark the current invoice as 'Old Version'.")) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await reviseInvoice(id!, formData);
      if (!res.success || !res.data) throw new Error(res.error || "Failed to revise invoice");
      router.push(`/dashboard/sales/invoice/form?id=${res.data.id}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!await customConfirm("Are you sure you want to VOID this invoice?")) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await voidInvoice(id!);
      if (!res.success) throw new Error(res.error || "Failed to void");
      router.push("/dashboard/sales/invoice");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isDraft = status === "Draft";
  const isSubmitted = status === "Submitted";
  const isOldVersion = status === "Old Version";

  const selectedCustomer = metadata.customers.find((c: any) => c.id === formData.customerId);

  return (
    <div className="py-3 w-full space-y-4 pb-24">
      <div className="flex items-center justify-between pb-6 border-b border-blue-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/sales/invoice" className="p-2 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-blue-900">{isEdit ? "Invoice Details" : "New Invoice"}</h1>
            <p className="text-sm text-blue-500">
              {isEdit ? `Editing Invoice: ${formData.invoiceNo}` : "Create a new customer invoice"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {isEdit && isDraft && (
             <button
               onClick={handleSubmit}
               disabled={loading}
               className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg font-semibold transition-colors disabled:opacity-50"
             >
               <Send size={16} /> Submit
             </button>
           )}
           {isEdit && isSubmitted && (
             <button
               onClick={handleRevise}
               disabled={loading}
               className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-semibold transition-colors disabled:opacity-50"
             >
               <Copy size={16} /> Revise
             </button>
           )}
           {isEdit && (isDraft || isSubmitted) && (
             <button
               onClick={handleVoid}
               disabled={loading}
               className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg font-semibold transition-colors disabled:opacity-50"
             >
               <AlertCircle size={16} /> Void
             </button>
           )}
           {isDraft && (
             <button
               onClick={handleSave}
               disabled={loading}
               className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50"
             >
               {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
               Save
             </button>
           )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Main Info */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Invoice No</label>
            <input
              type="text"
              value={formData.invoiceNo || ""}
              disabled
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none text-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Date <span className="text-rose-500">*</span></label>
            <input
              type="date"
              value={formData.invoiceDate}
              onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Company <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Company...</option>
              {metadata.companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Invoice Type <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.invoiceType}
              onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="Customer Invoice">Customer Invoice</option>
            </SearchableSelect>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-semibold text-blue-900">Prepared By <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.preparedById}
              onChange={(e) => setFormData({ ...formData, preparedById: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Employee...</option>
              {metadata.employees.map((e: any) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </SearchableSelect>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">P.O. No.</label>
            <input
              type="text"
              value={formData.poNo || ""}
              onChange={(e) => setFormData({ ...formData, poNo: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Vehicle Number</label>
            <input
              type="text"
              value={formData.vehicleNumber || ""}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Delivery Orders (Challan Linking) */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
        <div className="flex items-center justify-between border-b border-blue-100 pb-2 mb-3">
          <h3 className="text-lg font-bold text-blue-900">Delivery Orders (Challan Linking)</h3>
          {formData.doIds?.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {formData.doIds.length} DO(s) Linked
            </span>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-blue-700">Select Delivery Orders to Link</label>
          {isDraft ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-44 overflow-y-auto">
               {pendingDOs.length === 0 ? (
                 <span className="text-xs text-blue-400">
                   {formData.customerId ? "No pending Delivery Orders found for this customer." : "Select a customer to view available Delivery Orders."}
                 </span>
               ) : (
                 <div className="space-y-2">
                   {pendingDOs.map((doItem: any) => {
                     const isChecked = formData.doIds.includes(doItem.id);
                     return (
                       <label key={doItem.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${isChecked ? "bg-indigo-50/80 border-indigo-300 text-indigo-950 font-medium shadow-sm" : "bg-white border-blue-100 text-slate-700 hover:bg-slate-50"}`}>
                         <div className="flex items-center gap-2.5 text-sm">
                           <input
                             type="checkbox"
                             checked={isChecked}
                             onChange={() => handleDoToggle(doItem.id)}
                             className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-blue-300"
                           />
                           <span className="font-semibold text-slate-900">{doItem.doNo}</span>
                           {doItem.salesOrder?.orderNo && (
                             <span className="text-xs text-slate-500">({doItem.salesOrder.orderNo})</span>
                           )}
                         </div>
                         {isChecked ? (
                           <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">Linked</span>
                         ) : (
                           <span className="text-[11px] text-slate-400">Click to link</span>
                         )}
                       </label>
                     );
                   })}
                 </div>
               )}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              {formData.deliveryOrders?.length ? (
                <div className="flex flex-wrap gap-2">
                  {formData.deliveryOrders.map((l: any) => {
                    const d = l.deliveryOrder;
                    if (!d) return null;
                    return (
                      <span key={d.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-300 rounded-md text-xs font-semibold text-blue-900 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        {d.doNo} {d.salesOrder?.orderNo ? `(${d.salesOrder.orderNo})` : ""}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-xs text-blue-400">No Delivery Orders linked to this invoice.</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details of Buyer | Billed to, with optional Details of Consignee | Shipped to below */}
      <div className="space-y-4">
        {/* CARD 1: Details of Buyer | Billed to (MANDATORY) */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-blue-300 p-4">
          <div className="flex items-center justify-between border-b border-blue-200 pb-2 mb-3">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
              Details of Buyer | Billed to :
            </h3>
            <span className="text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">Mandatory *</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Name (Customer / Buyer) <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                disabled={!isDraft}
                className="w-full px-3 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                <option value="">Select Customer...</option>
                {metadata.customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.customerName}</option>
                ))}
              </SearchableSelect>
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Address (Bill To) <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={formData.billToId}
                onChange={(e) => setFormData({
                  ...formData,
                  billToId: e.target.value,
                  ...(differentShipTo ? {} : { shipToId: e.target.value }),
                })}
                disabled={!isDraft || !selectedCustomer}
                className="w-full px-3 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                <option value="">Select Bill To Address...</option>
                {selectedCustomer?.addresses?.map((addr: any) => (
                  <option key={addr.id} value={addr.id}>{addr.address}</option>
                ))}
              </SearchableSelect>
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Contact Person <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={formData.contactPersonId}
                onChange={(e) => handleContactChange(e.target.value)}
                disabled={!isDraft || !selectedCustomer}
                className="w-full px-3 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                <option value="">Select Contact...</option>
                {selectedCustomer?.contactPersons?.map((cp: any) => (
                  <option key={cp.id} value={cp.id}>{cp.contactPersonName}</option>
                ))}
              </SearchableSelect>
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">Phone / Tel</label>
              <input
                type="text"
                value={formData.tel || ""}
                onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
                disabled={!isDraft}
                placeholder="e.g. 9948300284"
                className="w-full px-3 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isDraft}
                className="w-full px-3 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">Fax</label>
              <input
                type="text"
                value={formData.fax || ""}
                onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                disabled={!isDraft}
                className="w-full px-3 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 pt-2 border-t border-blue-100 text-xs">
            <div>
              <span className="font-semibold text-slate-500 uppercase">GSTIN:</span>{" "}
              <span className="font-bold text-slate-900 break-all">{selectedCustomer?.gstin || "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 uppercase">PAN:</span>{" "}
              <span className="font-bold text-slate-900">{selectedCustomer?.pan || (selectedCustomer?.gstin ? selectedCustomer.gstin.substring(2, 12) : "—")}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 uppercase">Place of Supply:</span>{" "}
              <span className="font-bold text-slate-900">{selectedCustomer?.placeOfSupply || "—"}</span>
            </div>
          </div>
        </div>

        {/* Toggle: Different Ship To Address */}
        <label className={`flex items-center gap-3 w-fit select-none ${isDraft ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
          <button
            type="button"
            role="switch"
            aria-checked={differentShipTo}
            onClick={() => handleDifferentShipToToggle(!differentShipTo)}
            disabled={!isDraft}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${differentShipTo ? "bg-blue-600" : "bg-slate-300"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${differentShipTo ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
          <span className="text-sm font-semibold text-blue-900">Different Ship To Address</span>
          {!differentShipTo && (
            <span className="text-xs text-slate-500">(Shipping to the Bill To address)</span>
          )}
        </label>

        {/* CARD 2: Details of Consignee | Shipped to (OPTIONAL) */}
        {differentShipTo && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-300 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
              Details of Consignee | Shipped to :
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Name (Consignee)</label>
              <input
                type="text"
                placeholder="Enter consignee name"
                value={formData.consigneeName || ""}
                onChange={(e) => setFormData({ ...formData, consigneeName: e.target.value })}
                disabled={!isDraft}
                className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address (Ship To) <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={formData.shipToId}
                onChange={(e) => setFormData({ ...formData, shipToId: e.target.value })}
                disabled={!isDraft || !selectedCustomer}
                className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                <option value="">Select Ship To Address...</option>
                {selectedCustomer?.addresses?.map((addr: any) => (
                  <option key={addr.id} value={addr.id}>{addr.address}</option>
                ))}
              </SearchableSelect>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
              <input
                type="text"
                value={formData.consigneeCountry || "India"}
                onChange={(e) => setFormData({ ...formData, consigneeCountry: e.target.value })}
                disabled={!isDraft}
                className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                placeholder="e.g. 9948300284"
                value={formData.consigneePhone || ""}
                onChange={(e) => setFormData({ ...formData, consigneePhone: e.target.value })}
                disabled={!isDraft}
                className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                placeholder="e.g. GSTA728323"
                value={formData.consigneeGstin || ""}
                onChange={(e) => setFormData({ ...formData, consigneeGstin: e.target.value.toUpperCase() })}
                disabled={!isDraft}
                className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                placeholder="e.g. Tamil Nadu ( 33 )"
                value={formData.consigneeState || ""}
                onChange={(e) => setFormData({ ...formData, consigneeState: e.target.value })}
                disabled={!isDraft}
                className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Financial Info */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
        <h3 className="text-lg font-bold text-blue-900 mb-4 border-b border-blue-100 pb-2">Financial Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-3">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-semibold text-blue-900">Payment Term <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.paymentTermId}
              onChange={(e) => setFormData({ ...formData, paymentTermId: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Term...</option>
              {metadata.paymentTerms.map((pt: any) => (
                <option key={pt.id} value={pt.id}>{pt.name} ({pt.days} days)</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Currency <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.currencyId}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Currency...</option>
              {metadata.currencies.map((cur: any) => (
                <option key={cur.id} value={cur.id}>{cur.code}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Exchange Rate</label>
            <input
              type="number"
              step="0.001"
              value={formData.exchangeRate}
              disabled
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none text-slate-500"
            />
          </div>

          {selectedCustomer?.isSez && (
            <div className="space-y-1 md:col-span-2">
              <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-sm">
                SEZ Tax ({Number(metadata.companies.find((c: any) => c.id === formData.companyId)?.sezTaxRate) || 0}%) Auto-applied
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items Area */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-blue-900">Invoice Items</h3>
          {isDraft && (
            <button
              onClick={handleAddItem}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> Add Item
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-[13px] text-left min-w-[880px]">
            <colgroup>
              <col className="w-8" />
              <col className="w-24" />
              <col />
              <col className="w-24" />
              <col className="w-20" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-32" />
              <col className="w-9" />
            </colgroup>
            <thead className="text-[11px] text-blue-500 bg-blue-50/50 uppercase tracking-wide border-b border-blue-200">
              <tr>
                <th className="px-1.5 py-2 text-center">SN</th>
                <th className="px-1.5 py-2">WO</th>
                <th className="px-1.5 py-2">Part / Description</th>
                <th className="px-1.5 py-2">HSN / SAC</th>
                <th className="px-1.5 py-2">Qty</th>
                <th className="px-1.5 py-2">UOM</th>
                <th className="px-1.5 py-2">Unit Price</th>
                <th className="px-1.5 py-2 text-right">Amount</th>
                <th className="px-1.5 py-2">Tax</th>
                <th className="px-1.5 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {formData.items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-blue-400">
                    No items found. Select Delivery Orders or add items manually.
                  </td>
                </tr>
              ) : (
                formData.items.map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-blue-50/30 align-top">
                    <td className="px-1.5 py-1.5 pt-2.5 text-center text-blue-600 font-medium">{index + 1}</td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="text"
                        value={item.workOrderNo || ""}
                        onChange={(e) => updateItem(index, "workOrderNo", e.target.value)}
                        disabled={!isDraft || !!item.partId}
                        title={item.workOrderNo || ""}
                        className="w-full px-2 py-1 text-[13px] bg-slate-50 border border-blue-100 rounded-md text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        placeholder="WO No"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <div className="flex flex-col gap-1">
                        <textarea
                          rows={1}
                          value={item.description || (item.partId ? (metadata.parts.find((p: any) => p.id === item.partId)?.description || metadata.parts.find((p: any) => p.id === item.partId)?.partNo || "") : "")}
                          onChange={(e) => updateItem(index, "description", e.target.value.replace(/\n/g, " "))}
                          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                          disabled={!isDraft}
                          className="block w-full px-2 py-1 text-[13px] leading-snug bg-blue-50 border border-blue-200 rounded-md text-slate-700 break-words resize-none field-sizing-content focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                          placeholder="Product / Service Description *"
                        />
                        <textarea
                          rows={1}
                          value={item.remark || ""}
                          onChange={(e) => updateItem(index, "remark", e.target.value)}
                          disabled={!isDraft}
                          className="block w-full px-2 py-1 text-xs leading-snug bg-white border border-blue-200 rounded-md text-slate-600 break-words resize-y field-sizing-content focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                          placeholder="Description (optional, shown on print)"
                        />
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="text"
                        value={item.hsnCode || ""}
                        onChange={(e) => updateItem(index, "hsnCode", e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-2 py-1 text-[13px] bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 text-slate-600"
                        placeholder="HSN"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-2 py-1 text-[13px] bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <SearchableSelect
                        compact
                        value={item.uomId || ""}
                        onChange={(e) => updateItem(index, "uomId", e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-2 py-1 text-[13px] bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 text-slate-600"
                      >
                        <option value="">Select UOM...</option>
                        {metadata.uoms.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.uomName}</option>
                        ))}
                      </SearchableSelect>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-2 py-1 text-[13px] bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                      />
                    </td>
                    <td className="px-1.5 py-1.5 pt-2.5 text-right font-semibold text-blue-900 tabular-nums">
                      {Number(item.amount).toFixed(2)}
                    </td>
                    <td className="px-1.5 py-1.5">
                      <SearchableSelect
                        compact
                        value={item.taxTypeId || ""}
                        onChange={(e) => updateItem(index, "taxTypeId", e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-2 py-1 text-[13px] bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 text-slate-600"
                      >
                        <option value="">Select Tax...</option>
                        {metadata.taxes.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.taxType} ({t.taxRate}%)</option>
                        ))}
                      </SearchableSelect>
                      {Number(item.taxAmount) > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5 text-right">
                          Tax: {Number(item.taxAmount).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      {isDraft && (
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-rose-500 hover:bg-rose-100 rounded-md transition-colors"
                          title="Remove Item"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end pt-4 border-t border-blue-100">
           <div className="w-80 space-y-3">
             <div className="flex justify-between text-sm">
               <span className="font-semibold text-blue-900">Sub Total (Taxable Value):</span>
               <span className="text-blue-900">{Number(formData.amountBeforeTax).toFixed(2)}</span>
             </div>
             {Number(formData.taxAmount) > 0 && (
               !selectedCustomer?.isSez && (
                 (selectedCustomer?.placeOfSupply || "").toLowerCase().includes("tamil nadu") ||
                 (selectedCustomer?.gstin || "").startsWith("33")
               ) ? (
                 <>
                   <div className="flex justify-between text-sm">
                     <span className="font-semibold text-blue-900">CGST (Intra-state Tax):</span>
                     <span className="text-blue-900">{(Number(formData.taxAmount) / 2).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="font-semibold text-blue-900">SGST (Intra-state Tax):</span>
                     <span className="text-blue-900">{(Number(formData.taxAmount) / 2).toFixed(2)}</span>
                   </div>
                 </>
               ) : (
                 <div className="flex justify-between text-sm">
                   <span className="font-semibold text-blue-900">IGST (Inter-state Tax):</span>
                   <span className="text-blue-900">{Number(formData.taxAmount).toFixed(2)}</span>
                 </div>
               )
             )}
             <div className="flex justify-between text-sm">
               <span className="font-semibold text-blue-900">Total Tax:</span>
               <span className="text-blue-900">{Number(formData.taxAmount).toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-sm">
               <span className="font-semibold text-blue-900 self-center">Round Off:</span>
               <input
                 type="number"
                 step="0.01"
                 value={formData.roundOff || 0}
                 onChange={(e) => {
                    const rOff = Number(e.target.value);
                    const totals = calculateTotals(formData.items, formData.currencyId, rOff);
                    setFormData((prev: any) => ({ ...prev, ...totals, roundOff: rOff }));
                 }}
                 disabled={!isDraft}
                 className="w-24 px-2 py-1 text-right bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
               />
             </div>
             <div className="flex justify-between text-lg border-t border-blue-200 pt-3">
               <span className="font-bold text-blue-900">Total Amount:</span>
               <span className="font-bold text-indigo-700">
                 {metadata.currencies?.find((c: any) => c.id === formData.currencyId)?.code || "₹"} {Number(formData.amountAfterTax).toFixed(2)}
               </span>
             </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
           <div className="space-y-3">
             <div className="space-y-1">
               <label className="text-sm font-semibold text-blue-900">Select Bank Template</label>
               <SearchableSelect
                 value=""
                 onChange={(e) => handleBankChange(e.target.value)}
                 disabled={!isDraft}
                 className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
               >
                 <option value="">Select a Bank Profile to auto-fill...</option>
                 {metadata.banks?.map((b: any) => (
                   <option key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</option>
                 ))}
               </SearchableSelect>
             </div>
             <div className="space-y-1">
               <label className="text-sm font-semibold text-blue-900">Bank Details</label>
               <textarea
                 value={formData.bankDetails || ""}
                 onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                 disabled={!isDraft}
                 rows={3}
                 className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                 placeholder="Enter bank account information..."
               />
             </div>
           </div>
           <div className="space-y-1">
             <label className="text-sm font-semibold text-blue-900">Remarks</label>
             <textarea
               value={formData.remark || ""}
               onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
               disabled={!isDraft}
               rows={3}
               className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
               placeholder="Add any extra notes here..."
             />
           </div>
        </div>
      </div>

    </div>
  );
}
