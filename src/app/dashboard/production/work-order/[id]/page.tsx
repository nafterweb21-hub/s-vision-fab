import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import WorkOrderHeader from "../components/WorkOrderHeader";
import { getUomList } from "../actions";
import DeliveryLabelModal from "./DeliveryLabelModal";

export default async function WorkOrderDetailPage({
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
      reworks: {
        orderBy: { createdAt: 'desc' },
        include: {
          rejectedBy: true,
          reInspectedBy: true
        }
      },
      inProcesses: {
        include: {
          routingProcesses: true
        }
      }
    },
  });

  if (!workOrder) notFound();

  console.log("Work Order QC Data:", { qcAcceptance: workOrder?.qcAcceptance, qcBy: workOrder?.qcBy?.name, qcDate: workOrder?.qcDate });

  const uoms = await getUomList();

  let derivedStatus = workOrder.status || "Unknown";
  if (derivedStatus === "Completed" && workOrder.inProcesses && workOrder.inProcesses.length > 0) {
    const allCompleted = workOrder.inProcesses.every((ip: any) => 
      ip.routingProcesses.length > 0 && ip.routingProcesses.every((rp: any) => rp.status === "Completed")
    );
    if (!allCompleted) {
      derivedStatus = "WIP";
    }
  }
  
  const modifiedWorkOrder = { ...workOrder, status: derivedStatus };

  // Decimals → strings to keep client serialisable
  const serialised = JSON.parse(JSON.stringify(modifiedWorkOrder));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/production/work-order"
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">
            Work Order: {workOrder.workOrderNo}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage work order details, routing, and parameters
          </p>
        </div>
        <div>
          <a
            href={`/print/work-order/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-semibold transition-colors border border-blue-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print
          </a>
          <DeliveryLabelModal 
            workOrderNo={workOrder.workOrderNo} 
            defaultQty={workOrder.quantity?.toString() || "1"} 
            defaultUom={workOrder.labelUom?.uomName || workOrder.uom || ""} 
            uoms={uoms} 
          />
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <div className="border-b-2 border-blue-600 text-blue-600 whitespace-nowrap py-4 px-1 text-sm font-medium">
            Order Details
          </div>
          <Link
            href={`/dashboard/production/work-order/${id}/routing`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 text-sm font-medium"
          >
            In-Process & Routing
          </Link>
          <Link
            href={`/dashboard/production/work-order/${id}/timesheets`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 text-sm font-medium"
          >
            Timesheets & Parameters
          </Link>
          <Link
            href={`/dashboard/production/work-order/${id}/files`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 text-sm font-medium"
          >
            Files
          </Link>
        </nav>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <WorkOrderHeader wo={serialised} uoms={uoms} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Quality Control & Rework</h2>
          <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 shadow-sm">
            Total Qty: {Number(workOrder.quantity || 0)}
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Accepted Qty</span>
              <span className="text-2xl font-black text-emerald-700">{Number(workOrder.acceptedQty || 0)}</span>
            </div>
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Rejected Qty</span>
              <span className="text-2xl font-black text-rose-700">{Number(workOrder.rejectedQty || 0)}</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Reworked Qty</span>
              <span className="text-2xl font-black text-amber-700">{Number(workOrder.reworkedQty || 0)}</span>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Final Approved Qty</span>
              <span className="text-2xl font-black text-blue-700">{Number(workOrder.finalApprovedQty || 0)}</span>
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">Rework History</h3>
          
          {serialised.reworks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-sm font-medium">
              No rework tasks recorded for this work order.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200 tracking-widest font-bold">
                  <tr>
                    <th className="px-4 py-3">Rework Task</th>
                    <th className="px-4 py-3">Rejected Qty</th>
                    <th className="px-4 py-3">Reworked Qty</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {serialised.reworks.map((rwk: any) => (
                    <tr key={rwk.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 font-bold text-slate-800">{rwk.reworkNo}</td>
                      <td className="px-4 py-4 font-bold text-rose-600">{Number(rwk.rejectedQty)}</td>
                      <td className="px-4 py-4 font-bold text-emerald-600">{Number(rwk.reworkedQty)}</td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] uppercase font-bold tracking-widest rounded">
                          {rwk.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs italic text-slate-600 max-w-[200px] truncate">"{rwk.rejectionReason}"</td>
                      <td className="px-4 py-4 text-xs text-slate-500">
                        <div className="flex flex-col gap-1">
                          <span>Rejected: {new Date(rwk.rejectedAt).toLocaleDateString()}</span>
                          {rwk.reInspectedAt && <span>Re-inspected: {new Date(rwk.reInspectedAt).toLocaleDateString()}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
