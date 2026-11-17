"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Banknote,
  ChevronLeft,
  CheckCircle2,
  Ban,
  Edit2,
  Printer,
  Calendar,
  Building,
  User,
  FileText,
  CreditCard,
  Hash,
  DollarSign,
  AlignLeft,
} from "lucide-react";
import { getReceipt, transitionReceiptAction } from "../receipt.actions";

export default function ReceiptViewPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchReceipt = async () => {
    setLoading(true);
    try {
      const res = await getReceipt(id);
      if (!res.success) throw new Error(res.error || "Failed to load receipt");
      setReceipt(res.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipt();
  }, [id]);

  async function handleConfirm() {
    if (!await customConfirm(`Confirm receipt ${receipt?.receiptNo}?`)) return;
    setProcessing(true);
    const res = await transitionReceiptAction(id, "confirm");
    if (!res.success) hotToast.error(res.error || "Failed to confirm");
    else await fetchReceipt();
    setProcessing(false);
  }

  async function handleVoid() {
    if (!await customConfirm(`Void receipt ${receipt?.receiptNo}?`)) return;
    setProcessing(true);
    const res = await transitionReceiptAction(id, "void");
    if (!res.success) hotToast.error(res.error || "Failed to void");
    else await fetchReceipt();
    setProcessing(false);
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (errorMsg || !receipt) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 shadow-sm">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-medium">{errorMsg || "Receipt not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-3 w-full">
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
              Receipt: {receipt.receiptNo}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-blue-500">Record Details</span>
              <StatusPill status={receipt.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {receipt.status === "Draft" && (
            <>
              <button
                onClick={() => router.push(`/dashboard/sales/receipt/form?id=${receipt.id}`)}
                disabled={processing}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50"
              >
                <Edit2 size={14} /> Edit
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 text-xs font-bold text-white shadow-sm transition-all hover:from-emerald-400 hover:to-teal-400 active:scale-95 disabled:opacity-50"
              >
                {processing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
                Confirm
              </button>
            </>
          )}
          {receipt.status !== "Void" && (
            <button
              onClick={handleVoid}
              disabled={processing}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50"
            >
              <Ban size={14} /> Void
            </button>
          )}

        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white shadow-sm border border-blue-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Banknote size={150} />
            </div>
            
            <div className="p-6 border-b border-blue-50 bg-blue-50/30">
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                <FileText size={16} className="text-emerald-500" /> Payment Information
              </h3>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-6">
              <InfoItem icon={<Calendar />} label="Receipt Date" value={new Date(receipt.receiptDate).toLocaleDateString()} />
              <InfoItem icon={<Building />} label="Company" value={receipt.company?.companyName} />
              <InfoItem icon={<User />} label="Customer" value={receipt.customer?.customerName} />
              <InfoItem icon={<FileText />} label="Invoice No" value={receipt.invoice?.invoiceNo} />
              
              <div className="col-span-2 grid grid-cols-2 gap-6 pt-4 border-t border-blue-50">
                <InfoItem icon={<CreditCard />} label="Payment Method" value={receipt.paymentMethod} />
                <InfoItem icon={<Hash />} label="Cheque / Ref No" value={receipt.chequeRefNo || "—"} />
              </div>
            </div>
          </div>

          {receipt.remark && (
            <div className="rounded-2xl bg-white shadow-sm border border-blue-100 overflow-hidden">
              <div className="p-4 border-b border-blue-50 bg-blue-50/30">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <AlignLeft size={16} className="text-blue-500" /> Remarks
                </h3>
              </div>
              <div className="p-6 text-sm text-blue-700 whitespace-pre-wrap">
                {receipt.remark}
              </div>
            </div>
          )}
        </div>

        {/* Amount Summary & Creator */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg border border-emerald-400 overflow-hidden text-white relative">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <DollarSign size={100} />
            </div>
            <div className="p-6 relative z-10">
              <p className="text-emerald-100 text-xs font-bold tracking-wider uppercase mb-1">Amount Received</p>
              <h2 className="text-4xl font-black mb-4">
                <span className="text-emerald-200 text-2xl mr-1">{receipt.currency?.code}</span>
                {Number(receipt.amountReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <div className="space-y-2 text-sm text-emerald-50 pt-4 border-t border-emerald-400/30">
                <div className="flex justify-between">
                  <span>Exchange Rate</span>
                  <span className="font-mono">{Number(receipt.exchangeRate).toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-sm border border-blue-100 overflow-hidden">
             <div className="p-4 border-b border-blue-50 bg-blue-50/30">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <User size={16} className="text-blue-500" /> System Info
                </h3>
              </div>
              <div className="p-5 space-y-4 text-sm">
                <div>
                  <p className="text-xs text-blue-400 font-semibold mb-1">Created By</p>
                  <p className="text-blue-900 font-medium">{receipt.creator?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-400 font-semibold mb-1">Created At</p>
                  <p className="text-blue-900 font-medium">{new Date(receipt.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-400 font-semibold mb-1">Last Updated</p>
                  <p className="text-blue-900 font-medium">{new Date(receipt.updatedAt).toLocaleString()}</p>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-blue-300 [&>svg]:w-5 [&>svg]:h-5">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-blue-900/60 uppercase tracking-wider mb-1">{label}</p>
        <p className="font-semibold text-blue-900">{value}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "Confirmed"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : status === "Draft"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : status === "Void"
      ? "bg-rose-100 text-rose-700 border-rose-200"
      : "bg-blue-100 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${cls}`}>
      {status}
    </span>
  );
}
