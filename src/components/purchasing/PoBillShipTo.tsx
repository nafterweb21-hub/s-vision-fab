"use client";

import { SearchableSelect } from "@/components/SearchableSelect";

// Mandatory "Details of Consignee | Shipped to" for purchase orders. Picking a customer
// auto-fills the consignee name, default address, GSTIN, state and phone; the chosen
// values are stored as text on the PO. (Billed to on the printout is the PO's company.)

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

const emptyBillTo = {
  billToName: "",
  billToAddress: "",
  billToContactPerson: "",
  billToPhone: "",
  billToEmail: "",
  billToFax: "",
  billToGstin: "",
  billToState: "",
};

export const emptyPoShipTo: PoShipTo = {
  billToCustomerId: "",
  ...emptyBillTo,
  differentShipTo: true,
  consigneeName: "",
  consigneeAddress: "",
  consigneeGstin: "",
  consigneePhone: "",
  consigneeState: "",
  consigneeCountry: "India",
};

/** Builds form state from a loaded PO record. POs saved before the consignee was mandatory
 *  (shipping to the bill-to) show their bill-to as the consignee. */
export function poShipToFromRecord(po: Partial<Record<keyof PoShipTo, string | boolean | null>> | null | undefined): PoShipTo {
  const out = { ...emptyPoShipTo };
  for (const key of Object.keys(emptyPoShipTo) as (keyof PoShipTo)[]) {
    const v = po?.[key];
    if (key === "differentShipTo") out.differentShipTo = !!v;
    else if (typeof v === "string" && v !== "") (out[key] as string) = v;
  }
  if (po && !out.differentShipTo) {
    out.consigneeName = out.consigneeName || out.billToName;
    out.consigneeAddress = out.consigneeAddress || out.billToAddress;
    out.consigneeGstin = out.consigneeGstin || out.billToGstin;
    out.consigneePhone = out.consigneePhone || out.billToPhone;
    out.consigneeState = out.consigneeState || out.billToState;
  }
  out.differentShipTo = true;
  return out;
}

/** Returns an error message when the mandatory consignee / ship-to fields are missing, else "". */
export function validatePoShipTo(v: PoShipTo): string {
  if (!v.consigneeName.trim() || !v.consigneeAddress.trim()) {
    return "Please complete all mandatory fields in 'Details of Consignee | Shipped to' (Name, Ship To Address).";
  }
  return "";
}

/** Fills the consignee from a customer: its name, default address, GSTIN, state and default contact phone. */
export function applyPoCustomer(value: PoShipTo, customers: PoCustomer[] | undefined, customerId: string): PoShipTo {
  const c = customers?.find((x) => x.id === customerId);
  const defAddress = c?.addresses?.find((a) => a.isDefault) || c?.addresses?.[0];
  const defContact = c?.contactPersons?.find((p) => p.isDefault) || c?.contactPersons?.[0];
  return {
    ...value,
    billToCustomerId: customerId,
    ...emptyBillTo,
    differentShipTo: true,
    consigneeName: c?.customerName || "",
    consigneeAddress: defAddress?.address || "",
    consigneeGstin: c?.gstin || "",
    consigneePhone: defContact?.telNo || "",
    consigneeState: defAddress?.state || c?.placeOfSupply || "",
    consigneeCountry: value.consigneeCountry || "India",
  };
}

const inputCls =
  "w-full px-3 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60";

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
  const set = (patch: Partial<PoShipTo>) => onChange({ ...value, ...patch, differentShipTo: true });
  const customer =
    customers?.find((c) => c.id === value.billToCustomerId) ||
    customers?.find((c) => c.customerName === value.consigneeName);
  const addresses = customer?.addresses || [];

  // Selects are keyed by the stored text, so saved POs re-select the matching record.
  const shipToAddressId = addresses.find((a) => a.address === value.consigneeAddress)?.id || "";

  const handleAddressChange = (id: string) => {
    const a = addresses.find((x) => x.id === id);
    set({ consigneeAddress: a?.address || "", ...(a?.state ? { consigneeState: a.state } : {}) });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-blue-300 p-4">
      <div className="flex items-center justify-between border-b border-blue-200 pb-2 mb-3">
        <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
          Details of Consignee | Shipped to :
        </h3>
        <span className="text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">Mandatory *</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
        <div className="sm:col-span-1 lg:col-span-2">
          <label className="block text-xs font-semibold text-blue-900 mb-1">
            Name (Consignee) <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            value={customer?.id || ""}
            onChange={(e) => onChange(applyPoCustomer(value, customers, e.target.value))}
            disabled={readOnly}
            className={inputCls}
          >
            <option value="">{!customer && value.consigneeName ? value.consigneeName : "Select Consignee..."}</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>{c.customerName}</option>
            ))}
          </SearchableSelect>
        </div>

        <div className="sm:col-span-1 lg:col-span-2">
          <label className="block text-xs font-semibold text-blue-900 mb-1">
            Address (Ship To) <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            value={shipToAddressId}
            onChange={(e) => handleAddressChange(e.target.value)}
            disabled={readOnly || !customer}
            className={inputCls}
          >
            <option value="">{!shipToAddressId && value.consigneeAddress ? value.consigneeAddress : "Select Ship To Address..."}</option>
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>{a.address}</option>
            ))}
          </SearchableSelect>
        </div>

        <div>
          <label className="block text-xs font-semibold text-blue-900 mb-1">Country</label>
          <input
            type="text"
            value={value.consigneeCountry}
            onChange={(e) => set({ consigneeCountry: e.target.value })}
            disabled={readOnly}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-blue-900 mb-1">Phone</label>
          <input
            type="text"
            placeholder="e.g. 9948300284"
            value={value.consigneePhone}
            onChange={(e) => set({ consigneePhone: e.target.value })}
            disabled={readOnly}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-blue-900 mb-1">GSTIN</label>
          <input
            type="text"
            placeholder="e.g. GSTA728323"
            value={value.consigneeGstin}
            onChange={(e) => set({ consigneeGstin: e.target.value.toUpperCase() })}
            disabled={readOnly}
            className={`${inputCls} uppercase`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-blue-900 mb-1">State</label>
          <input
            type="text"
            placeholder="e.g. Tamil Nadu ( 33 )"
            value={value.consigneeState}
            onChange={(e) => set({ consigneeState: e.target.value })}
            disabled={readOnly}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}
