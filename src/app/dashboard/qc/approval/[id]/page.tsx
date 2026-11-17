import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import QcApprovalHeader from "./components/QcApprovalHeader";

export default async function QcApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { workOrderNo: id },
    include: {
      customer: true,
      labelUom: true,
      qcBy: true,
    },
  });

  if (!workOrder) notFound();

  // Decimals → strings to keep client serialisable
  const serialised = JSON.parse(JSON.stringify(workOrder));

  return (
    <div className="py-3 space-y-4 w-full">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/qc/approval"
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">
            QC Approval: {workOrder.workOrderNo}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review work order details and routing.
          </p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <div className="border-b-2 border-blue-600 text-blue-600 whitespace-nowrap py-4 px-1 text-sm font-medium">
            Order Details
          </div>
          <Link
            href={`/dashboard/qc/approval/${id}/routing`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 text-sm font-medium"
          >
            In-Process & Routing
          </Link>
          <Link
            href={`/dashboard/qc/approval/${id}/timesheets`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 text-sm font-medium"
          >
            Timesheets & Parameters
          </Link>
        </nav>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <QcApprovalHeader wo={serialised} />
      </div>
    </div>
  );
}
