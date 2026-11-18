import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { z } from "zod";
import { nextDocumentNo } from "@/lib/document-numbering";
import { invoicePaymentStatus } from "@/lib/invoice-payment";
import { receiptExchangeRate, receiptInvoiceBlockReason } from "@/lib/receipt-rules";

const Prisma_Decimal = Prisma.Decimal;

export type ReceiptStatus = "Draft" | "Confirmed" | "Void";

export const receiptFormSchema = z.object({
  receiptDate: z.string().or(z.date()),
  companyId: z.string().min(1, "Company is required"),
  customerId: z.string().min(1, "Customer is required"),
  invoiceId: z.string().min(1, "Invoice is required"),
  paymentMethod: z.string().min(1, "Payment Method is required"),
  chequeRefNo: z.string().optional().nullable(),
  amountReceived: z.union([z.number(), z.string()]).refine((val) => Number(val) > 0, "Amount must be greater than 0"),
  currencyId: z.string().min(1, "Currency is required"),
  // Accepted for backward compatibility but ignored: the server takes the latest
  // Currency Profile rate at create time and freezes it (spec cross-cutting rule).
  exchangeRate: z.union([z.number(), z.string()]).optional().nullable(),
  remark: z.string().optional().nullable(),
});

export type ReceiptInput = z.infer<typeof receiptFormSchema>;

type Tx = Prisma.TransactionClient;

const cleanStr = (v: any) => (v == null || v === "" ? null : String(v));

/**
 * Checks the invoice a Draft receipt is being saved against and returns the
 * latest Currency Profile rate for the receipt's currency. Amounts stay in the
 * invoice's currency, so the receipt currency must equal the invoice currency.
 */
async function checkReceiptTarget(tx: Tx, v: ReceiptInput) {
  const invoice = await tx.invoice.findUnique({
    where: { id: v.invoiceId },
    select: { id: true, invoiceNo: true, invoiceType: true, status: true, balanceDue: true, currencyId: true, customerId: true },
  });
  const blocked = receiptInvoiceBlockReason(invoice);
  if (blocked || !invoice) throw new Error(blocked || "Related invoice not found.");
  if (invoice.customerId !== v.customerId) {
    throw new Error(`Invoice ${invoice.invoiceNo} belongs to a different customer.`);
  }
  if (invoice.currencyId !== v.currencyId) {
    throw new Error(`Receipt currency must match the currency of invoice ${invoice.invoiceNo}.`);
  }
  if (new Prisma_Decimal(v.amountReceived).gt(invoice.balanceDue)) {
    throw new Error(`Amount received (${v.amountReceived}) cannot exceed invoice balance due (${invoice.balanceDue})`);
  }
  const currency = await tx.currency.findUnique({ where: { id: v.currencyId }, select: { exchangeRate: true } });
  if (!currency) throw new Error("Currency not found");
  return { latestRate: currency.exchangeRate };
}

export async function createReceipt(input: ReceiptInput & { creatorId: string }) {
  const validated = receiptFormSchema.parse(input);

  // The number is taken and the receipt written in one transaction: the
  // counter's row lock only holds for as long as the transaction does.
  return prisma.$transaction(async (tx) => {
    const { latestRate } = await checkReceiptTarget(tx, validated);
    const exchangeRate = receiptExchangeRate({
      latestRate,
      invoiceId: validated.invoiceId,
      currencyId: validated.currencyId,
    });

    const receiptNo = await nextDocumentNo(tx, "RECEIPT", {
      companyId: validated.companyId,
      isTaken: async (no) => (await tx.receipt.count({ where: { receiptNo: no } })) > 0,
    });

    return tx.receipt.create({
    data: {
      receiptNo,
      receiptDate: new Date(validated.receiptDate),
      companyId: validated.companyId,
      customerId: validated.customerId,
      invoiceId: validated.invoiceId,
      paymentMethod: validated.paymentMethod,
      chequeRefNo: cleanStr(validated.chequeRefNo),
      amountReceived: new Prisma_Decimal(validated.amountReceived),
      currencyId: validated.currencyId,
      exchangeRate: new Prisma_Decimal(exchangeRate),
      remark: cleanStr(validated.remark),
      creatorId: input.creatorId,
      status: "Draft",
    },
    });
  });
}

export async function updateReceipt(id: string, input: ReceiptInput) {
  const validated = receiptFormSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.receipt.findUnique({ where: { id } });
    if (!existing) throw new Error("Receipt not found");
    if (existing.status !== "Draft") throw new Error("Only Draft receipts can be edited");

    const { latestRate } = await checkReceiptTarget(tx, validated);
    // Frozen once taken: kept unless the invoice or currency changes.
    const exchangeRate = receiptExchangeRate({
      latestRate,
      existing,
      invoiceId: validated.invoiceId,
      currencyId: validated.currencyId,
    });

    // Conditional on still being Draft, so a concurrent confirm / void wins cleanly.
    const res = await tx.receipt.updateMany({
      where: { id, status: "Draft" },
      data: {
        receiptDate: new Date(validated.receiptDate),
        companyId: validated.companyId,
        customerId: validated.customerId,
        invoiceId: validated.invoiceId,
        paymentMethod: validated.paymentMethod,
        chequeRefNo: cleanStr(validated.chequeRefNo),
        amountReceived: new Prisma_Decimal(validated.amountReceived),
        currencyId: validated.currencyId,
        exchangeRate: new Prisma_Decimal(exchangeRate),
        remark: cleanStr(validated.remark),
      },
    });
    if (res.count !== 1) throw new Error("Only Draft receipts can be edited");
    return tx.receipt.findUniqueOrThrow({ where: { id } });
  });
}

export type ReceiptAction = "confirm" | "void";

/**
 * Locks the invoice row until the transaction ends and returns its current
 * values. Invoice revise also writes the invoice row before re-pointing
 * receipts, so the lock order is invoice -> receipt everywhere.
 */
async function lockInvoice(tx: Tx, invoiceId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${invoiceId} FOR UPDATE`;
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Related Invoice not found");
  return invoice;
}

/** The conditional status update hit no row: explain what happened meanwhile. */
async function lostTransition(tx: Tx, id: string, action: ReceiptAction): Promise<never> {
  const now = await tx.receipt.findUnique({ where: { id }, select: { status: true } });
  if (!now) throw new Error("Receipt not found");
  if (now.status === "Confirmed" && action === "confirm") throw new Error("This receipt was already confirmed");
  if (now.status === "Void") throw new Error("Receipt is already voided");
  throw new Error("The receipt or its invoice changed meanwhile. Reload and try again.");
}

// Confirm and void are atomic and idempotent: the invoice row is locked
// (SELECT ... FOR UPDATE), the receipt's status moves only through a conditional
// updateMany that must hit exactly one row, and the invoice amounts are computed
// from the locked, freshly read values. A second concurrent call blocks on the
// lock, then finds the receipt no longer in the source status and aborts.
export async function transitionReceipt(id: string, action: ReceiptAction) {
  if (action !== "confirm" && action !== "void") throw new Error("Invalid action");

  return prisma.$transaction(async (tx) => {
    const current = await tx.receipt.findUnique({ where: { id }, select: { status: true, invoiceId: true } });
    if (!current) throw new Error("Receipt not found");

    if (action === "confirm") {
      if (current.status === "Confirmed") throw new Error("This receipt was already confirmed");
      if (current.status !== "Draft") throw new Error("Only Draft receipts can be confirmed");

      const invoice = await lockInvoice(tx, current.invoiceId);
      const res = await tx.receipt.updateMany({
        where: { id, status: "Draft", invoiceId: invoice.id },
        data: { status: "Confirmed" },
      });
      if (res.count !== 1) return lostTransition(tx, id, action);

      // The receipt row is now locked by this transaction: amount / currency are stable.
      const receipt = await tx.receipt.findUniqueOrThrow({ where: { id } });
      const blocked = receiptInvoiceBlockReason(invoice);
      if (blocked) throw new Error(blocked);
      if (receipt.currencyId !== invoice.currencyId) {
        throw new Error(`Receipt currency does not match the currency of invoice ${invoice.invoiceNo}.`);
      }

      // Amounts are in the invoice's currency (enforced above); no rate conversion.
      const amount = new Prisma_Decimal(receipt.amountReceived);
      if (amount.gt(invoice.balanceDue)) {
        throw new Error(`Amount received (${amount}) cannot exceed invoice balance due (${invoice.balanceDue})`);
      }
      const newAmountPaid = new Prisma_Decimal(invoice.amountPaid).plus(amount);
      const newBalanceDue = new Prisma_Decimal(invoice.balanceDue).minus(amount);

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: invoicePaymentStatus(newAmountPaid.toNumber(), newBalanceDue.toNumber()),
        },
      });
      return receipt;
    }

    // ---- void ----
    if (current.status === "Void") throw new Error("Receipt is already voided");

    if (current.status === "Draft") {
      // A draft never touched the invoice: just retire it. Its number stays used.
      const res = await tx.receipt.updateMany({ where: { id, status: "Draft" }, data: { status: "Void" } });
      if (res.count !== 1) return lostTransition(tx, id, action);
      return tx.receipt.findUniqueOrThrow({ where: { id } });
    }

    if (current.status !== "Confirmed") throw new Error(`Cannot void a receipt in status ${current.status}`);

    const invoice = await lockInvoice(tx, current.invoiceId);
    if (!["Submitted", "Partially Paid", "Fully Paid"].includes(invoice.status)) {
      // Revise re-points receipts to the live row, so this means the data is off;
      // refuse rather than rewrite the amounts of a Void / Old Version invoice.
      throw new Error(
        `Invoice ${invoice.invoiceNo} is ${invoice.status}; this receipt cannot be voided against it. Contact an administrator.`,
      );
    }
    const res = await tx.receipt.updateMany({
      where: { id, status: "Confirmed", invoiceId: invoice.id },
      data: { status: "Void" },
    });
    if (res.count !== 1) return lostTransition(tx, id, action);

    const receipt = await tx.receipt.findUniqueOrThrow({ where: { id } });
    const amount = new Prisma_Decimal(receipt.amountReceived);
    const paid = new Prisma_Decimal(invoice.amountPaid);
    // Never below zero; the balance grows by exactly what comes off amountPaid.
    const newAmountPaid = Prisma_Decimal.max(0, paid.minus(amount));
    const newBalanceDue = new Prisma_Decimal(invoice.balanceDue).plus(paid.minus(newAmountPaid));

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        // Nothing left paid -> back to "Submitted".
        status: invoicePaymentStatus(newAmountPaid.toNumber(), newBalanceDue.toNumber()),
      },
    });
    return receipt;
  });
}
