import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { nextDocumentNo } from "@/lib/document-numbering";

const Prisma_Decimal = Prisma.Decimal;

export type QuotationStatus =
  | "Draft"
  | "Issued"
  | "Confirmed"
  | "Revised"
  | "Old Version"
  | "Void"
  | "Converted";

/** A quotation number is shared across revisions, so a revision must not take a
 *  new one — only a revision-0 row consumes a number. */
const quotationNoTaken = (tx: Prisma.TransactionClient) => async (no: string) =>
  (await tx.quotation.count({ where: { quotationNo: no } })) > 0;

export type ItemInput = {
  unitPrice: number | string;
  quantity: number | string;
  sortOrder?: number;
  partId?: string | null;
  uomId?: string | null;
};

export function computeTotals(opts: {
  items: ItemInput[];
  lumpSumDisc: number | string;
  taxRate?: number | null;
  isRoundOff?: boolean;
}) {
  const subTotal = opts.items.reduce(
    (acc, it) => acc + Number(it.unitPrice || 0) * Number(it.quantity || 0),
    0,
  );
  const disc = Number(opts.lumpSumDisc || 0);
  const afterDisc = Math.max(0, subTotal - disc);
  const taxRate = opts.taxRate ?? 0;
  const taxAmount = +(afterDisc * (taxRate / 100)).toFixed(2);
  let totalAmount = afterDisc + taxAmount;
  if (opts.isRoundOff) {
    totalAmount = Math.round(totalAmount);
  } else {
    totalAmount = +totalAmount.toFixed(2);
  }

  return {
    subTotal: +subTotal.toFixed(2),
    lumpSumDisc: +disc.toFixed(2),
    taxAmount,
    totalAmount,
  };
}

export type QuotationInput = {
  date: string | Date;
  salespersonId: string;
  customerId?: string; // fallback
  contactPersonId?: string | null;
  customerPoRef?: string | null;
  refNo?: string | null;
  title: string;
  paymentTermId?: string | null;
  quoteValidityDays?: number;
  leadTime?: string | null;
  incoterms?: string | null;
  currencyId: string;
  exchangeRate: number | string;
  lumpSumDisc?: number | string;
  taxTypeId?: string | null;
  termsAndConditions?: string | null;
  remark?: string | null;
  uploadUrl?: string | null;
  isRoundOff?: boolean;
  items: ItemInput[];
};

const cleanId = (v: any) => (v === "" || v == null ? null : v);
const cleanStr = (v: any) => (v == null || v === "" ? null : String(v));

export async function createQuotation(input: QuotationInput) {
  if (!input.salespersonId) throw new Error("Salesperson is required");
  if (!input.customerId) throw new Error("Customer is required");
  if (!input.currencyId) throw new Error("Currency is required");
  if (!input.title?.trim()) throw new Error("Title is required");
  if (!input.items?.length) throw new Error("At least one line item is required");

  const tax = input.taxTypeId
    ? await prisma.taxProfile.findUnique({ where: { id: input.taxTypeId } })
    : null;

  // The number is taken and the quotation written in one transaction: the
  // counter's row lock only holds for as long as the transaction does.
  return prisma.$transaction(async (tx) => {
    const finalCustomerId = input.customerId;
    const finalContactPersonId = cleanId(input.contactPersonId);

    if (!finalCustomerId) throw new Error("Customer is required");

    const customer = await tx.customerProfile.findUnique({ where: { id: finalCustomerId } });
    const company = await tx.companyProfile.findFirst({ where: { status: "Active" } });
    const isSez = customer?.isSez;
    const taxRate = isSez ? (Number(company?.sezTaxRate) || 0) : (tax?.taxRate ?? 0);

    const totals = computeTotals({
      items: input.items,
      lumpSumDisc: input.lumpSumDisc ?? 0,
      taxRate,
      isRoundOff: input.isRoundOff,
    });

    const quotationNo = await nextDocumentNo(tx as any, "QUOTATION", {
      isTaken: quotationNoTaken(tx as any),
    });

    return tx.quotation.create({
    data: {
      quotationNo,
      revision: 0,
      status: "Draft",
      date: new Date(input.date),
      salespersonId: input.salespersonId,
      customerId: finalCustomerId,
      contactPersonId: finalContactPersonId,
      customerPoRef: cleanStr(input.customerPoRef),
      refNo: cleanStr(input.refNo),
      title: input.title.trim(),
      paymentTermId: cleanId(input.paymentTermId),
      quoteValidityDays: input.quoteValidityDays ?? 60,
      leadTime: cleanStr(input.leadTime),
      incoterms: cleanStr(input.incoterms),
      currencyId: input.currencyId,
      exchangeRate: new Prisma_Decimal(input.exchangeRate),
      subTotal: new Prisma_Decimal(totals.subTotal),
      lumpSumDisc: new Prisma_Decimal(totals.lumpSumDisc),
      isRoundOff: input.isRoundOff || false,
      taxTypeId: isSez ? null : cleanId(input.taxTypeId),
      taxRate: isSez ? taxRate : (tax?.taxRate ?? null),
      taxAmount: (isSez || tax) ? new Prisma_Decimal(totals.taxAmount) : null,
      totalAmount: new Prisma_Decimal(totals.totalAmount),
      termsAndConditions: cleanStr(input.termsAndConditions),
      remark: cleanStr(input.remark),
      uploadUrl: cleanStr(input.uploadUrl),
      items: {
        create: input.items.map((it, idx) => ({
          unitPrice: new Prisma_Decimal(it.unitPrice ?? 0),
          quantity: Number(it.quantity) || 0,
          amount: new Prisma_Decimal(
            Number(it.unitPrice || 0) * Number(it.quantity || 0),
          ),
          sortOrder: it.sortOrder ?? idx,
          partId: cleanId(it.partId),
          uomId: cleanId(it.uomId),
        })),
      },
    },
    include: { items: true },
    });
  });
}

export async function updateQuotation(id: string, input: QuotationInput) {
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new Error("Quotation not found");
  if (existing.status !== "Draft")
    throw new Error("Only Draft quotations can be edited");

  const tax = input.taxTypeId
    ? await prisma.taxProfile.findUnique({ where: { id: input.taxTypeId } })
    : null;

  return prisma.$transaction(async (tx) => {
    const finalCustomerId = input.customerId;
    const finalContactPersonId = cleanId(input.contactPersonId);

    if (!finalCustomerId) throw new Error("Customer is required");

    const customer = await tx.customerProfile.findUnique({ where: { id: finalCustomerId } });
    const company = await tx.companyProfile.findFirst({ where: { status: "Active" } });
    const isSez = customer?.isSez;
    const taxRate = isSez ? (Number(company?.sezTaxRate) || 0) : (tax?.taxRate ?? 0);

    const totals = computeTotals({
      items: input.items,
      lumpSumDisc: input.lumpSumDisc ?? 0,
      taxRate,
      isRoundOff: input.isRoundOff,
    });

    await tx.quotationItem.deleteMany({ where: { quotationId: id } });
    return tx.quotation.update({
      where: { id },
      data: {
        date: new Date(input.date),
        salespersonId: input.salespersonId,
        customerId: finalCustomerId,
        contactPersonId: finalContactPersonId,
        customerPoRef: cleanStr(input.customerPoRef),
        refNo: cleanStr(input.refNo),
        title: input.title.trim(),
        paymentTermId: cleanId(input.paymentTermId),
        quoteValidityDays: input.quoteValidityDays ?? 60,
        leadTime: cleanStr(input.leadTime),
        incoterms: cleanStr(input.incoterms),
        currencyId: input.currencyId,
        exchangeRate: new Prisma_Decimal(input.exchangeRate),
        subTotal: new Prisma_Decimal(totals.subTotal),
        lumpSumDisc: new Prisma_Decimal(totals.lumpSumDisc),
        isRoundOff: input.isRoundOff || false,
        taxTypeId: isSez ? null : cleanId(input.taxTypeId),
        taxRate: isSez ? taxRate : (tax?.taxRate ?? null),
        taxAmount: (isSez || tax) ? new Prisma_Decimal(totals.taxAmount) : null,
        totalAmount: new Prisma_Decimal(totals.totalAmount),
        termsAndConditions: cleanStr(input.termsAndConditions),
        remark: cleanStr(input.remark),
        uploadUrl: cleanStr(input.uploadUrl),
        items: {
          create: input.items.map((it, idx) => ({
            unitPrice: new Prisma_Decimal(it.unitPrice ?? 0),
            quantity: Number(it.quantity) || 0,
            amount: new Prisma_Decimal(
              Number(it.unitPrice || 0) * Number(it.quantity || 0),
            ),
            sortOrder: it.sortOrder ?? idx,
            partId: cleanId(it.partId),
            uomId: cleanId(it.uomId),
          })),
        },
      },
      include: { items: true },
    });
  });
}

export type QuotationAction = "issue" | "confirm" | "void" | "revise" | "convertToSo" | "convertToInvoice";

export async function transitionQuotation(
  id: string,
  action: QuotationAction,
) {
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!q) throw new Error("Quotation not found");

  switch (action) {
    case "issue": {
      if (q.status !== "Draft") throw new Error("Only Draft can be issued");
      return prisma.quotation.update({
        where: { id },
        data: { status: "Issued" },
      });
    }
    case "confirm": {
      if (q.status !== "Issued" && q.status !== "Draft")
        throw new Error("Only Draft or Issued can be confirmed");
      return prisma.quotation.update({
        where: { id },
        data: { status: "Confirmed" },
      });
    }
    case "void": {
      if (q.status === "Converted")
        throw new Error("Cannot void a converted quotation");
      return prisma.quotation.update({
        where: { id },
        data: { status: "Void" },
      });
    }
    case "revise": {
      if (q.status !== "Confirmed" && q.status !== "Issued")
        throw new Error("Only Issued or Confirmed quotations can be revised");
      return prisma.$transaction(async (tx) => {
        await tx.quotation.update({
          where: { id },
          data: { status: "Old Version" },
        });
        const newRev = await tx.quotation.create({
          data: {
            quotationNo: q.quotationNo,
            revision: q.revision + 1,
            status: "Draft",
            date: new Date(),
            salespersonId: q.salespersonId,
            customerId: q.customerId,
            contactPersonId: q.contactPersonId,
            customerPoRef: q.customerPoRef,
            refNo: q.refNo,
            title: q.title,
            paymentTermId: q.paymentTermId,
            quoteValidityDays: q.quoteValidityDays,
            leadTime: q.leadTime,
            incoterms: q.incoterms,
            currencyId: q.currencyId,
            exchangeRate: q.exchangeRate,
            subTotal: q.subTotal,
            lumpSumDisc: q.lumpSumDisc,
            taxTypeId: q.taxTypeId,
            taxRate: q.taxRate,
            taxAmount: q.taxAmount,
            totalAmount: q.totalAmount,
            termsAndConditions: q.termsAndConditions,
            remark: q.remark,
            uploadUrl: q.uploadUrl,
            items: {
              create: q.items.map((it) => ({
                unitPrice: it.unitPrice,
                quantity: it.quantity,
                amount: it.amount,
                sortOrder: it.sortOrder,
                partId: it.partId,
                uomId: it.uomId,
              })),
            },
          },
        });
        return newRev;
      });
    }
    case "convertToSo": {
      if (q.status !== "Confirmed")
        throw new Error("Only Confirmed quotations can be converted to SO");
      if (q.salesOrderId) throw new Error("Already converted");

      const missing = q.items.filter((it) => !it.partId || !it.uomId);
      if (missing.length) {
        throw new Error(
          `Cannot convert: ${missing.length} line item(s) are missing Finished Good or UOM. Edit the quotation and set both for every line before converting.`,
        );
      }

      return prisma.$transaction(async (tx) => {
        const orderNo = await nextDocumentNo(tx, "SALES_ORDER", {
          isTaken: async (no) => (await tx.salesOrder.count({ where: { orderNo: no } })) > 0,
        });

        const internalQuotationNo = `${q.quotationNo}-R${q.revision}`;

        const so = await tx.salesOrder.create({
          data: {
            orderNo,
            revision: 0,
            status: "Draft",
            date: new Date(),
            salespersonId: q.salespersonId,
            customerId: q.customerId,
            customerPoRef: q.customerPoRef,
            paymentTermId: q.paymentTermId ?? (await firstPaymentTermId(tx)),
            currencyId: q.currencyId,
            exchangeRate: q.exchangeRate,
            amountBeforeTax: q.subTotal,
            taxTypeId: q.taxTypeId,
            taxRate: q.taxRate,
            taxAmount: q.taxAmount,
            amountAfterTax: q.totalAmount,
            contactPersonId: q.contactPersonId,
            email: null,
            remark: q.remark,
            items: {
              create: q.items.map((it) => ({
                partId: it.partId!,
                uomId: it.uomId!,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                internalQuotationNo,
              })),
            },
          },
        });

        await tx.quotation.update({
          where: { id },
          data: { salesOrderId: so.id, status: "Converted" },
        });

        return so;
      });
    }
    case "convertToInvoice": {
      if (q.status !== "Confirmed")
        throw new Error("Only Confirmed quotations can be converted to Invoice");
      if (q.invoiceId) throw new Error("Already converted to Invoice");

      return prisma.$transaction(async (tx) => {
        const company = await tx.companyProfile.findFirst({ where: { status: "Active" } });
        if (!company) throw new Error("No active company found");

        // Numbering is per company and configurable — see
        // src/lib/document-numbering.config.ts.
        const invoiceNo = await nextDocumentNo(tx, "INVOICE", {
          companyId: company.id,
          isTaken: async (no) => (await tx.invoice.count({ where: { invoiceNo: no } })) > 0,
        });

        const paymentTermId = q.paymentTermId ?? (await firstPaymentTermId(tx));
        const paymentTerm = await tx.paymentTermProfile.findUnique({ where: { id: paymentTermId } });

        const invoiceDate = new Date();
        const dueDate = new Date(invoiceDate);
        if (paymentTerm) {
          dueDate.setDate(dueDate.getDate() + paymentTerm.days);
        }

        const contactPersonId = q.contactPersonId || (await tx.customerContactPerson.findFirst({ where: { customerId: q.customerId } }))?.id;
        if (!contactPersonId) throw new Error("Customer has no contact person");

        const taxTypeId = q.taxTypeId || (await tx.taxProfile.findFirst({ where: { status: "Active" } }))?.id;
        if (!taxTypeId) throw new Error("No tax profile found");

        const invoice = await tx.invoice.create({
          data: {
            invoiceNo,
            revision: 0,
            invoiceDate,
            companyId: company.id,
            invoiceType: "Customer Invoice",
            customerId: q.customerId,
            contactPersonId,
            paymentTermId,
            dueDate,
            currencyId: q.currencyId,
            exchangeRate: q.exchangeRate,
            amountBeforeTax: q.subTotal,
            taxTypeId,
            taxRate: q.taxRate || 0,
            taxAmount: q.taxAmount || 0,
            amountAfterTax: q.totalAmount,
            balanceDue: q.totalAmount,
            remark: q.remark,
            preparedById: q.salespersonId,
            status: "Draft",
            items: {
              create: q.items.map((it, idx) => ({
                lineNo: idx + 1,
                partId: it.partId,
                description: null,
                quantity: it.quantity,
                uomId: it.uomId,
                unitPrice: it.unitPrice,
                amount: it.amount,
              })),
            },
          },
        });

        await tx.quotation.update({
          where: { id },
          data: { invoiceId: invoice.id, status: "Converted" },
        });

        return invoice;
      });
    }
  }
}

async function firstPaymentTermId(tx: Prisma.TransactionClient): Promise<string> {
  const pt = await tx.paymentTermProfile.findFirst({
    where: { status: "Active" },
    select: { id: true },
  });
  if (!pt)
    throw new Error(
      "Cannot convert: SO requires a Payment Term and the quotation has none and no active default exists",
    );
  return pt.id;
}

