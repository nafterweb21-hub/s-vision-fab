import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WeldingForm from "../components/WeldingForm";
import SprayPaintingForm from "../components/SprayPaintingForm";
import MachiningForm from "../components/MachiningForm";
import Link from "next/link";
import { ArrowLeft, ChevronRight, CheckCircle2, Clock } from "lucide-react";

export default async function ProcessParameterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // 1. Fetch current timesheet
  const timesheet = await prisma.productionTimesheet.findUnique({
    where: { id },
    include: {
      employee: true,
      weldingParameter: {
        include: {
          confirmedBy: true,
          typeOfJoint: true,
          weldingMachine: true,
        }
      },
      sprayParameter: true,
      machiningParameter: {
        include: {
          confirmedBy: true,
          machine: true,
          toolLists: true,
        }
      },
      routingProcess: {
        include: {
          inProcess: {
            include: {
              workOrder: {
                include: {
                  customer: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!timesheet) {
    return notFound();
  }

  // 2. Fetch queue of all pending process parameters
  const pendingTimesheets = await prisma.productionTimesheet.findMany({
    where: {
      OR: [
        { weldingParameter: { status: "Pending" } },
        { sprayParameter: { status: "Pending" } },
        { machiningParameter: { status: "Pending" } }
      ]
    },
    include: {
      employee: true,
      weldingParameter: true,
      sprayParameter: true,
      machiningParameter: true,
      routingProcess: {
        include: {
          inProcess: {
            include: {
              workOrder: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const allEmployees = await prisma.employee.findMany({
    orderBy: { name: 'asc' }
  });

  const allElcometers = await prisma.elcometerProfile.findMany({
    where: { status: "Active" },
    orderBy: { serialNo: 'asc' }
  });

  const serializedTimesheet = JSON.parse(JSON.stringify(timesheet));
  const serializedPending = JSON.parse(JSON.stringify(pendingTimesheets));

  // Determine active step in the confirmation flow
  let activeStep = 0;
  if (serializedTimesheet.weldingParameter) activeStep = 1;
  else if (serializedTimesheet.sprayParameter) activeStep = 2;
  else if (serializedTimesheet.machiningParameter) {
    // If machining has a tool list, highlight step 3 and show step 4 is part of it
    activeStep = 3;
  }

  const steps = [
    { label: "Welding", desc: "Voltage, current & pre-heating" },
    { label: "Spray Painting", desc: "Surface prep & primer coat" },
    { label: "Machining", desc: "Operation & part runtime" },
    { label: "Machining - Tool List", desc: "Cutting & CNC tool profile" }
  ];

  return (
    <div className="py-3 space-y-4 w-full">
      
      {/* Back button and title */}
      <div>
        <Link href="/dashboard/production/process-parameter" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <ArrowLeft size={16} className="mr-2" />
          Back to Confirmation List
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Process Parameter Confirmation Flow</h1>
            <p className="text-sm text-slate-500 mt-1">
              Confirm process parameter records step-by-step. Approved records are populated back to their respective Work Orders.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Stepper Flow */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < activeStep || (activeStep === 3 && idx === 2 && serializedTimesheet.machiningParameter?.toolLists?.length > 0);
            const isActive = stepNum === activeStep || (activeStep === 3 && idx === 3 && serializedTimesheet.machiningParameter?.toolLists?.length > 0);
            
            return (
              <div key={idx} className="flex items-start gap-3 relative">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isCompleted ? "bg-emerald-500 text-white" : isActive ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-slate-100 text-slate-500"
                }`}>
                  {isCompleted ? <CheckCircle2 size={18} /> : stepNum}
                </div>
                <div>
                  <h4 className={`text-sm font-semibold ${isActive ? "text-indigo-600" : "text-slate-800"}`}>{step.label}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                </div>
                {idx < 3 && (
                  <div className="hidden md:block absolute right-0 top-4 w-4 text-slate-300">
                    <ChevronRight size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Queue Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Confirmation Queue</h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                {serializedPending.length} pending
              </span>
            </div>
            
            {serializedPending.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No pending items remaining.</div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {serializedPending.map((p: any) => {
                  let pType = "Welding";
                  if (p.sprayParameter) pType = "Spray Painting";
                  else if (p.machiningParameter) pType = "Machining";
                  
                  const isCurrent = p.id === id;
                  const wo = p.routingProcess?.inProcess?.workOrder;

                  return (
                    <Link
                      key={p.id}
                      href={`/dashboard/production/process-parameter/${p.id}`}
                      className={`block p-3 rounded-lg border text-left transition-all ${
                        isCurrent 
                          ? "bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-200" 
                          : "border-slate-100 hover:bg-slate-50 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isCurrent ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {pType}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={10} />
                          Pending
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mt-2">
                        {wo?.workOrderNo || "No WO"}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Op: {p.employee?.name || "-"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Confirmation Form */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {serializedTimesheet.weldingParameter && (
              <WeldingForm timesheet={serializedTimesheet} parameter={serializedTimesheet.weldingParameter} employees={allEmployees} />
            )}
            
            {serializedTimesheet.sprayParameter && (
              <SprayPaintingForm timesheet={serializedTimesheet} parameter={serializedTimesheet.sprayParameter} employees={allEmployees} elcometers={allElcometers} />
            )}
            
            {serializedTimesheet.machiningParameter && (
              <MachiningForm timesheet={serializedTimesheet} parameter={serializedTimesheet.machiningParameter} employees={allEmployees} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
