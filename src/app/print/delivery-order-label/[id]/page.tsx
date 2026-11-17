import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AddressLabel, { type LabelData, type LabelKind, type LabelSize } from "@/app/print/AddressLabel";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const dt = new Date(d);
  const m = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${String(dt.getDate()).padStart(2, "0")}-${m[dt.getMonth()]}-${dt.getFullYear()}`;
}

const clean = (v?: string | null) => (v && v.trim() ? v.trim() : "");

/**
 * Envelope / shipping (packing slip) label for a delivery order. The parcel is
 * addressed to the sales order's deliver-to address, falling back to the
 * customer's first address. `?type=` and `?size=` set the initial choice.
 */
export default async function PrintDeliveryOrderLabelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const dO = await prisma.deliveryOrder.findUnique({
    where: { id },
    include: {
      customer: { include: { addresses: true } },
      salesOrder: { include: { deliverTo: true, billTo: true, contactPerson: true } },
    },
  });
  if (!dO) notFound();

  const company = await prisma.companyProfile.findFirst({ where: { status: "Active" } });
  const so = dO.salesOrder;

  const logoUrl = company?.uploadUrl
    ? company.uploadUrl.startsWith("/uploads")
      ? `/api${company.uploadUrl}`
      : company.uploadUrl
    : "/logo.jpg";

  const data: LabelData = {
    to: {
      name: dO.customer.customerName,
      address: so?.deliverTo?.address || so?.billTo?.address || dO.customer.addresses?.[0]?.address || "",
      gstin: clean(dO.customer.gstin),
      contactPerson: clean(so?.contactPerson?.contactPersonName),
      phone: clean(so?.tel) || clean(so?.contactPerson?.mobileNo) || clean(so?.contactPerson?.telNo),
    },
    from: {
      name: company?.companyName || "Vision Fab Private Limited",
      address: company?.address || "",
      gstin: clean(company?.gstRegistrationNo),
      contactPerson: "",
      phone: clean(company?.phoneNo),
      email: clean(company?.email),
    },
    docLabel: "D.O.",
    docNo: dO.doNo,
    docDate: fmtDate(dO.date),
    poNo: clean(dO.poNo),
    logoUrl,
  };

  const type: LabelKind = sp.type === "shipping" ? "shipping" : "envelope";
  const size: LabelSize = sp.size === "medium" || sp.size === "small" ? sp.size : "large";

  return <AddressLabel data={data} initialType={type} initialSize={size} />;
}
