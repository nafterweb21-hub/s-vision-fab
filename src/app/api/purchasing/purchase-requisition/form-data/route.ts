import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

import { RecordStatus } from "@/lib/status";
export async function GET() {
  const { error: authError } = await requirePermission("PURCHASE_REQUISITION", "v");
  if (authError) return authError;

  try {
    const [companies, employees, workOrders, materials, uoms] = await Promise.all([
      prisma.companyProfile.findMany({
        where: { status: "Active" },
        select: { id: true, companyName: true, allowPoForWo: true },
        orderBy: { companyName: "asc" },
      }),
      prisma.employee.findMany({
        where: { status: RecordStatus.Active },
        select: { id: true, name: true, email: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.workOrder.findMany({
        where: {
          status: {
            notIn: ["Void", "Cancelled"],
          },
        },
        select: { workOrderNo: true, jobDescription: true },
        orderBy: { workOrderNo: "desc" },
      }),
      prisma.materialProfile.findMany({
        where: { status: "Active" },
        select: { id: true, partNo: true, description: true, shape: true, size: true },
        orderBy: { description: "asc" },
      }),
      prisma.uomProfile.findMany({
        where: { status: "Active" },
        select: { id: true, uomName: true },
        orderBy: { uomName: "asc" },
      }),
    ]);

    return NextResponse.json({
      companies,
      employees,
      workOrders,
      materials,
      uoms,
    });
  } catch (e: any) {
    console.error("PR form-data error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
