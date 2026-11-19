import { prisma } from "@/lib/prisma";
import CocList, { type CocRow } from "./CocList";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 500;

export default async function CertificateOfConformityListPage() {
  const cocs = await prisma.certificateOfConformity.findMany({
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
    include: {
      customer: { select: { customerName: true } },
      deliveryOrder: { select: { doNo: true, status: true } },
      workOrder: { select: { jobDescription: true } },
      cocUom: { select: { uomName: true } },
      welder: { select: { name: true } },
      painter: { select: { name: true } },
      checkedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  });

  const rows: CocRow[] = cocs.map((c) => ({
    id: c.id,
    cocNo: c.cocNo,
    date: c.date.toISOString(),
    type: c.type,
    status: c.status,
    customerName: c.customer?.customerName ?? "—",
    doNo: c.deliveryOrder?.doNo ?? "—",
    doStatus: c.deliveryOrder?.status ?? "",
    workOrderNo: c.workOrderNo,
    description: c.workOrder?.jobDescription ?? "",
    quantity: Number(c.cocQuantity),
    uom: c.cocUom?.uomName ?? "",
    person: c.welder?.name ?? c.painter?.name ?? null,
    checkedBy: c.checkedBy?.name ?? null,
    approvedBy: c.approvedBy?.name ?? null,
  }));

  return <CocList rows={rows} capped={cocs.length === LIST_LIMIT} />;
}
