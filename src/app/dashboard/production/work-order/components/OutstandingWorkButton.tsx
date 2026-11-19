"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, X, Loader2, Inbox, AlertCircle } from "lucide-react";
import { EmptyState, buttonClass } from "@/components/form-ui";
import { useRouter } from "next/navigation";
import { createWorkOrderFromBatch, getOutstandingWorkBatches } from "../actions";

type Batch = Awaited<ReturnType<typeof getOutstandingWorkBatches>>[number];

export default function OutstandingWorkButton() {
  const [isOpen, setOpen] = useState(false);
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function open() {
    setOpen(true);
    setError("");
    setSelected(null);
    setLoading(true);
    try {
      const rows = await getOutstandingWorkBatches();
      setBatches(rows);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
  }

  function create() {
    if (!selected) return;
    setError("");
    startTransition(async () => {
      const res = await createWorkOrderFromBatch(selected);
      if (!res.success) {
        setError(res.error || "Failed to create");
        return;
      }
      setOpen(false);
      router.push(`/dashboard/production/work-order/${res.workOrderNo}`);
    });
  }

  return (
    <>
      <button type="button" onClick={open} className={buttonClass("primary", "md")}>
        <ClipboardList size={14} /> Outstanding Work
      </button>

      {/* Portalled to <body>: the dashboard content sits in a z-10 stacking context,
          so a fixed overlay rendered in place would stay under the sidebar. */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={close} />
          <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-600/15">
                  <ClipboardList size={15} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold leading-tight text-slate-800">Outstanding Work</h3>
                  <p className="truncate text-[11px] leading-tight text-slate-500">Confirmed Sales Order batches awaiting a work order — pick one to create it</p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto">
              {error && (
                <div className="m-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-10 text-indigo-500">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : !batches || batches.length === 0 ? (
                <EmptyState icon={Inbox} tone="slate" title="No outstanding sales order batches" description="Batches appear here once a sales order is confirmed." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <th className="w-8 py-2 pl-4 pr-1 font-medium"><span className="sr-only">Select</span></th>
                        <th className="px-3 py-2 font-medium">Work Order No</th>
                        <th className="px-3 py-2 font-medium">SO No</th>
                        <th className="px-3 py-2 font-medium">Customer</th>
                        <th className="hidden px-3 py-2 font-medium md:table-cell">Job</th>
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                        <th className="px-4 py-2 font-medium">Delivery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batches.map((b) => {
                        const isSelected = selected === b.batchId;
                        return (
                          <tr
                            key={b.batchId}
                            onClick={() => setSelected(b.batchId)}
                            aria-selected={isSelected}
                            className={`cursor-pointer transition-colors ${isSelected ? "bg-indigo-50/70" : "hover:bg-indigo-50/40"}`}
                          >
                            <td className="py-2 pl-4 pr-1">
                              <input
                                type="radio"
                                checked={isSelected}
                                onChange={() => setSelected(b.batchId)}
                                aria-label={`Select ${b.workOrderNo}`}
                                className="h-3.5 w-3.5 accent-indigo-600"
                              />
                            </td>
                            <td className="px-3 py-2 font-mono text-xs font-semibold text-indigo-700">{b.workOrderNo}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-600">{b.salesOrderNo}</td>
                            <td className="px-3 py-2 text-slate-800">{b.customer}</td>
                            <td className="hidden max-w-[240px] px-3 py-2 md:table-cell">
                              <p className="truncate text-slate-600" title={b.jobDescription ?? ""}>{b.jobDescription}</p>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="font-semibold tabular-nums text-slate-900">{b.quantity}</span>
                              <span className="ml-1 text-[11px] text-slate-400">{b.uom}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                              {new Date(b.deliveryDate).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <button type="button" onClick={close} className={buttonClass("ghost", "md")}>
                Close
              </button>
              <button type="button" onClick={create} disabled={!selected || isPending} className={buttonClass("primary", "md")}>
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {isPending ? "Creating…" : "Create Work Order"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
