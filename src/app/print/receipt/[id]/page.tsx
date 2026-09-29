import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintToolbar from "@/app/print/PrintToolbar";

export const dynamic = "force-dynamic";

function fmt(n: any) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date | string) {
  if (!d) return "";
  const dt = new Date(d);
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dd}-${m[dt.getMonth()]}-${dt.getFullYear()}`;
}

export default async function PrintReceiptPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      customer: { include: { addresses: true } },
      invoice: true,
      currency: true,
      company: true,
      creator: true,
    },
  });
  if (!receipt) notFound();

  const company = receipt.company || await prisma.companyProfile.findFirst({ where: { status: "Active" } });
  const settings = await prisma.generalSetting.findFirst();
  
  const gstRegistrationNo = company?.gstRegistrationNo || "";
  const companyAddress = company?.address || "";
  const companyPhone = company?.phoneNo || "";
  const companyEmail = company?.email || "";
  const companyName = company?.companyName || "Vision Fab Private Limited";

  const customerName = receipt.customer.customerName;
  const customerAddress = receipt.customer.addresses?.[0]?.address || "";

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
        
        .header { display: flex; justify-content: space-between; margin-bottom: 5mm; }
        .header-left { width: 40%; }
        .header-left img { max-width: 100%; height: auto; max-height: 60px; }
        .tagline { font-size: 11px; font-weight: 600; margin-top: 2px; }
        .header-right { width: 55%; text-align: left; }
        .company-name { color: #d00000; font-size: 20px; font-weight: bold; margin-bottom: 4px; }
        .company-details { font-size: 10px; line-height: 1.3; font-weight: 500; }
        
        .main-box { border: 1.5px solid #63a0d4; border-radius: 0; }
        
        .title-bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border-bottom: 1.5px solid #63a0d4; }
        .title-bar .gstin { font-weight: bold; font-size: 14px; }
        .title-bar .invoice-title { color: #0070c0; font-size: 16px; font-weight: bold; }
        
        .info-grid { display: grid; grid-template-columns: 50% 50%; border-bottom: 1.5px solid #63a0d4; }
        .info-left { border-right: 1.5px solid #63a0d4; padding: 0; }
        .info-right { padding: 0; }
        
        .info-left-header { text-align: center; font-size: 10px; font-weight: bold; border-bottom: 1px solid #63a0d4; padding: 2px; }
        .info-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .info-table td { padding: 6px; vertical-align: top; font-weight: 600; }
        .info-table td:first-child { font-weight: bold; width: 100px; }
        
        .right-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .right-table td { padding: 6px; vertical-align: top; font-weight: 600; }
        .right-table td:first-child { font-weight: bold; width: 100px; }

        .receipt-amount { font-size: 16px; font-weight: bold; color: #0070c0; padding: 20px; text-align: center; border-bottom: 1.5px solid #63a0d4; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 20px; font-size: 12px; font-weight: bold; }
        .signature-line { border-top: 1px solid #000; width: 150px; text-align: center; padding-top: 4px; }
      `}</style>

      <PrintToolbar doc="receipt" id={id} label="Print Receipt" />

      <div className="page">
        <div className="header">
          <div className="header-left">
            <img src="/logo.jpg" alt="Logo" />
            <div className="tagline">Your Engineering & Innovative Solution</div>
          </div>
          <div className="header-right">
            <div className="company-name">{companyName}</div>
            <div className="company-details">
              <div>{companyAddress}</div>
              <div>GST No.: {gstRegistrationNo}</div>
              <div>T(91) {companyPhone}</div>
              <div>E mail.: {companyEmail}</div>
            </div>
          </div>
        </div>
        
        <div style={{borderBottom: "2px solid #000", marginBottom: "4px"}}></div>

        <div className="main-box">
          <div className="title-bar">
            <div className="gstin">GSTIN : {gstRegistrationNo}</div>
            <div className="invoice-title">OFFICIAL RECEIPT</div>
            <div className="original">ORIGINAL</div>
          </div>

          <div className="info-grid">
            <div className="info-left">
              <div className="info-left-header">Received From</div>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td>Customer</td>
                    <td>{customerName}</td>
                  </tr>
                  <tr>
                    <td>Address</td>
                    <td>{customerAddress}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="info-right">
              <table className="right-table">
                <tbody>
                  <tr>
                    <td>Receipt No.</td>
                    <td className="font-bold">{receipt.receiptNo}</td>
                  </tr>
                  <tr>
                    <td>Date</td>
                    <td>{fmtDate(receipt.receiptDate)}</td>
                  </tr>
                  <tr>
                    <td>Payment Method</td>
                    <td>{receipt.paymentMethod}</td>
                  </tr>
                  {receipt.chequeRefNo && (
                    <tr>
                      <td>Ref/Cheque No.</td>
                      <td>{receipt.chequeRefNo}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Against Invoice</td>
                    <td>{receipt.invoice.invoiceNo}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="receipt-amount">
            Amount Received: {receipt.currency.code} {fmt(receipt.amountReceived)}
          </div>
          
          <div style={{ padding: "10px", fontSize: "10px", minHeight: "60px" }}>
             <strong>Remarks:</strong> {receipt.remark || "-"}
          </div>
        </div>
        
        <div className="signatures">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
             <br/><br/><br/>
             <div className="signature-line">Customer Signature</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
            {settings?.enableSignature && settings?.signatureUrl ? (
              <img 
                src={settings.signatureUrl.startsWith("/uploads") ? `/api${settings.signatureUrl}` : settings.signatureUrl} 
                alt="Signature" 
                style={{ maxHeight: "40px", marginBottom: "4px" }} 
              />
            ) : (
              <><br/><br/><br/></>
            )}
            <div className="signature-line">Authorized Signature</div>
          </div>
        </div>
      </div>
    </>
  );
}
