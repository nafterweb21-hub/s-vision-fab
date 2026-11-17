// Purchase order bill-to / ship-to. Bill-to is picked from a customer (address,
// contact person) and snapshotted as text on the PO. The PO ships to the bill-to address unless `differentShipTo`
// is on, in which case the consignee fields describe the delivery site.

const BILL_TO_KEYS = [
  "billToCustomerId",
  "billToName",
  "billToAddress",
  "billToContactPerson",
  "billToPhone",
  "billToEmail",
  "billToFax",
  "billToGstin",
  "billToState",
] as const;

const CONSIGNEE_KEYS = [
  "consigneeName",
  "consigneeAddress",
  "consigneeGstin",
  "consigneePhone",
  "consigneeState",
  "consigneeCountry",
] as const;

type BillToKey = (typeof BILL_TO_KEYS)[number];
type ConsigneeKey = (typeof CONSIGNEE_KEYS)[number];

export type PoShipToFields = { differentShipTo: boolean } & Record<BillToKey | ConsigneeKey, string | null>;

const clean = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

/** Normalizes request body fields into PO bill-to / ship-to columns; clears consignee fields when shipping to the bill-to address. */
export function poShipToData(body: Record<string, unknown> | null | undefined): PoShipToFields {
  const out = { differentShipTo: !!body?.differentShipTo } as PoShipToFields;
  for (const k of BILL_TO_KEYS) out[k] = clean(body?.[k]);
  for (const k of CONSIGNEE_KEYS) out[k] = out.differentShipTo ? clean(body?.[k]) : null;
  if (out.billToGstin) out.billToGstin = out.billToGstin.toUpperCase();
  if (out.consigneeGstin) out.consigneeGstin = out.consigneeGstin.toUpperCase();
  if (out.differentShipTo && !out.consigneeCountry) out.consigneeCountry = "India";
  return out;
}

/** Picks the bill-to / ship-to columns off an existing PO (used for revisions and copies). */
export function copyPoShipTo(po: Partial<PoShipToFields>): PoShipToFields {
  const out = { differentShipTo: !!po.differentShipTo } as PoShipToFields;
  for (const k of [...BILL_TO_KEYS, ...CONSIGNEE_KEYS]) out[k] = po[k] ?? null;
  return out;
}
