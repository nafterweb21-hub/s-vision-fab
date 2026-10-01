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
    <div className="p-0 sm:p-4 max-w-6xl mx-auto space-y-1 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-1 justify-between px-1 sm:px-0 mt-1 sm:mt-0">
        <div className="flex items-start md:items-center gap-1 w-full md:w-auto">
          <Link
            href="/dashboard/production/work-order"
            className="p-0.5 sm:p-2 shrink-0 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors mt-0.5 md:mt-0"
          >
            <ArrowLeft size={12} className="sm:w-5 sm:h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-xl md:text-2xl font-bold text-slate-800 break-words leading-tight">
              Work Order: {workOrder.workOrderNo}
            </h1>
            <p className="hidden sm:block text-xs md:text-sm text-slate-500 mt-0.5">
              Manage work order details, routing, and parameters
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 w-full md:w-auto shrink-0">
          <a
            href={`/print/work-order/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-1.5 py-0.5 sm:px-4 sm:py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded sm:rounded-lg text-[9px] sm:text-sm font-semibold transition-colors border border-blue-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-4 sm:h-4"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
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

      <div className="border-b border-slate-200 overflow-x-auto no-scrollbar">
        <nav className="-mb-px flex space-x-1 sm:space-x-8 min-w-max px-1 sm:px-0">
          <div className="border-b-2 border-blue-600 text-blue-600 whitespace-nowrap py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium">
            Order Details
          </div>
          <Link
            href={`/dashboard/production/work-order/${id}/routing`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium"
          >
            In-Process & Routing
          </Link>
          <Link
            href={`/dashboard/production/work-order/${id}/timesheets`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium"
          >
            Timesheets & Parameters
          </Link>
          <Link
            href={`/dashboard/production/work-order/${id}/files`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium"
          >
            Files
          </Link>
        </nav>
      </div>

      <div className="bg-white rounded-md sm:rounded-xl shadow-sm border-y sm:border border-slate-200 p-1.5 sm:p-6">
        <WorkOrderHeader wo={serialised} uoms={uoms} />
      </div>

      <div className="bg-white rounded-md sm:rounded-xl shadow-sm border-y sm:border border-slate-200 overflow-hidden">
        <div className="p-1.5 sm:p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-[11px] sm:text-base md:text-lg font-bold text-slate-800">Quality Control & Rework</h2>
          <div className="px-1 py-0.5 sm:px-2 sm:py-1 bg-white border border-slate-200 rounded text-[8px] sm:text-sm font-bold text-slate-600 shadow-sm shrink-0 ml-2">
            Total: {Number(workOrder.quantity || 0)}
          </div>
        </div>
        
        <div className="p-1.5 sm:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1 sm:gap-4 mb-2 sm:mb-8">
            <div className="bg-emerald-50 border border-emerald-100 p-1 sm:p-4 rounded-md flex flex-col items-center justify-center">
              <span className="text-[7px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5 sm:mb-1 text-center">Accepted</span>
              <span className="text-sm sm:text-xl md:text-2xl font-black text-emerald-700">{Number(workOrder.acceptedQty || 0)}</span>
            </div>
            <div className="bg-rose-50 border border-rose-100 p-1 sm:p-4 rounded-md flex flex-col items-center justify-center">
              <span className="text-[7px] sm:text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-0.5 sm:mb-1 text-center">Rejected</span>
              <span className="text-sm sm:text-xl md:text-2xl font-black text-rose-700">{Number(workOrder.rejectedQty || 0)}</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-1 sm:p-4 rounded-md flex flex-col items-center justify-center">
              <span className="text-[7px] sm:text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5 sm:mb-1 text-center">Reworked</span>
              <span className="text-sm sm:text-xl md:text-2xl font-black text-amber-700">{Number(workOrder.reworkedQty || 0)}</span>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-1 sm:p-4 rounded-md flex flex-col items-center justify-center">
              <span className="text-[7px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5 sm:mb-1 text-center">Approved</span>
              <span className="text-sm sm:text-xl md:text-2xl font-black text-blue-700">{Number(workOrder.finalApprovedQty || 0)}</span>
            </div>
          </div>

          <h3 className="text-[10px] sm:text-sm font-bold text-slate-700 uppercase tracking-widest mb-1.5 sm:mb-4">Rework History</h3>
          
          {serialised.reworks.length === 0 ? (
            <div className="text-center py-4 sm:py-8 text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-medium">
              No rework tasks recorded for this work order.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded sm:rounded-xl w-full">
              <table className="w-full text-[9px] sm:text-sm text-left">
                <thead className="text-[8px] sm:text-[10px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200 tracking-widest font-bold">
                  <tr>
                    <th className="px-1.5 sm:px-4 py-1.5 sm:py-3 w-16 sm:w-auto break-all sm:break-normal">Rework Task</th>
                    <th className="px-1.5 sm:px-4 py-1.5 sm:py-3 w-12 sm:w-auto break-words sm:break-normal">Rejected Qty</th>
                    <th className="px-1.5 sm:px-4 py-1.5 sm:py-3 w-12 sm:w-auto break-words sm:break-normal">Reworked Qty</th>
                    <th className="px-1.5 sm:px-4 py-1.5 sm:py-3">Status</th>
                    <th className="px-1.5 sm:px-4 py-1.5 sm:py-3">Reason</th>
                    <th className="px-1.5 sm:px-4 py-1.5 sm:py-3">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {serialised.reworks.map((rwk: any) => (
                    <tr key={rwk.id} className="hover:bg-slate-50/50">
                      <td className="px-1.5 sm:px-4 py-1.5 sm:py-4 font-bold text-slate-800 break-all min-w-[50px]">{rwk.reworkNo}</td>
                      <td className="px-1.5 sm:px-4 py-1.5 sm:py-4 font-bold text-rose-600">{Number(rwk.rejectedQty)}</td>
                      <td className="px-1.5 sm:px-4 py-1.5 sm:py-4 font-bold text-emerald-600">{Number(rwk.reworkedQty)}</td>
                      <td className="px-1.5 sm:px-4 py-1.5 sm:py-4">
                        <span className="px-1 sm:px-2 py-0.5 sm:py-1 bg-slate-100 text-slate-700 text-[8px] sm:text-[10px] uppercase font-bold tracking-widest rounded inline-block whitespace-nowrap">
                          {rwk.status}
                        </span>
                      </td>
                      <td className="px-1.5 sm:px-4 py-1.5 sm:py-4 text-[9px] sm:text-xs italic text-slate-600 max-w-[80px] sm:max-w-[200px] truncate">"{rwk.rejectionReason}"</td>
                      <td className="px-1.5 sm:px-4 py-1.5 sm:py-4 text-[9px] sm:text-xs text-slate-500">
                        <div className="flex flex-col gap-0.5 sm:gap-1 whitespace-nowrap">
                          <span>Rej: {new Date(rwk.rejectedAt).toLocaleDateString()}</span>
                          {rwk.reInspectedAt && <span>Insp: {new Date(rwk.reInspectedAt).toLocaleDateString()}</span>}
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
