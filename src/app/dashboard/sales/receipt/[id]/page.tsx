/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  AlertTriangle,
  Banknote,
  ArrowLeft,
  CheckCircle2,
  Ban,
  Edit2,
  Printer,
  Building2,
  CalendarDays,
  FileText,
  Hash,
  Lock,
  StickyNote,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { Badge, Card, MetaChip, StatusBadge, buttonClass } from "@/components/form-ui";
import { getReceipt, transitionReceiptAction } from "../receipt.actions";
import {
  emeraldButtonClass,
  fmtDate,
  formatAmount,
  normalizeReceiptStatus,
  paymentMethodMeta,
  receiptStatusTone,
  referenceLabel,
} from "../rc-status";
import { InvoiceBalanceCard, ReceiptSummaryRail, type BalanceMode } from "../ReceiptPanels";

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
    const voidPrompt =
      receipt?.status === "Draft"
        ? `Void draft receipt ${receipt?.receiptNo}? It was never applied to the invoice; the number stays used.`
        : `Void receipt ${receipt?.receiptNo}? Its amount will be taken off the invoice.`;
    if (!await customConfirm(voidPrompt)) return;
    setProcessing(true);
    const res = await transitionReceiptAction(id, "void");
    if (!res.success) hotToast.error(res.error || "Failed to void");
    else await fetchReceipt();
    setProcessing(false);
  }

  function handlePrint() {
    if (receipt?.status !== "Confirmed") return hotToast.error("Only Confirmed receipts can be printed");
    window.open(`/print/receipt/${id}`, "_blank");
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (errorMsg || !receipt) {
    return (
      <div className="space-y-3">
        <Link href="/dashboard/sales/receipt" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={12} /> Receipts
        </Link>
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          <p className="font-medium">{errorMsg || "Receipt not found."}</p>
        </div>
      </div>
    );
  }

  // ---- Display-only derivations ----
  const status: string = receipt.status;
  const displayStatus = normalizeReceiptStatus(status);
  const code: string = receipt.currency?.code || "";
  const amount = Number(receipt.amountReceived) || 0;
  const inv = receipt.invoice;
  const method = paymentMethodMeta(receipt.paymentMethod);
  const mode: BalanceMode = displayStatus === "Confirmed" ? "applied" : displayStatus === "Void" ? "void" : "pending";
  const invBalance = Number(inv?.balanceDue) || 0;
  const balanceAfter = inv ? (mode === "pending" ? invBalance - amount : invBalance) : null;
  const over = !!inv && mode === "pending" && amount > invBalance;
  const currencyMismatch = !!inv && !!inv.currencyId && inv.currencyId !== receipt.currencyId;

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
              <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Receipt</span>
                <span className="truncate font-mono text-lg font-semibold text-slate-900">{receipt.receiptNo}</span>
              </h1>
              <StatusBadge status={displayStatus} tone={receiptStatusTone(status)} size="md" />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Customer">{receipt.customer?.customerName || "—"}</MetaChip>
              <MetaChip icon={CalendarDays} title="Receipt date">{fmtDate(receipt.receiptDate)}</MetaChip>
              {inv?.invoiceNo && <MetaChip icon={FileText} label="Inv" title="Invoice">{inv.invoiceNo}</MetaChip>}
              <MetaChip icon={method.icon} title="Payment method">{receipt.paymentMethod}</MetaChip>
              {receipt.chequeRefNo && (
                <MetaChip icon={Hash} label={referenceLabel(receipt.paymentMethod)} title="Reference">{receipt.chequeRefNo}</MetaChip>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset ${
                  displayStatus === "Void" ? "bg-slate-100 text-slate-500 line-through ring-slate-500/15" : "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
                }`}
              >
                <Banknote size={12} /> {code} {formatAmount(amount)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            {receipt.status === "Draft" && (
              <>
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/sales/receipt/form?id=${receipt.id}`)}
                  disabled={processing}
                  className={buttonClass("secondary", "md")}
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button type="button" onClick={handleConfirm} disabled={processing} className={emeraldButtonClass}>
                  {processing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Confirm
                </button>
              </>
            )}
            {receipt.status !== "Void" && (
              <button type="button" onClick={handleVoid} disabled={processing} className={buttonClass("danger", "md")}>
                <Ban size={14} /> Void
              </button>
            )}
            {receipt.status === "Confirmed" && (
              <button type="button" onClick={handlePrint} disabled={processing} className={buttonClass("secondary", "md")}>
                <Printer size={14} /> Print
              </button>
            )}
            {receipt.status !== "Draft" && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            )}
          </div>
        </div>
      </div>

      {currencyMismatch && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          <AlertTriangle size={14} className="shrink-0" />
          <p>
            This receipt is in <span className="font-semibold">{code || "—"}</span> but the invoice is in a different currency. Amounts are compared as-is, without conversion.
          </p>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          <Card icon={FileText} tone="indigo" title="Receipt details" description="Number, date and company">
            <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <ReadItem label="Receipt No" mono>{receipt.receiptNo}</ReadItem>
              <ReadItem label="Receipt Date">{new Date(receipt.receiptDate).toLocaleDateString()}</ReadItem>
              <ReadItem label="Company">{receipt.company?.companyName}</ReadItem>
              <ReadItem label="Status">
                <StatusBadge status={displayStatus} tone={receiptStatusTone(status)} />
              </ReadItem>
            </dl>
          </Card>

          <Card icon={Users} tone="sky" title="Customer & invoice" description="Who paid and which document it settles">
            <div className="space-y-3">
              <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <ReadItem label="Customer">{receipt.customer?.customerName}</ReadItem>
                <ReadItem label="Invoice No" mono>{receipt.invoice?.invoiceNo}</ReadItem>
              </dl>
              {inv && (
                <InvoiceBalanceCard
                  code={code}
                  invoiceNo={inv.invoiceNo}
                  invoiceType={inv.invoiceType}
                  invoiceStatus={inv.status}
                  total={Number(inv.amountAfterTax) || 0}
                  paid={Number(inv.amountPaid) || 0}
                  balance={invBalance}
                  amount={amount}
                  mode={mode}
                />
              )}
            </div>
          </Card>

          <Card icon={Wallet} tone="emerald" title="Payment method & reference" description="How the money arrived and how much">
            <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <ReadItem label="Payment Method">
                <Badge tone={method.tone} icon={method.icon} size="md">{receipt.paymentMethod}</Badge>
              </ReadItem>
              <ReadItem label="Cheque / Ref No" mono>{receipt.chequeRefNo || "—"}</ReadItem>
              <ReadItem label="Currency">{code || "—"}</ReadItem>
              <ReadItem label="Exchange Rate" mono>{Number(receipt.exchangeRate).toFixed(4)}</ReadItem>
              <div className="min-w-0 sm:col-span-2">
                <dt className="mb-1 text-xs font-medium text-slate-600">Amount Received</dt>
                <dd className={`flex items-baseline gap-1.5 rounded-lg border-2 px-3 py-2 ${displayStatus === "Void" ? "border-slate-200 bg-slate-50" : "border-emerald-200 bg-emerald-50/40"}`}>
                  <span className="text-xs font-medium text-emerald-600">{code}</span>
                  <span className={`text-lg font-semibold tabular-nums ${displayStatus === "Void" ? "text-slate-400 line-through" : "text-emerald-800"}`}>
                    {Number(receipt.amountReceived).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </dd>
              </div>
            </dl>
          </Card>

          {receipt.remark && (
            <Card icon={StickyNote} tone="slate" title="Remarks">
              <p className="whitespace-pre-wrap text-[13px] text-slate-700">{receipt.remark}</p>
            </Card>
          )}
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4 xl:sticky xl:top-28 xl:self-start">
          <ReceiptSummaryRail
            code={code}
            amount={amount}
            over={over}
            struck={displayStatus === "Void"}
            balanceAfter={balanceAfter}
            rows={[
              { label: "Invoice", value: inv?.invoiceNo || "—", mono: true },
              { label: "Method", value: receipt.paymentMethod || "—" },
              { label: "Exchange Rate", value: Number(receipt.exchangeRate).toFixed(4) },
              ...(inv ? [{ label: mode === "applied" ? "Invoice balance" : "Balance due", value: formatAmount(invBalance) }] : []),
            ]}
            footnote={
              displayStatus === "Draft"
                ? "Draft: the invoice balance changes only when this receipt is confirmed."
                : displayStatus === "Void"
                ? "Void: not counted against the invoice."
                : "Confirmed: applied to the invoice balance."
            }
          />

          <Card icon={User} tone="slate" title="System info">
            <dl className="space-y-2.5 text-[13px]">
              <ReadItem label="Created By">{receipt.creator?.name || "—"}</ReadItem>
              <ReadItem label="Created At">{new Date(receipt.createdAt).toLocaleString()}</ReadItem>
              <ReadItem label="Last Updated">{new Date(receipt.updatedAt).toLocaleString()}</ReadItem>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReadItem({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-0.5 text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className={`truncate text-[13px] font-medium text-slate-900 ${mono ? "font-mono" : ""}`}>{children || "—"}</dd>
    </div>
  );
}
