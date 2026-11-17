"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Save,
  X,
  Loader2,
  AlertCircle,
  Banknote,
  ChevronLeft,
} from "lucide-react";
import {
getReceiptFormData,
  getReceipt,
  createReceiptAction,
  updateReceiptAction,
} from "../receipt.actions";

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

  // When invoice changes, update auto-populated fields
  useEffect(() => {
    if (selectedInvoice && !id) { // Only auto-populate if creating new or changing invoice
      setFormData((prev: any) => ({
        ...prev,
        currencyId: selectedInvoice.currencyId,
        exchangeRate: selectedInvoice.exchangeRate,
        // Optional: auto-fill amountReceived with balance due, or let user type it
      }));
    }
  }, [selectedInvoice, id]);

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
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/sales/receipt"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-500 shadow-sm transition-all hover:bg-emerald-50 hover:text-emerald-600 active:scale-95 border border-blue-100"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-900">
              {id ? `Edit Receipt: ${receiptNo}` : "New Receipt"}
            </h1>
            <p className="text-sm text-blue-500">
              {id ? "Modify existing receipt" : "Record a new payment"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/sales/receipt"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
          >
            <X size={16} /> Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || status !== "Draft"}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-6 text-sm font-bold text-white shadow-md transition-all hover:from-emerald-400 hover:to-teal-400 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save Receipt"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 shadow-sm">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {id && status !== "Draft" && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-700 shadow-sm">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-medium">This receipt is {status} and cannot be edited.</p>
        </div>
      )}

      <form className="space-y-6 rounded-2xl bg-white p-6 shadow-xl border border-blue-100 lg:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Banknote size={200} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Date *</label>
            <input
              type="date"
              name="receiptDate"
              value={formData.receiptDate}
              onChange={handleChange}
              disabled={status !== "Draft"}
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm text-blue-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Company *</label>
            <SearchableSelect
              name="companyId"
              value={formData.companyId}
              onChange={handleChange}
              disabled={status !== "Draft"}
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm text-blue-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
            >
              <option value="">Select Company</option>
              {options.companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Customer *</label>
            <SearchableSelect
              name="customerId"
              value={formData.customerId}
              onChange={(e) => {
                handleChange(e);
                setFormData((prev: any) => ({ ...prev, invoiceId: "" })); // Reset invoice when customer changes
              }}
              disabled={status !== "Draft"}
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm text-blue-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
            >
              <option value="">Select Customer</option>
              {options.customers.map((c: any) => (
                <option key={c.id} value={c.id}>{c.customerName}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Invoice No *</label>
            <SearchableSelect
              name="invoiceId"
              value={formData.invoiceId}
              onChange={handleChange}
              disabled={!formData.customerId || status !== "Draft"}
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm text-blue-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
            >
              <option value="">Select Invoice</option>
              {availableInvoices.map((inv: any) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNo} (Bal: {inv.currency?.code} {Number(inv.balanceDue).toFixed(2)})
                </option>
              ))}
            </SearchableSelect>
            {!formData.customerId && (
              <p className="text-[10px] text-amber-600">Select a customer first to see their invoices.</p>
            )}
          </div>
        </div>

        <hr className="border-blue-100" />

        {selectedInvoice && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <div>
              <p className="text-xs font-bold text-emerald-800/60 uppercase">Invoice Total</p>
              <p className="font-mono text-emerald-900 font-semibold">{selectedInvoice.currency?.code} {Number(selectedInvoice.amountAfterTax).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800/60 uppercase">Amount Paid</p>
              <p className="font-mono text-emerald-900 font-semibold">{selectedInvoice.currency?.code} {Number(selectedInvoice.amountPaid).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800/60 uppercase">Balance Due</p>
              <p className="font-mono text-emerald-900 font-bold text-lg">{selectedInvoice.currency?.code} {Number(selectedInvoice.balanceDue).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800/60 uppercase">Status</p>
              <p className="font-semibold text-emerald-900">{selectedInvoice.status}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Payment Method *</label>
            <SearchableSelect
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              disabled={status !== "Draft"}
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm text-blue-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
              <option value="Others">Others</option>
            </SearchableSelect>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Cheque / Ref No</label>
            <input
              type="text"
              name="chequeRefNo"
              value={formData.chequeRefNo}
              onChange={handleChange}
              disabled={status !== "Draft"}
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm text-blue-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Currency *</label>
            <SearchableSelect
              name="currencyId"
              value={formData.currencyId}
              onChange={handleChange}
              disabled={true} // Usually tied to Invoice
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm text-blue-900 opacity-70 cursor-not-allowed"
            >
              <option value="">Select Currency</option>
              {options.currencies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Exchange Rate *</label>
            <input
              type="number"
              step="0.001"
              name="exchangeRate"
              value={formData.exchangeRate}
              onChange={handleChange}
              disabled={true} // Usually tied to Invoice
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm text-blue-900 opacity-70 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Amount Received *</label>
            <input
              type="number"
              step="0.01"
              name="amountReceived"
              value={formData.amountReceived}
              onChange={handleChange}
              disabled={status !== "Draft"}
              className="w-full rounded-lg border-2 border-emerald-300 bg-emerald-50/30 px-4 py-3 text-lg font-bold text-emerald-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-60"
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Creator *</label>
            <SearchableSelect
              name="creatorId"
              value={formData.creatorId}
              onChange={handleChange}
              disabled={!!id || status !== "Draft"} // Only set on create
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm text-blue-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
            >
              <option value="">Select Creator</option>
              {options.employees.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Remarks</label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              disabled={status !== "Draft"}
              rows={3}
              className="w-full rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 text-sm text-blue-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 resize-none"
            />
          </div>
        </div>
      </form>
    </div>
  );
}

export default function ReceiptFormPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          </div>
        }
      >
        <ReceiptFormContent />
      </Suspense>
    </div>
  );
}
