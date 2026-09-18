"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";

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
    paymentTermId: "",
    currencyId: "",
    exchangeRate: 1,
    taxTypeId: "",
    taxRate: 0,
    amountBeforeTax: 0,
    taxAmount: 0,
    amountAfterTax: 0,
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
          invoiceDate: new Date(data.invoiceDate).toISOString().split("T")[0],
          doIds: data.deliveryOrders.map((doLink: any) => doLink.deliveryOrderId),
          items: data.items.map((item: any) => ({
             ...item,
             amount: Number(item.amount),
             unitPrice: Number(item.unitPrice),
             quantity: Number(item.quantity)
          }))
        });
        setStatus(data.status);
        setRevision(data.revision);

        if (data.customerId) {
           const doRes = await getPendingDOs(data.customerId);
           if (doRes.success) setPendingDOs(doRes.data || []);
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
      doIds: [],
      items: [],
      amountBeforeTax: 0,
      taxAmount: 0,
      amountAfterTax: 0
    }));

    // Fetch DOs
    if (customerId) {
      const doRes = await getPendingDOs(customerId);
      if (doRes.success) setPendingDOs(doRes.data || []);
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
      const totals = calculateTotals(prev.items, prev.taxRate, currencyId);
      return {
        ...prev,
        currencyId,
        exchangeRate: currency ? Number(currency.exchangeRate) : 1,
        ...totals
      };
    });
  };

  const handleTaxChange = (taxId: string) => {
    const tax = metadata.taxes.find((t: any) => t.id === taxId);
    setFormData((prev: any) => {
      const taxRate = tax ? Number(tax.taxRate) : 0;
      const totals = calculateTotals(prev.items, taxRate, prev.currencyId);
      return {
        ...prev,
        taxTypeId: taxId,
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

  const calculateTotals = (items: any[], taxRate: number, overrideCurrencyId?: string) => {
    const customer = metadata.customers?.find((c: any) => c.id === formData.customerId);
    const company = metadata.companies?.find((c: any) => c.id === formData.companyId);
    const effectiveTaxRate = customer?.isSez ? (Number(company?.sezTaxRate) || 0) : taxRate;

    const amtBefore = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const taxAmt = amtBefore * (effectiveTaxRate / 100);
    
    let finalTotal = amtBefore + taxAmt;
    const cid = overrideCurrencyId || formData.currencyId;
    const currency = metadata.currencies?.find((c: any) => c.id === cid);
    
    if (currency?.roundingMode === "UP") {
      finalTotal = Math.ceil(finalTotal);
    } else if (currency?.roundingMode === "DOWN") {
      finalTotal = Math.floor(finalTotal);
    }

    return {
      taxRate: effectiveTaxRate,
      amountBeforeTax: amtBefore,
      taxAmount: taxAmt,
      amountAfterTax: finalTotal
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
        const totals = calculateTotals(newItems, formData.taxRate);
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
    newItems[index][field] = value;
    
    if (field === "quantity" || field === "unitPrice") {
      newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].unitPrice);
    }

    const totals = calculateTotals(newItems, formData.taxRate);
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
    };
    const newItems = [...formData.items, newItem];
    const totals = calculateTotals(newItems, formData.taxRate);
    setFormData((prev: any) => ({ ...prev, items: newItems, ...totals }));
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_: any, i: number) => i !== index);
    newItems.forEach((item: any, idx: number) => {
      item.lineNo = idx + 1;
    });
    const totals = calculateTotals(newItems, formData.taxRate);
    setFormData((prev: any) => ({ ...prev, items: newItems, ...totals }));
  };

  const handleSave = async () => {
    if (!formData.companyId || !formData.customerId || !formData.paymentTermId || !formData.currencyId || !formData.preparedById) {
      setErrorMsg("Please fill in all mandatory fields.");
      return;
    }
    const isSez = selectedCustomer?.isSez;
    if (!isSez && !formData.taxTypeId) {
      setErrorMsg("Please select a Tax Type.");
      return;
    }
    if (formData.items.length === 0) {
      setErrorMsg("Please add at least one item or select a DO.");
      return;
    }

    const payload = { ...formData };
    if (isSez && !payload.taxTypeId && metadata.taxes.length > 0) {
      payload.taxTypeId = metadata.taxes[0].id;
    }

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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-24">
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
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Customer Info */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-4 border-b border-blue-100 pb-2">Customer & Delivery Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Customer <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Customer...</option>
              {metadata.customers.map((c: any) => (
                <option key={c.id} value={c.id}>{c.customerName}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Select Delivery Orders</label>
            {isDraft ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                 {pendingDOs.length === 0 ? (
                   <span className="text-xs text-blue-400">No pending DOs found.</span>
                 ) : (
                   <div className="space-y-2">
                     {pendingDOs.map((doItem: any) => (
                       <label key={doItem.id} className="flex items-center gap-2 text-sm text-blue-700 cursor-pointer">
                         <input
                           type="checkbox"
                           checked={formData.doIds.includes(doItem.id)}
                           onChange={() => handleDoToggle(doItem.id)}
                           className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-blue-300"
                         />
                         <span>{doItem.doNo} ({doItem.salesOrder?.orderNo})</span>
                       </label>
                     ))}
                   </div>
                 )}
              </div>
            ) : (
              <div className="text-sm text-blue-700 p-3 bg-blue-50 rounded-lg">
                {formData.doIds.length} Delivery Order(s) linked.
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Contact Person <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.contactPersonId}
              onChange={(e) => handleContactChange(e.target.value)}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Contact...</option>
              {selectedCustomer?.contactPersons?.map((cp: any) => (
                <option key={cp.id} value={cp.id}>{cp.contactPersonName}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Email <span className="text-rose-500">*</span></label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Tel</label>
            <input
              type="text"
              value={formData.tel || ""}
              onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Fax</label>
            <input
              type="text"
              value={formData.fax || ""}
              onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-semibold text-blue-900">Bill To Address</label>
            <SearchableSelect
              value={formData.billToId}
              onChange={(e) => setFormData({ ...formData, billToId: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Address...</option>
              {selectedCustomer?.addresses?.map((addr: any) => (
                <option key={addr.id} value={addr.id}>{addr.address}</option>
              ))}
            </SearchableSelect>
          </div>
        </div>
      </div>

      {/* Financial Info */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-4 border-b border-blue-100 pb-2">Financial Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-semibold text-blue-900">Tax Type {!selectedCustomer?.isSez && <span className="text-rose-500">*</span>}</label>
            {selectedCustomer?.isSez ? (
              <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-sm">
                SEZ Tax ({Number(metadata.companies.find((c: any) => c.id === formData.companyId)?.sezTaxRate) || 0}%) Auto-applied
              </div>
            ) : (
              <SearchableSelect
                value={formData.taxTypeId}
                onChange={(e) => handleTaxChange(e.target.value)}
                disabled={!isDraft}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                <option value="">Select Tax...</option>
                {metadata.taxes.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.taxType} ({t.taxRate}%)</option>
                ))}
              </SearchableSelect>
            )}
          </div>
        </div>
      </div>

      {/* Items Area */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold text-blue-900">Invoice Items</h3>
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
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider border-b border-blue-200">
              <tr>
                <th className="px-4 py-3">SN</th>
                <th className="px-4 py-3 min-w-[150px]">Work Order</th>
                <th className="px-4 py-3 min-w-[200px]">Part / Description</th>
                <th className="px-4 py-3 w-32">HSN / SAC</th>
                <th className="px-4 py-3 w-32">Qty</th>
                <th className="px-4 py-3 w-32">UOM</th>
                <th className="px-4 py-3 w-32">Unit Price</th>
                <th className="px-4 py-3 w-32">Amount</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {formData.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-blue-400">
                    No items found. Select Delivery Orders or add items manually.
                  </td>
                </tr>
              ) : (
                formData.items.map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-blue-50/30">
                    <td className="px-4 py-2 text-blue-600 font-medium">{index + 1}</td>
                    <td className="px-4 py-2">
                       <input
                        type="text"
                        value={item.workOrderNo || ""}
                        onChange={(e) => updateItem(index, "workOrderNo", e.target.value)}
                        disabled={!isDraft || !!item.partId}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-blue-100 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        placeholder="WO No"
                      />
                    </td>
                    <td className="px-4 py-2">
                       <input
                        type="text"
                        value={item.partId ? (metadata.parts.find((p: any) => p.id === item.partId)?.partNo || "") : item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        disabled={!isDraft || !!item.partId}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-blue-100 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        placeholder="Description"
                      />
                    </td>
                    <td className="px-4 py-2">
                       <input
                        type="text"
                        value={item.hsnCode || ""}
                        onChange={(e) => updateItem(index, "hsnCode", e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        placeholder="HSN"
                      />
                    </td>
                    <td className="px-4 py-2">
                       <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <SearchableSelect
                        value={item.uomId || ""}
                        onChange={(e) => updateItem(index, "uomId", e.target.value)}
                        disabled={!isDraft || !!item.partId}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-blue-100 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                      >
                        <option value="">Select UOM...</option>
                        {metadata.uoms.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.uomName}</option>
                        ))}
                      </SearchableSelect>
                    </td>
                    <td className="px-4 py-2">
                       <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                      />
                    </td>
                    <td className="px-4 py-2 font-semibold text-blue-900">
                       {Number(item.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      {isDraft && (
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md transition-colors"
                          title="Remove Item"
                        >
                          <Trash2 size={16} />
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
           <div className="w-72 space-y-3">
             <div className="flex justify-between text-sm">
               <span className="font-semibold text-blue-900">Amount Before Tax:</span>
               <span className="text-blue-900">{Number(formData.amountBeforeTax).toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-sm">
               <span className="font-semibold text-blue-900">Tax Amount ({formData.taxRate}%):</span>
               <span className="text-blue-900">{Number(formData.taxAmount).toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-lg border-t border-blue-200 pt-3">
               <span className="font-bold text-blue-900">Total Amount:</span>
               <span className="font-bold text-indigo-700">{Number(formData.amountAfterTax).toFixed(2)}</span>
             </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
