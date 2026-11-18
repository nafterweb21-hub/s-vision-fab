"use client";

import { MapPin } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Badge, Card, Field, inputClass, selectTriggerClass } from "@/components/form-ui";

// Optional "Details of Consignee | Shipped to" for purchase orders. Left blank, the
// printout ships to the bill-to (the PO's company). Picking a customer
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
    <Card
      icon={MapPin}
      tone="emerald"
      title="Details of Consignee | Shipped to"
      description="Picking a consignee fills its default address, GSTIN, state and phone"
      actions={<Badge tone="slate">Optional</Badge>}
      className="h-full"
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <Field label="Name (Consignee)" className="sm:col-span-2">
          <SearchableSelect
            value={customer?.id || ""}
            onChange={(e) => onChange(applyPoCustomer(value, customers, e.target.value))}
            disabled={readOnly}
            className={selectTriggerClass}
          >
            <option value="">{!customer && value.consigneeName ? value.consigneeName : "Select Consignee..."}</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>{c.customerName}</option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="Address (Ship To)" className="sm:col-span-2">
          <SearchableSelect
            value={shipToAddressId}
            onChange={(e) => handleAddressChange(e.target.value)}
            disabled={readOnly || !customer}
            className={selectTriggerClass}
          >
            <option value="">{!shipToAddressId && value.consigneeAddress ? value.consigneeAddress : "Select Ship To Address..."}</option>
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>{a.address}</option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="Country">
          <input
            type="text"
            value={value.consigneeCountry}
            onChange={(e) => set({ consigneeCountry: e.target.value })}
            disabled={readOnly}
            className={inputClass}
          />
        </Field>

        <Field label="Phone">
          <input
            type="text"
            placeholder="e.g. 9948300284"
            value={value.consigneePhone}
            onChange={(e) => set({ consigneePhone: e.target.value })}
            disabled={readOnly}
            className={`${inputClass} tabular-nums`}
          />
        </Field>

        <Field label="GSTIN">
          <input
            type="text"
            placeholder="e.g. GSTA728323"
            value={value.consigneeGstin}
            onChange={(e) => set({ consigneeGstin: e.target.value.toUpperCase() })}
            disabled={readOnly}
            className={`${inputClass} font-mono uppercase`}
          />
        </Field>

        <Field label="State">
          <input
            type="text"
            placeholder="e.g. Tamil Nadu ( 33 )"
            value={value.consigneeState}
            onChange={(e) => set({ consigneeState: e.target.value })}
            disabled={readOnly}
            className={inputClass}
          />
        </Field>
      </div>
    </Card>
  );
}
