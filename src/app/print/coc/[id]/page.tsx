import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintToolbar from "@/app/print/PrintToolbar";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = m[dt.getMonth()];
  return `${dd}-${mm}-${dt.getFullYear()}`;
}

export default async function PrintCocPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const coc = await prisma.certificateOfConformity.findUnique({
    where: { id },
    include: {
      customer: { include: { addresses: true } },
      deliveryOrder: true,
      workOrder: true,
      cocUom: true,
      approvedBy: true,
      checkedBy: true,
      welder: true,
      weldingMachine: true,
      painter: true,
      paintingMethod: true,
    },
  });
  if (!coc) notFound();

  const company = await prisma.companyProfile.findFirst({ where: { status: "Active" } });
  const settings = await prisma.generalSetting.findFirst();

  // Fallback to static if no company
  const companyName = company?.companyName || "Vision One Pte Ltd";
  const addressLines = company?.address ? company.address.split('\n') : ["No. 3 Kian Teck Road", "Singapore 628764"];
  const tel = company?.phoneNo || "(65) 6264 8334";
  const fax = company?.faxNo || "(65) 6264 8335";
  const gst = company?.gstRegistrationNo || "201007671E";

  const description = coc.workOrder?.jobDescription || "—";
  const poNo = coc.workOrder?.customerPoRef || "—";
  const qtyStr = `${coc.cocQuantity || 0} ${coc.cocUom?.uomName || ""}`;

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; padding: 0; background: #fff; color: #111; font-family: var(--print-font); font-size: 13px; }
        .page { width: 210mm; min-height: 297mm; padding: 15mm 20mm; box-sizing: border-box; position: relative; margin: 0 auto; }
        
        .doc-rev { text-align: right; font-size: 13px; margin-bottom: 10px; font-weight: normal; color: #000; }
        
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15mm; }
        .logo-box { width: 55%; height: 90px; background: transparent; display: flex; align-items: center; justify-content: flex-start; font-weight: bold; color: #0284c7; font-size: 14px; text-align: left; border-radius: 2px; }
        .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
        
        .company-info { width: 40%; color: #3b82f6; font-size: 13px; line-height: 1.4; }
        
        .title-container { text-align: center; margin-bottom: 15mm; }
        h1.title { font-size: 18px; font-weight: bold; text-decoration: underline; margin: 0; display: inline-block; color: #000; }
        
        table.info-table { width: 100%; border-collapse: collapse; margin-bottom: 25mm; }
        table.info-table td { padding: 4px 0; vertical-align: top; }
        table.info-table td.label { width: 150px; font-weight: normal; color: #000; text-transform: uppercase; }
        table.info-table td.colon { width: 20px; font-weight: normal; color: #000; }
        table.info-table td.value { color: #3b82f6; text-transform: uppercase; }
        
        .body-text { margin-bottom: 25mm; line-height: 1.8; text-transform: uppercase; color: #000; }
        .body-text .dynamic-blue { color: #3b82f6; }
        
        .signatures { display: flex; justify-content: space-between; margin-bottom: 20mm; }
        .sig-block { width: 35%; }
        .sig-title { margin-bottom: 5px; color: #000; text-transform: uppercase; }
        .sig-role { margin-bottom: 5px; color: #000; text-transform: uppercase; }
        .sig-name { color: #3b82f6; margin-bottom: 30px; text-transform: uppercase; min-height: 18px; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; }
        .sig-footer { text-align: center; color: #000; font-size: 12px; }
        
        
        
        @media screen {
          body { background: #f1f1f1; }
          .page { box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 20px auto; background: #fff; }
          .print-actions { position: fixed; top: 12px; right: 12px; z-index: 100; }
          .print-actions button { padding: 10px 16px; font-size: 14px; font-weight: 600; background: #1e3a8a; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
          .print-actions button:hover { background: #1e40af; }
        }
        @media print { .print-actions { display: none; } }
      `}</style>

      <PrintToolbar doc="coc" id={id} label="Print COC" />

      <div className="page">
        <div className="doc-rev">V-QA-011 Rev B</div>
        
        <div className="header">
          <div className="logo-box">
            <img src="/logo.jpg" alt="Company Logo" style={{ maxHeight: "80px", maxWidth: "100%", objectFit: "contain" }} />
          </div>
          <div className="company-info">
            <div>{companyName}</div>
            {addressLines.map((line, i) => <div key={i}>{line}</div>)}
            <div>T {tel}</div>
            <div>F {fax}</div>
            <div>GST Reg No. : {gst}</div>
          </div>
        </div>

        <div className="title-container">
          <h1 className="title">CERTIFICATE OF CONFORMITY</h1>
        </div>

        <table className="info-table">
          <tbody>
            <tr>
              <td className="label">CUSTOMER</td>
              <td className="colon">:</td>
              <td className="value">{coc.customer?.customerName || "—"}</td>
            </tr>
            {coc.type !== "Spray Painting" && (
              <>
                <tr>
                  <td className="label">DESCRIPTION</td>
                  <td className="colon">:</td>
                  <td className="value">{description}</td>
                </tr>
                <tr>
                  <td className="label">DRAWING NO</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.drawingNo || "—"}</td>
                </tr>
              </>
            )}
            {coc.type === "Spray Painting" && (
              <>
                <tr>
                  <td className="label">PART NAME</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.partName || "—"}</td>
                </tr>
                <tr>
                  <td className="label">PART NUMBER</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.partNumber || "—"}</td>
                </tr>
              </>
            )}
            <tr>
              <td className="label">PO NO</td>
              <td className="colon">:</td>
              <td className="value">{poNo}</td>
            </tr>
            {coc.type !== "Spray Painting" && (
              <tr>
                <td className="label">WORK ORDER NO</td>
                <td className="colon">:</td>
                <td className="value">{coc.workOrderNo || "—"}</td>
              </tr>
            )}
            <tr>
              <td className="label">QUANTITY</td>
              <td className="colon">:</td>
              <td className="value">{qtyStr}</td>
            </tr>
            {coc.type === "Welding" && (
              <>
                <tr>
                  <td className="label">SAN NO</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.sanNo || "—"}</td>
                </tr>
                <tr>
                  <td className="label">WELDER NAME & ID</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.welder ? `${coc.welder.name} (${coc.welder.code})` : "—"}</td>
                </tr>
                <tr>
                  <td className="label">WELDER ID NO</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.welder?.code || "—"}</td>
                </tr>
                <tr>
                  <td className="label">WELDING PROCESS</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.weldingProcess || "—"}</td>
                </tr>
                <tr>
                  <td className="label">
                    <div>WELDING MACHINE</div>
                    <div>SERIAL NO</div>
                  </td>
                  <td className="colon">
                    <div>&nbsp;</div>
                    <div>:</div>
                  </td>
                  <td className="value">
                    <div>&nbsp;</div>
                    <div>{coc.weldingMachine?.serialNo || "—"}</div>
                  </td>
                </tr>
              </>
            )}
            {coc.type === "Spray Painting" && (
              <>
                <tr>
                  <td className="label">PAINTING SAN NUMBER</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.paintingSanNo || "—"}</td>
                </tr>
                <tr>
                  <td className="label">PAINTER NAME</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.painter?.name || "—"}</td>
                </tr>
                <tr>
                  <td className="label">PAINTER ID NO</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.painter?.code || "—"}</td>
                </tr>
                <tr>
                  <td className="label">PAINTING METHOD</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.paintingMethod?.method || "—"}</td>
                </tr>
                <tr>
                  <td className="label">PAINTING SPECIFICATION</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.paintingSpecification || "—"}</td>
                </tr>
                <tr>
                  <td className="label">PAINT THICKNESS SPECIFICATION</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.paintThicknessSpecification || "—"}</td>
                </tr>
                <tr>
                  <td className="label">MEASURED TOTAL PAINT THICKNESS</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.measuredTotalPaintThickness || "—"}</td>
                </tr>
                <tr>
                  <td className="label">PAINT BATCH NUMBER</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.paintBatchNo || "—"}</td>
                </tr>
                <tr>
                  <td className="label">INSPECTION EQUIPMENT</td>
                  <td className="colon">:</td>
                  <td className="value">{coc.inspectionEquipment || "—"}</td>
                </tr>
              </>
            )}
            <tr>
              <td className="label">VISION ONE DO</td>
              <td className="colon">:</td>
              <td className="value">{coc.deliveryOrder?.doNo || "—"}</td>
            </tr>
            <tr>
              <td className="label">{coc.type === "Welding" || coc.type === "Spray Painting" ? "DATE OF COC" : "DATE ISSUED"}</td>
              <td className="colon">:</td>
              <td className="value">{fmtDate(coc.date)}</td>
            </tr>
          </tbody>
        </table>

        {coc.type === "Spray Painting" ? (
          <div className="body-text" style={{ textTransform: "none" }}>
            <b>Inspection</b><br />
            Individual coat and completed coating are inspected for appearance. Coatings shall free from
            be pinholes, blisters, craters, sogging, flakking, peeling and dry spray.
          </div>
        ) : (
          <div className="body-text">
            THIS IS TO CERTIFY THAT THE FOLLOWING PARTS STATED IN THE COC ARE MANUFACTURED
            ACCORDING TO THE REQUIREMENTS AS STATED IN THE <span className="dynamic-blue">{coc.customer?.customerName || "—"}</span> DRAWINGS.
          </div>
        )}

        <div className="signatures">
          <div className="sig-block">
            <div className="sig-title">CHECKED BY :</div>
            <div className="sig-role">QC INSPECTOR</div>
            <div className="sig-name">{coc.checkedBy?.name || "—"}</div>
            {settings?.enableSignature && settings?.signatureUrl && (
              <img 
                src={settings.signatureUrl.startsWith("/uploads") ? `/api${settings.signatureUrl}` : settings.signatureUrl} 
                alt="Signature" 
                style={{ maxHeight: "40px", marginBottom: "4px" }} 
              />
            )}
            <div className="sig-line"></div>
            <div className="sig-footer">Authorised Signature</div>
          </div>
          <div className="sig-block">
            <div className="sig-title">APPROVED BY :</div>
            <div className="sig-role">QC MANAGER</div>
            <div className="sig-name">{coc.approvedBy?.name || "—"}</div>
            {settings?.enableSignature && settings?.signatureUrl && (
              <img 
                src={settings.signatureUrl.startsWith("/uploads") ? `/api${settings.signatureUrl}` : settings.signatureUrl} 
                alt="Signature" 
                style={{ maxHeight: "40px", marginBottom: "4px" }} 
              />
            )}
            <div className="sig-line"></div>
            <div className="sig-footer">Authorised Signature</div>
          </div>
        </div>

      </div>
    </>
  );
}
