"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useState } from "react";
import { X, Tag, Printer } from "lucide-react";
import { Field, buttonClass, inputClass, selectTriggerClass } from "@/components/form-ui";

/** Delivery label: print-only fields, never saved (spec: work-order.md "Label printing"). */
export default function DeliveryLabelModal({
  workOrderNo,
  defaultQty,
  defaultUom,
  uoms,
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

  const valid = Number(qty) > 0 && !!uom;

  const handlePrint = () => {
    if (!valid) return;
    const params = new URLSearchParams();
    if (expiryDate) params.set("expiryDate", expiryDate);
    params.set("qty", qty);
    params.set("uom", uom);
    window.open(`/print/delivery-label/${encodeURIComponent(workOrderNo)}?${params.toString()}`, "_blank");
    setIsOpen(false);
  };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={buttonClass("secondary", "md")}>
        <Tag size={14} /> Print Label
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-600/15">
                  <Tag size={15} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[13px] font-semibold leading-tight text-slate-800">Print Delivery Label</h2>
                  <p className="truncate font-mono text-[11px] leading-tight text-slate-500">{workOrderNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <Field label="Expiry Date">
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Quantity" required>
                  <input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} className={`${inputClass} text-right tabular-nums`} />
                </Field>
                <Field label="UOM" required>
                  <SearchableSelect value={uom} onChange={(e) => setUom(e.target.value)} className={selectTriggerClass}>
                    <option value="">Select UOM</option>
                    {uoms.map((u) => (
                      <option key={u.id} value={u.uomName}>{u.uomName}</option>
                    ))}
                  </SearchableSelect>
                </Field>
              </div>
              <p className="text-[11px] text-slate-500">Quantity and UOM default from the work order. Nothing here is saved.</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <button type="button" onClick={() => setIsOpen(false)} className={buttonClass("ghost", "md")}>
                Cancel
              </button>
              <button type="button" onClick={handlePrint} disabled={!valid} className={buttonClass("primary", "md")}>
                <Printer size={14} /> Generate Label
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
