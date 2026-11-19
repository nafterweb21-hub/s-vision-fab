import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WorkOrderShell from "../../components/WorkOrderShell";
import FilesPanel from "./FilesPanel";

export default async function WorkOrderFilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const wo = await prisma.workOrder.findUnique({
    where: { workOrderNo: id },
    select: {
      workOrderNo: true,
      status: true,
      projectCode: true,
      deliveryDate: true,
      quantity: true,
      uom: true,
      customer: { select: { customerName: true } },
    },
  });
  if (!wo) notFound();

  return (
    <WorkOrderShell
      wo={{
        workOrderNo: wo.workOrderNo,
        status: wo.status,
        customerName: wo.customer?.customerName,
        projectCode: wo.projectCode,
        deliveryDate: wo.deliveryDate ? wo.deliveryDate.toISOString() : null,
        quantity: wo.quantity != null ? Number(wo.quantity) : null,
        uom: wo.uom,
      }}
      active="files"
    >
      <FilesPanel workOrderNo={wo.workOrderNo} />
    </WorkOrderShell>
  );
}
