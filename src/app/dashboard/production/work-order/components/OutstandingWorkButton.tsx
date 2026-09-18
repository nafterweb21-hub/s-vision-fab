"use client";

import { useState, useTransition } from "react";
import { ClipboardList, X, Loader2 } from "lucide-react";
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
      <button
        onClick={open}
        className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
      >
        <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
        Outstanding Work
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Outstanding Work</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirmed Sales Order batches awaiting work order creation
                </p>
              </div>
              <button onClick={close} className="p-1 hover:bg-slate-200 rounded-md text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {error && (
                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-10 text-slate-500">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : !batches || batches.length === 0 ? (
                <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                  <p className="text-sm">No outstanding sales order batches.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-3 py-2 font-semibold">Work Order No</th>
                        <th className="px-3 py-2 font-semibold">SO No</th>
                        <th className="px-3 py-2 font-semibold">Customer</th>
                        <th className="px-3 py-2 font-semibold">Job</th>
                        <th className="px-3 py-2 font-semibold text-right">Qty</th>
                        <th className="px-3 py-2 font-semibold">UOM</th>
                        <th className="px-3 py-2 font-semibold">Delivery Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batches.map((b) => (
                        <tr
                          key={b.batchId}
                          onClick={() => setSelected(b.batchId)}
                          className={`cursor-pointer hover:bg-slate-50 ${selected === b.batchId ? "bg-blue-50" : ""}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="radio"
                              checked={selected === b.batchId}
                              onChange={() => setSelected(b.batchId)}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-blue-700">{b.workOrderNo}</td>
                          <td className="px-3 py-2">{b.salesOrderNo}</td>
                          <td className="px-3 py-2">{b.customer}</td>
                          <td className="px-3 py-2 max-w-xs truncate">{b.jobDescription}</td>
                          <td className="px-3 py-2 text-right">{b.quantity}</td>
                          <td className="px-3 py-2">{b.uom}</td>
                          <td className="px-3 py-2">{new Date(b.deliveryDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={close}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={create}
                disabled={!selected || isPending}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium shadow-sm shadow-blue-500/20"
              >
                {isPending ? "Creating..." : "Create New Work Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
