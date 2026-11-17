import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintToolbar from "@/app/print/PrintToolbar";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const dt = new Date(d);
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dd}-${m[dt.getMonth()]}-${dt.getFullYear()}`;
}

export default async function PrintDeliveryOrderPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const deliveryOrder = await prisma.deliveryOrder.findUnique({
    where: { id },
    include: {
      items: { include: { uom: true, workOrder: true } },
      customer: { include: { addresses: true } },
      salesOrder: true,
    },
  });
  if (!deliveryOrder) notFound();

  const company = await prisma.companyProfile.findFirst({ where: { status: "Active" } });
  const settings = await prisma.generalSetting.findFirst();
  
  const companyAddress = company?.address || "";
  const companyPhone = company?.phoneNo || "";
  const companyEmail = company?.email || "";
  const companyName = company?.companyName || "Vision Fab Private Limited";

  const isReturnable = deliveryOrder.isReturnable;
  const returnableNote = deliveryOrder.returnableNote?.trim() || "";
  // Every DO (returnable or not) carries a value per line.
  const showValue = true;
  const colCount = showValue ? 6 : 5;
  const valueOfGoods = deliveryOrder.items.reduce((s, it) => s + Number(it.totalValue ?? 0), 0);
  const fmtMoney = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const customerName = deliveryOrder.customer?.customerName || "";
  const customerAddress = deliveryOrder.customer?.addresses?.[0]?.address || "";
  const customerGstin = deliveryOrder.customer?.gstin || "";
  const customerRoNumber = deliveryOrder.customer?.roNumber || "";

  // Company footer image — shared with the invoice (configured under invoice footer in settings)
  const footerImageUrl = settings?.enableInvoiceFooter && settings?.invoiceFooterUrl
    ? (settings.invoiceFooterUrl.startsWith("/uploads") ? `/api${settings.invoiceFooterUrl}` : settings.invoiceFooterUrl)
    : null;

  const footer = (
    <>
    <div className="footer-box">
      <div className="signature-box">
        <div className="signature-line">Goods Received in Good Condition By</div>
      </div>
      <div className="signature-box">
        {settings?.enableSignature && settings?.signatureUrl && (
          <img 
            src={settings.signatureUrl.startsWith("/uploads") ? `/api${settings.signatureUrl}` : settings.signatureUrl} 
            alt="Signature" 
            style={{ maxHeight: "40px", margin: "0 auto 4px auto" }} 
          />
        )}
        <div className="signature-line">For {companyName}</div>
      </div>
    </div>
    {footerImageUrl && (
      <div style={{ marginTop: "12px", textAlign: "center", width: "100%" }}>
        <img
          src={footerImageUrl}
          alt="Footer"
          style={{ maxWidth: "100%", height: "auto", maxHeight: "150px", display: "block", margin: "0 auto" }}
        />
      </div>
    )}
    </>
  );

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        body { margin: 0; padding: 0; background: #fff; color: #111; font-family: var(--print-font); }
        .page { width: 210mm; min-height: 297mm; padding: 12mm 12mm; box-sizing: border-box; position: relative; }
        .print-actions { position: fixed; top: 12px; right: 12px; z-index: 100; }
        @media screen {
          body { background: #f1f1f1; }
          .page { box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin: 12px auto; background: #fff; }
          .print-actions button { padding: 8px 14px; font-size: 13px; font-weight: 600; background: #c69200; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
        }
        @media print { .print-actions { display: none; } }

        /* Layout table: browsers repeat thead/tfoot on every printed page,
           so the company header and the signature footer appear on each page. */
        .print-layout { width: 100%; border-collapse: collapse; }
        .print-layout > thead > tr > td,
        .print-layout > tfoot > tr > td,
        .print-layout > tbody > tr > td { padding: 0; vertical-align: top; }
        @media print {
          @page { size: A4; margin: 12mm; }
          .page { width: auto; min-height: 0; padding: 0; }
          .items-table tr { break-inside: avoid; }
        }
        
        .header { display: flex; justify-content: space-between; margin-bottom: 5mm; }
        .header-left { width: 40%; }
        .header-left img { max-width: 100%; height: auto; max-height: 60px; }
        .tagline { font-size: 11px; font-weight: 600; margin-top: 2px; }
        .header-right { width: 55%; text-align: left; }
        .company-name { color: #d00000; font-size: 20px; font-weight: bold; margin-bottom: 4px; }
        .company-details { font-size: 10px; line-height: 1.3; font-weight: 500; }
        
        /* clone: when the box splits across printed pages, each page's piece gets its own
           top and bottom border instead of being left open at the page break. */
        .main-box { border: 1.5px solid #63a0d4; border-radius: 0; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
        
        .title-bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border-bottom: 1.5px solid #63a0d4; }
        .title-bar .do-title { color: #0070c0; font-size: 16px; font-weight: bold; }
        
        .info-grid { display: grid; grid-template-columns: 50% 50%; border-bottom: 1.5px solid #63a0d4; }
        .info-left { border-right: 1.5px solid #63a0d4; padding: 0; }
        .info-right { padding: 0; }
        
        .info-left-header { text-align: center; font-size: 10px; font-weight: bold; border-bottom: 1px solid #63a0d4; padding: 2px; }
        .info-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .info-table td { padding: 3px 6px; vertical-align: top; font-weight: 600; }
        .info-table td:first-child { font-weight: bold; width: 80px; }
        
        .right-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .right-table td { padding: 3px 6px; vertical-align: top; font-weight: 600; }
        .right-table td:nth-child(odd) { width: 80px; }
        
        .items-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 10px; }
        .items-table th { background: #e6f2ff; border-bottom: 1.5px solid #63a0d4; border-right: 1.5px solid #63a0d4; padding: 4px; font-weight: bold; }
        .items-table th:last-child { border-right: none; }
        .items-table td { border-right: 1.5px solid #63a0d4; padding: 4px; vertical-align: top; font-weight: 600; }
        .items-table td:last-child { border-right: none; }
        
        .items-table .text-left { text-align: left; }
        .items-table .text-right { text-align: right; }
        .items-table .font-bold { font-weight: bold; }
        
        .items-table tbody tr td { padding-bottom: 4px; padding-top: 4px; border-bottom: 1px solid #e1e1e1; }
        .items-table tbody tr:last-child td { border-bottom: none; }
        
        .items-table tbody tr.returnable-note td { border-top: 1.5px solid #63a0d4; border-bottom: none; padding: 8px 4px; text-align: center; font-weight: bold; text-transform: uppercase; white-space: pre-line; font-size: 11px; }
        .items-table tbody tr.value-total td { border-top: 1.5px solid #63a0d4; border-bottom: none; font-weight: bold; background: #e6f2ff; }
        .footer-box { margin-top: 20px; font-size: 10px; padding: 10px; border: 1.5px solid #63a0d4; display: flex; justify-content: space-between; min-height: 80px;}
        .signature-box { width: 45%; text-align: center; display: flex; flex-direction: column; justify-content: flex-end; }
        .signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 4px; font-weight: bold;}
      `}</style>

      <PrintToolbar doc="delivery-order" id={id} label="Print DO" />

      <div className="page">
        <table className="print-layout">
          <thead>
            <tr>
              <td>
        <div className="header">
          <div className="header-left">
            <img src={company?.uploadUrl ? (company.uploadUrl.startsWith("/uploads") ? `/api${company.uploadUrl}` : company.uploadUrl) : "/logo.jpg"} alt="Logo" />
            <div className="tagline">Your Engineering & Innovative Solution</div>
          </div>
          <div className="header-right">
            <div className="company-name">{companyName}</div>
            <div className="company-details">
              <div>{companyAddress}</div>
              <div>T(91) {companyPhone}</div>
              <div>E mail.: {companyEmail}</div>
            </div>
          </div>
        </div>
        
        <div style={{borderBottom: "2px solid #000", marginBottom: "4px"}}></div>
              </td>
            </tr>
          </thead>

          <tfoot>
            <tr>
              <td>
                {footer}
              </td>
            </tr>
          </tfoot>

          <tbody>
            <tr>
              <td>
        <div className="main-box">
          <div className="title-bar">
            <div></div>
            <div className="do-title">{isReturnable ? "RETURNABLE DELIVERY CHALLAN" : "DELIVERY ORDER"}</div>
            <div></div>
          </div>

          <div className="info-grid">
            <div className="info-left">
              <div className="info-left-header">Deliver To</div>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td>M/S</td>
                    <td>{customerName}</td>
                  </tr>
                  <tr>
                    <td>Address</td>
                    <td>{customerAddress}</td>
                  </tr>
                  <tr>
                    <td>GSTIN</td>
                    <td>{customerGstin}</td>
                  </tr>
                  <tr>
                    <td>RO No.</td>
                    <td>{customerRoNumber}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="info-right">
              <table className="right-table">
                <tbody>
                  <tr>
                    <td>D.O. No.</td>
                    <td className="font-bold">{deliveryOrder.doNo}</td>
                  </tr>
                  <tr>
                    <td>Date</td>
                    <td>{fmtDate(deliveryOrder.date)}</td>
                  </tr>
                  <tr>
                    <td>P.O. Ref</td>
                    <td>{deliveryOrder.poNo || deliveryOrder.salesOrder?.customerPoRef || "—"}</td>
                  </tr>
                  <tr>
                    <td>Sales Order</td>
                    <td>{deliveryOrder.salesOrder?.orderNo || "—"}</td>
                  </tr>
                  <tr>
                    <td>Transport</td>
                    <td>{deliveryOrder.modeOfTransport || "—"}</td>
                  </tr>
                  <tr>
                    <td>Vehicle No.</td>
                    <td>{deliveryOrder.vehicleNo || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <table className="items-table">
            <thead>
              <tr>
                <th style={{width: "5%"}}>S/N</th>
                <th style={{width: showValue ? "38%" : "45%"}}>Description</th>
                <th style={{width: showValue ? "17%" : "20%"}}>Work Order No</th>
                <th style={{width: showValue ? "12%" : "15%"}}>Quantity</th>
                <th style={{width: showValue ? "10%" : "15%"}}>UOM</th>
                {showValue && <th style={{width: "18%"}}>Total Value</th>}
              </tr>
            </thead>
            <tbody>
              {deliveryOrder.items.length === 0 ? (
                <tr>
                  <td colSpan={colCount} style={{ height: "40px" }}></td>
                </tr>
              ) : (
                deliveryOrder.items.map((it, idx) => (
                  <tr key={it.id}>
                    <td>{idx + 1}</td>
                    <td className="text-left">
                      <div className="font-bold">{it.workOrder?.jobDescription || "—"}</div>
                      {it.description?.trim() && (
                        <div style={{ whiteSpace: "pre-line", fontWeight: "normal", fontSize: "9px", marginTop: "1px" }}>
                          {it.description.trim()}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>{it.workOrderNo || "—"}</div>
                      {it.workOrder?.partName?.trim() && (
                        <div style={{ fontSize: "9px", marginTop: "1px" }}>{it.workOrder.partName.trim()}</div>
                      )}
                    </td>
                    <td className="text-right">{Number(it.quantity || 0)}</td>
                    <td>{it.uom?.uomName || "—"}</td>
                    {showValue && (
                      <td className="text-right">{fmtMoney(Number(it.totalValue ?? 0))}</td>
                    )}
                  </tr>
                ))
              )}
              {isReturnable && returnableNote && (
                <tr className="returnable-note">
                  <td></td>
                  <td colSpan={colCount - 1}>{returnableNote}</td>
                </tr>
              )}
              {showValue && (
                <tr className="value-total">
                  <td colSpan={colCount - 1} className="text-right">Value of Goods</td>
                  <td className="text-right">{fmtMoney(valueOfGoods)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
