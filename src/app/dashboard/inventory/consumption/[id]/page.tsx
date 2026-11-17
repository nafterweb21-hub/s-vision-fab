"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  PackageMinus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { canCreate, canEdit } from "@/lib/access";
import { SearchableSelect } from "@/components/SearchableSelect";

const MODULE = "MATERIAL_CONSUMPTION";
const API = "/api/inventory/consumption";
const LIST = "/dashboard/inventory/consumption";

type ConsumptionItem = {
  id: string;
  stockItemId: string;
  quantity: number;
  remark: string | null;
};

type Consumption = {
  id: string;
  mcNo: string;
  date: string;
  workOrderNo: string;
  issuedById: string;
  remark: string | null;
  status: "Draft" | "Submitted" | "Void";
  items: ConsumptionItem[];
};

type StockOption = {
  id: string;
  label: string;
  uomName: string;
  unitCost: number;
  onHand: number;
};

type Lookups = {
  stockItems: StockOption[];
  workOrders: { workOrderNo: string; customerName: string; jobDescription: string }[];
  employees: { id: string; label: string }[];
};

/** A form line. `stockItemId` empty means the row is a not-yet-filled placeholder. */
type FormLine = { stockItemId: string; quantity: string; remark: string };

const blankLine = (): FormLine => ({ stockItemId: "", quantity: "", remark: "" });

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Submitted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Void: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function ConsumptionFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";

  const { data: session } = useSession();
  const role = session?.user?.role;
  const permissions = session?.user?.permissions;
  const allowed = isNew ? canCreate(permissions, MODULE, role) : canEdit(permissions, MODULE, role);

  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [existing, setExisting] = useState<Consumption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [workOrderNo, setWorkOrderNo] = useState("");
  const [issuedById, setIssuedById] = useState("");
  const [remark, setRemark] = useState("");
  const [lines, setLines] = useState<FormLine[]>([blankLine()]);

  useEffect(() => {
    (async () => {
      try {
        const lookupRes = await fetch(`${API}/lookups`);
        if (!lookupRes.ok) throw new Error("Failed to load pickers");
        setLookups(await lookupRes.json());

        if (!isNew) {
          const res = await fetch(`${API}/${id}`);
          const doc = await res.json();
          if (!res.ok) throw new Error(doc.error || "Failed to load consumption");

          setExisting(doc);
          setDate(doc.date.slice(0, 10));
          setWorkOrderNo(doc.workOrderNo);
          setIssuedById(doc.issuedById);
          setRemark(doc.remark ?? "");
          setLines(
            doc.items.length > 0
              ? doc.items.map((i: ConsumptionItem) => ({
                  stockItemId: i.stockItemId,
                  quantity: String(i.quantity),
                  remark: i.remark ?? "",
                }))
              : [blankLine()],
          );
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const isSubmitted = existing?.status === "Submitted";
  const isVoid = existing?.status === "Void";

  const stockById = useMemo(
    () => new Map((lookups?.stockItems ?? []).map((s) => [s.id, s])),
    [lookups],
  );

  /**
   * A submitted document's own lines are already subtracted from the on-hand the
   * lookups report, so editing one would see the stock it is itself holding as
   * gone. Credit those lines back — the same correction the server makes.
   */
  const credited = useMemo(() => {
    const map = new Map<string, number>();
    if (existing?.status === "Submitted") {
      for (const item of existing.items) {
        map.set(item.stockItemId, (map.get(item.stockItemId) ?? 0) + item.quantity);
      }
    }
    return map;
  }, [existing]);

  /** On hand as this document sees it; null when the stock item is not loaded. */
  function availableFor(stockItemId: string): number | null {
    const stock = stockById.get(stockItemId);
    if (!stock) return null;
    return stock.onHand + (credited.get(stockItemId) ?? 0);
  }

  const filled = lines.filter((l) => l.stockItemId);
  const total = filled.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (stockById.get(l.stockItemId)?.unitCost ?? 0),
    0,
  );

  /**
   * Client-side mirror of the server's over-issue check. The server is still
   * authoritative — this only spares the user a round trip.
   */
  const overIssued = filled.filter((l) => {
    const available = availableFor(l.stockItemId);
    return available !== null && Number(l.quantity) > available;
  });

  const duplicated = filled.length !== new Set(filled.map((l) => l.stockItemId)).size;

  function setLine(index: number, patch: Partial<FormLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function save(submit: boolean) {
    if (!workOrderNo) return toast.error("Work Order is required");
    if (!issuedById) return toast.error("Issued By is required");
    if (filled.length === 0) return toast.error("Add at least one item");
    if (duplicated) return toast.error("The same item appears on more than one line");
    if (filled.some((l) => !(Number(l.quantity) > 0)))
      return toast.error("Every line needs a quantity greater than zero");
    // A submitted document is holding stock whether or not this save "submits",
    // so its lines are held to the same limit.
    if ((submit || isSubmitted) && overIssued.length > 0)
      return toast.error("Some lines issue more than the stock on hand");

    setSaving(true);
    try {
      const payload = {
        date,
        workOrderNo,
        issuedById,
        remark,
        items: filled.map((l, i) => ({
          stockItemId: l.stockItemId,
          quantity: Number(l.quantity),
          remark: l.remark || null,
          sortOrder: i,
        })),
        ...(isNew ? { submit } : {}),
      };

      const res = await fetch(isNew ? API : `${API}/${id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to save");

      // Submitting from the edit form is a save followed by an explicit
      // transition — but only for a Draft. A document that is already Submitted
      // has nothing to transition to; the save alone has moved its stock.
      if (!isNew && submit && !isSubmitted) {
        const sres = await fetch(`${API}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit" }),
        });
        const sbody = await sres.json();
        if (!sres.ok) throw new Error(sbody.error || "Saved, but failed to submit");
      }

      toast.success(
        isSubmitted
          ? `${existing!.mcNo} updated — stock on hand adjusted`
          : submit
            ? "Consumption submitted"
            : "Draft saved",
      );
      router.push(LIST);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
      setSaving(false);
    }
  }

  const selectedWo = lookups?.workOrders.find((w) => w.workOrderNo === workOrderNo);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
        <p className="text-sm text-blue-500">Loading…</p>
      </div>
    );
  }

  if (error || !lookups) {
    return (
      <div className="py-3 space-y-4 w-full">
        <BackLink />
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center gap-3 text-rose-700">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{error || "Failed to load"}</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="py-3 space-y-4 w-full">
        <BackLink />
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-sm text-slate-700">
          You do not have permission to {isNew ? "create" : "edit"} a material consumption.
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 space-y-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-blue-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase mb-1">
            <BackLink />
            {existing && (
              <>
                <span>/</span>
                <span className="text-blue-500">{existing.mcNo}</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[10px] border ${STATUS_STYLES[existing.status]}`}
                >
                  {existing.status}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
              <PackageMinus size={20} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-blue-900">
              {isNew ? "New Material Consumption" : `Edit ${existing?.mcNo ?? ""}`}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={LIST}
            className="px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          {!isSubmitted && !isVoid && (
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-semibold text-blue-700 bg-white border border-blue-300 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Draft"}
            </button>
          )}
          <button
            onClick={() => save(true)}
            disabled={saving || isVoid || overIssued.length > 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-lg shadow-md shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubmitted ? (
              <Save size={16} />
            ) : (
              <Check size={16} />
            )}
            {isSubmitted ? "Save Changes" : "Submit & Issue"}
          </button>
        </div>
      </div>

      <p className="text-sm text-blue-600 -mt-2">
        {isVoid
          ? "This consumption is void — read-only. Raise a new one instead."
          : isSubmitted
            ? "This document has already issued stock. Saving re-issues these lines and adjusts stock on hand immediately."
            : "Issue stock to a work order. A draft holds no stock until it is submitted."}
      </p>

      <fieldset disabled={isVoid} className="space-y-5 disabled:opacity-60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Date" required>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Work Order" required>
            <SearchableSelect
              value={workOrderNo}
              onChange={(e) => setWorkOrderNo(e.target.value)}
              className={INPUT}
            >
              <option value="">Select a work order…</option>
              {lookups.workOrders.map((w) => (
                <option key={w.workOrderNo} value={w.workOrderNo}>
                  {w.workOrderNo}
                  {w.customerName ? ` — ${w.customerName}` : ""}
                </option>
              ))}
            </SearchableSelect>
          </Field>
          <Field label="Issued By" required>
            <SearchableSelect
              value={issuedById}
              onChange={(e) => setIssuedById(e.target.value)}
              className={INPUT}
            >
              <option value="">Select an employee…</option>
              {lookups.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </SearchableSelect>
          </Field>
        </div>

        {selectedWo?.jobDescription && (
          <p className="text-xs text-blue-500 -mt-2">Job: {selectedWo.jobDescription}</p>
        )}

        <Field label="Remark">
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Optional note about this issue"
            className={INPUT}
          />
        </Field>

        <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 bg-blue-50/50">
            <h4 className="text-sm font-bold text-blue-900">Items</h4>
            <button
              onClick={() => setLines((prev) => [...prev, blankLine()])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors"
            >
              <Plus size={14} /> Add line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-blue-500 bg-blue-50/40 uppercase tracking-wider border-b border-blue-200">
                <tr>
                  <th className="px-3 py-2.5 min-w-[280px]">Item</th>
                  <th className="px-3 py-2.5 text-right w-28">On Hand</th>
                  <th className="px-3 py-2.5 text-right w-32">Qty</th>
                  <th className="px-3 py-2.5 w-20">UOM</th>
                  <th className="px-3 py-2.5 text-right w-28">Unit Cost</th>
                  <th className="px-3 py-2.5 text-right w-28">Amount</th>
                  <th className="px-3 py-2.5 min-w-[180px]">Remark</th>
                  <th className="px-3 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {lines.map((line, index) => {
                  const stock = stockById.get(line.stockItemId);
                  const available = availableFor(line.stockItemId);
                  const qty = Number(line.quantity) || 0;
                  const over = available !== null && qty > available;
                  return (
                    <tr key={index} className="hover:bg-blue-50/20">
                      <td className="px-3 py-2">
                        <SearchableSelect
                          value={line.stockItemId}
                          onChange={(e) => setLine(index, { stockItemId: e.target.value })}
                          className={INPUT}
                        >
                          <option value="">Select an item…</option>
                          {lookups.stockItems.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </SearchableSelect>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          available !== null && available <= 0 ? "text-rose-600" : "text-blue-700"
                        }`}
                      >
                        {available !== null ? available.toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={line.quantity}
                          onChange={(e) => setLine(index, { quantity: e.target.value })}
                          className={`${INPUT} text-right ${over ? "border-rose-400 bg-rose-50" : ""}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-blue-600 text-xs">{stock?.uomName ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-blue-700">
                        {stock ? stock.unitCost.toFixed(4) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-blue-900">
                        {stock ? `$${(qty * stock.unitCost).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={line.remark}
                          onChange={(e) => setLine(index, { remark: e.target.value })}
                          className={INPUT}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() =>
                            setLines((prev) =>
                              prev.length === 1 ? [blankLine()] : prev.filter((_, i) => i !== index),
                            )
                          }
                          title="Remove line"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-md transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-6 px-4 py-3 border-t border-blue-100 bg-blue-50/40">
            <span className="text-xs uppercase tracking-wider text-blue-500 font-semibold">
              Total Cost
            </span>
            <span className="text-lg font-bold text-blue-900">${total.toFixed(2)}</span>
          </div>
        </div>

        {overIssued.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Not enough stock on hand</p>
              <p className="text-rose-600">
                {overIssued
                  .map((l) => stockById.get(l.stockItemId)?.label)
                  .filter(Boolean)
                  .join("; ")}
              </p>
              {!isSubmitted && (
                <p className="text-xs mt-1 text-rose-500">
                  You can still save this as a draft — a draft does not move stock.
                </p>
              )}
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
}

function BackLink() {
  return (
    <Link href={LIST} className="hover:text-blue-600 inline-flex items-center gap-1">
      <ArrowLeft size={12} /> Material Consumption
    </Link>
  );
}

const INPUT =
  "w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-blue-500">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
