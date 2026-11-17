import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintBarcode from "../../work-order/[id]/PrintBarcode";
import PrintQRCode from "../../work-order/[id]/PrintQRCode";

export const dynamic = "force-dynamic";

export default async function DeliveryLabelPrint({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params;
  const sp = await searchParams;
  
  const expiryDate = sp.expiryDate as string || "";
  const qty = sp.qty as string || "1";
  const uom = sp.uom as string || "PCS";

  const wo = await prisma.workOrder.findUnique({
    where: { workOrderNo: decodeURIComponent(id) }
  });

  if (!wo) notFound();

  const sku = wo.internalQuotationNo || wo.workOrderNo;
  const desc = wo.jobDescription || "-";
  const projCode = wo.projectCode || "-";
  const poNumber = wo.customerPoRef || "-";
  const euc = "NIL";

  // The vehicle lives on the Delivery Order, not the Work Order: use the most
  // recent non-void DO that carries this work order.
  const latestDoItem = await prisma.deliveryOrderItem.findFirst({
    where: { workOrderNo: wo.workOrderNo, deliveryOrder: { status: { not: "Void" } } },
    orderBy: { deliveryOrder: { createdAt: "desc" } },
    select: { deliveryOrder: { select: { vehicleNo: true } } },
  });
  const vehicleNo = latestDoItem?.deliveryOrder.vehicleNo || "-";

  const formattedExpiry = expiryDate 
    ? new Date(expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
    : "-";
  const qtyUomString = `${qty} ${uom}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: 102mm 51mm;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: var(--print-font);
          background: #fff;
          width: 102mm;
          height: 51mm;
          overflow: hidden;
        }
        .label-container {
          width: 102mm;
          height: 51mm;
          padding: 3mm 4mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .header-title {
          text-align: center;
          font-weight: bold;
          font-size: 11px;
          border-bottom: 1px solid #000;
          padding-bottom: 2px;
          margin-bottom: 3px;
        }
        .top-barcodes {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          margin-bottom: 3px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 55px 1fr;
          gap: 1px 4px;
          font-size: 9px;
          line-height: 1.2;
        }
        .info-label {
          font-weight: bold;
          text-align: right;
          color: #000;
        }
        .info-value {
          color: #0284c7; /* blue-600 */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .multi-col {
          display: flex;
          gap: 10px;
        }
        .bottom-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
        }
        .logo-img {
          max-height: 20px;
          max-width: 60px;
          object-fit: contain;
        }
        .qty-uom-section {
          display: flex;
          gap: 15px;
          align-items: flex-end;
        }
        .qty-grid {
          display: grid;
          grid-template-columns: auto auto;
          gap: 1px 4px;
          font-size: 10px;
          margin-bottom: 2px;
        }
        .bottom-barcodes {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        /* Override barcode heights internally */
        .top-barcodes svg { height: 25px !important; }
        .bottom-barcodes svg { height: 20px !important; }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
      <div className="label-container">
        <div className="header-title">DELIVERY LABEL</div>
        
        <div className="top-barcodes">
          <PrintQRCode value={sku} size={25} />
          <PrintBarcode value={sku} height={25} width={0.8} />
        </div>

        <div className="info-grid">
          <div className="info-label">SKU :</div>
          <div className="info-value">{sku}</div>

          <div className="info-label">Desc :</div>
          <div className="info-value">{desc}</div>

          <div className="info-label">Proj Code :</div>
          <div className="info-value multi-col">
            <span style={{ minWidth: '80px' }}>{projCode}</span>
            <span className="info-label">PO Number :</span>
            <span>{poNumber}</span>
          </div>

          <div className="info-label">Expiry Date :</div>
          <div className="info-value">{formattedExpiry}</div>

          <div className="info-label">EUC :</div>
          <div className="info-value multi-col">
            <span style={{ minWidth: '80px' }}>{euc}</span>
            <span className="info-label">Vehicle No :</span>
            <span>{vehicleNo}</span>
          </div>
        </div>

        <div className="bottom-section">
          <div>
            <img src="/logo.jpg" alt="Company Logo" className="logo-img" />
          </div>
          
          <div className="qty-uom-section">
            <div className="qty-grid">
              <div className="info-label">Qty :</div>
              <div className="info-value">{qty}</div>
              <div className="info-label">UOM :</div>
              <div className="info-value">{uom}</div>
            </div>
            
            <div className="bottom-barcodes">
              <PrintQRCode value={qtyUomString} size={20} />
              <PrintBarcode value={qtyUomString} height={20} width={0.8} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
