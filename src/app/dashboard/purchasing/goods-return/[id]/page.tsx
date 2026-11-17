"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  PackageX,
  Save,
  ArrowLeft,
  Loader2,
  Send,
  Ban,
  AlertCircle,
} from "lucide-react";
import { getGoodsReturnFormData, submitGoodsReturn, voidGoodsReturn } from "../actions";
export default function GoodsReturnFormPage() {
  const params = useParams();
  const id = params?.id as string;

  const router = useRouter();
  const isNew = id === "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [prereq, setPrereq] = useState<any>(null);
  const [existing, setExisting] = useState<any>(null);

  // Header form state
  const [rtnDate, setRtnDate] = useState(new Date().toISOString().slice(0, 10));
  const [companyId, setCompanyId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [goodsReceiveId, setGoodsReceiveId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [taxTypeId, setTaxTypeId] = useState("");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [remark, setRemark] = useState("");
  const [creatorId, setCreatorId] = useState("");

  // Return items state
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const data = await getGoodsReturnFormData();
        setPrereq(data);

        if (isNew && data.employees?.length > 0) {
          setCreatorId(data.employees[0].id);
        }

        if (!isNew) {
          const res = await fetch(`/api/purchasing/goods-return/${id}`);
          if (!res.ok) throw new Error("Failed to fetch Goods Return details");
          const rtn = await res.json();
          setExisting(rtn);

          setRtnDate(new Date(rtn.rtnDate).toISOString().slice(0, 10));
          setCompanyId(rtn.companyId);
          setSupplierId(rtn.supplierId);
          setPurchaseOrderId(rtn.purchaseOrderId);
          setGoodsReceiveId(rtn.goodsReceiveId);
          setCurrencyId(rtn.currencyId);
          setExchangeRate(Number(rtn.exchangeRate) || 1);
          setTaxTypeId(rtn.taxTypeId || "");
          setTaxRate(Number(rtn.taxRate) || 0);
          setRemark(rtn.remark || "");
          setCreatorId(rtn.creatorId);

          if (rtn.items) {
            setItems(
              rtn.items.map((i: any) => ({
                id: i.id,
                goodsReceiveItemId: i.goodsReceiveItemId,
                returnQty: Number(i.returnQty),
                amount: Number(i.amount),
                internalQty: Number(i.internalQty),
                remark: i.remark || "",
                grItem: i.goodsReceiveItem,
              }))
            );
          }
        }
      } catch (e: any) {
        setErrorMsg(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isNew, id]);

  // --- Cascading dropdown logic ---
  const filteredGRsBySupplier =
    prereq?.goodsReceives?.filter((gr: any) => gr.supplierId === supplierId) || [];

  const filteredGRsByPO =
    purchaseOrderId
      ? filteredGRsBySupplier.filter((gr: any) => gr.purchaseOrderId === purchaseOrderId)
      : filteredGRsBySupplier;

  const filteredPOs = React.useMemo(() => {
    if (!prereq?.goodsReceives || !supplierId) return [];
    // Build unique PO list from prereq GRs that belong to this supplier
    const poMap = new Map<string, any>();
    filteredGRsBySupplier.forEach((gr: any) => {
      if (!poMap.has(gr.purchaseOrderId)) {
        poMap.set(gr.purchaseOrderId, gr.purchaseOrder);
      }
    });
    return Array.from(poMap.values());
  }, [prereq, supplierId, filteredGRsBySupplier]);

  const selectedGR = prereq?.goodsReceives?.find((gr: any) => gr.id === goodsReceiveId);

  // Auto-populate currency/tax from GR when GR is selected (new only)
  useEffect(() => {
    if (!id) return;
    if (isNew && selectedGR) {
      const cur = prereq?.currencies?.find((c: any) => c.id === selectedGR.currencyId);
      if (cur) {
        setCurrencyId(cur.id);
        setExchangeRate(Number(cur.exchangeRate) || 1);
      }
      setTaxTypeId(selectedGR.taxTypeId || "");
      setTaxRate(Number(selectedGR.taxRate) || 0);

      // Populate items from GR items
      if (selectedGR.items) {
        setItems(
          selectedGR.items.map((grItem: any) => ({
            id: null,
            goodsReceiveItemId: grItem.id,
            returnQty: 0,
            amount: 0,
            internalQty: 0,
            remark: "",
            grItem,
          }))
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goodsReceiveId, isNew]);

  function updateItemReturnQty(index: number, qty: number) {
    const newItems = [...items];
    const item = newItems[index];
    const grItem = item.grItem;
    const poItem = grItem?.purchaseOrderItem;
    const unitPrice = Number(poItem?.unitPrice || 0);
    const conversion = Number(poItem?.conversion || 1);
    const maxQty = Number(grItem?.receiveQty || 0);
    const safeQty = Math.min(Math.max(0, qty), maxQty);

    newItems[index] = {
      ...item,
      returnQty: safeQty,
      amount: +(safeQty * unitPrice).toFixed(4),
      internalQty: +(safeQty * conversion).toFixed(4),
    };
    setItems(newItems);
  }

  async function handleSaveDraft() {
    setSaving(true);
    setErrorMsg("");
    try {
      if (!companyId) throw new Error("Company is mandatory");
      if (!supplierId) throw new Error("Supplier is mandatory");
      if (!purchaseOrderId) throw new Error("PO No is mandatory");
      if (!goodsReceiveId) throw new Error("GR No is mandatory");
      if (!rtnDate) throw new Error("RTN Date is mandatory");
      if (!creatorId) throw new Error("Creator is mandatory");

      const payload = {
        rtnDate,
        companyId,
        supplierId,
        purchaseOrderId,
        goodsReceiveId,
        currencyId,
        exchangeRate,
        taxTypeId,
        taxRate,
        remark,
        creatorId,
        items: items.map((i) => ({
          id: i.id,
          goodsReceiveItemId: i.goodsReceiveItemId,
          returnQty: Number(i.returnQty),
          amount: Number(i.amount),
          internalQty: Number(i.internalQty),
          remark: i.remark || null,
        })),
      };

      if (isNew) {
        const res = await fetch("/api/purchasing/goods-return", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create Goods Return");
        router.push(`/dashboard/saved?module=Goods Return&id=${data.rtnNo || data.id || ''}&viewUrl=/dashboard/purchasing/goods-return/${data.id}&backUrl=/dashboard/purchasing/goods-return`);
      } else {
        const res = await fetch(`/api/purchasing/goods-return/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update Goods Return");
        router.push(`/dashboard/saved?module=Goods Return&id=${existing?.rtnNo || id}&viewUrl=/dashboard/purchasing/goods-return/${id}&backUrl=/dashboard/purchasing/goods-return`);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (isNew) return hotToast.error("Please save draft first before submitting.");
    if (!await customConfirm("Submit this Goods Return?")) return;
    setSaving(true);
    try {
      const res = await submitGoodsReturn(id);
      if (!res.success) throw new Error(res.error);
      router.push(`/dashboard/saved?module=Goods Return (Submitted)&id=${existing?.rtnNo || id}&viewUrl=/dashboard/purchasing/goods-return/${id}&backUrl=/dashboard/purchasing/goods-return`);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid() {
    if (!await customConfirm("Void this Goods Return?")) return;
    setSaving(true);
    try {
      const res = await voidGoodsReturn(id);
      if (!res.success) throw new Error(res.error);
      router.push(`/dashboard/purchasing/goods-return?toast=updated`);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  const isReadonly = !isNew && existing?.status !== "Draft";
  const totalAmount = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="py-3 space-y-4 w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/purchasing/goods-return"
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
              <PackageX size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isNew ? "New Goods Return" : `Goods Return – ${existing?.rtnNo}`}
              </h1>
              {!isNew && (
                <p className="text-sm text-slate-500 mt-0.5">
                  Status: <StatusPill status={existing?.status} />
                </p>
              )}
            </div>
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
            <>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Submit
              </button>
              <button
                onClick={handleVoid}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                <Ban className="w-4 h-4" /> Void
              </button>
            </>
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
        {/* Left: Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <FormCard title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FieldGroup label="Company *">
                <SearchableSelect
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  disabled={isReadonly}
                  className={selectCls(isReadonly)}
                >
                  <option value="">Select Company</option>
                  {prereq?.companies?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </SearchableSelect>
              </FieldGroup>

              <FieldGroup label="RTN Date *">
                <input
                  type="date"
                  value={rtnDate}
                  onChange={(e) => setRtnDate(e.target.value)}
                  disabled={isReadonly}
                  className={inputCls(isReadonly)}
                />
              </FieldGroup>

              <FieldGroup label="Supplier *">
                <SearchableSelect
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    setPurchaseOrderId("");
                    setGoodsReceiveId("");
                    setItems([]);
                  }}
                  disabled={isReadonly}
                  className={selectCls(isReadonly)}
                >
                  <option value="">Select Supplier</option>
                  {prereq?.suppliers?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.supplierName}</option>
                  ))}
                </SearchableSelect>
              </FieldGroup>

              <FieldGroup label="PO No *">
                <SearchableSelect
                  value={purchaseOrderId}
                  onChange={(e) => {
                    setPurchaseOrderId(e.target.value);
                    setGoodsReceiveId("");
                    setItems([]);
                  }}
                  disabled={isReadonly || !supplierId || !isNew}
                  className={selectCls(isReadonly || !supplierId || !isNew)}
                >
                  <option value="">Select PO</option>
                  {filteredPOs.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.poNo}</option>
                  ))}
                </SearchableSelect>
              </FieldGroup>

              <FieldGroup label="GR No *">
                <SearchableSelect
                  value={goodsReceiveId}
                  onChange={(e) => {
                    setGoodsReceiveId(e.target.value);
                    setItems([]);
                  }}
                  disabled={isReadonly || !purchaseOrderId || !isNew}
                  className={selectCls(isReadonly || !purchaseOrderId || !isNew)}
                >
                  <option value="">Select GR</option>
                  {filteredGRsByPO.map((gr: any) => (
                    <option key={gr.id} value={gr.id}>{gr.grNo}</option>
                  ))}
                </SearchableSelect>
              </FieldGroup>
            </div>
          </FormCard>

          {/* Return Items */}
          <FormCard title="Return Items">
            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Select a GR No to populate items.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3">Material</th>
                      <th className="px-3 py-3">Description</th>
                      <th className="px-3 py-3 text-right">Recv Qty</th>
                      <th className="px-3 py-3">UOM</th>
                      <th className="px-3 py-3 text-right">Unit Price</th>
                      <th className="px-3 py-3 text-right w-32">Return Qty</th>
                      <th className="px-3 py-3 text-right">Amount</th>
                      <th className="px-3 py-3 text-right">Internal Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => {
                      const grItem = item.grItem;
                      const poItem = grItem?.purchaseOrderItem;
                      const receiveQty = Number(grItem?.receiveQty || 0);
                      const unitPrice = Number(poItem?.unitPrice || 0);
                      const uom = poItem?.poUom?.uomName || "—";
                      const material = poItem?.material || "—";
                      const description = poItem?.description || `Item ${index + 1}`;

                      return (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="px-3 py-3 text-slate-700 font-medium">{material}</td>
                          <td className="px-3 py-3 text-slate-600 max-w-[180px] truncate" title={description}>{description}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-600">{receiveQty}</td>
                          <td className="px-3 py-3 text-slate-500">{uom}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-600">{unitPrice.toFixed(4)}</td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min={0}
                              max={receiveQty}
                              step="any"
                              value={item.returnQty}
                              onChange={(e) => updateItemReturnQty(index, Number(e.target.value))}
                              disabled={isReadonly}
                              className={`w-28 px-2 py-1 text-right text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isReadonly ? "bg-slate-100 border-slate-200" : "border-slate-300"
                              } ${
                                Number(item.returnQty) > receiveQty
                                  ? "border-rose-400 bg-rose-50"
                                  : ""
                              }`}
                            />
                            {Number(item.returnQty) > receiveQty && (
                              <p className="text-xs text-rose-600 mt-1">Exceeds received qty</p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-700 font-medium">
                            {Number(item.amount).toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                            {Number(item.internalQty).toFixed(4)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-right text-sm font-semibold text-slate-700">
                        Total Amount:
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-bold text-slate-900">
                        {totalAmount.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </FormCard>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* GR Summary */}
          <FormCard title="GR Summary">
            <div className="space-y-4 text-sm">
              <SummaryRow label="GR No" value={selectedGR?.grNo || existing?.goodsReceive?.grNo || "—"} />
              <SummaryRow
                label="Currency"
                value={prereq?.currencies?.find((c: any) => c.id === currencyId)?.code || "—"}
              />
              <SummaryRow label="Exchange Rate" value={exchangeRate.toString()} />
              <SummaryRow
                label="Tax Type"
                value={`${prereq?.taxes?.find((t: any) => t.id === taxTypeId)?.taxType || "—"} (${taxRate}%)`}
              />
            </div>
          </FormCard>

          {/* Other Details */}
          <FormCard title="Other Details">
            <div className="space-y-4">
              <FieldGroup label="Creator *">
                <SearchableSelect
                  value={creatorId}
                  onChange={(e) => setCreatorId(e.target.value)}
                  disabled={isReadonly}
                  className={selectCls(isReadonly)}
                >
                  <option value="">Select Creator</option>
                  {prereq?.employees?.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </SearchableSelect>
              </FieldGroup>
              <FieldGroup label="Remark">
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={3}
                  disabled={isReadonly}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    isReadonly ? "bg-slate-100 border-slate-200" : "border-slate-300"
                  }`}
                />
              </FieldGroup>
            </div>
          </FormCard>
        </div>
      </div>
    </div>
  );
}

// ─── small helpers ────────────────────────────────────────────────────────────

const inputCls = (disabled: boolean) =>
  `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    disabled ? "bg-slate-100 border-slate-200 cursor-not-allowed" : "border-slate-300"
  }`;

const selectCls = (disabled: boolean) =>
  `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    disabled ? "bg-slate-100 border-slate-200 cursor-not-allowed" : "border-slate-300"
  }`;

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "Submitted"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "Draft"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "Void"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}
