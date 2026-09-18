"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";

type MovementDetail = {
  id: string;
  transactionType: "GR" | "RTN" | "PO";
  transactionNo: string;
  transactionDate: string;
  supplier: string;
  workOrderNo: string;
  customer: string;
  poUom: string;
  poQty: number;
  conversion: number;
  internalUom: string;
  internalQty: number;
  inOut: "In" | "Out";
  unitPrice: number;
  amountPoCurrency: number;
  amountSgd: number;
  deliveryDate: string;
  invoiceNo: string;
  receiveStatus: string;
};

export default function MovementModal({ 
  materialId, 
  description,
  onClose 
}: { 
  materialId: string; 
  description: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<MovementDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMovement() {
      try {
        const res = await fetch(`/api/inventory/movement?materialId=${materialId}`);
        if (!res.ok) throw new Error("Failed to load movement details");
        setRows(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMovement();
  }, [materialId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-blue-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-blue-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50/50">
          <div>
            <h3 className="text-lg font-bold text-blue-900">Material Movement Detail</h3>
            <p className="text-sm text-blue-600">{description}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-blue-400 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-blue-500">Loading movements...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center gap-3 text-rose-700">
              <AlertCircle size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white border border-blue-200 rounded-xl p-12 text-center shadow-sm">
              <p className="text-blue-600 font-semibold">No movements found for this material.</p>
            </div>
          ) : (
            <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-[11px] text-blue-500 bg-blue-50/80 uppercase tracking-wider border-b border-blue-200">
                    <tr>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Trans No</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Supplier</th>
                      <th className="px-3 py-3">Customer</th>
                      <th className="px-3 py-3">WO No</th>
                      <th className="px-3 py-3">In/Out</th>
                      <th className="px-3 py-3 text-right">PO Qty</th>
                      <th className="px-3 py-3 text-right">Internal Qty</th>
                      <th className="px-3 py-3 text-right">Unit Price</th>
                      <th className="px-3 py-3 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            r.transactionType === "GR" ? "bg-emerald-100 text-emerald-700" :
                            r.transactionType === "RTN" ? "bg-rose-100 text-rose-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {r.transactionType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-blue-900">{r.transactionNo || "—"}</td>
                        <td className="px-3 py-2.5 text-blue-700">{new Date(r.transactionDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2.5 text-blue-700 truncate max-w-[150px]" title={r.supplier}>{r.supplier || "—"}</td>
                        <td className="px-3 py-2.5 text-blue-700 truncate max-w-[120px]" title={r.customer}>{r.customer || "—"}</td>
                        <td className="px-3 py-2.5 text-blue-700">{r.workOrderNo || "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className={`font-bold ${r.inOut === "In" ? "text-emerald-600" : "text-rose-600"}`}>
                            {r.inOut}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-blue-700">{r.poQty.toFixed(2)} <span className="text-[10px]">{r.poUom}</span></td>
                        <td className="px-3 py-2.5 text-right font-medium text-blue-900">{r.internalQty.toFixed(2)} <span className="text-[10px]">{r.internalUom}</span></td>
                        <td className="px-3 py-2.5 text-right text-blue-700">{r.unitPrice.toFixed(4)}</td>
                        <td className="px-3 py-2.5 text-right text-blue-700 font-medium">${r.amountSgd.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
