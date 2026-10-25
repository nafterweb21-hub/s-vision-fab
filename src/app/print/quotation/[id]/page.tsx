import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintToolbar from "@/app/print/PrintToolbar";

export const dynamic = "force-dynamic";

function fmt(n: any) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dd}-${m[dt.getMonth()]}-${dt.getFullYear()}`;
}

export default async function PrintQuotationPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { part: true, uom: true } },
      salesperson: true,
      customer: { include: { addresses: true, contactPersons: { where: { status: "Active" } } } },
      contactPerson: true,
      currency: true,
      taxType: true,
      paymentTerm: true,
    },
  });
  if (!q) notFound();

  const company = await prisma.companyProfile.findFirst({ where: { status: "Active" } });
  const defaultAddress =
    q.customer.addresses.find((a) => a.isDefault) || q.customer.addresses[0];

  const contact =
    q.contactPerson ||
    q.customer.contactPersons.find((c) => c.isDefault) ||
    q.customer.contactPersons[0];

  const currencyCode = q.currency?.code || "USD";
  const taxLabel = q.taxType ? `Add (${q.taxType.taxRate}%)` : "Add Tax";
  
  const companyName = company?.companyName || "Vision One Pte. Ltd.";
  const companyAddress = company?.address || "";
  const companyPhone = company?.phoneNo || "";
  const companyFax = company?.faxNo || "";
  const companyEmail = company?.email || "";
  const companyGst = company?.gstRegistrationNo || company?.rocNo || "";

  const companyLogo = company?.uploadUrl && company.uploadUrl.startsWith("/uploads")
    ? `/api${company.uploadUrl}`
    : "/logo.jpg";

  const footerLine = company
    ? `${companyAddress} ${company.rocNo ? `(Co. reg. No.: ${company.rocNo})` : ""} Telephone: ${companyPhone} / Fax: ${companyFax}`
    : "";

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; padding: 0; background: #fff; color: #111; font-family: var(--print-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif); }
        .page {
          width: 210mm;
          min-height: 297mm;
          max-width: 210mm;
          padding: 10mm 12mm;
          box-sizing: border-box;
          position: relative;
          background: #fff;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        .print-actions { position: fixed; top: 12px; right: 12px; z-index: 100; }
        
        @media screen {
          body { background: #f1f5f9; padding: 20px 0; }
          .page { box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin: 0 auto; background: #fff; }
        }
        
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body { background: #fff; margin: 0; padding: 0; }
          .page {
            width: 100% !important;
            min-height: auto !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-actions { display: none !important; }
        }

        .header { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .header-left { width: 45%; }
        .header-left img { max-width: 100%; height: auto; max-height: 55px; mix-blend-mode: multiply; }
        .tagline { font-size: 10px; font-weight: 600; margin-top: 2px; color: #222; }
        .header-right { width: 52%; text-align: left; }
        .company-name { color: #d00000; font-size: 18px; font-weight: bold; margin-bottom: 2px; }
        .company-details { font-size: 9.5px; line-height: 1.35; font-weight: 500; color: #333; }

        .main-box { border: 1.5px solid #63a0d4; border-radius: 0; }
        .title-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px;
          background: #e6f2ff;
          border-bottom: 1.5px solid #63a0d4;
        }
        .quote-title { color: #0070c0; font-size: 16px; font-weight: bold; letter-spacing: 0.5px; }
        .quote-subject { font-size: 11px; font-weight: 600; color: #333; }
        .quote-ref { font-size: 11px; font-weight: bold; color: #111; }

        .info-grid { display: grid; grid-template-columns: 50% 50%; border-bottom: 1.5px solid #63a0d4; }
        .info-col-left { border-right: 1.5px solid #63a0d4; }
        .info-col-right { }

        .col-header {
          text-align: center;
          font-size: 10px;
          font-weight: bold;
          border-bottom: 1px solid #63a0d4;
          padding: 2.5px 4px;
          background: #f7fbff;
          color: #1e3a8a;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .info-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .info-table td { padding: 2.5px 6px; vertical-align: top; font-weight: 500; }
        .info-table td.key { width: 85px; font-weight: bold; color: #333; }
        .info-table td.sep { width: 8px; font-weight: bold; }
        .info-table td.val { color: #111; font-weight: 600; }

        .items-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 10px; }
        .items-table th {
          background: #e6f2ff;
          border-bottom: 1.5px solid #63a0d4;
          border-right: 1.5px solid #63a0d4;
          padding: 4px 6px;
          font-weight: bold;
          color: #0f172a;
        }
        .items-table th:last-child { border-right: none; }
        .items-table td {
          border-right: 1.5px solid #63a0d4;
          border-bottom: 1px solid #e2e8f0;
          padding: 4px 6px;
          vertical-align: middle;
          font-weight: 500;
        }
        .items-table td:last-child { border-right: none; }
        .items-table tbody tr:last-child td { border-bottom: none; }

        .items-table .text-left { text-align: left; }
        .items-table .text-right { text-align: right; }
        .items-table .num { font-variant-numeric: tabular-nums; }

        .bottom-grid {
          display: grid;
          grid-template-columns: 58% 42%;
          border-top: 1.5px solid #63a0d4;
        }
        .terms-col {
          border-right: 1.5px solid #63a0d4;
          padding: 6px 8px;
          font-size: 9.5px;
          line-height: 1.35;
          color: #333;
        }
        .terms-col .term-label { font-weight: bold; color: #1e3a8a; margin-top: 2px; }

        .totals-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .totals-table td { padding: 3px 6px; font-weight: 600; }
        .totals-table td.label { text-align: left; color: #333; }
        .totals-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .totals-table tr.grand-total td {
          background: #e6f2ff;
          border-top: 1.5px solid #63a0d4;
          color: #0070c0;
          font-weight: bold;
          font-size: 11px;
          padding: 5px 6px;
        }

        .signatures-box {
          margin-top: 8px;
          border: 1.5px solid #63a0d4;
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          background: #fff;
        }
        .sign-col { width: 44%; text-align: center; display: flex; flex-direction: column; justify-content: space-between; min-height: 60px; }
        .sign-title { font-weight: bold; color: #111; font-size: 10.5px; }
        .sign-line { border-top: 1px solid #111; padding-top: 3px; font-size: 9.5px; font-weight: 600; color: #444; width: 85%; margin: 0 auto; }

        .footer-line {
          margin-top: 6px;
          padding-top: 4px;
          border-top: 1px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 8.5px;
          color: #64748b;
        }
      `}</style>

      <PrintToolbar doc="quotation" id={id} label="Print Quotation" />

      <div className="page">
        <div>
          {/* Header */}
          <div className="header">
            <div className="header-left">
              <img src={companyLogo} alt="Logo" />
              <div className="tagline">Your Engineering &amp; Innovative Solution</div>
            </div>
            <div className="header-right">
              <div className="company-name">{companyName}</div>
              <div className="company-details">
                <div>{companyAddress}</div>
                {companyGst && <div>GST / Reg No.: {companyGst}</div>}
                <div>T: {companyPhone} {companyFax ? `/ F: ${companyFax}` : ""}</div>
                {companyEmail && <div>E: {companyEmail}</div>}
              </div>
            </div>
          </div>

          <div style={{ borderBottom: "2px solid #000", marginBottom: "6px", marginTop: "2px" }}></div>

          {/* Main Box */}
          <div className="main-box">
            {/* Title Bar */}
            <div className="title-bar">
              <div className="quote-title">QUOTATION</div>
              {q.title && (
                <div className="quote-subject">
                  Subject: <span style={{ color: "#0070c0" }}>{q.title}</span>
                </div>
              )}
              <div className="quote-ref">
                No.: {q.quotationNo} {q.revision !== undefined ? `(Rev: ${q.revision})` : ""}
              </div>
            </div>

            {/* Information Grid: Customer Details & Quotation Info */}
            <div className="info-grid">
              {/* Customer Details */}
              <div className="info-col-left">
                <div className="col-header">Customer Details (To)</div>
                <table className="info-table">
                  <tbody>
                    <tr>
                      <td className="key">Customer Name</td>
                      <td className="sep">:</td>
                      <td className="val">{q.customer.customerName}</td>
                    </tr>
                    <tr>
                      <td className="key">Address</td>
                      <td className="sep">:</td>
                      <td className="val">{defaultAddress?.address || "—"}</td>
                    </tr>
                    <tr>
                      <td className="key">Attention</td>
                      <td className="sep">:</td>
                      <td className="val">{contact?.contactPersonName || "—"}</td>
                    </tr>
                    <tr>
                      <td className="key">Email</td>
                      <td className="sep">:</td>
                      <td className="val">{contact?.email || "—"}</td>
                    </tr>
                    <tr>
                      <td className="key">Contact No.</td>
                      <td className="sep">:</td>
                      <td className="val">{contact?.telNo || contact?.mobileNo || "—"}</td>
                    </tr>
                    {q.customer.gstin && (
                      <tr>
                        <td className="key">GSTIN</td>
                        <td className="sep">:</td>
                        <td className="val">{q.customer.gstin}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Quotation Details */}
              <div className="info-col-right">
                <div className="col-header">Quotation Info</div>
                <table className="info-table">
                  <tbody>
                    <tr>
                      <td className="key">Quotation Date</td>
                      <td className="sep">:</td>
                      <td className="val">{fmtDate(q.date)}</td>
                    </tr>
                    <tr>
                      <td className="key">Quote Validity</td>
                      <td className="sep">:</td>
                      <td className="val">{q.quoteValidityDays} Days</td>
                    </tr>
                    <tr>
                      <td className="key">Payment Terms</td>
                      <td className="sep">:</td>
                      <td className="val">{q.paymentTerm?.name || "—"}</td>
                    </tr>
                    <tr>
                      <td className="key">Currency</td>
                      <td className="sep">:</td>
                      <td className="val">{currencyCode}</td>
                    </tr>
                    <tr>
                      <td className="key">Prepared By</td>
                      <td className="sep">:</td>
                      <td className="val">{q.salesperson?.name || "—"}</td>
                    </tr>
                    <tr>
                      <td className="key">Sales Email</td>
                      <td className="sep">:</td>
                      <td className="val">{q.salesperson?.email || "—"}</td>
                    </tr>
                    {(q.customerPoRef || q.refNo) && (
                      <tr>
                        <td className="key">Reference No.</td>
                        <td className="sep">:</td>
                        <td className="val">{q.customerPoRef || q.refNo}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Items Table */}
            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: "35px" }}>Item</th>
                  <th className="text-left">Finished Good / Description</th>
                  <th style={{ width: "60px" }}>UOM</th>
                  <th className="text-right" style={{ width: "95px" }}>Unit Price ({currencyCode})</th>
                  <th className="text-right" style={{ width: "55px" }}>Qty</th>
                  <th className="text-right" style={{ width: "105px" }}>Total ({currencyCode})</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((it, idx) => {
                  const partNo = it.part?.partNo ? it.part.partNo.trim() : "";
                  const desc = it.part?.description || "—";
                  return (
                    <tr key={it.id}>
                      <td style={{ fontWeight: "bold" }}>{idx + 1}</td>
                      <td className="text-left">
                        {partNo && <span style={{ fontWeight: "bold" }}>{partNo} — </span>}
                        <span>{desc}</span>
                      </td>
                      <td>{it.uom?.uomName || "—"}</td>
                      <td className="text-right num">{fmt(it.unitPrice)}</td>
                      <td className="text-right num">{it.quantity}</td>
                      <td className="text-right num" style={{ fontWeight: "bold" }}>{fmt(it.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals & Notes Section */}
            <div className="bottom-grid">
              <div className="terms-col">
                {q.leadTime && (
                  <div>
                    <span className="term-label">Lead Time: </span>
                    <span>{q.leadTime}</span>
                  </div>
                )}
                {q.incoterms && (
                  <div>
                    <span className="term-label">Incoterms: </span>
                    <span>{q.incoterms}</span>
                  </div>
                )}
                {q.remark && (
                  <div>
                    <span className="term-label">Remarks: </span>
                    <span>{q.remark}</span>
                  </div>
                )}
                {q.termsAndConditions ? (
                  <div style={{ marginTop: "4px" }}>
                    <span className="term-label">Terms &amp; Conditions:</span>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: "9px", color: "#444", marginTop: "1px" }}>
                      {q.termsAndConditions}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "9px", color: "#666", fontStyle: "italic", marginTop: "4px" }}>
                    Standard warranty and delivery terms apply. Quotation valid for {q.quoteValidityDays} days from date of issue.
                  </div>
                )}
              </div>

              {/* Totals */}
              <div>
                <table className="totals-table">
                  <tbody>
                    <tr>
                      <td className="label">Sub Total:</td>
                      <td className="num">{fmt(q.subTotal)}</td>
                    </tr>
                    {Number(q.lumpSumDisc) > 0 && (
                      <tr>
                        <td className="label">Lump Sum Discount:</td>
                        <td className="num" style={{ color: "#b91c1c" }}>- {fmt(q.lumpSumDisc)}</td>
                      </tr>
                    )}
                    {q.taxType && (
                      <tr>
                        <td className="label">{taxLabel}:</td>
                        <td className="num">{fmt(q.taxAmount)}</td>
                      </tr>
                    )}
                    <tr className="grand-total">
                      <td className="label">Total Amount ({currencyCode}):</td>
                      <td className="num">{fmt(q.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Signatures Box */}
          <div className="signatures-box">
            <div className="sign-col">
              <div className="sign-title">For {companyName}</div>
              <div className="sign-line">Authorized Signatory</div>
            </div>
            <div className="sign-col">
              <div className="sign-title">Customer Acceptance &amp; Confirmation</div>
              <div className="sign-line">Authorized Signature &amp; Company Stamp / Date</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-line">
          <div>{footerLine}</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </>
  );
}
