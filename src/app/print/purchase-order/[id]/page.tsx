import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintToolbar from "@/app/print/PrintToolbar";
import CompanyLogo from "./CompanyLogo";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.toLocaleString('en-US', { month: 'short' }));
  return `${dd}-${mm}-${dt.getFullYear()}`;
}

const formatNumber = (num: any, decimals: number = 2) => {
  if (num === null || num === undefined) return "0.00";
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default async function PrintPurchaseOrderPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      company: true,
      supplier: {
        include: { addresses: true }
      },
      currency: true,
      taxType: true,
      contactPerson: true,
      purchaser: true,
      items: {
        include: { poUom: true }
      }
    }
  });

  if (!po) notFound();

  const settings = await prisma.generalSetting.findFirst();

  const primarySupplierAddress = po.supplier?.addresses?.find((a) => a.isDefault)?.address || po.supplier?.addresses?.[0]?.address || "";
  
  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; padding: 0; background: #fff; color: #111; font-family: var(--print-font); }
        .page { width: 210mm; min-height: 297mm; padding: 15mm 20mm; box-sizing: border-box; position: relative; font-size: 12px; }
        .dyn { color: #3b82f6; }
        
        .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .logo-box { width: 55%; display: flex; align-items: center; justify-content: center; min-height: 80px; padding: 10px; }
        .company-info { width: 40%; font-size: 11px; line-height: 1.4; }
        
        h1.title { text-align: center; font-size: 18px; margin: 20px 0; font-weight: bold; text-decoration: underline; }
        
        table.items-table { width: 100%; border-collapse: collapse; border: 1px solid #111; font-size: 11px; margin-top: 15px; }
        table.items-table th, table.items-table td { border: 1px solid #111; padding: 5px; }
        table.items-table th { color: #111; font-weight: bold; }
        
        @media screen {
          body { background: #f1f1f1; }
          .page { box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 20px auto; background: #fff; }
          .print-actions { position: fixed; top: 12px; right: 12px; z-index: 100; }
          .print-actions button { padding: 10px 16px; font-size: 14px; font-weight: 600; background: #1e3a8a; color: #fff; border: 0; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .print-actions button:hover { background: #1e40af; }
        }
        @media print { .print-actions { display: none; } }
      `}</style>

      <PrintToolbar doc="purchase-order" id={id} label="Print PO" />

      <div className="page">
        <div className="header-row">
          <div className="logo-box">
            <CompanyLogo src={po.company?.uploadUrl || ""} alt="COMPANY LOGO" companyName={po.company?.companyName} style={{ maxHeight: "60px", maxWidth: "100%", objectFit: "contain" }} />
          </div>
          <div className="company-info dyn">
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>{po.company?.companyName}</div>
            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '4px' }}>{po.company?.address}</div>
            <div>T (65) {po.company?.phoneNo}</div>
            <div>F (65) {po.company?.faxNo}</div>
            <div style={{ marginTop: '4px' }}>GST Reg No. : {po.company?.gstRegistrationNo}</div>
          </div>
        </div>

        <h1 className="title">PURCHASE ORDER</h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <div style={{ width: '55%' }}>
            <div style={{ marginBottom: '2px' }}>To :</div>
            <div className="dyn font-bold" style={{ fontSize: '13px', marginBottom: '2px' }}>{po.supplier?.supplierName}</div>
            <div className="dyn" style={{ whiteSpace: 'pre-wrap', marginBottom: '4px' }}>{primarySupplierAddress}</div>
            {po.supplierGst && <div style={{ marginBottom: '2px' }}>Supplier GST : <span className="dyn">{po.supplierGst}</span></div>}
            <div style={{ marginBottom: '2px' }}>Attn : <span className="dyn">{po.contactPerson?.contactPersonName || "—"}</span></div>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '2px' }}>
              <div>Tel : <span className="dyn">{po.telNo || "—"}</span></div>
              <div>Fax : <span className="dyn">{po.faxNo || "—"}</span></div>
            </div>
            <div>Email : <span className="dyn">{po.email || "—"}</span></div>
          </div>
          
          <div style={{ width: '40%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr><td style={{ width: '35%', paddingBottom: '4px' }}>PO No</td><td style={{ width: '5%', paddingBottom: '4px' }}>:</td><td className="dyn" style={{ paddingBottom: '4px' }}>{po.poNo}</td></tr>
                <tr><td style={{ paddingBottom: '4px' }}>Date</td><td style={{ paddingBottom: '4px' }}>:</td><td className="dyn" style={{ paddingBottom: '4px' }}>{fmtDate(po.date)}</td></tr>
                <tr><td style={{ paddingBottom: '4px' }}>Purchaser</td><td style={{ paddingBottom: '4px' }}>:</td><td className="dyn" style={{ paddingBottom: '4px' }}>{po.purchaser?.name}</td></tr>
                <tr><td style={{ paddingBottom: '4px' }}>Email</td><td style={{ paddingBottom: '4px' }}>:</td><td className="dyn" style={{ paddingBottom: '4px' }}>{po.purchaser?.email}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>Item</th>
              <th style={{ width: '12%' }}>Material</th>
              <th style={{ width: '12%' }}>Description</th>
              <th style={{ width: '8%' }}>HSN Code</th>
              <th style={{ width: '9%' }}>Shape</th>
              <th style={{ width: '9%' }}>Size</th>
              <th style={{ width: '12%' }}>Delivery Date</th>
              <th style={{ width: '7%', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '7%', textAlign: 'center' }}>UOM</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Unit<br/>Price</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((it, idx) => (
              <tr key={it.id} className="dyn">
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{it.material}</td>
                <td>
                  <div>{it.description}</div>
                  {it.hsnDescription && <div style={{ fontSize: '9px', color: '#555' }}>{it.hsnDescription}</div>}
                </td>
                <td>{it.hsnCode}</td>
                <td>{it.shape}</td>
                <td>{it.size}</td>
                <td style={{ textAlign: 'center' }}>{fmtDate(it.deliveryDate)}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(it.quantity)}</td>
                <td style={{ textAlign: 'center' }}>{it.poUom?.uomName}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(it.unitPrice, 4)}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(it.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} rowSpan={Number(po.roundOff) !== 0 ? 4 : 3} style={{ border: 'none', padding: '15px 10px 0 0', verticalAlign: 'top' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#111' }}>
                  <tbody>
                    <tr>
                      <td style={{ verticalAlign: 'top', width: '70px', paddingBottom: '10px' }}>Require :</td>
                      <td style={{ paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '12px', height: '12px', border: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
                            {po.millCertificate && <span style={{ fontSize: '10px', lineHeight: 1 }}>✓</span>}
                          </div>
                          <span className="dyn">Mill Certificate</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <div style={{ width: '12px', height: '12px', border: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111' }}>
                            {po.certOfConformance && <span style={{ fontSize: '10px', lineHeight: 1 }}>✓</span>}
                          </div>
                          <span className="dyn">Certificate of Conformance</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top', paddingTop: '10px' }}>Remark :</td>
                      <td className="dyn" style={{ minHeight: '40px', paddingBottom: '4px', paddingTop: '10px' }}>
                        <div style={{ borderBottom: '1px dotted #3b82f6', display: 'inline-block', minWidth: '100%', whiteSpace: 'pre-wrap' }}>{po.remark}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td colSpan={3} style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <span>Total :</span>
                  <span style={{ width: '15px', textAlign: 'center' }}>$</span>
                </div>
              </td>
              <td className="dyn" style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(po.amountBeforeTax)}</td>
            </tr>
            <tr>
              <td colSpan={3} style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <span>Total Tax :</span>
                  <span style={{ width: '15px', textAlign: 'center' }}>$</span>
                </div>
              </td>
              <td className="dyn" style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(po.taxAmount)}</td>
            </tr>
            {Number(po.roundOff) !== 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <span>Round Off :</span>
                    <span style={{ width: '15px', textAlign: 'center' }}>$</span>
                  </div>
                </td>
                <td className="dyn" style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(po.roundOff)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <span>Total {po.currency?.code} :</span>
                  <span style={{ width: '15px', textAlign: 'center' }}>$</span>
                </div>
              </td>
              <td className="dyn" style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(po.amountAfterTax)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ border: '1px solid #111', padding: '15px', marginTop: '20px', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {po.company?.as9100RequirementNote && (
              <div style={{ fontSize: '9px', lineHeight: '1.4' }}>
                <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>Requirement (AS9100 product) - Supplier shall:</div>
                <div>- Notify {po.company?.companyName || "Vision One Pte Ltd"} on non-conforming products</div>
                <div>- Obtain {po.company?.companyName || "Vision One Pte Ltd"}'s approval for non-conforming product disposition</div>
                <div>- Notify {po.company?.companyName || "Vision One Pte Ltd"} and obtain approval for :</div>
                <div style={{ marginLeft: '10px' }}>- changes in product and/or process</div>
                <div style={{ marginLeft: '10px' }}>- change of outsource service provider</div>
                <div style={{ marginLeft: '10px' }}>- change of manufacturing facility location</div>
                <div>- Applicable records to be retained for at least 3 years</div>
                <div>- Provide right of access to {po.company?.companyName || "Vision One Pte Ltd"}, its customer and regulatory authorities to applicable facilities, at any level of the supply chain, involved in the order and all applicable records.</div>
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '200px' }}>
              <div style={{ fontSize: '11px', marginBottom: '10px', width: '100%', textAlign: 'center' }}>
                Approved By
              </div>
              {settings?.enableSignature && settings?.signatureUrl ? (
                <img 
                  src={settings.signatureUrl.startsWith("/uploads") ? `/api${settings.signatureUrl}` : settings.signatureUrl} 
                  alt="Signature" 
                  style={{ maxHeight: "40px", marginBottom: "4px" }} 
                />
              ) : (
                <div style={{ height: "40px" }}></div>
              )}
              <div style={{ borderTop: '1px solid #111', width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
