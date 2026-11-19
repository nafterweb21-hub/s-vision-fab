"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  PackageX,
  PackageCheck,
  Save,
  ArrowLeft,
  Loader2,
  Send,
  Ban,
  AlertCircle,
  Lock,
  FileText,
  ClipboardList,
  StickyNote,
  Building2,
  CalendarDays,
  Coins,
} from "lucide-react";
import {
  Card,
  EmptyState,
  Field,
  MetaChip,
  StatusBadge,
  buttonClass,
  inputClass,
  inputSmClass,
  selectTriggerClass,
  textareaClass,
  type Tone,
} from "@/components/form-ui";
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

  // Per GR line: what other Submitted returns have already sent back. This
  // return's own qty is excluded so editing a draft doesn't count against itself.
  const returnedElsewhere = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const gr of prereq?.goodsReceives || []) {
      for (const gi of gr.items || []) {
        const qty = (gi.goodsReturnItems || [])
          .filter((r: any) => r.goodsReturnId !== id)
          .reduce((s: number, r: any) => s + Number(r.returnQty || 0), 0);
        map.set(gi.id, qty);
      }
    }
    return map;
  }, [prereq, id]);

  /** Received on this GR line minus what other submitted returns already took back. */
  function leftToReturn(item: any): number {
    const receiveQty = Number(item.grItem?.receiveQty || 0);
    return Math.max(0, receiveQty - (returnedElsewhere.get(item.goodsReceiveItemId) ?? 0));
  }

  function updateItemReturnQty(index: number, qty: number) {
    const newItems = [...items];
    const item = newItems[index];
    const grItem = item.grItem;
    const poItem = grItem?.purchaseOrderItem;
    const unitPrice = Number(poItem?.unitPrice || 0);
    const conversion = Number(poItem?.conversion || 1);
    const maxQty = leftToReturn(item);
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
      // A draft saved earlier can go over if another return was submitted since.
      const overLine = items.find((i) => Number(i.returnQty) > leftToReturn(i) + 0.005);
      if (overLine) {
        const po = overLine.grItem?.purchaseOrderItem;
        throw new Error(
          `${po?.material || po?.description || "A line"}: returning ${Number(overLine.returnQty)} but only ${leftToReturn(overLine)} is left to return.`,
        );
      }

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
      <div className="flex flex-col items-center justify-center gap-2 p-12">
        <Loader2 size={20} className="animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500">Loading…</p>
      </div>
    );
  }

  // ---- Display-only derived values ----
  const status = isNew ? "Draft" : existing?.status || "Draft";
  const supplierName = prereq?.suppliers?.find((s: any) => s.id === supplierId)?.supplierName || existing?.supplier?.supplierName || "";
  const grNo = selectedGR?.grNo || existing?.goodsReceive?.grNo || "";
  const poNo =
    filteredPOs.find((p: any) => p.id === purchaseOrderId)?.poNo || selectedGR?.purchaseOrder?.poNo || existing?.purchaseOrder?.poNo || "";
  const currencyCode = prereq?.currencies?.find((c: any) => c.id === currencyId)?.code || "";
  const taxName = prereq?.taxes?.find((t: any) => t.id === taxTypeId)?.taxType || "";
  const totalReturnQty = items.reduce((sum, i) => sum + (Number(i.returnQty) || 0), 0);
  const linesReturning = items.filter((i) => Number(i.returnQty) > 0).length;

  function setLineRemark(index: number, value: string) {
    setItems((cur) => cur.map((it, i) => (i === index ? { ...it, remark: value } : it)));
  }

  return (
    <div className="w-full space-y-4">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-rose-500 via-rose-500 to-pink-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/purchasing/goods-return" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Goods Return
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {isNew || !existing?.rtnNo ? (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">New Goods Return</h1>
              ) : (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">RTN</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">{existing.rtnNo}</span>
                </h1>
              )}
              <StatusBadge status={status} tone={RTN_TONE[status] ?? "slate"} size="md" label={isNew ? "New · Draft" : status} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Supplier">{supplierName || "No supplier yet"}</MetaChip>
              <MetaChip icon={CalendarDays} label="RTN" title="Return date">{fmtDate(rtnDate)}</MetaChip>
              <MetaChip icon={ClipboardList} label="PO" title="Purchase order">{poNo || "Not selected"}</MetaChip>
              <MetaChip icon={PackageCheck} label="GR" title="Goods receive">{grNo || "Not selected"}</MetaChip>
              {currencyCode && (
                <MetaChip icon={Coins} title="Currency and exchange rate">
                  {currencyCode} @ {exchangeRate}
                </MetaChip>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => router.push("/dashboard/purchasing/goods-return")} className={buttonClass("ghost", "md")}>
              Back
            </button>
            {isReadonly && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            )}
            {!isNew && existing?.status === "Draft" && (
              <button type="button" onClick={handleVoid} disabled={saving} className={buttonClass("danger", "md")}>
                <Ban size={14} /> Void
              </button>
            )}
            {!isReadonly && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className={buttonClass(isNew ? "primary" : "secondary", "md")}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Draft
              </button>
            )}
            {!isNew && existing?.status === "Draft" && (
              <button type="button" onClick={handleSubmit} disabled={saving} className={buttonClass("primary", "md")}>
                <Send size={14} /> Submit
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          {errorMsg}
        </div>
      )}
      {isReadonly && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
          <Lock size={14} className="shrink-0 text-slate-400" />
          <span>
            This goods return is <strong className="font-semibold text-slate-800">{existing?.status}</strong> — read-only.
          </span>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card icon={FileText} tone="rose" title="Return details" description="Supplier, then the PO and the submitted GR to return against" className="h-full">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Company" required className="sm:col-span-2">
              <SearchableSelect
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={isReadonly}
                className={selectTriggerClass}
              >
                <option value="">Select Company</option>
                {prereq?.companies?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </SearchableSelect>
            </Field>

            <Field label="RTN Date" required>
              <input
                type="date"
                value={rtnDate}
                onChange={(e) => setRtnDate(e.target.value)}
                disabled={isReadonly}
                className={inputClass}
              />
            </Field>

            <Field label="Supplier" required>
              <SearchableSelect
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setPurchaseOrderId("");
                  setGoodsReceiveId("");
                  setItems([]);
                }}
                disabled={isReadonly}
                className={selectTriggerClass}
              >
                <option value="">Select Supplier</option>
                {prereq?.suppliers?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.supplierName}</option>
                ))}
              </SearchableSelect>
            </Field>

            <Field label="PO No" required>
              {!isNew ? (
                <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 font-mono text-[13px] text-slate-600">
                  {poNo || "—"}
                </div>
              ) : (
                <SearchableSelect
                  value={purchaseOrderId}
                  onChange={(e) => {
                    setPurchaseOrderId(e.target.value);
                    setGoodsReceiveId("");
                    setItems([]);
                  }}
                  disabled={isReadonly || !supplierId}
                  className={selectTriggerClass}
                >
                  <option value="">Select PO</option>
                  {filteredPOs.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.poNo}</option>
                  ))}
                </SearchableSelect>
              )}
            </Field>

            <Field label="GR No" required>
              {!isNew ? (
                <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 font-mono text-[13px] text-slate-600">
                  {grNo || "—"}
                </div>
              ) : (
                <SearchableSelect
                  value={goodsReceiveId}
                  onChange={(e) => {
                    setGoodsReceiveId(e.target.value);
                    setItems([]);
                  }}
                  disabled={isReadonly || !purchaseOrderId}
                  className={selectTriggerClass}
                >
                  <option value="">Select GR</option>
                  {filteredGRsByPO.map((gr: any) => (
                    <option key={gr.id} value={gr.id}>{gr.grNo}</option>
                  ))}
                </SearchableSelect>
              )}
            </Field>
          </div>
        </Card>

        <Card icon={StickyNote} tone="slate" title="Other details" description="Who raised the return, and why" className="h-full">
          <div className="space-y-3">
            <Field label="Creator" required>
              <SearchableSelect
                value={creatorId}
                onChange={(e) => setCreatorId(e.target.value)}
                disabled={isReadonly}
                className={selectTriggerClass}
              >
                <option value="">Select Creator</option>
                {prereq?.employees?.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </SearchableSelect>
            </Field>
            <Field label="Remark">
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={2}
                disabled={isReadonly}
                className={textareaClass}
                placeholder="Reason for the return…"
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Items */}
      <Card
        icon={PackageX}
        tone="rose"
        title={
          <span className="inline-flex items-center gap-1.5">
            Return Items
            {items.length > 0 && (
              <span className="rounded-full bg-rose-50 px-1.5 text-[11px] font-semibold tabular-nums text-rose-700 ring-1 ring-inset ring-rose-600/15">
                {items.length}
              </span>
            )}
          </span>
        }
        description="Return quantity per received line; it can't exceed what is left after earlier returns"
        bodyClassName={items.length === 0 ? "p-4" : "p-0"}
      >
        {items.length === 0 ? (
          <EmptyState
            boxed
            icon={PackageX}
            tone="rose"
            title="No lines yet"
            description="Select a submitted GR to load the lines that were received."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-8 py-2 pl-3 pr-1 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">Item</th>
                  <th className="px-2 py-2 font-medium">UOM</th>
                  <th className="px-2 py-2 text-right font-medium">Received</th>
                  <th className="px-2 py-2 text-right font-medium">Left to Return</th>
                  <th className="px-2 py-2 text-right font-medium">Unit Price</th>
                  <th className="w-28 px-2 py-2 text-right font-medium">Return Qty</th>
                  <th className="px-2 py-2 text-right font-medium">Amount</th>
                  <th className="px-2 py-2 text-right font-medium">Internal Qty</th>
                  <th className="w-48 px-3 py-2 font-medium">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const grItem = item.grItem;
                  const poItem = grItem?.purchaseOrderItem;
                  const receiveQty = Number(grItem?.receiveQty || 0);
                  const unitPrice = Number(poItem?.unitPrice || 0);
                  const material = poItem?.material;
                  const description = poItem?.description;
                  const left = leftToReturn(item);
                  const over = Number(item.returnQty) > left + 0.005;
                  const returning = Number(item.returnQty) > 0;
                  return (
                    <tr key={index} className="align-top transition-colors hover:bg-slate-50/60 focus-within:bg-indigo-50/30">
                      <td className="py-2 pl-3 pr-1">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
                            returning ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="max-w-[260px] px-2 py-2">
                        <p className="truncate font-medium text-slate-800" title={material || description}>
                          {material || description || `Item ${index + 1}`}
                        </p>
                        {material && description && (
                          <p className="truncate text-xs text-slate-500" title={description}>{description}</p>
                        )}
                      </td>
                      <td className="px-2 py-2 text-slate-600">{poItem?.poUom?.uomName || "—"}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">{receiveQty}</td>
                      <td className={`px-2 py-2 text-right tabular-nums ${left < receiveQty ? "font-medium text-amber-600" : "text-slate-600"}`}>
                        {left}
                        {left < receiveQty && (
                          <p className="text-[11px] font-normal text-slate-400">{+(receiveQty - left).toFixed(4)} already returned</p>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">{unitPrice.toFixed(4)}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          max={left}
                          step="any"
                          value={item.returnQty}
                          onChange={(e) => updateItemReturnQty(index, Number(e.target.value))}
                          disabled={isReadonly || (left <= 0 && !Number(item.returnQty))}
                          aria-invalid={over}
                          className={`${inputSmClass} text-right tabular-nums ${over ? "border-rose-400 bg-rose-50" : ""}`}
                        />
                        {over && <p className="mt-0.5 text-[11px] text-rose-600">Only {left} left to return</p>}
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold tabular-nums ${returning ? "text-slate-900" : "text-slate-300"}`}>
                        {Number(item.amount).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                        {Number(item.internalQty).toFixed(4)}
                        {poItem?.internalUom?.uomName && (
                          <span className="ml-1 text-[11px] text-slate-400">{poItem.internalUom.uomName}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={item.remark || ""}
                          onChange={(e) => setLineRemark(index, e.target.value)}
                          disabled={isReadonly}
                          className={inputSmClass}
                          placeholder="Reason"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50/70 text-[13px]">
                <tr>
                  <td colSpan={6} className="py-2 pl-3 pr-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {linesReturning} of {items.length} line{items.length === 1 ? "" : "s"} returning
                  </td>
                  <td className="px-3.5 py-2 text-right font-semibold tabular-nums text-slate-900">{fmtQty(totalReturnQty)}</td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-slate-900">{totalAmount.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-2">
        <Card icon={ClipboardList} tone="violet" title="Goods receive" description="Currency and tax are taken from the GR">
          <dl className="space-y-2 text-[13px]">
            <SummaryRow label="GR No" value={grNo} mono />
            <SummaryRow label="PO No" value={poNo} mono />
            <SummaryRow label="Currency" value={currencyCode ? `${currencyCode} @ ${exchangeRate}` : ""} />
            <SummaryRow label="Tax" value={taxName ? `${taxName} (${taxRate}%)` : taxRate ? `${taxRate}%` : ""} />
          </dl>
        </Card>

        {/* Return summary — dark anchor, same as the PO form */}
        <section className="overflow-hidden rounded-xl bg-[#111827] text-slate-300 shadow-lg shadow-slate-900/10 ring-1 ring-white/5">
          <header className="flex items-center gap-2.5 border-b border-white/10 px-4 py-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-400/20">
              <PackageX size={15} />
            </span>
            <div>
              <h2 className="text-[13px] font-semibold leading-tight text-white">Summary</h2>
              <p className="text-[11px] leading-tight text-slate-400">Live totals for this return</p>
            </div>
          </header>
          <dl className="space-y-2 px-4 py-3 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Lines returning</dt>
              <dd className="tabular-nums text-slate-200">{linesReturning}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Total return qty</dt>
              <dd className="tabular-nums text-slate-200">{fmtQty(totalReturnQty)}</dd>
            </div>
          </dl>
          <div className="relative border-t border-white/10 bg-white/[0.03] px-4 py-3">
            <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-gradient-to-b from-rose-400 to-pink-500" />
            <p className="text-[11px] font-medium uppercase tracking-wide text-rose-300">Return Amount (before tax)</p>
            <p className="mt-0.5 flex items-baseline gap-1.5">
              {currencyCode && <span className="text-xs font-medium text-rose-300">{currencyCode}</span>}
              <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">{totalAmount.toFixed(2)}</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── small helpers ────────────────────────────────────────────────────────────

/** Submitted is the final state of a return, so it reads as done (green). */
const RTN_TONE: Record<string, Tone> = { Draft: "amber", Submitted: "emerald", Void: "rose" };

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`truncate text-right font-medium text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

const fmtQty = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });
