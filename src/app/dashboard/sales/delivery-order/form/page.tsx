"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Send, AlertCircle, Printer } from "lucide-react";

const DEFAULT_RETURNABLE_NOTE = "Not for sale\nSend for testing and return";

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
    fetchMetadata();
    if (isEdit) {
      fetchDeliveryOrder();
    }
  }, [id]);

  const fetchMetadata = async () => {
    try {
      const res = await fetch("/api/sales/delivery-order/form-data");
      if (res.ok) {
        const data = await res.json();
        setMetadata(data);
      }
    } catch (err) {
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

  const handleSave = async () => {
    // doNo is assigned by the server on create, so it is not asked for here.
    if (!formData.customerId || !formData.salesOrderId) {
      setErrorMsg("Please fill in Customer and Sales Order.");
      return;
    }
    if (formData.items.length === 0) {
      setErrorMsg("Please add at least one work order item.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const url = isEdit ? `/api/sales/delivery-order/${id}` : "/api/sales/delivery-order";
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to save Delivery Order");
      
      router.push(`/dashboard/saved?module=Delivery Order&id=${resData.doNo || resData.id || ''}&viewUrl=/dashboard/sales/delivery-order/form?id=${resData.id}&backUrl=/dashboard/sales/delivery-order`);
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
      const res = await fetch(`/api/sales/delivery-order/${id}/submit`, { method: "POST" });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to submit");
      router.push(`/dashboard/saved?module=Delivery Order (Submitted)&id=${resData.doNo || resData.id || ''}&viewUrl=/dashboard/sales/delivery-order/form?id=${resData.id}&backUrl=/dashboard/sales/delivery-order`);
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
        newItems[index].quantity = wo.quantity || 0;
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
      <div className="p-8 flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isDraft = status === "Draft";

  // Filter Sales Orders and Work Orders based on selected Customer
  const filteredSalesOrders = formData.customerId 
    ? metadata.salesOrders.filter((so: any) => so.customerId === formData.customerId)
    : metadata.salesOrders;

  // Work orders belong to a sales order line; only offer the selected SO's work orders.
  const selectedSalesOrder = metadata.salesOrders.find((so: any) => so.id === formData.salesOrderId);
  const soWorkOrderNos = new Set<string>(selectedSalesOrder?.workOrderNos || []);
  const partNameFor = (item: any): string =>
    item.workOrder?.partName ||
    metadata.workOrders.find((w: any) => w.workOrderNo === item.workOrderNo)?.partName ||
    "";
  const filteredWorkOrders = selectedSalesOrder
    ? metadata.workOrders.filter((wo: any) => soWorkOrderNos.has(wo.workOrderNo))
    : [];

  const selectedCustomer = formData.customerId 
    ? metadata.customers.find((c: any) => c.id === formData.customerId)
    : null;

  return (
    <div className="py-3 space-y-4 pb-24 w-full">
      <div className="flex items-center justify-between pb-6 border-b border-blue-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/sales/delivery-order" className="p-2 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-blue-900">{isEdit ? "Edit Delivery Order" : "New Delivery Order"}</h1>
            <p className="text-sm text-blue-500">
              {isEdit ? `Editing DO: ${formData.doNo}` : "Create a new delivery order to track delivered goods"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {isEdit && (
             <Link
               href={`/print/delivery-order/${id}`}
               target="_blank"
               className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg font-semibold transition-colors"
             >
               <Printer size={16} /> Print
             </Link>
           )}
           {isEdit && isDraft && (
             <button
               onClick={handleSubmit}
               disabled={loading}
               className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg font-semibold transition-colors disabled:opacity-50"
             >
               <Send size={16} /> Submit DO
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

      {/* Main Form Fields */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Delivery Order No</label>
            {/* Assigned on save from the configured format — see Admin → Document Numbering. */}
            <input
              type="text"
              value={isEdit ? formData.doNo : "Auto-generated on save"}
              readOnly
              disabled
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900/70 disabled:opacity-60"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Date <span className="text-rose-500">*</span></label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Customer <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value, salesOrderId: "", poNo: "" })} // Reset SO when customer changes
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
            <label className="text-sm font-semibold text-blue-900">GST Number</label>
            <input
              type="text"
              readOnly
              value={selectedCustomer?.gstin || ""}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed text-slate-500"
              placeholder="-"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">RO Number</label>
            <input
              type="text"
              readOnly
              value={selectedCustomer?.roNumber || ""}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed text-slate-500"
              placeholder="-"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Sales Order <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.salesOrderId}
              onChange={(e) => {
                // Pre-fill the PO No from the sales order's customer PO ref; still editable.
                const so = metadata.salesOrders.find((s: any) => s.id === e.target.value);
                // Drop work orders that don't belong to the newly selected sales order.
                const woNos = new Set<string>(so?.workOrderNos || []);
                const items = formData.items.map((it: any) =>
                  it.workOrderNo && !woNos.has(it.workOrderNo) ? { ...it, workOrderNo: "" } : it,
                );
                setFormData({ ...formData, salesOrderId: e.target.value, poNo: so?.customerPoRef || "", items });
              }}
              disabled={!isDraft || !formData.customerId}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Sales Order...</option>
              {filteredSalesOrders.map((so: any) => (
                <option key={so.id} value={so.id}>{so.orderNo} {so.customerPoRef ? `(${so.customerPoRef})` : ""}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">PO No</label>
            <input
              type="text"
              value={formData.poNo || ""}
              onChange={(e) => setFormData({ ...formData, poNo: e.target.value })}
              disabled={!isDraft}
              placeholder="Customer PO number"
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Mode of Transport</label>
            <SearchableSelect
              value={formData.modeOfTransport || ""}
              onChange={(e) => setFormData({ ...formData, modeOfTransport: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Mode...</option>
              {["Road", "Rail", "Air", "Sea", "Courier", "Hand Delivery"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Vehicle Number</label>
            <input
              type="text"
              value={formData.vehicleNo || ""}
              onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
              disabled={!isDraft}
              placeholder="e.g. TN 01 AB 1234"
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1 md:col-span-2 flex items-center gap-3">
             <input 
               type="checkbox" 
               id="cocRequired"
               checked={formData.cocRequired}
               onChange={(e) => setFormData({ ...formData, cocRequired: e.target.checked })}
               disabled={!isDraft}
               className="w-5 h-5 rounded border-blue-300 text-indigo-600 focus:ring-indigo-500"
             />
             <label htmlFor="cocRequired" className="text-sm font-semibold text-blue-900 select-none">
               Requires Certificate Of Conformity (COC)
             </label>
          </div>

          <div className="md:col-span-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex items-center gap-3">
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
                className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="isReturnable" className="text-sm font-semibold text-blue-900 select-none">
                Returnable Delivery Challan (Not for Sale)
              </label>
            </div>
            {formData.isReturnable && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-blue-900">Note printed on the challan</label>
                <textarea
                  rows={3}
                  value={formData.returnableNote || ""}
                  onChange={(e) => setFormData({ ...formData, returnableNote: e.target.value })}
                  disabled={!isDraft}
                  placeholder={DEFAULT_RETURNABLE_NOTE}
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Area */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-blue-900">Delivery Items (Work Orders)</h3>
          {isDraft && (
            <button
              onClick={addItem}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Plus size={16} /> Add Item
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-[13px] text-left min-w-[680px]">
            <colgroup>
              <col />
              <col className="w-24" />
              <col className="w-32" />
              <col className="w-36" />
              <col className="w-32" />
              {isDraft && <col className="w-9" />}
            </colgroup>
            <thead className="text-[11px] text-blue-500 bg-blue-50/50 uppercase tracking-wide border-b border-blue-200">
              <tr>
                <th className="px-1.5 py-2">Work Order No</th>
                <th className="px-1.5 py-2">Quantity</th>
                <th className="px-1.5 py-2">UOM</th>
                <th className="px-1.5 py-2">Delivery Date</th>
                <th className="px-1.5 py-2 text-right">Total Value</th>
                {isDraft && <th className="px-1.5 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {formData.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-blue-400">
                    No items added yet. Click &quot;Add Item&quot; to begin.
                  </td>
                </tr>
              ) : (
                formData.items.map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-blue-50/30 align-top">
                    <td className="px-1.5 py-1.5">
                      <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                      <div className="w-44 shrink-0">
                      <SearchableSelect
                        compact
                        value={item.workOrderNo}
                        onChange={(e) => updateItem(index, "workOrderNo", e.target.value)}
                        disabled={!isDraft}
                        dropdownPosition="top"
                        className="w-full px-2 py-1 text-[13px] bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
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
                      </div>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-600" title={partNameFor(item)}>
                        {item.workOrderNo ? partNameFor(item) || "-" : ""}
                      </span>
                      </div>
                      <textarea
                        rows={1}
                        value={item.description || ""}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        disabled={!isDraft}
                        className="block w-full px-2 py-1 text-xs leading-snug bg-white border border-blue-200 rounded-md text-slate-600 break-words resize-y field-sizing-content focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        placeholder="Description (optional, shown on print)"
                      />
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5">
                       <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-2 py-1 text-[13px] text-right tabular-nums bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <SearchableSelect
                        compact
                        value={item.uomId || ""}
                        onChange={(e) => updateItem(index, "uomId", e.target.value)}
                        disabled={!isDraft}
                        dropdownPosition="top"
                        className="w-full px-2 py-1 text-[13px] bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                      >
                        <option value="">Select UOM...</option>
                        {metadata.uoms.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.uomName}</option>
                        ))}
                      </SearchableSelect>
                    </td>
                    <td className="px-1.5 py-1.5">
                       <input
                        type="date"
                        value={item.deliveryDate ? item.deliveryDate.split("T")[0] : ""}
                        onChange={(e) => updateItem(index, "deliveryDate", e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-2 py-1 text-[13px] bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.totalValue ?? ""}
                          onChange={(e) => updateItem(index, "totalValue", e.target.value)}
                          disabled={!isDraft}
                          placeholder={suggestedValue(item) || "0.00"}
                          title={
                            unitPriceFor(item.workOrderNo) != null
                              ? `SO unit price ${unitPriceFor(item.workOrderNo)!.toFixed(2)} × qty`
                              : "No SO unit price found — enter manually"
                          }
                          className="w-full px-2 py-1 text-[13px] text-right tabular-nums bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        />
                      </td>
                    {isDraft && (
                      <td className="px-1 py-1.5 text-center">
                        <button
                          onClick={() => removeItem(index)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {formData.items.length > 0 && (
              <tfoot className="border-t border-blue-200">
                <tr>
                  <td colSpan={4} className="px-1.5 py-2 text-right text-xs font-bold text-blue-900 uppercase">Value of Goods</td>
                  <td className="px-1.5 py-2 text-right font-bold tabular-nums text-blue-900">
                    {formData.items.reduce((s: number, it: any) => s + (Number(it.totalValue) || 0), 0).toFixed(2)}
                  </td>
                  {isDraft && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
