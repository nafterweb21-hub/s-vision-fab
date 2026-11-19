"use client";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
  SearchX,
  ClipboardList,
  Building2,
  Wrench,
  Package,
  ChevronRight,
} from "lucide-react";
import { EmptyState, InitialsAvatar, MetaChip, StatusBadge, buttonClass } from "@/components/form-ui";
import { Breadcrumb, ErrorBlock, LoadingBlock, SearchBar } from "@/components/purchasing/DocListParts";
import { PoLineCard, SrfFieldsCard, fmtDate, srfQuantityError, type SrfFieldValues } from "../SrfParts";

const today = () => new Date().toISOString().slice(0, 10);

export default function NewSubconRequestFormPage() {
  const router = useRouter();

  // Step 1: outstanding PO-Subcon lines
  const [outstandingItems, setOutstandingItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Step 2: the form
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [values, setValues] = useState<SrfFieldValues>({
    srfDate: today(),
    outsourcedById: "",
    dateRequired: "",
    receivedById: "",
    quantity: 0,
    remark: "",
  });
  const [saving, setSaving] = useState(false);

  // Debounce the server-side search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingItems(true);
      setItemsError("");
      try {
        const res = await fetch(`/api/purchasing/subcon-request-form/outstanding-po-items?search=${encodeURIComponent(debouncedSearch)}`);
        if (!res.ok) throw new Error("Failed to fetch outstanding PO items");
        const data = await res.json();
        if (!cancelled) setOutstandingItems(data);
      } catch (err: any) {
        if (!cancelled) setItemsError(err.message);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  // Employees only need loading once.
  useEffect(() => {
    fetch("/api/employees")
      .then((res) => (res.ok ? res.json() : []))
      .then(setEmployees)
      .catch((e) => console.error(e));
  }, []);

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    // Spec defaults: Outsourced By = PO purchaser, Date Required = PO delivery date,
    // Received By = PO contact person, Quantity = what is still available on the line.
    setValues((v) => ({
      ...v,
      outsourcedById: item.purchaseOrder.purchaser?.id || "",
      dateRequired: item.deliveryDate ? new Date(item.deliveryDate).toISOString().slice(0, 10) : today(),
      receivedById: item.purchaseOrder.contactPerson?.id || "",
      quantity: item.availableQuantity || 0,
    }));
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    if (!values.outsourcedById) return hotToast.error("Outsourced By is required");
    if (!values.dateRequired) return hotToast.error("Date Required is required");
    const qtyError = srfQuantityError(values.quantity, selectedItem.availableQuantity);
    if (qtyError) return hotToast.error(qtyError);

    setSaving(true);
    try {
      const res = await fetch("/api/purchasing/subcon-request-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          purchaseOrderItemId: selectedItem.id,
          quantity: Number(values.quantity),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create Subcon Request Form");
      }
      const created = await res.json();
      router.push(
        `/dashboard/saved?module=Subcon Request&id=${created.srfNo || created.id}&viewUrl=/dashboard/purchasing/subcon-request-form/${created.id}&backUrl=/dashboard/purchasing/subcon-request-form`,
      );
    } catch (err: any) {
      hotToast.error(err.message);
      setSaving(false);
    }
  };

  // ---------------- Step 1: pick a PO line ----------------
  if (!selectedItem) {
    return (
      <div className="relative space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 sm:inline-flex">
              <ClipboardList size={18} />
            </span>
            <div className="min-w-0">
              <Breadcrumb current="Subcon Request Form" />
              <h1 className="text-lg font-semibold leading-tight text-slate-900">New Subcon Request Form</h1>
              <p className="text-xs text-slate-500">Step 1 of 2 — pick the Issued PO-Subcon line you're handing items over for.</p>
            </div>
          </div>
          <Link href="/dashboard/purchasing/subcon-request-form" className={buttonClass("secondary", "md")}>
            <ArrowLeft size={14} /> Back
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by PO No, Supplier or Description..."
            refreshing={loadingItems && outstandingItems.length > 0}
            hasFilters={search.trim() !== ""}
            onClear={() => setSearch("")}
          />

          {loadingItems && outstandingItems.length === 0 ? (
            <LoadingBlock label="Loading outstanding items..." />
          ) : itemsError ? (
            <ErrorBlock message={itemsError} />
          ) : outstandingItems.length === 0 ? (
            search.trim() ? (
              <EmptyState
                icon={SearchX}
                tone="slate"
                title="No outstanding lines match your search"
                action={
                  <button type="button" onClick={() => setSearch("")} className={buttonClass("secondary", "md")}>
                    Clear search
                  </button>
                }
              />
            ) : (
              <EmptyState
                icon={Package}
                tone="indigo"
                title="No outstanding PO-Subcon lines"
                description="Lines appear here once a PO-Subcon is Issued and they aren't fully covered by other request forms."
              />
            )
          ) : (
            <div className={`overflow-x-auto transition-opacity ${loadingItems ? "opacity-60" : ""}`}>
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    <th className="py-2 pl-4 pr-3 font-medium">PO No</th>
                    <th className="px-3 py-2 font-medium">Supplier</th>
                    <th className="hidden px-3 py-2 font-medium md:table-cell">Work Order</th>
                    <th className="px-3 py-2 font-medium">Part Description</th>
                    <th className="hidden px-3 py-2 font-medium lg:table-cell">Delivery</th>
                    <th className="px-3 py-2 text-right font-medium">Available</th>
                    <th className="px-4 py-2 text-right font-medium"><span className="sr-only">Select</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outstandingItems.map((item) => {
                    const supplier = item.purchaseOrder.supplier?.supplierName || "";
                    const ordered = Number(item.quantity) || 0;
                    const pct = ordered > 0 ? Math.round((Number(item.totalRequested || 0) / ordered) * 100) : 0;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="group cursor-pointer transition-colors hover:bg-indigo-50/40"
                      >
                        <td className="py-2 pl-4 pr-3 font-mono text-xs font-semibold text-slate-800">{item.purchaseOrder.poNo}</td>
                        <td className="px-3 py-2">
                          <div className="flex min-w-0 max-w-[200px] items-center gap-2" title={supplier}>
                            <InitialsAvatar name={supplier} />
                            <span className="truncate font-medium text-slate-800">{supplier || "—"}</span>
                          </div>
                        </td>
                        <td className="hidden px-3 py-2 font-mono text-xs text-slate-600 md:table-cell">{item.purchaseOrder.workOrderNo || "—"}</td>
                        <td className="max-w-[260px] px-3 py-2 text-slate-700">
                          <p className="truncate" title={item.description}>{item.description || "—"}</p>
                          {(item.masterRoutingProcess?.routingProcess || item.woRoutingProcess?.inProcess?.description) && (
                            <p className="truncate text-[11px] text-slate-400">
                              {item.masterRoutingProcess?.routingProcess || item.woRoutingProcess?.inProcess?.description}
                            </p>
                          )}
                        </td>
                        <td className="hidden px-3 py-2 text-xs text-slate-500 lg:table-cell">{fmtDate(item.deliveryDate)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-semibold tabular-nums text-emerald-700">{item.availableQuantity}</span>
                          <span className="ml-1 text-[11px] text-slate-400">{item.poUom?.uomName}</span>
                          {pct > 0 && <p className="text-[11px] tabular-nums text-slate-400">of {ordered} · {pct}% requested</p>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectItem(item);
                            }}
                            className={buttonClass("secondary", "sm", "group-hover:border-indigo-200 group-hover:text-indigo-700")}
                          >
                            Select <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------- Step 2: the form ----------------
  const po = selectedItem.purchaseOrder;
  return (
    <div className="w-full space-y-4">
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600"
            >
              <ArrowLeft size={12} /> Choose a different PO line
            </button>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="text-lg font-semibold leading-tight text-slate-900">New Subcon Request Form</h1>
              <StatusBadge status="Draft" tone="amber" size="md" label="New · Draft" />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Supplier">{po.supplier?.supplierName || "—"}</MetaChip>
              <MetaChip icon={ClipboardList} label="PO" title="Purchase order">{po.poNo}</MetaChip>
              {po.workOrderNo && <MetaChip icon={Wrench} label="WO" title="Work order">{po.workOrderNo}</MetaChip>}
              <MetaChip icon={Package} label="Available" title="PO line quantity not yet on other forms">
                {selectedItem.availableQuantity} {selectedItem.poUom?.uomName ?? ""}
              </MetaChip>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Link href="/dashboard/purchasing/subcon-request-form" className={buttonClass("ghost", "md")}>
              Cancel
            </Link>
            <button type="button" onClick={handleSave} disabled={saving} className={buttonClass("primary", "md")}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save Draft"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <SrfFieldsCard
          values={values}
          onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
          employees={employees}
          contactPersons={po.supplier?.contactPersons ?? []}
          available={selectedItem.availableQuantity ?? null}
          uom={selectedItem.poUom?.uomName}
        />
        <PoLineCard item={selectedItem} />
      </div>
    </div>
  );
}
