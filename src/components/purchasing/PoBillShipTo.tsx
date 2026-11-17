"use client";

import { SearchableSelect } from "@/components/SearchableSelect";

// "Details of Buyer | Billed to" and an optional "Details of Consignee | Shipped to"
// for purchase orders, mirroring the invoice form. Picking a customer auto-fills its
// default address and contact person; the chosen values are stored as text on the PO.

export type PoCustomer = {
  id: string;
  customerName: string;
  gstin?: string | null;
  pan?: string | null;
  placeOfSupply?: string | null;
  addresses?: { id: string; address: string; state?: string | null; isDefault?: boolean }[];
  contactPersons?: {
    id: string;
    contactPersonName: string;
    telNo?: string | null;
    faxNo?: string | null;
    email?: string | null;
    isDefault?: boolean;
  }[];
};

type PoContact = NonNullable<PoCustomer["contactPersons"]>[number];

export type PoShipTo = {
  billToCustomerId: string;
  billToName: string;
  billToAddress: string;
  billToContactPerson: string;
  billToPhone: string;
  billToEmail: string;
  billToFax: string;
  billToGstin: string;
  billToState: string;
  differentShipTo: boolean;
  consigneeName: string;
  consigneeAddress: string;
  consigneeGstin: string;
  consigneePhone: string;
  consigneeState: string;
  consigneeCountry: string;
};

const emptyConsignee = {
  consigneeName: "",
  consigneeAddress: "",
  consigneeGstin: "",
  consigneePhone: "",
  consigneeState: "",
  consigneeCountry: "India",
};

export const emptyPoShipTo: PoShipTo = {
  billToCustomerId: "",
  billToName: "",
  billToAddress: "",
  billToContactPerson: "",
  billToPhone: "",
  billToEmail: "",
  billToFax: "",
  billToGstin: "",
  billToState: "",
  differentShipTo: false,
  ...emptyConsignee,
};

/** Builds form state from a loaded PO record. */
export function poShipToFromRecord(po: Partial<Record<keyof PoShipTo, string | boolean | null>> | null | undefined): PoShipTo {
  const out = { ...emptyPoShipTo };
  for (const key of Object.keys(emptyPoShipTo) as (keyof PoShipTo)[]) {
    const v = po?.[key];
    if (key === "differentShipTo") out.differentShipTo = !!v;
    else if (typeof v === "string" && v !== "") (out[key] as string) = v;
  }
  return out;
}

/** Returns an error message when the mandatory bill-to / ship-to fields are missing, else "". */
export function validatePoShipTo(v: PoShipTo): string {
  if (!v.billToCustomerId || !v.billToAddress.trim() || !v.billToContactPerson.trim() || !v.billToEmail.trim()) {
    return "Please complete all mandatory fields in 'Details of Buyer | Billed to' (Customer, Bill To Address, Contact Person, Email).";
  }
  if (v.differentShipTo && !v.consigneeAddress.trim()) {
    return "Please select a Ship To Address, or turn off 'Different Ship To Address'.";
  }
  return "";
}

const contactFields = (c?: PoContact) => ({
  billToContactPerson: c?.contactPersonName || "",
  billToPhone: c?.telNo || "",
  billToFax: c?.faxNo || "",
  billToEmail: c?.email || "",
});

/** Fills bill-to from a customer: its default address and default contact person. Resets ship-to. */
export function applyPoCustomer(value: PoShipTo, customers: PoCustomer[] | undefined, customerId: string): PoShipTo {
  const c = customers?.find((x) => x.id === customerId);
  const defAddress = c?.addresses?.find((a) => a.isDefault) || c?.addresses?.[0];
  const defContact = c?.contactPersons?.find((p) => p.isDefault) || c?.contactPersons?.[0];
  return {
    ...value,
    billToCustomerId: customerId,
    billToName: c?.customerName || "",
    billToAddress: defAddress?.address || "",
    billToGstin: c?.gstin || "",
    billToState: c?.placeOfSupply || "",
    ...contactFields(defContact),
    ...emptyConsignee,
    differentShipTo: false,
  };
}

const billInputCls =
  "w-full px-3 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60";
const shipInputCls =
  "w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60";

export default function PoBillShipTo({
  customers,
  value,
  onChange,
  readOnly,
}: {
  customers: PoCustomer[] | undefined;
  value: PoShipTo;
  onChange: (next: PoShipTo) => void;
  readOnly?: boolean;
}) {
  const set = (patch: Partial<PoShipTo>) => onChange({ ...value, ...patch });
  const customer = customers?.find((c) => c.id === value.billToCustomerId);
  const addresses = customer?.addresses || [];
  const contacts = customer?.contactPersons || [];

  // Selects are keyed by the stored text, so saved POs re-select the matching record.
  const billToAddressId = addresses.find((a) => a.address === value.billToAddress)?.id || "";
  const shipToAddressId = addresses.find((a) => a.address === value.consigneeAddress)?.id || "";
  const contactId = contacts.find((c) => c.contactPersonName === value.billToContactPerson)?.id || "";

  const handleCustomerChange = (customerId: string) => onChange(applyPoCustomer(value, customers, customerId));

  const handleContactChange = (id: string) => {
    set(contactFields(contacts.find((c) => c.id === id)));
  };

  const toggle = (enabled: boolean) =>
    onChange({ ...value, ...emptyConsignee, differentShipTo: enabled });

  const gstin = customer?.gstin || value.billToGstin;
  const pan = customer?.pan || (gstin ? gstin.substring(2, 12) : "");
  const placeOfSupply = customer?.placeOfSupply || value.billToState;

  return (
    <div className="space-y-4">
      {/* CARD 1: Details of Buyer | Billed to */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-blue-300 p-4">
        <div className="flex items-center justify-between border-b border-blue-200 pb-2 mb-3">
          <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
            Details of Buyer | Billed to :
          </h3>
          <span className="text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">Mandatory *</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
          <div className="sm:col-span-1 lg:col-span-2">
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Name (Customer / Buyer) <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              value={value.billToCustomerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              disabled={readOnly}
              className={billInputCls}
            >
              <option value="">Select Customer...</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>{c.customerName}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="sm:col-span-1 lg:col-span-2">
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Address (Bill To) <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              value={billToAddressId}
              onChange={(e) => set({ billToAddress: addresses.find((a) => a.id === e.target.value)?.address || "" })}
              disabled={readOnly || !customer}
              className={billInputCls}
            >
              <option value="">Select Bill To Address...</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>{a.address}</option>
              ))}
            </SearchableSelect>
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Contact Person <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              value={contactId}
              onChange={(e) => handleContactChange(e.target.value)}
              disabled={readOnly || !customer}
              className={billInputCls}
            >
              <option value="">Select Contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.contactPersonName}</option>
              ))}
            </SearchableSelect>
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">Phone / Tel</label>
            <input
              type="text"
              placeholder="e.g. 9948300284"
              value={value.billToPhone}
              onChange={(e) => set({ billToPhone: e.target.value })}
              disabled={readOnly}
              className={billInputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={value.billToEmail}
              onChange={(e) => set({ billToEmail: e.target.value })}
              disabled={readOnly}
              className={billInputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">Fax</label>
            <input
              type="text"
              value={value.billToFax}
              onChange={(e) => set({ billToFax: e.target.value })}
              disabled={readOnly}
              className={billInputCls}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 pt-2 border-t border-blue-100 text-xs">
          <div>
            <span className="font-semibold text-slate-500 uppercase">GSTIN:</span>{" "}
            <span className="font-bold text-slate-900 break-all">{gstin || "—"}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 uppercase">PAN:</span>{" "}
            <span className="font-bold text-slate-900">{pan || "—"}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 uppercase">Place of Supply:</span>{" "}
            <span className="font-bold text-slate-900">{placeOfSupply || "—"}</span>
          </div>
        </div>
      </div>

      {/* Toggle: Different Ship To Address */}
      <label className={`flex items-center gap-3 w-fit select-none ${readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
        <button
          type="button"
          role="switch"
          aria-checked={value.differentShipTo}
          onClick={() => toggle(!value.differentShipTo)}
          disabled={readOnly}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${value.differentShipTo ? "bg-blue-600" : "bg-slate-300"}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${value.differentShipTo ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
        <span className="text-sm font-semibold text-blue-900">Different Ship To Address</span>
        {!value.differentShipTo && (
          <span className="text-xs text-slate-500">(Shipping to the Bill To address)</span>
        )}
      </label>

      {/* CARD 2: Details of Consignee | Shipped to */}
      {value.differentShipTo && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-300 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
              Details of Consignee | Shipped to :
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Name (Consignee)</label>
              <input
                type="text"
                placeholder="Enter consignee name"
                value={value.consigneeName}
                onChange={(e) => set({ consigneeName: e.target.value })}
                disabled={readOnly}
                className={shipInputCls}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address (Ship To) <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={shipToAddressId}
                onChange={(e) => set({ consigneeAddress: addresses.find((a) => a.id === e.target.value)?.address || "" })}
                disabled={readOnly || !customer}
                className={shipInputCls}
              >
                <option value="">Select Ship To Address...</option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>{a.address}</option>
                ))}
              </SearchableSelect>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
              <input
                type="text"
                value={value.consigneeCountry}
                onChange={(e) => set({ consigneeCountry: e.target.value })}
                disabled={readOnly}
                className={shipInputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                placeholder="e.g. 9948300284"
                value={value.consigneePhone}
                onChange={(e) => set({ consigneePhone: e.target.value })}
                disabled={readOnly}
                className={shipInputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                placeholder="e.g. GSTA728323"
                value={value.consigneeGstin}
                onChange={(e) => set({ consigneeGstin: e.target.value.toUpperCase() })}
                disabled={readOnly}
                className={`${shipInputCls} uppercase`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                placeholder="e.g. Tamil Nadu ( 33 )"
                value={value.consigneeState}
                onChange={(e) => set({ consigneeState: e.target.value })}
                disabled={readOnly}
                className={shipInputCls}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
