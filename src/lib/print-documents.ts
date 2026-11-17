import "server-only";
import type { PDFOptions } from "puppeteer";
import { prisma } from "@/lib/prisma";

/**
 * Single registry describing every printable document: the page geometry and
 * how to name the resulting file.
 *
 * Permissions deliberately live elsewhere. `/print/<doc>` is already registered
 * under `exportPrefixes` in `modules.config.ts`, so the guarding module is
 * derived with `resolveExportModule` rather than restated here — one source of
 * truth means a PDF can never be more permissive than the page it renders.
 *
 * Adding a printout means adding one entry here — the PDF route handler and any
 * future email-attachment code both read from this table.
 */

export type PrintDocumentKey =
  | "coc"
  | "delivery-label"
  | "delivery-order"
  | "invoice"
  | "ncr"
  | "purchase-order"
  | "purchase-order-subcon"
  | "purchase-requisition"
  | "quotation"
  | "receipt"
  | "subcon-request-form"
  | "work-order";

type PrintDocument = {
  /** Per-document Chromium overrides; omit for the A4 default. */
  pdf?: PDFOptions;
  /**
   * Human-meaningful file name (without extension). Falls back to the record id
   * when the document number cannot be resolved.
   */
  resolveName: (id: string) => Promise<string | null>;
};

/** Strips characters that are illegal in file names on Windows and Linux. */
function safe(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "-").trim();
}

function withRevision(no: string, revision: number | null | undefined): string {
  return revision ? `${no}-R${revision}` : no;
}

export const PRINT_DOCUMENTS: Record<PrintDocumentKey, PrintDocument> = {
  coc: {
    resolveName: async (id) => {
      const row = await prisma.certificateOfConformity.findUnique({
        where: { id },
        select: { cocNo: true },
      });
      return row && `COC ${row.cocNo}`;
    },
  },
  "delivery-label": {
    // The label stock is 102x51mm, not A4.
    pdf: { width: "102mm", height: "51mm", preferCSSPageSize: true },
    // The label is printed per work order: the route param is the work order
    // number, not a delivery order id.
    resolveName: async (id) => {
      const row = await prisma.workOrder.findUnique({
        where: { workOrderNo: id },
        select: { workOrderNo: true },
      });
      return row && `Delivery Label ${row.workOrderNo}`;
    },
  },
  "delivery-order": {
    resolveName: async (id) => {
      const row = await prisma.deliveryOrder.findUnique({
        where: { id },
        select: { doNo: true },
      });
      return row && `DO ${row.doNo}`;
    },
  },
  invoice: {
    resolveName: async (id) => {
      const row = await prisma.invoice.findUnique({
        where: { id },
        select: { invoiceNo: true },
      });
      return row && `Invoice ${row.invoiceNo}`;
    },
  },
  ncr: {
    resolveName: async (id) => {
      const row = await prisma.ncr.findUnique({
        where: { id },
        select: { ncrNo: true },
      });
      return row && `NCR ${row.ncrNo}`;
    },
  },
  "purchase-order": {
    resolveName: async (id) => {
      const row = await prisma.purchaseOrder.findUnique({
        where: { id },
        select: { poNo: true, revision: true },
      });
      return row && `PO ${withRevision(row.poNo, row.revision)}`;
    },
  },
  "purchase-order-subcon": {
    resolveName: async (id) => {
      const row = await prisma.purchaseOrder.findUnique({
        where: { id },
        select: { poNo: true, revision: true },
      });
      return row && `PO Subcon ${withRevision(row.poNo, row.revision)}`;
    },
  },
  "purchase-requisition": {
    resolveName: async (id) => {
      const row = await prisma.purchaseRequisition.findUnique({
        where: { id },
        select: { prNo: true, revision: true },
      });
      return row && `PR ${withRevision(row.prNo, row.revision)}`;
    },
  },
  quotation: {
    resolveName: async (id) => {
      const row = await prisma.quotation.findUnique({
        where: { id },
        select: { quotationNo: true, revision: true },
      });
      return row && `Quotation ${withRevision(row.quotationNo, row.revision)}`;
    },
  },
  receipt: {
    resolveName: async (id) => {
      const row = await prisma.receipt.findUnique({
        where: { id },
        select: { receiptNo: true },
      });
      return row && `Receipt ${row.receiptNo}`;
    },
  },
  "subcon-request-form": {
    resolveName: async (id) => {
      const row = await prisma.subconRequestForm.findUnique({
        where: { id },
        select: { srfNo: true },
      });
      return row && `SRF ${row.srfNo}`;
    },
  },
  "work-order": {
    // The route param is the work order number itself, which is the model's id.
    resolveName: async (id) => `WO ${id}`,
  },
};

export function isPrintDocumentKey(value: string): value is PrintDocumentKey {
  return Object.hasOwn(PRINT_DOCUMENTS, value);
}

/** `PO 800123-R1.pdf`, falling back to `purchase-order-<id>.pdf`. */
export async function pdfFileName(
  doc: PrintDocumentKey,
  id: string,
): Promise<string> {
  let resolved: string | null = null;
  try {
    resolved = await PRINT_DOCUMENTS[doc].resolveName(id);
  } catch {
    // A naming lookup failure must not sink an otherwise valid PDF.
    resolved = null;
  }
  return `${safe(resolved ?? `${doc}-${id}`)}.pdf`;
}
