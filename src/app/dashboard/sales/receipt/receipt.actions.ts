"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createReceipt, updateReceipt, transitionReceipt, ReceiptInput, ReceiptAction } from "@/lib/receipts";

import { RecordStatus } from "@/lib/status";
import { RECEIPT_PAYABLE_INVOICE_STATUSES, RECEIPT_PAYABLE_INVOICE_TYPES } from "@/lib/receipt-rules";
// Confirm / void rewrites amountPaid, balanceDue and status on the linked Invoice row, which may be a
// Customer Invoice, Credit Note or Debit Note (invoiceType). Each has its own list, and an open
// form?id=... view, so refresh all of them.
function revalidateLinkedDocuments() {
  for (const base of ["/dashboard/sales/invoice", "/dashboard/sales/credit-note", "/dashboard/sales/debit-note"]) {
    revalidatePath(base);
    revalidatePath(`${base}/form`);
  }
}

export async function getReceipts() {
  try {
    const receipts = await prisma.receipt.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { customerName: true } },
        invoice: { select: { invoiceNo: true } },
        currency: { select: { code: true } },
      },
    });
    return { success: true, data: JSON.parse(JSON.stringify(receipts)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getReceipt(id: string) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        company: true,
        customer: true,
        invoice: true,
        currency: true,
        creator: true,
      },
    });
    if (!receipt) throw new Error("Receipt not found");
    return { success: true, data: JSON.parse(JSON.stringify(receipt)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getReceiptFormData() {
  try {
    const [companies, customers, currencies, employees, invoices] = await Promise.all([
      prisma.companyProfile.findMany({ where: { status: "Active" } }),
      prisma.customerProfile.findMany({ where: { status: "Active" } }),
      prisma.currency.findMany({ where: { status: "Active" } }),
      prisma.employee.findMany({ where: { status: RecordStatus.Active }, include: { user: true } }),
      prisma.invoice.findMany({
        // Only documents a customer pays against (no Credit Notes), still open, with
        // a balance left. Same rule as the server guard in src/lib/receipts.ts.
        where: {
          invoiceType: { in: [...RECEIPT_PAYABLE_INVOICE_TYPES] },
          status: { in: [...RECEIPT_PAYABLE_INVOICE_STATUSES] },
          balanceDue: { gt: 0 },
        },
        include: {
          currency: true,
          customer: true,
        },
      }),
    ]);

    return {
      success: true,
      data: JSON.parse(
        JSON.stringify({
          companies,
          customers,
          currencies,
          employees,
          invoices,
        }),
      ),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createReceiptAction(data: ReceiptInput & { creatorId: string }) {
  try {
    const receipt = await createReceipt(data);
    revalidatePath("/dashboard/sales/receipt");
    return { success: true, data: JSON.parse(JSON.stringify(receipt)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateReceiptAction(id: string, data: ReceiptInput) {
  try {
    const receipt = await updateReceipt(id, data);
    revalidatePath("/dashboard/sales/receipt");
    return { success: true, data: JSON.parse(JSON.stringify(receipt)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function transitionReceiptAction(id: string, action: ReceiptAction) {
  try {
    await transitionReceipt(id, action);
    revalidatePath("/dashboard/sales/receipt");
    revalidatePath(`/dashboard/sales/receipt/${id}`);
    revalidateLinkedDocuments();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// No deleteDraftReceiptAction: spec "No DELETE anywhere". A Draft is voided via
// transitionReceiptAction(id, "void"), which keeps its running number used.
