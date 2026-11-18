/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";
import { hasDifferentShipTo } from "@/lib/invoice-ship-to";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Send,
  AlertCircle,
  Copy,
  Building2,
  CalendarDays,
  CalendarClock,
  FileMinus,
  Hash,
  Landmark,
  ListOrdered,
  Lock,
  MapPin,
  QrCode,
  Receipt,
  ShieldCheck,
  StickyNote,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Card,
  EmptyState,
  Field,
  MetaChip,
  StatusBadge,
  buttonClass,
  checkboxClass,
  iconButtonDangerClass,
  inputClass,
  inputSmClass,
  readOnlyClass,
  selectTriggerClass,
  selectTriggerSmClass,
  textareaClass,
  textareaSmClass,
} from "@/components/form-ui";
import { computeGstBreakup, gstLineTax, invoiceGrandTotal, invoiceGstContext, noteLineGstRate, roundTo2 } from "@/lib/gst";
import { invoiceReviseBlockReason, invoiceVoidBlockReason } from "../../invoice/inv-status";
import { getInvoiceFormData, getPendingDOs, getDOItemsForInvoice, getInvoice, createInvoice, updateInvoice, reviseInvoice, submitInvoice, voidInvoice } from "../credit-note.actions";
import { CN_PAYMENT_TONE, creditNotePaymentState, creditNoteStatusTone, einvoiceTone, normalizeCreditNoteStatus } from "../cn-status";

function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function CreditNoteFormPage() {
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
    invoiceType: "Credit Note",
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
             amount: Number(item.amount),
             unitPrice: Number(item.unitPrice),
             quantity: Number(item.quantity),
             taxRate: Number(item.taxRate || item.gstRate || 0),
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
      amountAfterTax: 0
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
      const totals = calculateTotals(prev.items);
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

  const calculateTotals = (items: any[], overrideRoundOff?: number) => {
    const customer = metadata.customers?.find((c: any) => c.id === formData.customerId);
    const company = metadata.companies?.find((c: any) => c.id === formData.companyId);
    const effectiveTaxRate = customer?.isSez ? (Number(company?.sezTaxRate) || 0) : 0;

    let amtBefore = 0;
    let totalTax = 0;

    items.forEach(item => {
        const amt = Number(item.amount) || 0;
        // The server's taxable per line is the 2-dp amount (computeGstBreakup).
        amtBefore += roundTo2(amt);
        
        let itemTaxRate = Number(item.taxRate) || 0;
        if (!itemTaxRate && item.taxTypeId && metadata.taxes?.length > 0) {
          const tax = metadata.taxes.find((t: any) => t.id === item.taxTypeId);
          if (tax) itemTaxRate = Number(tax.taxRate) || 0;
        }
        if (customer?.isSez) {
          itemTaxRate = effectiveTaxRate;
        }

        // Rounded per line exactly as the server stores it (gstLineTax, shared with computeGstBreakup).
        const tAmt = gstLineTax(amt, itemTaxRate);
        item.taxRate = itemTaxRate;
        item.taxAmount = tAmt;
        totalTax += tAmt;
    });

    amtBefore = roundTo2(amtBefore);
    totalTax = roundTo2(totalTax);

    const rOff = overrideRoundOff !== undefined ? overrideRoundOff : (Number(formData.roundOff) || 0);

    // Same grand-total rule the server stores (no currency roundingMode; see invoiceGrandTotal).
    const finalTotal = invoiceGrandTotal(amtBefore, totalTax, rOff);

    const avgTaxRate = totalTax > 0 && amtBefore > 0
      ? Math.round((totalTax / amtBefore) * 10000) / 100
      : (customer?.isSez ? effectiveTaxRate : 0);

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
    newItems[index][field] = value;
    
    if (field === "taxTypeId") {
       const tax = metadata.taxes?.find((t: any) => t.id === value);
       newItems[index].taxRate = tax ? Number(tax.taxRate) : 0;
    }

    if (field === "quantity" || field === "unitPrice") {
      newItems[index].amount = Number(newItems[index].quantity || 0) * Number(newItems[index].unitPrice || 0);
    }

    const totals = calculateTotals(newItems);
    setFormData((prev: any) => ({ ...prev, items: newItems, ...totals }));
  };

  const handleAddItem = () => {
    const defaultTax = metadata.taxes?.[0];
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
      taxTypeId: defaultTax?.id || "",
      taxRate: defaultTax ? Number(defaultTax.taxRate) : 0,
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

    const payload = { ...formData };
    if (!payload.taxTypeId && payload.items?.length > 0) {
      const itemWithTax = payload.items.find((i: any) => i.taxTypeId);
      if (itemWithTax) {
        payload.taxTypeId = itemWithTax.taxTypeId;
        payload.taxRate = itemWithTax.taxRate;
      }
    }
    payload.taxTypeId = payload.taxTypeId || null;

    setLoading(true);
    setErrorMsg("");
    try {
      if (isEdit) {
        const res = await updateInvoice(id!, payload);
        if (!res.success) throw new Error(res.error || "Failed to update credit note");
      } else {
        const res = await createInvoice(payload);
        if (!res.success) throw new Error(res.error || "Failed to create credit note");
      }
      router.push("/dashboard/sales/credit-note");
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
      router.push("/dashboard/sales/credit-note");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevise = async () => {
    if (!await customConfirm("Are you sure you want to create a new revision? This will mark the current credit note as 'Old Version'.")) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await reviseInvoice(id!, formData);
      if (!res.success || !res.data) throw new Error(res.error || "Failed to revise credit note");
      router.push(`/dashboard/sales/credit-note/form?id=${res.data.id}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!await customConfirm("Are you sure you want to VOID this credit note?")) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await voidInvoice(id!);
      if (!res.success) throw new Error(res.error || "Failed to void");
      router.push("/dashboard/sales/credit-note");
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

  // ---- Display-only derivations (no effect on the payload) ----
  const currencyCode = metadata.currencies?.find((c: any) => c.id === formData.currencyId)?.code || "₹";
  const selectedCompany =
    metadata.companies?.find((c: any) => c.id === formData.companyId) ??
    (formData.company?.id === formData.companyId ? formData.company : undefined);
  const gstCustomer = selectedCustomer ?? (formData.customer?.id === formData.customerId ? formData.customer : undefined);
  const sezTaxRate = Number(selectedCompany?.sezTaxRate) || 0;
  // Preview of the CGST/SGST/IGST split the server computes on save (computeBreakupForData in
  // credit-note.actions.ts), using the same shared helpers. Display only.
  const gstPreview = computeGstBreakup({
    lines: (formData.items || []).map((it: any) => ({
      amount: Number(it.amount) || 0,
      taxRate: noteLineGstRate(it, formData.taxRate),
    })),
    taxRatePercent: Number(formData.taxRate) || 0,
    ...invoiceGstContext(selectedCompany, gstCustomer),
  });
  const isIntraStateDisplay = gstPreview.supplyType === "intra";
  const displayStatus = isEdit ? normalizeCreditNoteStatus(status) : "Draft";
  const paymentState = isEdit ? creditNotePaymentState(status) : null;
  const linkedDOs: any[] = isDraft
    ? pendingDOs.filter((d: any) => formData.doIds?.includes(d.id))
    : (formData.deliveryOrders || []).map((l: any) => l.deliveryOrder).filter(Boolean);
  const linkedSoNos = Array.from(new Set(linkedDOs.map((d: any) => d.salesOrder?.orderNo).filter(Boolean))) as string[];
  const einvoiceStatus: string = formData.einvoiceStatus || "Not Generated";
  const hasEInvoice = isEdit && einvoiceStatus !== "Not Generated";
  const hasPaymentData = isEdit && formData.balanceDue !== undefined && formData.balanceDue !== null;
  // Same rule voidInvoice enforces on the server (active IRN, payments or non-void receipts block it).
  const voidBlockReason = isEdit ? invoiceVoidBlockReason({ ...formData, status }, undefined, "Credit Note") : null;
  const reviseBlockReason = isEdit ? invoiceReviseBlockReason({ ...formData, status }, "Credit Note") : null;
  const totalQty = formData.items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0);

  return (
    <div className="w-full space-y-4 pb-24">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/sales/credit-note" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Credit Notes
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {isEdit ? (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Credit Note</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">{formData.invoiceNo}</span>
                  {revision > 0 && (
                    <span className="rounded bg-slate-100 px-1 py-px font-mono text-[11px] font-medium text-slate-500">R{revision}</span>
                  )}
                </h1>
              ) : (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">New Credit Note</h1>
              )}
              <StatusBadge
                status={displayStatus}
                tone={creditNoteStatusTone(isEdit ? status : "Draft")}
                size="md"
                label={isEdit ? displayStatus : "New · Draft"}
              />
              {paymentState && <Badge tone={CN_PAYMENT_TONE[paymentState]} size="md">{paymentState}</Badge>}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Customer">{selectedCustomer?.customerName || "No customer yet"}</MetaChip>
              <MetaChip icon={CalendarDays} title="Credit note date">{fmtDate(formData.invoiceDate)}</MetaChip>
              {formData.dueDate && (
                <MetaChip icon={CalendarClock} label="Due" title="Due date (recalculated from the payment term on save)">
                  {fmtDate(formData.dueDate)}
                </MetaChip>
              )}
              {linkedDOs.length > 0 && (
                <MetaChip icon={Truck} label="DO" title={linkedDOs.map((d: any) => d.doNo).join(", ")}>
                  {linkedDOs.map((d: any) => d.doNo).join(", ")}
                </MetaChip>
              )}
              {linkedSoNos.length > 0 && (
                <MetaChip icon={Hash} label="SO" title={linkedSoNos.join(", ")}>
                  {linkedSoNos.join(", ")}
                </MetaChip>
              )}
              {formData.poNo && (
                <MetaChip icon={Hash} label="PO" title="P.O. No.">{formData.poNo}</MetaChip>
              )}
              {selectedCustomer?.placeOfSupply && (
                <MetaChip icon={MapPin} label="POS" title="Place of supply">{selectedCustomer.placeOfSupply}</MetaChip>
              )}
              {hasEInvoice && (
                <span title={formData.irn || formData.einvoiceError || undefined}>
                  <Badge tone={einvoiceTone(einvoiceStatus)} icon={QrCode}>
                    {einvoiceStatus === "Generated" ? "IRN generated" : `E-invoice ${einvoiceStatus.toLowerCase()}`}
                  </Badge>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => router.push("/dashboard/sales/credit-note")} className={buttonClass("ghost", "md")}>
              Back
            </button>
            {isEdit && (isDraft || isSubmitted) && (
              <button type="button" onClick={handleVoid} disabled={loading || !!voidBlockReason} title={voidBlockReason || undefined} className={buttonClass("danger", "md")}>
                <AlertCircle size={14} /> Void
              </button>
            )}
            {isEdit && displayStatus === "Submitted" && (
              <button type="button" onClick={handleRevise} disabled={loading || !!reviseBlockReason} title={reviseBlockReason || undefined} className={buttonClass("warn", "md")}>
                <Copy size={14} /> Revise
              </button>
            )}
            {isEdit && isDraft && (
              <button type="button" onClick={handleSubmit} disabled={loading} className={buttonClass("success", "md")}>
                <Send size={14} /> Submit
              </button>
            )}
            {isDraft && (
              <button type="button" onClick={handleSave} disabled={loading} className={buttonClass("primary", "md")}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save
              </button>
            )}
            {!isDraft && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {isEdit && !isDraft && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
          <Lock size={14} className="shrink-0 text-slate-400" />
          {isOldVersion ? (
            <span>This credit note has been superseded by a newer revision and is view-only.</span>
          ) : (
            <span>
              This credit note is <span className="font-semibold text-slate-800">{status}</span> and can no longer be edited.
            </span>
          )}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          {/* Credit note details */}
          <Card icon={FileMinus} tone="indigo" title="Credit note details" description="Number, date, company and references">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Invoice No">
                <input type="text" value={formData.invoiceNo || ""} disabled className={`${readOnlyClass} font-mono`} />
              </Field>
              <Field label="Date" required>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  disabled={!isDraft}
                  className={inputClass}
                />
              </Field>
              <Field label="Company" required>
                <SearchableSelect
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  disabled={!isDraft}
                  className={selectTriggerClass}
                >
                  <option value="">Select Company...</option>
                  {metadata.companies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </SearchableSelect>
              </Field>

              <Field label="Invoice Type" required>
                <SearchableSelect
                  value={formData.invoiceType}
                  onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value })}
                  disabled={!isDraft}
                  className={selectTriggerClass}
                >
                  <option value="Credit Note">Credit Note</option>
                </SearchableSelect>
              </Field>

              <Field label="Prepared By" required className="sm:col-span-1 lg:col-span-2">
                <SearchableSelect
                  value={formData.preparedById}
                  onChange={(e) => setFormData({ ...formData, preparedById: e.target.value })}
                  disabled={!isDraft}
                  className={selectTriggerClass}
                >
                  <option value="">Select Employee...</option>
                  {metadata.employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="P.O. No.">
                <input
                  type="text"
                  value={formData.poNo || ""}
                  onChange={(e) => setFormData({ ...formData, poNo: e.target.value })}
                  disabled={!isDraft}
                  className={inputClass}
                />
              </Field>
              <Field label="Vehicle Number">
                <input
                  type="text"
                  value={formData.vehicleNumber || ""}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  disabled={!isDraft}
                  className={inputClass}
                />
              </Field>
            </div>
          </Card>

          {/* Bill to / Ship to */}
          <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2">
            {/* Details of Buyer | Billed to (MANDATORY) */}
            <Card
              icon={UserRound}
              tone="sky"
              title="Bill to"
              description="Details of Buyer | Billed to"
              actions={<Badge tone="rose">Mandatory</Badge>}
            >
              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <Field label="Name (Customer / Buyer)" required className="sm:col-span-2">
                  <SearchableSelect
                    value={formData.customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    disabled={!isDraft}
                    className={selectTriggerClass}
                  >
                    <option value="">Select Customer...</option>
                    {metadata.customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.customerName}</option>
                    ))}
                  </SearchableSelect>
                </Field>

                <Field label="Address (Bill To)" required className="sm:col-span-2">
                  <SearchableSelect
                    value={formData.billToId}
                    onChange={(e) => setFormData({
                      ...formData,
                      billToId: e.target.value,
                      ...(differentShipTo ? {} : { shipToId: e.target.value }),
                    })}
                    disabled={!isDraft || !selectedCustomer}
                    className={selectTriggerClass}
                  >
                    <option value="">Select Bill To Address...</option>
                    {selectedCustomer?.addresses?.map((addr: any) => (
                      <option key={addr.id} value={addr.id}>{addr.address}</option>
                    ))}
                  </SearchableSelect>
                </Field>

                <Field label="Contact Person" required>
                  <SearchableSelect
                    value={formData.contactPersonId}
                    onChange={(e) => handleContactChange(e.target.value)}
                    disabled={!isDraft || !selectedCustomer}
                    className={selectTriggerClass}
                  >
                    <option value="">Select Contact...</option>
                    {selectedCustomer?.contactPersons?.map((cp: any) => (
                      <option key={cp.id} value={cp.id}>{cp.contactPersonName}</option>
                    ))}
                  </SearchableSelect>
                </Field>

                <Field label="Phone / Tel">
                  <input
                    type="text"
                    value={formData.tel || ""}
                    onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
                    disabled={!isDraft}
                    placeholder="e.g. 9948300284"
                    className={inputClass}
                  />
                </Field>

                <Field label="Email" required>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isDraft}
                    className={inputClass}
                  />
                </Field>

                <Field label="Fax">
                  <input
                    type="text"
                    value={formData.fax || ""}
                    onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                    disabled={!isDraft}
                    className={inputClass}
                  />
                </Field>
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">GSTIN</dt>
                  <dd className="break-all font-mono font-semibold text-slate-800">{selectedCustomer?.gstin || "—"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">PAN</dt>
                  <dd className="font-mono font-semibold text-slate-800">{selectedCustomer?.pan || (selectedCustomer?.gstin ? selectedCustomer.gstin.substring(2, 12) : "—")}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Place of Supply</dt>
                  <dd className="font-semibold text-slate-800">{selectedCustomer?.placeOfSupply || "—"}</dd>
                </div>
              </dl>
            </Card>

            {/* Details of Consignee | Shipped to (OPTIONAL) */}
            <Card
              icon={Truck}
              tone="violet"
              title="Ship to"
              description="Details of Consignee | Shipped to"
              actions={
                <label className={`flex select-none items-center gap-2 ${isDraft ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                  <span className="hidden text-[11px] font-medium text-slate-600 sm:inline">Different Ship To Address</span>
                  <span className="text-[11px] font-medium text-slate-600 sm:hidden">Different</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={differentShipTo}
                    aria-label="Different Ship To Address"
                    onClick={() => handleDifferentShipToToggle(!differentShipTo)}
                    disabled={!isDraft}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed ${differentShipTo ? "bg-indigo-600" : "bg-slate-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${differentShipTo ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                  </button>
                </label>
              }
            >
              {differentShipTo ? (
                <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                  <Field label="Name (Consignee)" className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Enter consignee name"
                      value={formData.consigneeName || ""}
                      onChange={(e) => setFormData({ ...formData, consigneeName: e.target.value })}
                      disabled={!isDraft}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Address (Ship To)" required className="sm:col-span-2">
                    <SearchableSelect
                      value={formData.shipToId}
                      onChange={(e) => setFormData({ ...formData, shipToId: e.target.value })}
                      disabled={!isDraft || !selectedCustomer}
                      className={selectTriggerClass}
                    >
                      <option value="">Select Ship To Address...</option>
                      {selectedCustomer?.addresses?.map((addr: any) => (
                        <option key={addr.id} value={addr.id}>{addr.address}</option>
                      ))}
                    </SearchableSelect>
                  </Field>

                  <Field label="Country">
                    <input
                      type="text"
                      value={formData.consigneeCountry || "India"}
                      onChange={(e) => setFormData({ ...formData, consigneeCountry: e.target.value })}
                      disabled={!isDraft}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Phone">
                    <input
                      type="text"
                      placeholder="e.g. 9948300284"
                      value={formData.consigneePhone || ""}
                      onChange={(e) => setFormData({ ...formData, consigneePhone: e.target.value })}
                      disabled={!isDraft}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="GSTIN">
                    <input
                      type="text"
                      placeholder="e.g. GSTA728323"
                      value={formData.consigneeGstin || ""}
                      onChange={(e) => setFormData({ ...formData, consigneeGstin: e.target.value.toUpperCase() })}
                      disabled={!isDraft}
                      className={`${inputClass} uppercase`}
                    />
                  </Field>

                  <Field label="State">
                    <input
                      type="text"
                      placeholder="e.g. Tamil Nadu ( 33 )"
                      value={formData.consigneeState || ""}
                      onChange={(e) => setFormData({ ...formData, consigneeState: e.target.value })}
                      disabled={!isDraft}
                      className={inputClass}
                    />
                  </Field>
                </div>
              ) : (
                <EmptyState
                  boxed
                  icon={MapPin}
                  tone="violet"
                  title="Shipping to the Bill To address"
                  description={
                    isDraft
                      ? "Turn on “Different Ship To Address” to send goods to a separate consignee."
                      : "This credit note ships to the buyer's billing address."
                  }
                />
              )}
            </Card>
          </div>

          {/* Delivery Orders (Challan Linking) */}
          <Card
            icon={Truck}
            tone="amber"
            title="Delivery orders"
            description="Challan linking — select delivery orders to link"
            actions={
              formData.doIds?.length > 0 ? (
                <Badge tone="indigo">{formData.doIds.length} DO(s) Linked</Badge>
              ) : undefined
            }
          >
            {isDraft ? (
              pendingDOs.length === 0 ? (
                <EmptyState
                  boxed
                  icon={Truck}
                  tone="amber"
                  title={formData.customerId ? "No pending delivery orders" : "Pick a customer first"}
                  description={formData.customerId ? "No pending Delivery Orders found for this customer." : "Select a customer to view available Delivery Orders."}
                />
              ) : (
                <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
                  {pendingDOs.map((doItem: any) => {
                    const isChecked = formData.doIds.includes(doItem.id);
                    return (
                      <label
                        key={doItem.id}
                        className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
                          isChecked
                            ? "border-indigo-300 bg-indigo-50/70 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5 text-[13px]">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleDoToggle(doItem.id)}
                            className={checkboxClass}
                          />
                          <span className="truncate font-mono font-semibold text-slate-900">{doItem.doNo}</span>
                          {doItem.salesOrder?.orderNo && (
                            <span className="truncate text-xs text-slate-500">({doItem.salesOrder.orderNo})</span>
                          )}
                        </div>
                        {isChecked ? (
                          <Badge tone="indigo">Linked</Badge>
                        ) : (
                          <span className="shrink-0 text-[11px] text-slate-400">Click to link</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )
            ) : formData.deliveryOrders?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {formData.deliveryOrders.map((l: any) => {
                  const d = l.deliveryOrder;
                  if (!d) return null;
                  return (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="font-mono">{d.doNo}</span> {d.salesOrder?.orderNo ? <span className="text-slate-500">({d.salesOrder.orderNo})</span> : ""}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No Delivery Orders linked to this credit note.</p>
            )}
          </Card>

          {/* Line items */}
          <Card
            icon={ListOrdered}
            tone="emerald"
            title={
              <span className="inline-flex items-center gap-1.5">
                Line items
                {formData.items.length > 0 && (
                  <span className="rounded-full bg-emerald-50 px-1.5 text-[11px] font-semibold tabular-nums text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                    {formData.items.length}
                  </span>
                )}
              </span>
            }
            description="Parts, HSN, quantities, pricing and tax"
            bodyClassName="p-0"
            actions={
              isDraft ? (
                <button type="button" onClick={handleAddItem} className={buttonClass("link", "sm")}>
                  <Plus size={14} /> Add Item
                </button>
              ) : undefined
            }
          >
            {formData.items.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  boxed
                  icon={ListOrdered}
                  tone="emerald"
                  title="No items yet"
                  description="No items found. Select Delivery Orders or add items manually."
                  action={
                    isDraft && (
                      <button type="button" onClick={handleAddItem} className={buttonClass("primary", "md")}>
                        <Plus size={14} /> Add first item
                      </button>
                    )
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] table-fixed text-left text-[13px]">
                  <colgroup>
                    <col className="w-9" />
                    <col className="w-24" />
                    <col />
                    <col className="w-24" />
                    <col className="w-20" />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-28" />
                    <col className="w-36" />
                    <col className="w-9" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2 text-center font-medium">SN</th>
                      <th className="px-1.5 py-2 font-medium">Work Order</th>
                      <th className="px-1.5 py-2 font-medium">Part / Description</th>
                      <th className="px-1.5 py-2 font-medium">HSN / SAC</th>
                      <th className="px-1.5 py-2 text-right font-medium">Qty</th>
                      <th className="px-1.5 py-2 font-medium">UOM</th>
                      <th className="px-1.5 py-2 text-right font-medium">Unit Price</th>
                      <th className="px-1.5 py-2 text-right font-medium">Amount</th>
                      <th className="px-1.5 py-2 font-medium">Tax</th>
                      <th className="px-1.5 py-2"><span className="sr-only">Remove</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item: any, index: number) => (
                      <tr key={index} className="align-top transition-colors hover:bg-slate-50/60">
                        <td className="px-2 py-1.5 pt-2 text-center">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-semibold tabular-nums text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input
                            type="text"
                            value={item.workOrderNo || ""}
                            onChange={(e) => updateItem(index, "workOrderNo", e.target.value)}
                            disabled={!isDraft || !!item.partId}
                            title={item.workOrderNo || ""}
                            className={`${inputSmClass} font-mono text-[12px]`}
                            placeholder="WO No"
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <textarea
                            rows={1}
                            value={item.partId ? (metadata.parts.find((p: any) => p.id === item.partId)?.partNo || "") : item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value.replace(/\n/g, " "))}
                            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                            disabled={!isDraft || !!item.partId}
                            className={`${textareaSmClass} resize-none field-sizing-content`}
                            placeholder="Description"
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <input
                            type="text"
                            value={item.hsnCode || ""}
                            onChange={(e) => updateItem(index, "hsnCode", e.target.value)}
                            disabled={!isDraft}
                            className={`${inputSmClass} font-mono text-[12px]`}
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
                            className={`${inputSmClass} text-right tabular-nums`}
                          />
                        </td>
                        <td className="px-1.5 py-1.5">
                          <SearchableSelect
                            compact
                            value={item.uomId || ""}
                            onChange={(e) => updateItem(index, "uomId", e.target.value)}
                            disabled={!isDraft || !!item.partId}
                            className={selectTriggerSmClass}
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
                            className={`${inputSmClass} text-right tabular-nums`}
                          />
                        </td>
                        <td className="px-1.5 py-1.5 pt-2 text-right font-semibold tabular-nums text-slate-900">
                          {Number(item.amount).toFixed(2)}
                        </td>
                        <td className="px-1.5 py-1.5">
                          <SearchableSelect
                            compact
                            value={item.taxTypeId || ""}
                            onChange={(e) => updateItem(index, "taxTypeId", e.target.value)}
                            disabled={!isDraft}
                            className={selectTriggerSmClass}
                          >
                            <option value="">Select Tax...</option>
                            {metadata.taxes.map((t: any) => (
                              <option key={t.id} value={t.id}>{t.taxType} ({t.taxRate}%)</option>
                            ))}
                          </SearchableSelect>
                          {Number(item.taxAmount) > 0 && (
                            <div className="mt-0.5 text-right text-[11px] tabular-nums text-slate-500">
                              Tax: {Number(item.taxAmount).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-1 py-1.5 pt-2 text-center">
                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className={iconButtonDangerClass}
                              title="Remove Item"
                              aria-label={`Remove item ${index + 1}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/70 text-xs">
                      <td colSpan={4} className="px-3 py-2 text-slate-500">
                        {formData.items.length} line{formData.items.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-1.5 py-2 text-right font-semibold tabular-nums text-slate-700">{totalQty}</td>
                      <td colSpan={2} className="px-1.5 py-2 text-right text-slate-500">Amount before tax</td>
                      <td className="px-1.5 py-2 text-right font-semibold tabular-nums text-slate-900">{Number(formData.amountBeforeTax).toFixed(2)}</td>
                      <td className="px-1.5 py-2 text-right tabular-nums text-slate-500">Tax {Number(formData.taxAmount).toFixed(2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {/* Bank details & remarks */}
          <Card icon={StickyNote} tone="slate" title="Bank details & remarks" description="Printed on the credit note">
            <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
              <div className="space-y-3">
                <Field label="Select Bank Template">
                  <SearchableSelect
                    value=""
                    onChange={(e) => handleBankChange(e.target.value)}
                    disabled={!isDraft}
                    className={selectTriggerClass}
                  >
                    <option value="">Select a Bank Profile to auto-fill...</option>
                    {metadata.banks?.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</option>
                    ))}
                  </SearchableSelect>
                </Field>
                <Field label="Bank Details">
                  <textarea
                    value={formData.bankDetails || ""}
                    onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                    disabled={!isDraft}
                    rows={3}
                    className={`${textareaClass} font-mono text-[12px]`}
                    placeholder="Enter bank account information..."
                  />
                </Field>
              </div>
              <Field label="Remarks">
                <textarea
                  value={formData.remark || ""}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  disabled={!isDraft}
                  rows={6}
                  className={textareaClass}
                  placeholder="Add any extra notes here..."
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4 xl:sticky xl:top-28 xl:self-start">
          {/* Payment & currency */}
          <Card icon={Wallet} tone="blue" title="Payment & currency" description="Terms, currency and exchange rate">
            <div className="space-y-3">
              <Field label="Payment Term" required>
                <SearchableSelect
                  compact
                  value={formData.paymentTermId}
                  onChange={(e) => setFormData({ ...formData, paymentTermId: e.target.value })}
                  disabled={!isDraft}
                  className={selectTriggerClass}
                >
                  <option value="">Select Term...</option>
                  {metadata.paymentTerms.map((pt: any) => (
                    <option key={pt.id} value={pt.id}>{pt.name} ({pt.days} days)</option>
                  ))}
                </SearchableSelect>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Currency" required>
                  <SearchableSelect
                    compact
                    value={formData.currencyId}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    disabled={!isDraft}
                    className={selectTriggerClass}
                  >
                    <option value="">Select Currency...</option>
                    {metadata.currencies.map((cur: any) => (
                      <option key={cur.id} value={cur.id}>{cur.code}</option>
                    ))}
                  </SearchableSelect>
                </Field>

                <Field label="Exchange Rate">
                  <input
                    type="number"
                    step="0.001"
                    value={formData.exchangeRate}
                    disabled
                    className={`${readOnlyClass} text-right tabular-nums`}
                  />
                </Field>
              </div>

              {selectedCustomer?.isSez && (
                <div className={`${readOnlyClass} flex items-center gap-1.5`}>
                  <ShieldCheck size={13} className="shrink-0 text-slate-400" />
                  SEZ Tax ({Number(metadata.companies.find((c: any) => c.id === formData.companyId)?.sezTaxRate) || 0}%) Auto-applied
                </div>
              )}
            </div>
          </Card>

          {/* Summary — dark anchor echoing the sidebar */}
          <section className="overflow-hidden rounded-xl bg-[#111827] text-slate-300 shadow-lg shadow-slate-900/10 ring-1 ring-white/5">
            <header className="flex items-center gap-2.5 border-b border-white/10 px-4 py-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/20">
                <Receipt size={15} />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold leading-tight text-white">Summary</h2>
                <p className="text-[11px] leading-tight text-slate-400">Live totals for this credit note</p>
              </div>
            </header>
            <dl className="space-y-2 px-4 py-3 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">Amount Before Tax</dt>
                <dd className="tabular-nums text-slate-200">{Number(formData.amountBeforeTax).toFixed(2)}</dd>
              </div>
              {Number(formData.taxAmount) > 0 && selectedCustomer && (
                isIntraStateDisplay ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-400">CGST <span className="text-[11px] text-slate-500">(Intra-state)</span></dt>
                      <dd className="tabular-nums text-slate-200">{gstPreview.totals.cgst.toFixed(2)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-400">SGST <span className="text-[11px] text-slate-500">(Intra-state)</span></dt>
                      <dd className="tabular-nums text-slate-200">{gstPreview.totals.sgst.toFixed(2)}</dd>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-400">IGST <span className="text-[11px] text-slate-500">(Inter-state)</span></dt>
                    <dd className="tabular-nums text-slate-200">{gstPreview.totals.igst.toFixed(2)}</dd>
                  </div>
                )
              )}
              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2">
                <dt className="text-slate-400">Tax Amount</dt>
                <dd className="tabular-nums text-slate-200">{Number(formData.taxAmount).toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">
                  <label htmlFor="credit-note-round-off">Round Off</label>
                </dt>
                <dd>
                  <input
                    id="credit-note-round-off"
                    type="number"
                    step="0.01"
                    value={formData.roundOff || 0}
                    onChange={(e) => {
                       const rOff = Number(e.target.value);
                       const totals = calculateTotals(formData.items, rOff);
                       setFormData((prev: any) => ({ ...prev, ...totals, roundOff: rOff }));
                    }}
                    disabled={!isDraft}
                    className="h-7 w-24 rounded-md border border-white/15 bg-white/5 px-2 text-right text-[13px] tabular-nums text-white transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </dd>
              </div>
            </dl>
            <div className="relative border-t border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-gradient-to-b from-emerald-400 to-teal-500" />
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-300">Total Amount <span className="normal-case tracking-normal text-slate-400">· credited to customer</span></p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-emerald-300">{currencyCode}</span>
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">{Number(formData.amountAfterTax).toFixed(2)}</span>
              </p>
            </div>
          </section>

          {/* Payment / balance (only once the credit note exists) */}
          {hasPaymentData && (
            <Card
              icon={Landmark}
              tone={paymentState === "Paid" ? "emerald" : paymentState === "Partial" ? "sky" : "slate"}
              title="Payment / refund"
              description="Settled via Receipts"
              actions={paymentState ? <Badge tone={CN_PAYMENT_TONE[paymentState]}>{paymentState}</Badge> : undefined}
            >
              <dl className="space-y-1.5 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Amount paid</dt>
                  <dd className="tabular-nums text-slate-800">{currencyCode} {Number(formData.amountPaid || 0).toFixed(2)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Balance due</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{currencyCode} {Number(formData.balanceDue).toFixed(2)}</dd>
                </div>
                {formData.dueDate && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Due date</dt>
                    <dd className="text-slate-700">{fmtDate(formData.dueDate)}</dd>
                  </div>
                )}
              </dl>
            </Card>
          )}

          {/* Tax & e-invoice */}
          <Card icon={QrCode} tone="violet" title="Tax & e-invoice" description="GST supply type and IRN status">
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Supply type</dt>
                <dd className="text-right text-slate-800">
                  {!selectedCustomer
                    ? "—"
                    : selectedCustomer?.isSez
                    ? `SEZ (${sezTaxRate}%)`
                    : isIntraStateDisplay
                    ? "Intra-state · CGST + SGST"
                    : "Inter-state · IGST"}
                </dd>
              </div>
              {isEdit && formData.supplyType && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Saved breakup</dt>
                  <dd className="text-right text-slate-800">{formData.supplyType === "intra" ? "Intra-state" : formData.supplyType === "inter" ? "Inter-state" : formData.supplyType}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">E-invoice</dt>
                <dd>
                  {isEdit ? (
                    <Badge tone={einvoiceTone(einvoiceStatus)}>{einvoiceStatus}</Badge>
                  ) : (
                    <span className="text-slate-400">After submit</span>
                  )}
                </dd>
              </div>
              {formData.irn && (
                <div className="min-w-0">
                  <dt className="text-slate-500">IRN</dt>
                  <dd className="mt-0.5 break-all rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 ring-1 ring-inset ring-slate-200">{formData.irn}</dd>
                </div>
              )}
              {formData.ackNo && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Ack No</dt>
                  <dd className="font-mono text-[12px] text-slate-800">{formData.ackNo}</dd>
                </div>
              )}
              {formData.ackDate && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Ack Date</dt>
                  <dd className="text-slate-800">{fmtDate(formData.ackDate)}</dd>
                </div>
              )}
              {formData.ewbNo && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">E-way bill</dt>
                  <dd className="font-mono text-[12px] text-slate-800">{formData.ewbNo}</dd>
                </div>
              )}
              {einvoiceStatus === "Cancelled" && formData.einvoiceCancelReason && (
                <div className="min-w-0">
                  <dt className="text-slate-500">Cancel reason</dt>
                  <dd className="text-slate-700">{formData.einvoiceCancelReason}</dd>
                </div>
              )}
              {einvoiceStatus === "Failed" && formData.einvoiceError && (
                <div className="whitespace-pre-line rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
                  {formData.einvoiceError}
                </div>
              )}
            </dl>
            <p className="mt-2 text-[11px] text-slate-400">Generate or cancel the IRN from the Credit Notes list.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
