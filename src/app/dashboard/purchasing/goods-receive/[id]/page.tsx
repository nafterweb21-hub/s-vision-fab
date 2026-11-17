"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { PackageCheck, Save, ArrowLeft, Loader2, Send, Ban, AlertCircle } from "lucide-react";
import {
getGoodsReceiveFormData,
  createGoodsReceive,
  updateGoodsReceive,
  submitGoodsReceive,
  voidGoodsReceive,
} from "../actions";

function cleanErrorMessage(msg: any): string {
  const text = typeof msg === "string" ? msg : msg?.message || "";
  if (!text) return "An unexpected error occurred.";
  if (text.includes("Argument `company` is missing") || text.includes("companyId")) {
    return "Company is mandatory. Please select a valid Company.";
  }
  if (text.includes("Argument `supplier` is missing") || text.includes("supplierId")) {
    return "Supplier is mandatory. Please select a valid Supplier.";
  }
  if (text.includes("Argument `purchaseOrder` is missing") || text.includes("purchaseOrderId")) {
    return "PO No is mandatory. Please select an issued Purchase Order.";
  }
  if (text.includes("Invalid `prisma.") || text.includes("invocation:")) {
    return "Unable to save Goods Receive. Please ensure all mandatory fields (Company, Supplier, PO No, Date) are filled.";
  }
  return text;
}

export default function GoodsReceiveFormPage() {
  const params = useParams();
  const id = params?.id as string;

  const router = useRouter();
  const isNew = id === "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [prereq, setPrereq] = useState<any>(null);
  const [existing, setExisting] = useState<any>(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [companyId, setCompanyId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  
  const [doNo, setDoNo] = useState("");
  const [doDate, setDoDate] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [remark, setRemark] = useState("");
  const [creatorId, setCreatorId] = useState("");

  const [currencyId, setCurrencyId] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [taxTypeId, setTaxTypeId] = useState("");
  const [taxRate, setTaxRate] = useState<number>(0);

  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const data = await getGoodsReceiveFormData();
        setPrereq(data);

        // TODO: Get currently logged in user's employeeId to set default Creator.
        // For now, if there's any employee, select the first one.
        if (isNew && data.employees?.length > 0) {
          setCreatorId(data.employees[0].id);
        }

        if (!isNew) {
          const res = await fetch(`/api/purchasing/goods-receive/${id}`);
          if (!res.ok) throw new Error("Failed to fetch GR details");
          const gr = await res.json();
          setExisting(gr);

          setDate(new Date(gr.date).toISOString().slice(0, 10));
          setCompanyId(gr.companyId);
          setSupplierId(gr.supplierId);
          setPurchaseOrderId(gr.purchaseOrderId);
          setDoNo(gr.doNo || "");
          setDoDate(gr.doDate ? new Date(gr.doDate).toISOString().slice(0, 10) : "");
          setInvoiceNo(gr.invoiceNo || "");
          setInvoiceDate(gr.invoiceDate ? new Date(gr.invoiceDate).toISOString().slice(0, 10) : "");
          setRemark(gr.remark || "");
          setCreatorId(gr.creatorId);
          setCurrencyId(gr.currencyId);
          setExchangeRate(Number(gr.exchangeRate) || 1);
          setTaxTypeId(gr.taxTypeId || "");
          setTaxRate(Number(gr.taxRate) || 0);

          if (gr.items) {
            setItems(
              gr.items.map((i: any) => ({
                id: i.id,
                purchaseOrderItemId: i.purchaseOrderItemId,
                receiveQty: Number(i.receiveQty),
                poItem: i.purchaseOrderItem,
              }))
            );
          }
        }
      } catch (e: any) {
        setErrorMsg(cleanErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isNew, id]);

  const selectedPO = prereq?.purchaseOrders?.find((p: any) => p.id === purchaseOrderId);

  // Auto-populate when PO changes (only for New GR)
  useEffect(() => {
    if (!id) return;
    if (isNew && selectedPO) {
      setCompanyId(selectedPO.companyId);
      setSupplierId(selectedPO.supplierId);
      // Find latest currency exchange rate
      const cur = prereq?.currencies?.find((c: any) => c.id === selectedPO.currencyId);
      if (cur) {
        setCurrencyId(cur.id);
        setExchangeRate(Number(cur.exchangeRate) || 1);
      }

      setTaxTypeId(selectedPO.taxTypeId);
      setTaxRate(Number(selectedPO.taxRate));

      // Populate items
      if (selectedPO.items) {
        setItems(
          selectedPO.items.map((pi: any) => ({
            id: null, // new
            purchaseOrderItemId: pi.id,
            receiveQty: 0,
            poItem: pi,
          }))
        );
      }
    }
  }, [purchaseOrderId, isNew, prereq]);

  const filteredPOs =
    prereq?.purchaseOrders?.filter((p: any) => {
      if (companyId && p.companyId !== companyId) return false;
      if (supplierId && p.supplierId !== supplierId) return false;
      return true;
    }) || [];

  async function handleSaveDraft() {
    setSaving(true);
    setErrorMsg("");
    try {
      if (!companyId) throw new Error("Company is mandatory");
      if (!supplierId) throw new Error("Supplier is mandatory");
      if (!purchaseOrderId) throw new Error("PO No is mandatory");
      if (!date) throw new Error("GR Date is mandatory");

      const payload = {
        date: new Date(date).toISOString(),
        companyId,
        supplierId,
        purchaseOrderId,
        currencyId,
        exchangeRate,
        taxTypeId,
        taxRate,
        doNo,
        doDate: doDate ? new Date(doDate).toISOString() : null,
        invoiceNo,
        invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : null,
        remark,
        creatorId,
        items: items.map((i) => ({
          id: i.id,
          purchaseOrderItemId: i.purchaseOrderItemId,
          receiveQty: Number(i.receiveQty),
        })),
      };

      if (isNew) {
        const res = await createGoodsReceive(payload);
        if (!res.success) throw new Error(res.error);
        router.push(`/dashboard/saved?module=Goods Receive&id=${res.id}&viewUrl=/dashboard/purchasing/goods-receive/${res.id}&backUrl=/dashboard/purchasing/goods-receive`);
      } else {
        const res = await updateGoodsReceive(id, payload);
        if (!res.success) throw new Error(res.error);
        router.push(`/dashboard/saved?module=Goods Receive&id=${existing?.grNo || id}&viewUrl=/dashboard/purchasing/goods-receive/${id}&backUrl=/dashboard/purchasing/goods-receive`);
      }
    } catch (e: any) {
      setErrorMsg(cleanErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (isNew) {
      return hotToast.error("Please save draft first before submitting.");
    }
    if (!await customConfirm("Submit this Goods Receive?")) return;
    setSaving(true);
    try {
      const res = await submitGoodsReceive(id);
      if (!res.success) throw new Error(res.error);
      router.push(`/dashboard/saved?module=Goods Receive (Submitted)&id=${existing?.grNo || id}&viewUrl=/dashboard/purchasing/goods-receive/${id}&backUrl=/dashboard/purchasing/goods-receive`);
    } catch (e: any) {
      setErrorMsg(cleanErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const isReadonly = !isNew && existing?.status !== "Draft";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="py-3 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/purchasing/goods-receive"
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isNew ? "New Goods Receive" : `Edit ${existing?.grNo}`}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {!isNew && `Status: ${existing?.status}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isReadonly && (
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </button>
          )}
          {!isNew && existing?.status === "Draft" && (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Submit
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-700">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <h3 className="font-semibold text-slate-800">Basic Information</h3>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Company <span className="text-red-500">*</span></label>
                <SearchableSelect
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  disabled={isReadonly}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                >
                  <option value="">Select Company</option>
                  {prereq?.companies?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </SearchableSelect>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">GR Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isReadonly}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Supplier <span className="text-red-500">*</span></label>
                <SearchableSelect
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    setPurchaseOrderId("");
                  }}
                  disabled={isReadonly}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                >
                  <option value="">Select Supplier</option>
                  {prereq?.suppliers?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.supplierName}</option>
                  ))}
                </SearchableSelect>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">PO No <span className="text-red-500">*</span></label>
                <SearchableSelect
                  value={purchaseOrderId}
                  onChange={(e) => setPurchaseOrderId(e.target.value)}
                  disabled={isReadonly || !isNew}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                >
                  <option value="">Select PO</option>
                  {filteredPOs.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.poNo}</option>
                  ))}
                </SearchableSelect>
              </div>
            </div>
          </div>

          {/* Reference Documents */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <h3 className="font-semibold text-slate-800">Reference Documents</h3>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">DO No</label>
                <input
                  type="text"
                  value={doNo}
                  onChange={(e) => setDoNo(e.target.value)}
                  disabled={isReadonly}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">DO Date</label>
                <input
                  type="date"
                  value={doDate}
                  onChange={(e) => setDoDate(e.target.value)}
                  disabled={isReadonly}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Invoice No</label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  disabled={isReadonly}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={isReadonly}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between rounded-t-xl">
              <h3 className="font-semibold text-slate-800">Received Items</h3>
            </div>
            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Select a PO to populate items.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Purchased Qty</th>
                      <th className="px-4 py-3 text-right">Received Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {item.poItem?.description || item.poItem?.material || `Item ${index + 1}`}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                          {Number(item.poItem?.quantity || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <input
                              type="number"
                              min="0"
                              max={Number(item.poItem?.quantity || 0)}
                              value={item.receiveQty}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[index].receiveQty = Number(e.target.value);
                                setItems(newItems);
                              }}
                              disabled={isReadonly}
                              className="w-24 px-2 py-1 text-right text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* PO Details Pane */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <h3 className="font-semibold text-slate-800">PO Summary</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">WO No</p>
                <p className="text-sm font-medium text-slate-900">{selectedPO?.workOrderNo || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Currency</p>
                <p className="text-sm font-medium text-slate-900">
                  {prereq?.currencies?.find((c: any) => c.id === currencyId)?.code || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Exchange Rate</p>
                <p className="text-sm font-medium text-slate-900">{exchangeRate}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tax Type</p>
                <p className="text-sm font-medium text-slate-900">
                  {prereq?.taxes?.find((t: any) => t.id === taxTypeId)?.taxType || "—"} ({taxRate}%)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <h3 className="font-semibold text-slate-800">Other Details</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Creator</label>
                <SearchableSelect
                  value={creatorId}
                  onChange={(e) => setCreatorId(e.target.value)}
                  disabled={isReadonly}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                >
                  <option value="">Select Creator</option>
                  {prereq?.employees?.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </SearchableSelect>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Remark</label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={3}
                  disabled={isReadonly}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 resize-none"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
