// An invoice has a separate ship-to when its ship-to address differs from bill-to
// or any consignee override is filled in. Otherwise it ships to the bill-to address.
type ShipToFields = {
  billToId?: string | null;
  shipToId?: string | null;
  consigneeName?: string | null;
  consigneeGstin?: string | null;
  consigneePhone?: string | null;
  consigneeState?: string | null;
  consigneeCountry?: string | null;
};

export function hasDifferentShipTo(inv: ShipToFields): boolean {
  const filled = (v?: string | null) => !!v && v.trim() !== "";
  return (
    (!!inv.shipToId && inv.shipToId !== inv.billToId) ||
    filled(inv.consigneeName) ||
    filled(inv.consigneeGstin) ||
    filled(inv.consigneePhone) ||
    filled(inv.consigneeState) ||
    (filled(inv.consigneeCountry) && inv.consigneeCountry!.trim() !== "India")
  );
}
