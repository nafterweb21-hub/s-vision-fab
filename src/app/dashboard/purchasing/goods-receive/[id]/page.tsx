"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  PackageCheck,
  Save,
  ArrowLeft,
  Loader2,
  Send,
  AlertCircle,
  Lock,
  FileText,
  Receipt,
  ClipboardList,
  StickyNote,
  Building2,
  CalendarDays,
  Wrench,
  Coins,
  Package,
} from "lucide-react";
import {
  Badge,
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
import { poReceiveLabel, poReceiveTone } from "../../purchase-order/po-status";
import {
  getGoodsReceiveFormData,
  getPoLineBalances,
  createGoodsReceive,
  updateGoodsReceive,
  submitGoodsReceive,
} from "../actions";

/** Submitted is the final state of a GR, so it reads as done (green). */
const GR_TONE: Record<string, Tone> = { Draft: "amber", Submitted: "emerald", Void: "rose" };

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
  const [balances, setBalances] = useState<Record<string, { ordered: number; received: number; inDraft: number; open: number }>>({});

  useEffect(() => {
    if (!purchaseOrderId) {
      setBalances({});
      return;
    }
    let cancelled = false;
    getPoLineBalances(purchaseOrderId, isNew ? undefined : id)
      .then((b) => { if (!cancelled) setBalances(b); })
      .catch(() => { if (!cancelled) setBalances({}); });
    return () => { cancelled = true; };
  }, [purchaseOrderId, isNew, id]);

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
      <div className="flex flex-col items-center justify-center gap-2 p-12">
        <Loader2 size={20} className="animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500">Loading…</p>
      </div>
    );
  }

  // ---- Display-only derived values ----
  const status = isNew ? "Draft" : existing?.status || "Draft";
  const supplierName = prereq?.suppliers?.find((s: any) => s.id === supplierId)?.supplierName || "";
  const poNo = selectedPO?.poNo || existing?.purchaseOrder?.poNo || "";
  const workOrderNo = selectedPO?.workOrderNo || existing?.purchaseOrder?.workOrderNo || "";
  const poReceiveStatus = selectedPO?.receiveStatus || existing?.purchaseOrder?.receiveStatus || "";
  const currencyCode = prereq?.currencies?.find((c: any) => c.id === currencyId)?.code || "";
  const taxName = prereq?.taxes?.find((t: any) => t.id === taxTypeId)?.taxType || "";
  const totalReceiving = items.reduce((sum, i) => sum + (Number(i.receiveQty) || 0), 0);
  const linesReceiving = items.filter((i) => Number(i.receiveQty) > 0).length;
  const overLines = items.filter((i) => {
    const bal = balances[i.purchaseOrderItemId];
    return bal && Number(i.receiveQty) > bal.open;
  }).length;

  function setReceiveQty(index: number, value: string) {
    setItems((cur) => cur.map((it, i) => (i === index ? { ...it, receiveQty: Number(value) } : it)));
  }

  function receiveAllOpen() {
    setItems((cur) =>
      cur.map((it) => {
        const bal = balances[it.purchaseOrderItemId];
        return bal ? { ...it, receiveQty: bal.open } : it;
      }),
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/purchasing/goods-receive" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Goods Receive
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {isNew || !existing?.grNo ? (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">New Goods Receive</h1>
              ) : (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">GR</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">{existing.grNo}</span>
                </h1>
              )}
              <StatusBadge status={status} tone={GR_TONE[status] ?? "slate"} size="md" label={isNew ? "New · Draft" : status} />
              {poReceiveStatus && (
                <Badge tone={poReceiveTone(poReceiveStatus)} icon={PackageCheck} size="md">
                  PO {poReceiveLabel(poReceiveStatus).toLowerCase()}
                </Badge>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Supplier">{supplierName || "No supplier yet"}</MetaChip>
              <MetaChip icon={CalendarDays} label="GR" title="GR date">{fmtDate(date)}</MetaChip>
              <MetaChip icon={ClipboardList} label="PO" title="Purchase order">{poNo || "Not selected"}</MetaChip>
              {workOrderNo && <MetaChip icon={Wrench} label="WO" title="Work order">{workOrderNo}</MetaChip>}
              {currencyCode && (
                <MetaChip icon={Coins} title="Currency and exchange rate">
                  {currencyCode} @ {exchangeRate}
                </MetaChip>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => router.push("/dashboard/purchasing/goods-receive")} className={buttonClass("ghost", "md")}>
              Back
            </button>
            {isReadonly && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
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
            This goods receive is <strong className="font-semibold text-slate-800">{existing?.status}</strong> — read-only.
          </span>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card icon={FileText} tone="indigo" title="Receipt details" description="Pick the supplier and an Issued purchase order" className="h-full">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
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

            <Field label="Supplier" required>
              <SearchableSelect
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setPurchaseOrderId("");
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

            <Field label="GR Date" required>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isReadonly}
                className={inputClass}
              />
            </Field>

            <Field
              label="PO No"
              required
              className="sm:col-span-2"
              help={isNew ? "Only Issued purchase orders are listed; the lines fill from the PO." : undefined}
            >
              {!isNew && !selectedPO && poNo ? (
                <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 font-mono text-[13px] text-slate-600">
                  {poNo}
                </div>
              ) : (
                <SearchableSelect
                  value={purchaseOrderId}
                  onChange={(e) => setPurchaseOrderId(e.target.value)}
                  disabled={isReadonly || !isNew}
                  className={selectTriggerClass}
                >
                  <option value="">Select PO</option>
                  {filteredPOs.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.poNo}</option>
                  ))}
                </SearchableSelect>
              )}
            </Field>
          </div>
        </Card>

        <Card icon={Receipt} tone="sky" title="Supplier documents" description="Delivery order and invoice that came with the goods" className="h-full">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <Field label="DO No">
              <input
                type="text"
                value={doNo}
                onChange={(e) => setDoNo(e.target.value)}
                disabled={isReadonly}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="DO Date">
              <input
                type="date"
                value={doDate}
                onChange={(e) => setDoDate(e.target.value)}
                disabled={isReadonly}
                className={inputClass}
              />
            </Field>
            <Field label="Invoice No">
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                disabled={isReadonly}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Invoice Date">
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                disabled={isReadonly}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Items */}
      <Card
        icon={Package}
        tone="amber"
        title={
          <span className="inline-flex items-center gap-1.5">
            Received Items
            {items.length > 0 && (
              <span className="rounded-full bg-amber-50 px-1.5 text-[11px] font-semibold tabular-nums text-amber-700 ring-1 ring-inset ring-amber-600/15">
                {items.length}
              </span>
            )}
          </span>
        }
        description="Receive quantity per PO line; it can't exceed the open balance"
        actions={
          !isReadonly && items.length > 0 && Object.keys(balances).length > 0 ? (
            <button type="button" onClick={receiveAllOpen} className={buttonClass("link", "sm")}>
              <PackageCheck size={14} /> Receive all open
            </button>
          ) : undefined
        }
        bodyClassName={items.length === 0 ? "p-4" : "p-0"}
      >
        {items.length === 0 ? (
          <EmptyState
            boxed
            icon={Package}
            tone="amber"
            title="No lines yet"
            description="Select an Issued purchase order to load its lines."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-8 py-2 pl-3 pr-1 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">Item</th>
                  <th className="px-2 py-2 font-medium">UOM</th>
                  <th className="px-2 py-2 text-right font-medium">Ordered</th>
                  <th className="px-2 py-2 text-right font-medium">Prev. Received</th>
                  <th className="w-32 px-2 py-2 text-right font-medium">Receive Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Balance after</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const bal = balances[item.purchaseOrderItemId];
                  // Balance left after this GR's quantity is received.
                  const remaining = bal ? Math.round((bal.open - (Number(item.receiveQty) || 0)) * 100) / 100 : 0;
                  const over = !!bal && remaining < 0;
                  const material = item.poItem?.material;
                  const description = item.poItem?.description;
                  return (
                    <tr key={index} className="align-top transition-colors hover:bg-slate-50/60 focus-within:bg-indigo-50/30">
                      <td className="py-2 pl-3 pr-1">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-semibold tabular-nums text-white">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <p className="font-medium text-slate-800">{material || description || `Item ${index + 1}`}</p>
                        {material && description && <p className="text-xs text-slate-500">{description}</p>}
                      </td>
                      <td className="px-2 py-2 text-slate-600">{item.poItem?.poUom?.uomName || "—"}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">{Number(item.poItem?.quantity || 0)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                        {bal ? bal.received : "—"}
                        {bal && bal.inDraft > 0 && (
                          <span className="block text-[11px] font-medium text-amber-600" title="Held by other Draft GRs on this PO">
                            +{bal.inDraft} in draft
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          max={bal ? bal.open : Number(item.poItem?.quantity || 0)}
                          value={item.receiveQty}
                          onChange={(e) => setReceiveQty(index, e.target.value)}
                          disabled={isReadonly}
                          aria-invalid={over}
                          className={`${inputSmClass} text-right tabular-nums ${over ? "border-rose-400 bg-rose-50" : ""}`}
                        />
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-semibold tabular-nums ${
                          !bal ? "text-slate-400" : over ? "text-rose-600" : remaining === 0 ? "text-emerald-600" : "text-slate-800"
                        }`}
                      >
                        {bal ? remaining : "—"}
                        {over && <span className="block text-[11px] font-medium">Over open balance</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50/70 text-[13px]">
                <tr>
                  <td colSpan={5} className="py-2 pl-3 pr-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {linesReceiving} of {items.length} line{items.length === 1 ? "" : "s"} receiving
                  </td>
                  <td className="px-3.5 py-2 text-right font-semibold tabular-nums text-slate-900">{fmtQty(totalReceiving)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card icon={ClipboardList} tone="violet" title="Purchase order" description="Taken from the selected PO">
          <dl className="space-y-2 text-[13px]">
            <SummaryRow label="PO No" value={poNo} mono />
            <SummaryRow label="Work Order" value={workOrderNo} mono />
            <SummaryRow label="Currency" value={currencyCode ? `${currencyCode} @ ${exchangeRate}` : ""} />
            <SummaryRow label="Tax" value={taxName ? `${taxName} (${taxRate}%)` : taxRate ? `${taxRate}%` : ""} />
            {poReceiveStatus && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Receive status</dt>
                <dd>
                  <Badge tone={poReceiveTone(poReceiveStatus)} dot>{poReceiveLabel(poReceiveStatus)}</Badge>
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card icon={StickyNote} tone="slate" title="Other details" description="Who received it, and any notes">
          <div className="space-y-3">
            <Field label="Creator">
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
                rows={3}
                disabled={isReadonly}
                className={textareaClass}
              />
            </Field>
          </div>
        </Card>

        {/* Receipt summary — dark anchor, same as the PO form */}
        <section className="overflow-hidden rounded-xl bg-[#111827] text-slate-300 shadow-lg shadow-slate-900/10 ring-1 ring-white/5">
          <header className="flex items-center gap-2.5 border-b border-white/10 px-4 py-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/20">
              <PackageCheck size={15} />
            </span>
            <div>
              <h2 className="text-[13px] font-semibold leading-tight text-white">Summary</h2>
              <p className="text-[11px] leading-tight text-slate-400">Live totals for this receipt</p>
            </div>
          </header>
          <dl className="space-y-2 px-4 py-3 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">PO lines</dt>
              <dd className="tabular-nums text-slate-200">{items.length}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Lines receiving</dt>
              <dd className="tabular-nums text-slate-200">{linesReceiving}</dd>
            </div>
            {overLines > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-rose-300">Over open balance</dt>
                <dd className="tabular-nums text-rose-300">{overLines}</dd>
              </div>
            )}
          </dl>
          <div className="relative border-t border-white/10 bg-white/[0.03] px-4 py-3">
            <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-gradient-to-b from-indigo-400 to-violet-500" />
            <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-300">Total Receive Qty</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-white">{fmtQty(totalReceiving)}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

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
