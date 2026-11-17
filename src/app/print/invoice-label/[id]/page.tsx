import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { hasDifferentShipTo } from "@/lib/invoice-ship-to";
import InvoiceLabel, { type LabelData, type LabelKind, type LabelSize } from "./InvoiceLabel";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const dt = new Date(d);
  const m = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${String(dt.getDate()).padStart(2, "0")}-${m[dt.getMonth()]}-${dt.getFullYear()}`;
}

const clean = (v?: string | null) => (v && v.trim() ? v.trim() : "");

/**
 * Envelope / shipping (packing slip) label for an invoice. The type and size
 * are picked on screen; `?type=` and `?size=` only set the initial choice.
 */
export default async function PrintInvoiceLabelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: { include: { addresses: true } },
      contactPerson: true,
      company: true,
      billTo: true,
      shipTo: true,
      preparedBy: true,
    },
  });
  if (!inv) notFound();

  const company = inv.company || (await prisma.companyProfile.findFirst({ where: { status: "Active" } }));

  // Address the parcel to the ship-to (consignee) when the invoice has one.
  const differentShipTo = hasDifferentShipTo(inv);
  const billToAddress = inv.billTo?.address || inv.customer.addresses?.[0]?.address || "";
  const toAddress = differentShipTo ? inv.shipTo?.address || billToAddress : billToAddress;
  const toName = differentShipTo ? clean(inv.consigneeName) || inv.customer.customerName : inv.customer.customerName;
  const toGstin = differentShipTo ? clean(inv.consigneeGstin) || clean(inv.customer.gstin) : clean(inv.customer.gstin);
  const toPhone = differentShipTo
    ? clean(inv.consigneePhone)
    : clean(inv.tel) || clean(inv.contactPerson?.mobileNo) || clean(inv.contactPerson?.telNo);

  const logoUrl = company?.uploadUrl
    ? company.uploadUrl.startsWith("/uploads")
      ? `/api${company.uploadUrl}`
      : company.uploadUrl
    : "/logo.jpg";

  const data: LabelData = {
    to: {
      name: toName,
      address: toAddress,
      gstin: toGstin,
      contactPerson: clean(inv.contactPerson?.contactPersonName),
      phone: toPhone,
    },
    from: {
      name: company?.companyName || "Vision Fab Private Limited",
      address: company?.address || "",
      gstin: clean(company?.gstRegistrationNo),
      contactPerson: clean(inv.preparedBy?.name),
      phone: clean(company?.phoneNo),
      email: clean(company?.email),
    },
    invoiceNo: inv.invoiceNo,
    invoiceDate: fmtDate(inv.invoiceDate),
    poNo: clean(inv.poNo),
    logoUrl,
  };

  const type: LabelKind = sp.type === "shipping" ? "shipping" : "envelope";
  const size: LabelSize = sp.size === "medium" || sp.size === "small" ? sp.size : "large";

  return <InvoiceLabel data={data} initialType={type} initialSize={size} />;
}
