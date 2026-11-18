/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Save,
  Loader2,
  AlertCircle,
  Banknote,
  ArrowLeft,
  Building2,
  CalendarDays,
  FileText,
  Hash,
  Lock,
  StickyNote,
  Users,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Card,
  Field,
  MetaChip,
  StatusBadge,
  buttonClass,
  inputClass,
  readOnlyClass,
  selectTriggerClass,
  textareaClass,
} from "@/components/form-ui";
import {
getReceiptFormData,
  getReceipt,
  createReceiptAction,
  updateReceiptAction,
} from "../receipt.actions";
import {
  emeraldButtonClass,
  fmtDate,
  formatAmount,
  paymentMethodMeta,
  receiptStatusTone,
  referenceLabel,
} from "../rc-status";
import { InvoiceBalanceCard, ReceiptSummaryRail } from "../ReceiptPanels";

function ReceiptFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState<any>({
    receiptDate: new Date().toISOString().slice(0, 10),
    companyId: "",
    customerId: "",
    invoiceId: "",
    paymentMethod: "Bank Transfer",
    chequeRefNo: "",
    amountReceived: "",
    currencyId: "",
    exchangeRate: "1",
    remark: "",
    creatorId: "",
  });

  const [options, setOptions] = useState<any>({
    companies: [],
    customers: [],
    currencies: [],
    employees: [],
    invoices: [],
  });

  const [receiptNo, setReceiptNo] = useState("");
  const [status, setStatus] = useState("Draft");
  // What the saved receipt carries; its exchange rate is frozen unless the invoice or currency changes.
  const [stored, setStored] = useState<{ invoiceId: string; currencyId: string; exchangeRate: string } | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const optRes = await getReceiptFormData();
        if (!optRes.success) throw new Error(optRes.error || "Failed to load options");
        setOptions(optRes.data);

        if (id) {
          const res = await getReceipt(id);
          if (!res.success) throw new Error(res.error || "Failed to load receipt");
          const r = res.data;
          setReceiptNo(r.receiptNo);
          setStatus(r.status);
          setStored({ invoiceId: r.invoiceId, currencyId: r.currencyId, exchangeRate: String(r.exchangeRate) });
          setFormData({
            receiptDate: new Date(r.receiptDate).toISOString().slice(0, 10),
            companyId: r.companyId,
            customerId: r.customerId,
            invoiceId: r.invoiceId,
            paymentMethod: r.paymentMethod,
            chequeRefNo: r.chequeRefNo || "",
            amountReceived: r.amountReceived,
            currencyId: r.currencyId,
            exchangeRate: r.exchangeRate,
            remark: r.remark || "",
            creatorId: r.creatorId,
          });
        } else {
          // Defaults for new
          let compId = "";
          if (optRes.data.companies.length > 0) compId = optRes.data.companies[0].id;
          
          let currId = "";
          const defCurr = optRes.data.currencies.find((c: any) => c.isDefault);
          if (defCurr) currId = defCurr.id;

          setFormData((prev: any) => ({
            ...prev,
            creatorId: optRes.data.employees[0]?.id || "",
            companyId: compId,
            currencyId: currId,
          }));
        }
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  const selectedInvoice = useMemo(() => {
    if (!formData.invoiceId) return null;
    return options.invoices.find((inv: any) => inv.id === formData.invoiceId) || null;
  }, [formData.invoiceId, options.invoices]);

  // Filter invoices by selected customer
  const availableInvoices = useMemo(() => {
    if (!formData.customerId) return [];
    return options.invoices.filter((inv: any) => inv.customerId === formData.customerId);
  }, [formData.customerId, options.invoices]);

  // When the invoice changes (new or edited Draft), the currency follows the invoice and the
  // rate shown is the latest from Currency Profile, unless this is the saved receipt's own
  // invoice + currency, whose rate stays frozen. Display only: the server sets the rate.
  useEffect(() => {
    if (!selectedInvoice || status !== "Draft") return;
    const keep =
      !!stored && stored.invoiceId === selectedInvoice.id && stored.currencyId === selectedInvoice.currencyId;
    const latest = options.currencies.find((c: any) => c.id === selectedInvoice.currencyId)?.exchangeRate;
    setFormData((prev: any) => ({
      ...prev,
      currencyId: selectedInvoice.currencyId,
      exchangeRate: keep ? stored!.exchangeRate : latest ?? prev.exchangeRate,
    }));
  }, [selectedInvoice, stored, status, options.currencies]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "Draft") {
      hotToast.error("Only Draft receipts can be saved.");
      return;
    }

    if (selectedInvoice) {
      if (Number(formData.amountReceived) > Number(selectedInvoice.balanceDue)) {
        hotToast.error("Amount Received cannot exceed the Invoice Balance Due.");
        return;
      }
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const payload = { ...formData };
      if (id) {
        const res = await updateReceiptAction(id, payload);
        if (!res.success) throw new Error(res.error || "Update failed");
        router.push(`/dashboard/sales/receipt?toast=updated`);
      } else {
        const res = await createReceiptAction(payload);
        if (!res.success) throw new Error(res.error || "Create failed");
        router.push(`/dashboard/sales/receipt?toast=created`);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // ---- Display-only derivations (no effect on the payload) ----
  const isDraft = status === "Draft";
  const selectedCustomer = options.customers.find((c: any) => c.id === formData.customerId);
  const currencyCode: string =
    selectedInvoice?.currency?.code || options.currencies.find((c: any) => c.id === formData.currencyId)?.code || "";
  const amountNum = Number(formData.amountReceived) || 0;
  const invTotal = Number(selectedInvoice?.amountAfterTax) || 0;
  const invPaid = Number(selectedInvoice?.amountPaid) || 0;
  const invBalance = Number(selectedInvoice?.balanceDue) || 0;
  // Same comparison as the save-time check in handleSave.
  const overBalance = !!selectedInvoice && Number(formData.amountReceived) > Number(selectedInvoice.balanceDue);
  const method = paymentMethodMeta(formData.paymentMethod);

  return (
    <div className="w-full space-y-4 pb-24">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/sales/receipt" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Receipts
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {id ? (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Edit Receipt</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">{receiptNo}</span>
                </h1>
              ) : (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">New Receipt</h1>
              )}
              <StatusBadge status={status} tone={receiptStatusTone(status)} size="md" label={id ? status : "New · Draft"} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Customer">{selectedCustomer?.customerName || "No customer yet"}</MetaChip>
              <MetaChip icon={CalendarDays} title="Receipt date">{fmtDate(formData.receiptDate)}</MetaChip>
              {selectedInvoice && (
                <MetaChip icon={FileText} label="Inv" title="Invoice">{selectedInvoice.invoiceNo}</MetaChip>
              )}
              <MetaChip icon={method.icon} title="Payment method">{formData.paymentMethod || "—"}</MetaChip>
              {formData.chequeRefNo && (
                <MetaChip icon={Hash} label={referenceLabel(formData.paymentMethod)} title="Reference">{formData.chequeRefNo}</MetaChip>
              )}
              {amountNum > 0 && (
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset ${
                  overBalance ? "bg-rose-50 text-rose-700 ring-rose-600/15" : "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
                }`}>
                  <Banknote size={12} /> {currencyCode} {formatAmount(amountNum)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <Link href="/dashboard/sales/receipt" className={buttonClass("ghost", "md")}>
              Cancel
            </Link>
            {!isDraft && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            )}
            <button type="button" onClick={handleSave} disabled={saving || status !== "Draft"} className={emeraldButtonClass}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving..." : "Save Receipt"}
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {id && status !== "Draft" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-700">
          <Lock size={14} className="shrink-0" />
          <p className="font-medium">This receipt is {status} and cannot be edited.</p>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <form className="min-w-0 space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Receipt details */}
          <Card icon={FileText} tone="indigo" title="Receipt details" description="Number, date, company and creator">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field label="Receipt No">
                <input type="text" value={receiptNo || "Auto-generated"} disabled className={`${readOnlyClass} font-mono`} />
              </Field>
              <Field label="Date" required>
                <input
                  type="date"
                  name="receiptDate"
                  value={formData.receiptDate}
                  onChange={handleChange}
                  disabled={status !== "Draft"}
                  className={inputClass}
                />
              </Field>
              <Field label="Company" required>
                <SearchableSelect
                  compact
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleChange}
                  disabled={status !== "Draft"}
                  className={selectTriggerClass}
                >
                  <option value="">Select Company</option>
                  {options.companies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="Creator" required help={id ? "Set when the receipt was created." : undefined}>
                <SearchableSelect
                  compact
                  name="creatorId"
                  value={formData.creatorId}
                  onChange={handleChange}
                  disabled={!!id || status !== "Draft"} // Only set on create
                  className={selectTriggerClass}
                >
                  <option value="">Select Creator</option>
                  {options.employees.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SearchableSelect>
              </Field>
            </div>
          </Card>

          {/* Customer & invoice */}
          <Card icon={Users} tone="sky" title="Customer & invoice" description="Who paid and which document it settles">
            <div className="space-y-3">
              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <Field label="Customer" required>
                  <SearchableSelect
                    compact
                    name="customerId"
                    value={formData.customerId}
                    onChange={(e) => {
                      handleChange(e);
                      setFormData((prev: any) => ({ ...prev, invoiceId: "" })); // Reset invoice when customer changes
                    }}
                    disabled={status !== "Draft"}
                    className={selectTriggerClass}
                  >
                    <option value="">Select Customer</option>
                    {options.customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.customerName}</option>
                    ))}
                  </SearchableSelect>
                </Field>
                <Field
                  label="Invoice No"
                  required
                  help={
                    !formData.customerId ? (
                      <span className="text-amber-600">Select a customer first to see their invoices.</span>
                    ) : availableInvoices.length === 0 ? (
                      "No open invoices for this customer."
                    ) : undefined
                  }
                >
                  <SearchableSelect
                    compact
                    name="invoiceId"
                    value={formData.invoiceId}
                    onChange={handleChange}
                    disabled={!formData.customerId || status !== "Draft"}
                    className={selectTriggerClass}
                  >
                    <option value="">Select Invoice</option>
                    {availableInvoices.map((inv: any) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNo} (Bal: {inv.currency?.code} {Number(inv.balanceDue).toFixed(2)})
                      </option>
                    ))}
                  </SearchableSelect>
                </Field>
              </div>

              {selectedInvoice ? (
                <InvoiceBalanceCard
                  code={currencyCode}
                  invoiceNo={selectedInvoice.invoiceNo}
                  invoiceType={selectedInvoice.invoiceType}
                  invoiceStatus={selectedInvoice.status}
                  total={invTotal}
                  paid={invPaid}
                  balance={invBalance}
                  amount={amountNum}
                  mode="pending"
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-4 text-center text-xs text-slate-500">
                  Pick an invoice to see its total, what is already paid and the balance due.
                </div>
              )}
            </div>
          </Card>

          {/* Payment method & reference */}
          <Card icon={Wallet} tone="emerald" title="Payment method & reference" description="How the money arrived and how much">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field label="Payment Method" required>
                <SearchableSelect
                  compact
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  disabled={status !== "Draft"}
                  className={selectTriggerClass}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="Others">Others</option>
                </SearchableSelect>
              </Field>
              <Field label="Cheque / Ref No" help={`${referenceLabel(formData.paymentMethod)} for this ${formData.paymentMethod ? formData.paymentMethod.toLowerCase() : "payment"}.`}>
                <input
                  type="text"
                  name="chequeRefNo"
                  value={formData.chequeRefNo}
                  onChange={handleChange}
                  disabled={status !== "Draft"}
                  className={`${inputClass} font-mono`}
                />
              </Field>
              <Field label="Currency" required help="Taken from the invoice.">
                <SearchableSelect
                  compact
                  name="currencyId"
                  value={formData.currencyId}
                  onChange={handleChange}
                  disabled={true} // Usually tied to Invoice
                  className={selectTriggerClass}
                >
                  <option value="">Select Currency</option>
                  {options.currencies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.code}</option>
                  ))}
                </SearchableSelect>
              </Field>
              <Field label="Exchange Rate" required help="Latest Currency Profile rate, fixed when the receipt is created.">
                <input
                  type="number"
                  step="0.001"
                  name="exchangeRate"
                  value={formData.exchangeRate}
                  onChange={handleChange}
                  disabled={true} // Usually tied to Invoice
                  className={`${readOnlyClass} text-right tabular-nums`}
                />
              </Field>
              <Field
                label="Amount Received"
                required
                className="sm:col-span-2"
                error={overBalance ? "Amount Received cannot exceed the Invoice Balance Due." : undefined}
                help={selectedInvoice ? `Balance due: ${currencyCode} ${formatAmount(invBalance)}` : undefined}
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600">
                    {currencyCode}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    name="amountReceived"
                    value={formData.amountReceived}
                    onChange={handleChange}
                    disabled={status !== "Draft"}
                    className={`h-11 w-full rounded-lg border-2 bg-white pr-3 text-right text-lg font-semibold tabular-nums transition-colors placeholder:text-slate-300 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70 ${
                      currencyCode ? "pl-14" : "pl-3"
                    } ${
                      overBalance
                        ? "border-rose-300 text-rose-700 focus:border-rose-500 focus:ring-rose-500/15"
                        : "border-emerald-300 text-emerald-800 focus:border-emerald-500 focus:ring-emerald-500/15"
                    }`}
                    placeholder="0.00"
                  />
                </div>
              </Field>
            </div>
          </Card>

          {/* Remarks */}
          <Card icon={StickyNote} tone="slate" title="Remarks" description="Internal notes for this receipt">
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              disabled={status !== "Draft"}
              rows={3}
              aria-label="Remarks"
              className={`${textareaClass} resize-none`}
            />
          </Card>
        </form>

        {/* Right rail */}
        <div className="min-w-0 space-y-4 xl:sticky xl:top-28 xl:self-start">
          <ReceiptSummaryRail
            code={currencyCode}
            amount={amountNum}
            over={overBalance}
            balanceAfter={selectedInvoice ? invBalance - amountNum : null}
            rows={[
              { label: "Invoice", value: selectedInvoice?.invoiceNo || "—", mono: true },
              { label: "Method", value: formData.paymentMethod || "—" },
              { label: "Exchange rate", value: Number(formData.exchangeRate || 0).toFixed(4) },
              ...(selectedInvoice ? [{ label: "Balance due", value: formatAmount(invBalance) }] : []),
            ]}
            footnote={isDraft ? "Saved as Draft. The invoice balance changes only when the receipt is confirmed." : undefined}
          />
          {selectedInvoice && selectedInvoice.invoiceType && selectedInvoice.invoiceType !== "Customer Invoice" && (
            <div className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] text-violet-800">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>
                This document is a <Badge tone="violet">{selectedInvoice.invoiceType}</Badge>.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReceiptFormPage() {
  return (
    <div className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        }
      >
        <ReceiptFormContent />
      </Suspense>
    </div>
  );
}
