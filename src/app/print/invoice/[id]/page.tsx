import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintToolbar from "@/app/print/PrintToolbar";
import EInvoiceQr from "./EInvoiceQr";

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

function numberToWords(n: number): string {
  if (isNaN(n) || n === 0) return '';
  const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
  const b = ['', '', 'TWENTY ', 'THIRTY ', 'FORTY ', 'FIFTY ', 'SIXTY ', 'SEVENTY ', 'EIGHTY ', 'NINETY '];
  
  if (n.toString().length > 9) return 'OVERFLOW';
  let str = ('000000000' + n).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!str) return '';
  let words = '';
  words += (Number(str[1]) != 0) ? (a[Number(str[1])] || b[Number(str[1][0])] + a[Number(str[1][1])]) + 'CRORE ' : '';
  words += (Number(str[2]) != 0) ? (a[Number(str[2])] || b[Number(str[2][0])] + a[Number(str[2][1])]) + 'LAKH ' : '';
  words += (Number(str[3]) != 0) ? (a[Number(str[3])] || b[Number(str[3][0])] + a[Number(str[3][1])]) + 'THOUSAND ' : '';
  words += (Number(str[4]) != 0) ? (a[Number(str[4])] || b[Number(str[4][0])] + a[Number(str[4][1])]) + 'HUNDRED ' : '';
  words += (Number(str[5]) != 0) ? ((words != '') ? 'AND ' : '') + (a[Number(str[5])] || b[Number(str[5][0])] + a[Number(str[5][1])]) : '';
  return words.trim();
}

function currencyToWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'ZERO RUPEES ONLY';
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let words = numberToWords(rupees) + ' RUPEES';
  if (paise > 0) {
    words += ' AND ' + numberToWords(paise) + ' PAISA';
  }
  return words + ' ONLY';
}

function parseBankDetails(text: string) {
  const data = { bankName: '', branch: '', accName: '', accNo: '', ifsc: '' };
  if (!text) return data;
  text.split('\n').forEach(line => {
    const parts = line.split(':');
    if (parts.length < 2) return;
    const key = parts[0].trim().toLowerCase();
    const val = parts.slice(1).join(':').trim();
    if (key.includes('bank name')) data.bankName = val;
    else if (key.includes('account name')) data.accName = val;
    else if (key.includes('account no')) data.accNo = val;
    else if (key.includes('ifsc') || key.includes('swift')) data.ifsc = val;
    else if (key.includes('branch')) data.branch = val;
  });
  return data;
}


export default async function PrintInvoicePage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: { orderBy: { lineNo: "asc" }, include: { uom: true, part: true } },
      preparedBy: true,
      customer: { include: { addresses: true } },
      contactPerson: true,
      currency: true,
      taxType: true,
      paymentTerm: true,
      company: true,
      deliveryOrders: { include: { deliveryOrder: true } },
      billTo: true,
    },
  });
  if (!inv) notFound();

  const company = inv.company || await prisma.companyProfile.findFirst({ where: { status: "Active" } });
  const settings = await prisma.generalSetting.findFirst();
  
  const totalQty = inv.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const uomName = inv.items.length > 0 && inv.items[0].uom ? inv.items[0].uom.uomName : "PCS";
  
  const gstRegistrationNo = company?.gstRegistrationNo || "";
  const companyAddress = company?.address || "";
  const companyPhone = company?.phoneNo || "";
  const companyEmail = company?.email || "";
  const msmeNo = company?.msmeNo || "";
  const companyName = company?.companyName || "Vision Fab Private Limited";

  const customerName = inv.customer.customerName;
  const customerAddress = inv.billTo?.address || inv.customer.addresses?.[0]?.address || "";
  const customerGstin = inv.customer.gstin || "";
  const customerRoNumber = inv.customer.roNumber || "";
  const customerPan = inv.customer.pan || "";
  const customerPlace = inv.customer.placeOfSupply || "";

  const bankData = parseBankDetails(inv.bankDetails || "");

  // GST breakup for the summary table. Prefer the stored CGST/SGST/IGST values;
  // fall back to splitting the flat tax for invoices created before e-invoicing.
  const taxRateNum = Number(inv.taxRate || 0);
  const taxAmountNum = Number(inv.taxAmount || 0);
  const storedCgst = Number(inv.cgstAmount || 0);
  const storedSgst = Number(inv.sgstAmount || 0);
  const storedIgst = Number(inv.igstAmount || 0);
  const hasStoredBreakup = storedCgst > 0 || storedSgst > 0 || storedIgst > 0;
  const isInterState = hasStoredBreakup
    ? storedIgst > 0
    : inv.supplyType === "inter";
  const cgstAmt = hasStoredBreakup ? storedCgst : (isInterState ? 0 : taxAmountNum / 2);
  const sgstAmt = hasStoredBreakup ? storedSgst : (isInterState ? 0 : taxAmountNum / 2);
  const igstAmt = hasStoredBreakup ? storedIgst : (isInterState ? taxAmountNum : 0);
  const hsnSummary = Array.from(new Set(inv.items.map((i) => i.hsnCode).filter(Boolean))).join(", ");

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
        .title-bar .original { font-size: 10px; font-weight: bold; }
        
        .info-grid { display: grid; grid-template-columns: 45% 55%; border-bottom: 1.5px solid #63a0d4; }
        .info-left { border-right: 1.5px solid #63a0d4; padding: 0; }
        .info-right { padding: 0; }
        
        .info-left-header { text-align: center; font-size: 10px; font-weight: bold; border-bottom: 1px solid #63a0d4; padding: 2px; }
        .info-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .info-table td { padding: 3px 6px; vertical-align: top; font-weight: 600; }
        .info-table td:first-child { font-weight: bold; width: 60px; }
        
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
        
        .items-table tbody tr.item-row td { padding-bottom: 2px; padding-top: 4px; }
        
        .items-table tbody tr.tax-row td { padding-top: 4px; padding-bottom: 2px; }
        
        .totals-row td { border-top: 1.5px solid #63a0d4; padding: 4px; font-weight: bold; background: #e6f2ff; }
        
        .has-bg .items-table th,
        .has-bg .totals-row td,
        .has-bg .bg-\\[\\#f7fbff\\] {
          background-color: transparent !important;
        }
      `}</style>

      <PrintToolbar doc="invoice" id={id} label="Print Invoice" />

      <div className={`page ${settings?.enableInvoiceBackground && settings?.invoiceBackgroundUrl ? 'has-bg' : ''}`} style={
        settings?.enableInvoiceBackground && settings?.invoiceBackgroundUrl
          ? {
              backgroundImage: `url('${settings.invoiceBackgroundUrl.startsWith("/uploads") ? `/api${settings.invoiceBackgroundUrl}` : settings.invoiceBackgroundUrl}')`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }
          : {}
      }>
        <div className="header">
          <div className="header-left">
            <img 
              src={company?.uploadUrl ? (company.uploadUrl.startsWith("/uploads") ? `/api${company.uploadUrl}` : company.uploadUrl) : "/logo.jpg"} 
              alt="Logo" 
              style={{ mixBlendMode: "multiply" }}
            />
            <div className="tagline">Your Engineering & Innovative Solution</div>
          </div>
          <div className="header-right">
            <div className="company-name">{companyName}</div>
            <div className="company-details">
              <div>{companyAddress}</div>
              <div>GST No.: {gstRegistrationNo}</div>
              {msmeNo && <div>MSME No.: {msmeNo}</div>}
              <div>T(91) {companyPhone}</div>
              <div>E mail.: {companyEmail}</div>
            </div>
          </div>
        </div>
        
        <div style={{borderBottom: "2px solid #000", marginBottom: "4px"}}></div>

        <div className="main-box">
          <div className="title-bar">
            <div className="gstin">GSTIN : {gstRegistrationNo}</div>
            <div className="invoice-title">TAX INVOICE</div>
            <div className="original">ORIGINAL FOR RECIPIENT</div>
          </div>

          {inv.einvoiceStatus === "Generated" && inv.irn && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                padding: "6px 8px",
                borderBottom: "1.5px solid #63a0d4",
                fontSize: "10px",
              }}
            >
              <div style={{ lineHeight: 1.5 }}>
                <div>
                  <span style={{ fontWeight: "bold" }}>IRN:</span>{" "}
                  <span style={{ wordBreak: "break-all", fontFamily: "monospace" }}>{inv.irn}</span>
                </div>
                <div>
                  <span style={{ fontWeight: "bold" }}>Ack No.:</span> {inv.ackNo || "—"}
                  <span style={{ marginLeft: "12px", fontWeight: "bold" }}>Ack Date:</span>{" "}
                  {inv.ackDate ? fmtDate(inv.ackDate) : "—"}
                </div>
              </div>
              {inv.signedQrCode && (
                <div style={{ flexShrink: 0 }}>
                  <EInvoiceQr value={inv.signedQrCode} size={96} />
                </div>
              )}
            </div>
          )}

          <div className="info-grid">
            <div className="info-left">
              <div className="info-left-header">Customer Detail</div>
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
                  <tr>
                    <td>PAN</td>
                    <td>{customerPan}</td>
                  </tr>
                  <tr>
                    <td>Place of<br/>Supply</td>
                    <td>{customerPlace}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="info-right">
              <table className="right-table">
                <tbody>
                  <tr>
                    <td>Invoice No.</td>
                    <td className="font-bold">{inv.invoiceNo?.split("-R")[0]}</td>
                    <td>Invoice Date</td>
                    <td>{fmtDate(inv.invoiceDate)}</td>
                  </tr>
                  <tr>
                    <td>P.O. No.</td>
                    <td>{inv.poNo || ""}</td>
                    <td>Due Date</td>
                    <td>{fmtDate(inv.dueDate)}</td>
                  </tr>
                  <tr>
                    <td>Vehicle Number</td>
                    <td>{inv.vehicleNumber || ""}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <table className="items-table">
            <thead>
              <tr>
                <th style={{width: "4%"}}>Sr.<br/>No.</th>
                <th style={{width: "48%"}}>Name of Product / Service</th>
                <th style={{width: "12%"}}>HSN / SAC</th>
                <th style={{width: "10%"}}>Qty</th>
                <th style={{width: "12%"}}>Rate</th>
                <th style={{width: "14%"}}>Taxable Value</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, idx) => (
                <tr key={it.id} className="item-row">
                  <td>{idx + 1}</td>
                  <td className="text-left font-bold">
                    {it.part?.partNo ? `${it.part.partNo} ` : ""}
                    {it.description || it.part?.description}
                  </td>
                  <td>{it.hsnCode || ""}</td>
                  <td className="text-right">{fmt(it.quantity)} {it.uom?.uomName || ""}</td>
                  <td className="text-right">{fmt(it.unitPrice)}</td>
                  <td className="text-right bg-[#f7fbff]">{fmt(it.amount)}</td>
                </tr>
              ))}
              
              <tr className="tax-row">
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td className="text-right font-bold border-t-2 border-[#63a0d4] bg-[#f7fbff]">{fmt(inv.amountBeforeTax)}</td>
              </tr>
              
              {Number(inv.taxAmount) > 0 && (
                <tr className="tax-row">
                  <td></td>
                  <td className="text-right font-bold italic pr-4">
                    {inv.taxType && Number(inv.taxType.taxRate) > 0 
                      ? `${inv.taxType.taxType} (${inv.taxType.taxRate}%)` 
                      : "Total Tax"}
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="text-right bg-[#f7fbff]">{fmt(inv.taxAmount)}</td>
                </tr>
              )}
              
              {Number(inv.roundOff) !== 0 && (
                <tr className="tax-row">
                  <td></td>
                  <td className="text-right font-bold italic pr-4">
                    Round Off
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="text-right bg-[#f7fbff]">{fmt(inv.roundOff)}</td>
                </tr>
              )}
              
              <tr style={{ height: "40px" }}>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td className="bg-[#f7fbff]"></td>
              </tr>
              
              <tr className="totals-row">
                <td colSpan={3} className="text-right pr-4">Total</td>
                <td className="text-right">{fmt(totalQty)} {uomName}</td>
                <td></td>
                <td className="text-right">₹ {fmt(inv.amountAfterTax)}</td>
              </tr>
            </tbody>
          </table>

          <div className="footer-section">
            <div style={{ borderTop: "1.5px solid #63a0d4", borderBottom: "1.5px solid #63a0d4", padding: "4px", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div>Total in words</div>
                <div className="font-bold uppercase">{currencyToWords(Number(inv.amountAfterTax || 0))}</div>
              </div>
              <div className="font-bold text-[9px] pr-2 mt-2">(E &amp; O.E.)</div>
            </div>

            {isInterState ? (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "10px", borderBottom: "1.5px solid #63a0d4" }}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{width: '34%', borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>HSN / SAC</th>
                    <th rowSpan={2} style={{width: '24%', borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>Taxable Value</th>
                    <th colSpan={2} style={{width: '30%', borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>IGST</th>
                    <th rowSpan={2} style={{width: '12%', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>Total</th>
                  </tr>
                  <tr>
                    <th style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>%</th>
                    <th style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>{hsnSummary}</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}} className="text-right">{fmt(inv.amountBeforeTax)}</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}} className="text-right">{fmt(taxRateNum)}</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}} className="text-right">{fmt(igstAmt)}</td>
                    <td style={{borderBottom: '1.5px solid #63a0d4', padding: '4px'}} className="text-right">{fmt(igstAmt)}</td>
                  </tr>
                  <tr>
                    <td style={{borderRight: '1.5px solid #63a0d4', padding: '4px'}} className="text-right font-bold pr-4">Total</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', padding: '4px'}} className="text-right font-bold">{fmt(inv.amountBeforeTax)}</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', padding: '4px'}}></td>
                    <td style={{borderRight: '1.5px solid #63a0d4', padding: '4px'}} className="text-right font-bold">{fmt(igstAmt)}</td>
                    <td style={{padding: '4px'}} className="text-right font-bold">{fmt(igstAmt)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "10px", borderBottom: "1.5px solid #63a0d4" }}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{width: '25%', borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>HSN / SAC</th>
                    <th rowSpan={2} style={{width: '15%', borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>Taxable Value</th>
                    <th colSpan={2} style={{width: '24%', borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>CGST</th>
                    <th colSpan={2} style={{width: '24%', borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>SGST</th>
                    <th rowSpan={2} style={{width: '12%', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>Total</th>
                  </tr>
                  <tr>
                    <th style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>%</th>
                    <th style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>Amount</th>
                    <th style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>%</th>
                    <th style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}}>{hsnSummary}</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}} className="text-right">{fmt(inv.amountBeforeTax)}</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}} className="text-right">{fmt(taxRateNum / 2)}</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}} className="text-right">{fmt(cgstAmt)}</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}} className="text-right">{fmt(taxRateNum / 2)}</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', borderBottom: '1.5px solid #63a0d4', padding: '4px'}} className="text-right">{fmt(sgstAmt)}</td>
                    <td style={{borderBottom: '1.5px solid #63a0d4', padding: '4px'}} className="text-right">{fmt(cgstAmt + sgstAmt)}</td>
                  </tr>
                  <tr>
                    <td style={{borderRight: '1.5px solid #63a0d4', padding: '4px'}} className="text-right font-bold pr-4">Total</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', padding: '4px'}} className="text-right font-bold">{fmt(inv.amountBeforeTax)}</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', padding: '4px'}}></td>
                    <td style={{borderRight: '1.5px solid #63a0d4', padding: '4px'}} className="text-right font-bold">{fmt(cgstAmt)}</td>
                    <td style={{borderRight: '1.5px solid #63a0d4', padding: '4px'}}></td>
                    <td style={{borderRight: '1.5px solid #63a0d4', padding: '4px'}} className="text-right font-bold">{fmt(sgstAmt)}</td>
                    <td style={{padding: '4px'}} className="text-right font-bold">{fmt(cgstAmt + sgstAmt)}</td>
                  </tr>
                </tbody>
              </table>
            )}

            <div style={{ borderBottom: "1.5px solid #63a0d4", padding: "4px", fontSize: "10px", display: "flex" }}>
              <span style={{ marginRight: "4px" }}>Total Tax in words:</span>
              <span className="font-bold uppercase">{currencyToWords(Number(inv.taxAmount || 0))}</span>
            </div>

            <div style={{ display: "flex", fontSize: "10px" }}>
              <div style={{ width: "65%", borderRight: "1.5px solid #63a0d4", display: "flex", flexDirection: "column" }}>
                <div style={{ textAlign: "center", fontWeight: "bold", padding: "2px", borderBottom: "1.5px solid #63a0d4" }}>Bank Details</div>
                
                <table style={{ width: "100%", borderCollapse: "collapse", padding: "4px" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "4px", width: "20%" }}>Name</td>
                      <td style={{ padding: "4px", width: "30%", fontWeight: "bold" }}>{bankData.bankName}</td>
                      <td style={{ padding: "4px", width: "20%" }}>Branch</td>
                      <td style={{ padding: "4px", width: "30%", fontWeight: "bold" }}>{bankData.branch}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px" }}>Acc. Name</td>
                      <td style={{ padding: "4px", fontWeight: "bold" }}>{bankData.accName}</td>
                      <td style={{ padding: "4px" }}>Acc. Number</td>
                      <td style={{ padding: "4px", fontWeight: "bold" }}>{bankData.accNo}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px" }}>IFSC</td>
                      <td style={{ padding: "4px", fontWeight: "bold" }}>{bankData.ifsc}</td>
                      <td style={{ padding: "4px" }}></td>
                      <td style={{ padding: "4px" }}></td>
                    </tr>
                  </tbody>
                </table>
                
                <div style={{ padding: "4px", borderTop: "1.5px solid #63a0d4", fontSize: "9px", lineHeight: "1.2", marginTop: "auto" }}>
                  Subject to our home Jurisdiction.<br/>
                  Our Responsibility Ceases as soon as goods leaves our Premises.<br/>
                  Goods once sold will not taken back.<br/>
                  Delivery Ex-Premises.
                </div>
              </div>
              
              <div style={{ width: "35%", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "center", padding: "4px" }}>
                <div>
                  <div style={{ fontSize: "8px", fontWeight: "bold", paddingBottom: "2px" }}>
                    Certified that the particulars given above are true and<br/>correct.
                  </div>
                  <div style={{ fontWeight: "bold", fontSize: "12px", marginTop: "4px" }}>
                    For {companyName}
                  </div>
                </div>
                <div style={{ marginTop: "10px" }}>
                  {settings?.enableSignature && settings?.signatureUrl && (
                    <img 
                      src={settings.signatureUrl.startsWith("/uploads") ? `/api${settings.signatureUrl}` : settings.signatureUrl} 
                      alt="Signature" 
                      style={{ maxHeight: "40px", margin: "0 auto 4px auto", mixBlendMode: "multiply" }} 
                    />
                  )}
                  <div style={{ fontSize: "8px", fontWeight: "bold", paddingBottom: "4px" }}>
                    Authorised Signatory
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {settings?.enableInvoiceFooter && settings?.invoiceFooterUrl && (
          <div style={{ marginTop: "12px", textAlign: "center", width: "100%" }}>
            <img
              src={settings.invoiceFooterUrl.startsWith("/uploads") ? `/api${settings.invoiceFooterUrl}` : settings.invoiceFooterUrl}
              alt="Invoice Footer"
              style={{ maxWidth: "100%", height: "auto", maxHeight: "150px", display: "block", margin: "0 auto" }}
            />
          </div>
        )}
      </div>
    </>
  );
}
