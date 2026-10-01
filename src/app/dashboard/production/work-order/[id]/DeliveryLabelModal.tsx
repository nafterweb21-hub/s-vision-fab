"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useState } from "react";
import { X, Printer } from "lucide-react";
export default function DeliveryLabelModal({ 
  workOrderNo, 
  defaultQty, 
  defaultUom,
  uoms
}: { 
  workOrderNo: string;
  defaultQty: string;
  defaultUom: string;
  uoms: { id: string; uomName: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [qty, setQty] = useState(defaultQty || "1");
  const [uom, setUom] = useState(defaultUom || "");

  const handlePrint = () => {
    const params = new URLSearchParams();
    if (expiryDate) params.set("expiryDate", expiryDate);
    if (qty) params.set("qty", qty);
    if (uom) params.set("uom", uom);
    window.open(`/print/delivery-label/${encodeURIComponent(workOrderNo)}?${params.toString()}`, "_blank");
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-2 py-1 sm:px-4 sm:py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded sm:rounded-lg text-[10px] sm:text-sm font-semibold transition-colors border border-indigo-200"
      >
        <Printer size={12} className="sm:w-4 sm:h-4" />
        Print Label
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Print Delivery Label</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1">Date does not save into the system</p>
              </div>
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">UOM</label>
                  <SearchableSelect
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                  >
                    <option value="">Select UOM</option>
                    {uoms.map(u => (
                      <option key={u.id} value={u.uomName}>{u.uomName}</option>
                    ))}
                  </SearchableSelect>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Printer size={16} />
                Generate Label
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
