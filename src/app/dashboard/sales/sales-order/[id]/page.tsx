"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState, useEffect, useMemo, use } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FileText, Save, CheckCircle2, ChevronDown, ChevronRight, Loader2, Factory, X, Plus, Trash2, ArrowLeft, AlertCircle } from "lucide-react";
import { ProfileOrFreeText } from "@/components/ProfileOrFreeText";
import { getFormData } from "./actions";
type PageProps = {
  params: Promise<{ id: string }>;
};

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
              batches: (item.batches || []).map((b: any) => ({
                ...b,
                deliveryDate: new Date(b.deliveryDate).toISOString().split("T")[0],
              }))
            }))
          );
        } else {
          // Defaults
          if (data.currencies.length > 0) {
            const defCurr = data.currencies.find((c: any) => c.code === "SGD") || data.currencies[0];
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/sales/sales-order" className="inline-flex items-center text-sm text-blue-500 hover:text-blue-800 :text-blue-200 transition-colors mb-2">
            <ArrowLeft size={16} className="mr-1" /> Back to Orders
          </Link>
          <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            {isNew ? "Create Sales Order" : `Edit Sales Order: ${order.orderNo}`}
            {!isNew && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                order.status === "Confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}>
                {order.status}
              </span>
            )}
          </h2>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={() => router.push("/dashboard/sales/sales-order")}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            Back
          </button>

          {order.status === "Draft" && (
            <>
              <button
                onClick={() => handleSave("Draft")}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Draft
              </button>
              {!isNew && (
                <>
                  <button
                    onClick={() => handleSave("Confirmed")}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Confirm
                  </button>
                  <button
                    onClick={() => handleSave("Void")}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-rose-700 bg-rose-100 rounded-lg hover:bg-rose-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    Void
                  </button>
                </>
              )}
            </>
          )}

          {order.status === "Confirmed" && (
            <>

              <button
                onClick={() => handleSave("Revised")}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 disabled:opacity-50 flex items-center gap-2"
              >
                Revised
              </button>
              <button
                onClick={() => handleSave("Closed")}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 disabled:opacity-50 flex items-center gap-2"
              >
                Closed
              </button>
              <button
                onClick={() => handleSave("Old Version")}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2"
              >
                Old Version
              </button>
            </>
          )}

          {order.status === "Revised" && (
            <>
              <button
                onClick={() => handleSave("Confirmed")}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirmed
              </button>
              <button
                onClick={() => handleSave("Closed")}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 disabled:opacity-50 flex items-center gap-2"
              >
                Closed
              </button>
              <button
                onClick={() => handleSave("Old Version")}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2"
              >
                Old Version
              </button>
            </>
          )}

          {(order.status === "Closed" || order.status === "Void" || order.status === "Old Revise") && (
            <button
              disabled
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg flex items-center gap-2 opacity-70"
            >
              View Only
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Information */}
          <div className="p-6 bg-white rounded-xl border border-blue-200 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">General Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={order.date}
                  onChange={(e) => handleOrderChange("date", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Order Type <span className="text-red-500">*</span></label>
                <SearchableSelect
                  value={order.orderType || "Direct"}
                  onChange={(e) => handleOrderChange("orderType", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="Direct">Direct</option>
                  <option value="Sub-contract">Sub-contract</option>
                </SearchableSelect>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Salesperson <span className="text-red-500">*</span></label>
                <SearchableSelect
                  value={order.salespersonId}
                  onChange={(e) => handleOrderChange("salespersonId", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select Salesperson</option>
                  {formDataCache?.employees?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </SearchableSelect>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Quotation Reference</label>
                <input
                  type="text"
                  placeholder="Auto-fill items Int. Quotation"
                  value={headerQuotationRef}
                  onChange={(e) => handleHeaderQuotationChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-blue-300"
                />
              </div>
              <div className="sm:col-span-2">
                <ProfileOrFreeText
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
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Customer PO Ref</label>
                <input
                  type="text"
                  value={order.customerPoRef || ""}
                  onChange={(e) => handleOrderChange("customerPoRef", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-blue-700 mb-1">Remark</label>
                <textarea
                  value={order.remark || ""}
                  onChange={(e) => handleOrderChange("remark", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-blue-700 mb-1">Upload (File URL)</label>
                <input
                  type="text"
                  value={order.uploadUrl || ""}
                  onChange={(e) => handleOrderChange("uploadUrl", e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-6 bg-white rounded-xl border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <FileText size={20} className="text-indigo-500" />
                Order Items
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>
            
            {items.length === 0 ? (
              <div className="text-center p-8 bg-blue-50 rounded-lg border border-dashed border-blue-200 ">
                <p className="text-blue-500 text-sm">No items added to this order.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg relative group">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="absolute -top-2 -right-2 p-1 bg-white text-rose-500 border border-blue-200 rounded-full shadow-sm hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    
                    <div className="flex-1 space-y-4">
                      {/* Item Level Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pb-4 border-b border-blue-200">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-blue-500 mb-1">Part <span className="text-red-500">*</span></label>
                          <SearchableSelect
                            value={item.partId}
                            onChange={(e) => handleItemChange(index, "partId", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">Select Part</option>
                            {formDataCache?.finishedGoods?.map((fg: any) => (
                              <option key={fg.id} value={fg.id}>{fg.partNo} - {fg.description}</option>
                            ))}
                          </SearchableSelect>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-500 mb-1">Int. Quotation</label>
                          <input
                            type="text"
                            value={item.internalQuotationNo || ""}
                            onChange={(e) => handleItemChange(index, "internalQuotationNo", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-500 mb-1">Unit Price <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice || ""}
                            onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-500 mb-1">UOM <span className="text-red-500">*</span></label>
                          <SearchableSelect
                            value={item.uomId}
                            onChange={(e) => handleItemChange(index, "uomId", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">Select UOM</option>
                            {formDataCache?.uoms?.map((u: any) => (
                              <option key={u.id} value={u.id}>{u.uomName}</option>
                            ))}
                          </SearchableSelect>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-500 mb-1">Vendor Material No</label>
                          <input
                            type="text"
                            value={item.vendorMaterialNo || ""}
                            onChange={(e) => handleItemChange(index, "vendorMaterialNo", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-500 mb-1">Estimate No</label>
                          <input
                            type="text"
                            value={item.estimateNo || ""}
                            onChange={(e) => handleItemChange(index, "estimateNo", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-medium text-blue-500 mb-1">Material Specification</label>
                          <input
                            type="text"
                            value={item.materialSpecification || ""}
                            onChange={(e) => handleItemChange(index, "materialSpecification", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-blue-500 mb-1">Item Remark</label>
                          <input
                            type="text"
                            value={item.remark || ""}
                            onChange={(e) => handleItemChange(index, "remark", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-blue-500 mb-1">Item Upload URL</label>
                          <input
                            type="text"
                            value={item.uploadUrl || ""}
                            onChange={(e) => handleItemChange(index, "uploadUrl", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex flex-col justify-end pb-1">
                          <span className="text-xs font-medium text-blue-500 mb-1">Total Quantity</span>
                          <span className="text-sm font-bold text-indigo-700">{item.quantity}</span>
                        </div>
                      </div>

                      {/* Batches Level Info */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-blue-900 uppercase">Batches</span>
                          <button
                            type="button"
                            onClick={() => addBatch(index)}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                          >
                            <Plus size={12} /> Add Batch
                          </button>
                        </div>
                        <div className="space-y-2">
                          {item.batches?.map((batch: any, bIndex: number) => (
                            <div key={bIndex} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-start relative group/batch p-2 bg-white rounded border border-blue-100">
                               <button
                                  type="button"
                                  onClick={() => removeBatch(index, bIndex)}
                                  className="absolute -top-1 -right-1 p-0.5 bg-white text-rose-500 border border-blue-200 rounded-full shadow-sm hover:bg-rose-50 opacity-0 group-hover/batch:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                              <div>
                                <label className="block text-[10px] font-medium text-slate-500 mb-1">Qty</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={batch.quantity}
                                  onChange={(e) => handleBatchChange(index, bIndex, "quantity", parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-medium text-slate-500 mb-1">Delivery Date</label>
                                <input
                                  type="date"
                                  value={batch.deliveryDate}
                                  onChange={(e) => handleBatchChange(index, bIndex, "deliveryDate", e.target.value)}
                                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-medium text-slate-500 mb-1">Remark</label>
                                <input
                                  type="text"
                                  value={batch.remark || ""}
                                  onChange={(e) => handleBatchChange(index, bIndex, "remark", e.target.value)}
                                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="flex items-center pt-4">
                                <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={batch.noRoutingProcess}
                                    onChange={(e) => handleBatchChange(index, bIndex, "noRoutingProcess", e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                                  />
                                  No Routing
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Total Overview (Workaround for missing item prices) */}
          <div className="p-6 bg-white rounded-xl border border-blue-200 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Financials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Amount Before Tax (Calculated)</label>
                <div className="flex items-center gap-2">
                  <span className="text-blue-500">{formDataCache?.currencies?.find((c:any) => c.id === order.currencyId)?.code || "$"}</span>
                  <input
                    type="text"
                    readOnly
                    value={amountBeforeTax.toFixed(2)}
                    className="w-full px-3 py-2 text-sm bg-slate-100 text-slate-500 border border-slate-200 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-blue-500">Tax Amount</span>
                  <span className="text-sm font-medium">{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-blue-200 mt-1">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-indigo-600">{amountAfterTax.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar settings */}
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-blue-200 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-blue-900 ">Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">Currency <span className="text-red-500">*</span></label>
              <SearchableSelect
                value={order.currencyId}
                onChange={(e) => handleOrderChange("currencyId", e.target.value)}
                className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Select Currency</option>
                {formDataCache?.currencies?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.code}</option>
                ))}
              </SearchableSelect>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Tax Type</label>
              {selectedCustomer?.isSez ? (
                <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-sm">
                  SEZ Tax ({Number(formDataCache?.companies?.[0]?.sezTaxRate) || 0}%) Auto-applied
                </div>
              ) : (
                <SearchableSelect
                  value={order.taxTypeId || ""}
                  onChange={(e) => handleOrderChange("taxTypeId", e.target.value)}
                  disabled={order.status !== "Draft"}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">— Select Tax Type —</option>
                  {formDataCache?.taxes.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.taxType} ({t.taxRate}%)</option>
                  ))}
                </SearchableSelect>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">Payment Term <span className="text-red-500">*</span></label>
              <SearchableSelect
                value={order.paymentTermId}
                onChange={(e) => handleOrderChange("paymentTermId", e.target.value)}
                className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Select Payment Term</option>
                {formDataCache?.paymentTerms?.map((pt: any) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </SearchableSelect>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">Project Code</label>
              <input
                type="text"
                value={order.projectCode || ""}
                onChange={(e) => handleOrderChange("projectCode", e.target.value)}
                className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">Other Payment Detail</label>
              <input
                type="text"
                value={order.otherPaymentDetail || ""}
                onChange={(e) => handleOrderChange("otherPaymentDetail", e.target.value)}
                className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">Ref Contract</label>
              <input
                type="text"
                value={order.refContract || ""}
                onChange={(e) => handleOrderChange("refContract", e.target.value)}
                className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="p-6 bg-white rounded-xl border border-blue-200 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-blue-900 ">Customer Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">Contact Person</label>
              {order.customerSelection?.type === "freetext" ? (
                <input
                  type="text"
                  readOnly
                  value={order.customerSelection?.freeTextPayload?.contactPerson || ""}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed"
                />
              ) : (
                <SearchableSelect
                  value={order.contactPersonId || ""}
                  onChange={(e) => handleOrderChange("contactPersonId", e.target.value)}
                  disabled={!selectedCustomer}
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                >
                  <option value="">Select Contact</option>
                  {selectedCustomer?.contactPersons?.map((cp: any) => (
                    <option key={cp.id} value={cp.id}>{cp.contactPersonName}</option>
                  ))}
                </SearchableSelect>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">GST Number</label>
                <input
                  type="text"
                  readOnly
                  value={order.customerSelection?.type === "freetext" ? (order.customerSelection?.freeTextPayload?.gstin || "") : (selectedCustomer?.gstin || "")}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">RO Number</label>
                <input
                  type="text"
                  readOnly
                  value={selectedCustomer?.roNumber || ""}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Tel</label>
                <input
                  type="text"
                  value={order.tel || ""}
                  onChange={(e) => handleOrderChange("tel", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Fax</label>
                <input
                  type="text"
                  value={order.fax || ""}
                  onChange={(e) => handleOrderChange("fax", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={order.email || ""}
                onChange={(e) => handleOrderChange("email", e.target.value)}
                className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">Deliver To</label>
              {order.customerSelection?.type === "freetext" ? (
                <input
                  type="text"
                  readOnly
                  value={order.customerSelection?.freeTextPayload?.address || ""}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed"
                />
              ) : (
                <SearchableSelect
                  value={order.deliverToId || ""}
                  onChange={(e) => handleOrderChange("deliverToId", e.target.value)}
                  disabled={!selectedCustomer}
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                >
                  <option value="">Select Address</option>
                  {selectedCustomer?.addresses?.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.address}</option>
                  ))}
                </SearchableSelect>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">Bill To</label>
              {order.customerSelection?.type === "freetext" ? (
                <input
                  type="text"
                  readOnly
                  value={order.customerSelection?.freeTextPayload?.address || ""}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed"
                />
              ) : (
                <SearchableSelect
                  value={order.billToId || ""}
                  onChange={(e) => handleOrderChange("billToId", e.target.value)}
                  disabled={!selectedCustomer}
                  className="w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                >
                  <option value="">Select Address</option>
                  {selectedCustomer?.addresses?.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.address}</option>
                  ))}
                </SearchableSelect>
              )}
            </div>
            
          </div>
        </div>
      </div>

      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-blue-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="text-rose-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Validation Error</h3>
              <p className="text-sm text-slate-600 mb-6">
                Please add at least one item before saving the Sales Order.
              </p>
              <button
                onClick={() => setShowValidationModal(false)}
                className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
