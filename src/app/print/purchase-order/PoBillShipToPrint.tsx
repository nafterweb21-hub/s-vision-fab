// "Billed to | Shipped to" box for the PO and PO-Subcon printouts.
// Uses the bill-to saved on the PO (falling back to the company profile for POs
// saved before bill-to fields existed). Shipped to repeats the bill-to unless the
// PO has a different ship-to (consignee) set.

type Company = {
  companyName?: string | null;
  address?: string | null;
  gstRegistrationNo?: string | null;
  phoneNo?: string | null;
  faxNo?: string | null;
  email?: string | null;
} | null | undefined;

type PoParties = {
  billToName?: string | null;
  billToAddress?: string | null;
  billToContactPerson?: string | null;
  billToPhone?: string | null;
  billToEmail?: string | null;
  billToFax?: string | null;
  billToGstin?: string | null;
  billToState?: string | null;
  differentShipTo?: boolean | null;
  consigneeName?: string | null;
  consigneeAddress?: string | null;
  consigneeGstin?: string | null;
  consigneePhone?: string | null;
  consigneeState?: string | null;
  consigneeCountry?: string | null;
};

type Party = {
  name?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  fax?: string | null;
  gstin?: string | null;
  state?: string | null;
  country?: string | null;
};

const cell: React.CSSProperties = { width: "50%", verticalAlign: "top", border: "1px solid #111", padding: "6px 8px" };
const heading: React.CSSProperties = { fontWeight: "bold", marginBottom: "4px" };
const line: React.CSSProperties = { marginBottom: "2px" };

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <div style={line}>{label} : <span className="dyn">{value}</span></div>;
}

function PartyBlock({ name, address, contactPerson, phone, email, fax, gstin, state, country }: Party) {
  return (
    <>
      {name && <div className="dyn" style={{ ...line, fontWeight: "bold" }}>{name}</div>}
      {address && <div className="dyn" style={{ ...line, whiteSpace: "pre-wrap" }}>{address}</div>}
      <Row label="State" value={[state, country].filter(Boolean).join(", ")} />
      <Row label="GSTIN" value={gstin} />
      <Row label="Attn" value={contactPerson} />
      <Row label="Phone" value={phone} />
      <Row label="Fax" value={fax} />
      <Row label="Email" value={email} />
    </>
  );
}

export default function PoBillShipToPrint({ company, po }: { company: Company; po: PoParties }) {
  const billTo: Party = po.billToName
    ? {
        name: po.billToName,
        address: po.billToAddress,
        contactPerson: po.billToContactPerson,
        phone: po.billToPhone,
        email: po.billToEmail,
        fax: po.billToFax,
        gstin: po.billToGstin,
        state: po.billToState,
      }
    : {
        name: company?.companyName,
        address: company?.address,
        phone: company?.phoneNo,
        email: company?.email,
        fax: company?.faxNo,
        gstin: company?.gstRegistrationNo,
      };

  const shipTo: Party = po.differentShipTo
    ? {
        name: po.consigneeName || billTo.name,
        address: po.consigneeAddress,
        phone: po.consigneePhone,
        gstin: po.consigneeGstin,
        state: po.consigneeState,
        country: po.consigneeCountry,
      }
    : billTo;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "10px" }}>
      <tbody>
        <tr>
          <td style={cell}>
            <div style={heading}>Details of Buyer | Billed to :</div>
            <PartyBlock {...billTo} />
          </td>
          <td style={cell}>
            <div style={heading}>Details of Consignee | Shipped to :</div>
            <PartyBlock {...shipTo} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
