"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast as hotToast } from "react-hot-toast";
import { Search, ClipboardCheck, ArrowLeft, RefreshCw, FileText, CheckCircle, AlertCircle, X, Loader2, Calendar, User, Briefcase, Activity, LogOut } from "lucide-react";
import { submitWorkOrderQc, submitProcessQc, sendBackToProduction, approveRework, rejectRework } from "../actions";

export default function QcDashboardClient({ initialAwaiting, initialWorkOrders, initialReworks }: { initialAwaiting: any[], initialWorkOrders: any[], initialReworks?: any[] }) {
  const router = useRouter();
  const [awaiting, setAwaiting] = useState<any[]>(initialAwaiting);
  const [workOrders, setWorkOrders] = useState<any[]>(initialWorkOrders);
  const [reworks, setReworks] = useState<any[]>(initialReworks || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isPending, startTransition] = useTransition();

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<"WORK_ORDER" | "PROCESS" | "REWORK" | null>(null);
  const [drawerData, setDrawerData] = useState<any>(null);

  // Form State
  const [passedQty, setPassedQty] = useState(0);
  const [defectsFound, setDefectsFound] = useState(0);
  const [qcStatus, setQcStatus] = useState("Approved");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    setAwaiting(initialAwaiting);
    setWorkOrders(initialWorkOrders);
    setReworks(initialReworks || []);
  }, [initialAwaiting, initialWorkOrders, initialReworks]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredWorkOrders = workOrders.filter(wo => 
    wo.workOrderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.customer?.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.jobDescription?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openWorkOrderInspection = (wo: any) => {
    setDrawerData(wo);
    setDrawerType("WORK_ORDER");
    
    // Auto-calculate available qty to inspect
    // Default to the quantity that Production actually scanned out (producedQty).
    const qty = wo.producedQty !== undefined ? Number(wo.producedQty) : (wo.quantity ? Number(wo.quantity) : 0);
    
    setPassedQty(qty);
    setDefectsFound(0);
    setQcStatus("Approved");
    setRemarks("");
    setDrawerOpen(true);
  };

  const openProcessInspection = (ts: any) => {
    setDrawerData(ts);
    setDrawerType("PROCESS");
    setPassedQty(ts.completedQty ? Number(ts.completedQty) : 0);
    setDefectsFound(0);
    setQcStatus("Approved");
    setRemarks("");
    setDrawerOpen(true);
  };

  const handleSubmitWorkOrder = () => {
    if (!drawerData) return;
    startTransition(async () => {
      const fullRemark = `[Passed: ${passedQty} | Defects: ${defectsFound}] ${remarks}`;
      
      // The inspector is taken from the signed-in user on the server.
      const res = await submitWorkOrderQc(
        drawerData.workOrderNo, 
        qcStatus, 
        fullRemark, 
        undefined,
        passedQty, 
        defectsFound
      );
      if (!res?.success) {
        hotToast.error(res?.error || "Could not save the inspection.");
        return;
      }
      
      setDrawerOpen(false);
      handleRefresh();
    });
  };

  const handleSubmitProcess = () => {
    if (!drawerData) return;
    startTransition(async () => {
      const fullRemark = `[Passed: ${passedQty} | Defects: ${defectsFound}] ${remarks}`;
      const res = await submitProcessQc(drawerData.id, qcStatus, fullRemark);
      if (!res?.success) {
        hotToast.error(res?.error || "Could not save the inspection.");
        return;
      }
      setDrawerOpen(false);
      handleRefresh();
    });
  };

  const openReworkInspection = (rwk: any) => {
    setDrawerData(rwk);
    setDrawerType("REWORK");
    setPassedQty(rwk.reworkedQty ? Number(rwk.reworkedQty) : 0);
    setDefectsFound(0);
    setQcStatus("Approved");
    setRemarks("");
    setDrawerOpen(true);
  };

  const handleSubmitRework = () => {
    if (!drawerData) return;
    startTransition(async () => {
      const res =
        qcStatus === "Approved"
          ? await approveRework(drawerData.id, remarks)
          : await rejectRework(drawerData.id, defectsFound, remarks);
      if (!res?.success) {
        hotToast.error(res?.error || "Could not save the re-inspection.");
        return;
      }
      setDrawerOpen(false);
      handleRefresh();
    });
  };

  const handleSendBack = (workOrderNo: string) => {
    startTransition(async () => {
      try {
        const result = await sendBackToProduction(workOrderNo);
        if (result?.success) {
          handleRefresh();
        } else {
          alert(`Failed to send back: ${result?.error || 'Unknown error'}`);
        }
      } catch (err: any) {
        alert(`Error: ${err?.message || 'Failed to send back to production'}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 text-slate-800 font-sans p-6 md:p-8 relative overflow-hidden">
      
      {/* Background Glows (Glossy feel) */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-white/80 to-transparent pointer-events-none blur-3xl"></div>
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl pointer-events-none"></div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-8 pb-4 md:pb-6 border-b border-blue-200/50 relative z-10 gap-4 md:gap-0">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
          <button onClick={() => router.push("/")} className="p-2 md:p-2.5 bg-white/80 backdrop-blur-md border border-white shadow-sm rounded-lg md:rounded-xl hover:bg-white transition-colors flex-shrink-0">
            <ArrowLeft size={20} className="text-blue-900 w-4 h-4 md:w-5 md:h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-3xl font-black italic tracking-tighter text-blue-950 flex items-center gap-2 md:gap-3 drop-shadow-sm leading-tight md:leading-none truncate">
              <div className="bg-gradient-to-b from-blue-500 to-blue-600 p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-md shadow-blue-500/20 border border-blue-400 flex-shrink-0">
                <ClipboardCheck className="text-white w-4 h-4 md:w-6 md:h-6" />
              </div>
              <span className="truncate">QC WORKFLOW DASHBOARD</span>
            </h1>
            <div className="text-[9px] md:text-xs font-bold text-blue-500/80 uppercase tracking-widest mt-1 md:mt-1.5 ml-1 md:ml-2">
              Inspector View • Real-time
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3 w-full md:w-auto mt-2 md:mt-0">
          <button 
            onClick={handleRefresh}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 md:py-2.5 bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-xl text-[10px] md:text-sm font-bold text-blue-900 hover:bg-white transition-colors ${isRefreshing ? 'opacity-50' : ''}`}
          >
            <RefreshCw size={14} className={`md:w-4 md:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
          <button 
            onClick={() => router.push('/')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 md:py-2.5 bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-xl text-[10px] md:text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={14} className="md:w-4 md:h-4" />
            LOGOUT
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px_350px] lg:grid-cols-[1fr_300px_300px] gap-4 md:gap-6 relative z-10">
        
        {/* LEFT COLUMN: WORK ORDER INFORMATION */}
        <div className="bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-blue-900/5 rounded-2xl md:rounded-3xl overflow-hidden flex flex-col">
          <div className="p-4 md:p-6 border-b border-blue-100/50 bg-white/50 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
            <h2 className="text-xs md:text-sm font-bold tracking-widest uppercase text-blue-950 flex items-center gap-2">
              <FileText size={16} className="text-blue-500 md:w-[18px] md:h-[18px]" />
              Work Order Information
            </h2>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="px-3 md:px-4 py-1.5 md:py-2 bg-emerald-50 text-emerald-700 text-[10px] md:text-xs font-bold rounded-md md:rounded-lg border border-emerald-200 whitespace-nowrap">
                {workOrders.length} ORDERS
              </div>
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 md:w-4 md:h-4" />
                <input 
                  type="text" 
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-64 pl-8 md:pl-10 pr-3 md:pr-4 py-1.5 md:py-2.5 text-xs md:text-sm bg-white/80 border border-blue-100 rounded-lg md:rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-blue-950 placeholder:text-blue-300 shadow-inner"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1 custom-scrollbar p-2 md:p-0">
            <table className="w-full text-left border-collapse block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-blue-50/50 border-b border-blue-100/50 text-[9px] md:text-[10px] uppercase tracking-widest text-blue-700 font-bold">
                  <th className="px-2 md:px-4 py-2 md:py-3 pl-4 md:pl-6 whitespace-nowrap">Work Order</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap hidden md:table-cell">Project / Job</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 pr-4 md:pr-6 whitespace-nowrap">QC Status / Action</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-sm font-medium text-blue-400">
                      No active work orders found.
                    </td>
                  </tr>
                ) : (
                  filteredWorkOrders.map((wo) => (
                    <tr key={wo.workOrderNo} className="block md:table-row border border-slate-100 md:border-0 md:border-b md:border-blue-50 hover:bg-white/80 transition-colors group mb-3 md:mb-0 rounded-xl md:rounded-none bg-white md:bg-transparent shadow-sm md:shadow-none p-3 md:p-0">
                      
                      {/* WORK ORDER */}
                      <td className="block md:table-cell px-4 py-2 md:py-4 pl-4 md:pl-6 border-b border-slate-50 md:border-0">
                        <div className="flex items-center gap-3">
                          <div className="p-2 md:p-2 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 rounded-lg md:rounded-lg border border-emerald-200/50 shadow-inner flex-shrink-0">
                            <FileText size={16} className="md:w-[16px] md:h-[16px]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-blue-950 text-sm md:text-base tracking-wide truncate">
                              {wo.workOrderNo}
                            </div>
                            <div className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mt-0.5">
                              {Number(wo.totalQty || 0)} UNITS
                            </div>
                            {wo.rejectedQty > 0 && (
                              <div className="text-[9px] uppercase font-bold tracking-widest text-rose-500 mt-0.5">
                                {wo.rejectedQty} REJECTED
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* PROJECT / JOB */}
                      <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell max-w-[150px] xl:max-w-[180px]">
                        <div className="font-bold text-blue-900 text-sm truncate">
                          {wo.jobDescription || "Standard Production"}
                        </div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1 flex items-center gap-1">
                          <Briefcase size={10} className="text-blue-400 shrink-0" />
                          <span className="truncate">CLIENT: {wo.customer?.customerName || "N/A"}</span>
                        </div>
                      </td>

                      {/* QC STATUS */}
                      <td className="flex md:table-cell px-2 md:px-4 py-3 md:py-4 pr-4 md:pr-6 justify-between items-center w-full">
                        <div className="flex flex-row items-center justify-between w-full md:min-w-[130px]">
                          <div>
                            <div suppressHydrationWarning className="font-bold text-blue-950 text-xs md:text-sm">
                              {new Date(wo.date).toLocaleDateString('en-GB')}
                            </div>
                            <div suppressHydrationWarning className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5 md:mt-1">
                              DUE: {wo.deliveryDate ? new Date(wo.deliveryDate).toLocaleDateString('en-GB') : "TBD"}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div 
                              onClick={() => {
                                if (wo.status !== 'Completed' && wo.qcAcceptance !== 'Approved') {
                                  openWorkOrderInspection(wo);
                                }
                              }}
                              className={wo.status !== 'Completed' && wo.qcAcceptance !== 'Approved' ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                            >
                              {wo.status === 'Completed' || wo.qcAcceptance === 'Approved' ? (
                                <span className="px-3 py-1 text-[9px] md:text-[9px] uppercase tracking-widest font-bold rounded-lg md:rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm w-fit inline-block">
                                  APPROVED
                                </span>
                              ) : wo.qcAcceptance === 'Rejected' ? (
                                <span className="px-3 py-1 text-[9px] md:text-[9px] uppercase tracking-widest font-bold rounded-lg md:rounded-full bg-rose-50 text-rose-600 border border-rose-200 shadow-sm w-fit inline-block">
                                  REJECTED
                                </span>
                              ) : wo.qcAcceptance === 'Pending' || wo.status === 'Pending for QC' ? (
                                <span className="px-3 py-1 text-[9px] md:text-[9px] uppercase tracking-widest font-bold rounded-lg md:rounded-full bg-amber-50 text-amber-600 border border-amber-200 shadow-sm w-fit inline-block">
                                  PENDING
                                </span>
                              ) : (
                                <span className="px-3 py-1 text-[9px] md:text-[9px] uppercase tracking-widest font-bold rounded-lg md:rounded-full bg-slate-50 text-slate-500 border border-slate-200 shadow-sm w-fit inline-block">
                                  IN-PROGRESS
                                </span>
                              )}
                            </div>

                            {/* ACTION BUTTON */}
                            <div className="mt-2 md:mt-3">
                              {wo.qcAcceptance === 'Rejected' ? (
                                <button 
                                  onClick={() => handleSendBack(wo.workOrderNo)}
                                  className="px-4 py-2 bg-gradient-to-b from-amber-500 to-amber-600 text-white border border-amber-400 text-[9px] font-bold tracking-widest uppercase rounded-lg shadow-sm active:scale-95 transition-transform"
                                  disabled={isPending}
                                >
                                  SEND BACK
                                </button>
                              ) : wo.status !== 'Completed' && wo.qcAcceptance !== 'Approved' && (
                                <button 
                                  onClick={() => openWorkOrderInspection(wo)}
                                  className="px-4 py-2 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 text-[9px] font-bold tracking-widest uppercase rounded-lg shadow-sm active:scale-95 transition-transform"
                                  disabled={isPending}
                                >
                                  INSPECT
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: AWAITING INSPECTION */}
        <div className="bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-blue-900/5 rounded-2xl md:rounded-3xl flex flex-col min-h-[400px] md:min-h-[700px]">
          <div className="p-4 md:p-6 border-b border-blue-100/50 bg-white/50 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
            <h2 className="text-xs md:text-sm font-bold tracking-widest uppercase text-blue-950 flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-500 md:w-[18px] md:h-[18px]" />
              Awaiting Inspection
            </h2>
            <span className="px-3 py-1 bg-rose-50 border border-rose-100 text-rose-600 shadow-sm text-[10px] md:text-xs font-bold rounded-full w-fit">
              {awaiting.length} Items
            </span>
          </div>

          <div className="p-3 md:p-5 flex-1 overflow-y-auto custom-scrollbar">
            {awaiting.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-blue-400 p-8 text-center">
                <div className="p-4 bg-emerald-50 rounded-full mb-4 border border-emerald-100 shadow-inner">
                  <CheckCircle size={48} className="text-emerald-400" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-blue-600">All Caught Up</p>
                <p className="text-xs font-medium mt-2 text-blue-400">No production sessions are awaiting inspection.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {awaiting.map((ts) => {
                  const wo = ts.routingProcess?.inProcess?.workOrder;
                  const processName = ts.routingProcess?.routingProcess ? Object.keys(ts.routingProcess.routingProcess).find(k => ts.routingProcess.routingProcess[k] === true && k !== 'id' && k !== 'routingProcessId')?.toUpperCase() : "UNKNOWN";
                  
                  return (
                    <div key={ts.id} className="bg-white/80 border border-white rounded-xl md:rounded-2xl p-3 md:p-5 shadow-sm hover:shadow-lg shadow-blue-900/5 transition-all relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1 md:w-1.5 bg-gradient-to-b from-rose-400 to-rose-600 shadow-[2px_0_8px_rgba(225,29,72,0.3)]"></div>
                      
                      <div className="flex justify-between items-start mb-2 md:mb-3">
                        <div>
                          <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 md:mb-1.5 flex items-center gap-1.5 md:gap-2">
                            <span suppressHydrationWarning className="text-slate-500">{new Date(ts.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> 
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span> 
                            {ts.employee?.name || "Unknown"}
                          </div>
                          <div className="font-bold text-blue-950 text-xs md:text-base tracking-wide truncate">
                            {wo?.workOrderNo || "Unknown WO"}
                          </div>
                        </div>
                        <span className="px-1.5 md:px-2.5 py-0.5 md:py-1 bg-blue-50 text-blue-700 text-[7px] md:text-[9px] uppercase font-bold tracking-widest rounded-md md:rounded-lg border border-blue-100 shadow-inner shrink-0">
                          {processName}
                        </span>
                      </div>
                      
                      <div className="flex gap-3 md:gap-6 mt-2 md:mt-4 pt-2 md:pt-4 border-t border-slate-100">
                        <div>
                          <div className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Completed</div>
                          <div className="text-xs md:text-sm font-bold text-blue-900">{Number(ts.completedQty)}</div>
                        </div>
                        <div>
                          <div className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Client</div>
                          <div className="text-xs md:text-sm font-bold text-blue-900 truncate max-w-[100px] md:max-w-[150px]">{wo?.customer?.customerName || "N/A"}</div>
                        </div>
                      </div>

                      <button 
                        onClick={() => openProcessInspection(ts)}
                        className="w-full mt-3 md:mt-5 py-2 md:py-3 bg-white hover:bg-rose-50 text-rose-600 text-[9px] md:text-xs font-bold tracking-widest rounded-lg md:rounded-xl border border-rose-200 transition-all shadow-sm hover:shadow-md"
                      >
                        START INSPECTION
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* THIRD COLUMN: REWORK RE-INSPECTION */}
        <div className="bg-white/60 backdrop-blur-xl border border-white shadow-xl shadow-blue-900/5 rounded-2xl md:rounded-3xl flex flex-col min-h-[400px] md:min-h-[700px]">
          <div className="p-4 md:p-6 border-b border-blue-100/50 bg-white/50 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
            <h2 className="text-xs md:text-sm font-bold tracking-widest uppercase text-blue-950 flex items-center gap-2">
              <RefreshCw size={16} className="text-indigo-500 md:w-[18px] md:h-[18px]" />
              Rework Re-inspection
            </h2>
            <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm text-[10px] md:text-xs font-bold rounded-full w-fit">
              {reworks.length} Items
            </span>
          </div>

          <div className="p-3 md:p-5 flex-1 overflow-y-auto custom-scrollbar">
            {reworks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-blue-400 p-8 text-center">
                <div className="p-4 bg-indigo-50 rounded-full mb-4 border border-indigo-100 shadow-inner">
                  <CheckCircle size={48} className="text-indigo-400" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">All Caught Up</p>
                <p className="text-xs font-medium mt-2 text-blue-400">No reworked items are awaiting inspection.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reworks.map((rwk) => {
                  const wo = rwk.workOrder;
                  return (
                    <div key={rwk.id} className="bg-white/80 border border-white rounded-xl md:rounded-2xl p-3 md:p-5 shadow-sm hover:shadow-lg shadow-blue-900/5 transition-all relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1 md:w-1.5 bg-gradient-to-b from-indigo-400 to-indigo-600 shadow-[2px_0_8px_rgba(99,102,241,0.3)]"></div>
                      
                      <div className="flex justify-between items-start mb-2 md:mb-3">
                        <div>
                          <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 md:mb-1.5 flex items-center gap-1.5 md:gap-2">
                            <span suppressHydrationWarning className="text-slate-500">{new Date(rwk.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> 
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span> 
                            {rwk.reworkNo}
                          </div>
                          <div className="font-bold text-blue-950 text-xs md:text-base tracking-wide truncate">
                            {wo?.workOrderNo || "Unknown WO"}
                          </div>
                        </div>
                        <span className="px-1.5 md:px-2.5 py-0.5 md:py-1 bg-indigo-50 text-indigo-700 text-[7px] md:text-[9px] uppercase font-bold tracking-widest rounded-md md:rounded-lg border border-indigo-100 shadow-inner shrink-0">
                          REWORK
                        </span>
                      </div>
                      
                      <div className="flex gap-3 md:gap-6 mt-2 md:mt-4 pt-2 md:pt-4 border-t border-slate-100">
                        <div>
                          <div className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Reworked Qty</div>
                          <div className="text-xs md:text-sm font-bold text-blue-900">{Number(rwk.reworkedQty)}</div>
                        </div>
                        <div>
                          <div className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Client</div>
                          <div className="text-xs md:text-sm font-bold text-blue-900 truncate max-w-[100px] md:max-w-[150px]">{wo?.customer?.customerName || "N/A"}</div>
                        </div>
                      </div>

                      <button 
                        onClick={() => openReworkInspection(rwk)}
                        className="w-full mt-3 md:mt-5 py-2 md:py-3 bg-white hover:bg-indigo-50 text-indigo-600 text-[9px] md:text-xs font-bold tracking-widest rounded-lg md:rounded-xl border border-indigo-200 transition-all shadow-sm hover:shadow-md"
                      >
                        RE-INSPECT
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INSPECTION DRAWER (MODAL) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-blue-950/40 backdrop-blur-sm transition-opacity" 
            onClick={() => !isPending && setDrawerOpen(false)}
          ></div>
          
          {/* Modal Panel (Matches Screenshot 2 layout but White/Blue Theme) */}
          {drawerType === "WORK_ORDER" && drawerData ? (
            <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-white shadow-2xl rounded-3xl flex flex-col animate-scale-up overflow-hidden m-4 max-h-[90vh]">
              <div className="p-6 border-b border-blue-100 flex items-center justify-between bg-blue-50/50">
                <h3 className="text-xl font-black italic tracking-wide text-blue-950 uppercase flex items-center gap-2">
                  <Activity className="text-emerald-500" size={24} />
                  New QC Inspection
                </h3>
                <button 
                  onClick={() => setDrawerOpen(false)}
                  disabled={isPending}
                  className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                
                {/* WORK ORDER FIELD */}
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Work Order</label>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-950 shadow-inner flex items-center justify-between">
                    <span>{drawerData.workOrderNo} - {drawerData.jobDescription || "Standard Production"}</span>
                  </div>
                </div>

                {/* QTY ROW */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Passed Qty</label>
                    <input 
                      type="number" 
                      value={passedQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setPassedQty(val);
                        const total = drawerData.quantity ? Number(drawerData.quantity) : 0;
                        setDefectsFound(Math.max(0, total - val));
                        if (val < total) setQcStatus("Rejected");
                        else setQcStatus("Approved");
                      }}
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-blue-950 shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Defects Found</label>
                    <input 
                      type="number" 
                      value={defectsFound}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setDefectsFound(val);
                        const total = drawerData.quantity ? Number(drawerData.quantity) : 0;
                        setPassedQty(Math.max(0, total - val));
                        if (val > 0) setQcStatus("Rejected");
                        else setQcStatus("Approved");
                      }}
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-blue-950 shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* STATUS */}
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Status</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      type="button" 
                      onClick={() => setQcStatus("Approved")} 
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${qcStatus === 'Approved' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      Approved
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setQcStatus("Rejected")} 
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${qcStatus === 'Rejected' ? 'bg-white text-rose-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      Rejected
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setQcStatus("Pending")} 
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${qcStatus === 'Pending' ? 'bg-white text-amber-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      Pending
                    </button>
                  </div>
                </div>

                {/* REMARKS */}
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Remarks</label>
                  <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Inspection notes..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all resize-none placeholder:text-slate-400"
                  />
                </div>

                {/* SUBMIT */}
                <button 
                  onClick={handleSubmitWorkOrder}
                  disabled={isPending}
                  className="w-full py-4 bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 border border-emerald-400 text-white font-bold text-sm tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={18} className="animate-spin text-white" /> : <ClipboardCheck size={18} />}
                  SUBMIT INSPECTION
                </button>
              </div>
            </div>
          ) : drawerType === "PROCESS" && drawerData ? (
            <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-white shadow-2xl rounded-3xl flex flex-col animate-scale-up overflow-hidden m-4 max-h-[90vh]">
              <div className="p-6 border-b border-blue-100 flex items-center justify-between bg-blue-50/50">
                <h3 className="text-xl font-black italic tracking-wide text-blue-950 uppercase flex items-center gap-2">
                  <Activity className="text-emerald-500" size={24} />
                  New Process QC
                </h3>
                <button 
                  onClick={() => setDrawerOpen(false)}
                  disabled={isPending}
                  className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                {/* WORK ORDER / PROCESS FIELD */}
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Process Completed</label>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-950 shadow-inner flex items-center justify-between">
                    <span>
                      {drawerData.routingProcess?.inProcess?.workOrder?.workOrderNo} - {Object.keys(drawerData.routingProcess?.routingProcess || {}).find(k => drawerData.routingProcess.routingProcess[k] === true && k !== 'id' && k !== 'routingProcessId')?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </div>
                </div>

                {/* SPECIFIC PROCESS PARAMETERS */}
                {drawerData.weldingParameter && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                    <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Activity size={14} /> Welding Details
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-blue-950">
                      <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Voltage</span><span className="font-semibold">{drawerData.weldingParameter.voltageVolts || "N/A"} V</span></div>
                      <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Current</span><span className="font-semibold">{drawerData.weldingParameter.currentAmp || "N/A"} A</span></div>
                      <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Pre-Heat</span><span className="font-semibold">{drawerData.weldingParameter.preHeatingC || "N/A"}°C</span></div>
                      <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Post-Heat</span><span className="font-semibold">{drawerData.weldingParameter.postHeatingC || "N/A"}°C</span></div>
                      {drawerData.weldingParameter.remark && (
                        <div className="col-span-2 mt-1 flex flex-col">
                          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Operator Notes</span>
                          <span className="font-medium italic text-slate-600">"{drawerData.weldingParameter.remark}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {drawerData.sprayParameter && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                    <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Activity size={14} /> Spray Details
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-blue-950">
                      <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Tank Pressure</span><span className="font-semibold">{drawerData.sprayParameter.paintTankPressurePsi || "N/A"} PSI</span></div>
                      <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Nozzle Size</span><span className="font-semibold">{drawerData.sprayParameter.sprayNozzleSize || "N/A"}</span></div>
                      <div className="col-span-2 flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Paint Type</span><span className="font-semibold">{drawerData.sprayParameter.typeOfPaint || "N/A"}</span></div>
                      {drawerData.sprayParameter.remark && (
                        <div className="col-span-2 mt-1 flex flex-col">
                          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Operator Notes</span>
                          <span className="font-medium italic text-slate-600">"{drawerData.sprayParameter.remark}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {drawerData.machiningParameter && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                    <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Activity size={14} /> Machining Details
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-blue-950">
                      <div className="col-span-2 flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Machine ID</span><span className="font-semibold">{drawerData.machiningParameter.machineSerialNoId || "N/A"}</span></div>
                      <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">CNC Program</span><span className="font-semibold">{drawerData.machiningParameter.cncProgramNo || "N/A"}</span></div>
                      <div className="flex flex-col"><span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Run Time</span><span className="font-semibold">{drawerData.machiningParameter.partRuntimeHr || 0}h {drawerData.machiningParameter.partRuntimeMins || 0}m</span></div>
                      {drawerData.machiningParameter.remark && (
                        <div className="col-span-2 mt-1 flex flex-col">
                          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Operator Notes</span>
                          <span className="font-medium italic text-slate-600">"{drawerData.machiningParameter.remark}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* QTY ROW (READ-ONLY FOR PROCESS) */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Passed Qty</label>
                    <div className="w-full px-4 py-3 bg-slate-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-950 shadow-inner flex items-center justify-between">
                      <span>{passedQty}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Defects Found</label>
                    <div className="w-full px-4 py-3 bg-slate-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-950 shadow-inner flex items-center justify-between">
                      <span>{defectsFound}</span>
                    </div>
                  </div>
                </div>

                {/* STATUS */}
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Status</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      type="button" 
                      onClick={() => setQcStatus("Approved")} 
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${qcStatus === 'Approved' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      Approved
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setQcStatus("Rejected")} 
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${qcStatus === 'Rejected' ? 'bg-white text-rose-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      Rejected
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setQcStatus("Pending")} 
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${qcStatus === 'Pending' ? 'bg-white text-amber-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      Pending
                    </button>
                  </div>
                </div>

                {/* REMARKS */}
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Remarks</label>
                  <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Inspection notes..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all resize-none placeholder:text-slate-400"
                  />
                </div>

                {/* SUBMIT */}
                <button 
                  onClick={handleSubmitProcess}
                  disabled={isPending}
                  className="w-full py-4 bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 border border-emerald-400 text-white font-bold text-sm tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={18} className="animate-spin text-white" /> : <ClipboardCheck size={18} />}
                  SUBMIT INSPECTION
                </button>
              </div>
            </div>
          ) : drawerType === "REWORK" && drawerData ? (
            <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl border border-white shadow-2xl rounded-3xl flex flex-col animate-scale-up overflow-hidden m-4 max-h-[90vh]">
              <div className="p-6 border-b border-blue-100 flex items-center justify-between bg-blue-50/50">
                <h3 className="text-xl font-black italic tracking-wide text-blue-950 uppercase flex items-center gap-2">
                  <Activity className="text-indigo-500" size={24} />
                  Rework Re-inspection
                </h3>
                <button 
                  onClick={() => setDrawerOpen(false)}
                  disabled={isPending}
                  className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                
                {/* REWORK NO / WORK ORDER FIELD */}
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Rework Task</label>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-950 shadow-inner flex flex-col justify-center">
                    <span>{drawerData.reworkNo}</span>
                    <span className="text-xs text-blue-600 mt-1">For Work Order: {drawerData.workOrderNo}</span>
                  </div>
                </div>

                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 shadow-sm">
                  <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">Original Rejection</div>
                  <div className="text-xs text-rose-950 italic">
                    "{drawerData.rejectionReason}"
                  </div>
                </div>

                {/* QTY ROW */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Passed Qty</label>
                    <input 
                      type="number" 
                      value={passedQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setPassedQty(val);
                        const total = drawerData.reworkedQty ? Number(drawerData.reworkedQty) : 0;
                        setDefectsFound(Math.max(0, total - val));
                        if (val < total) setQcStatus("Rejected");
                        else setQcStatus("Approved");
                      }}
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-blue-950 shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Reject Again</label>
                    <input 
                      type="number" 
                      value={defectsFound}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setDefectsFound(val);
                        const total = drawerData.reworkedQty ? Number(drawerData.reworkedQty) : 0;
                        setPassedQty(Math.max(0, total - val));
                        if (val > 0) setQcStatus("Rejected");
                        else setQcStatus("Approved");
                      }}
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm font-bold text-blue-950 shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* STATUS */}
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Re-inspection Status</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      type="button" 
                      onClick={() => setQcStatus("Approved")} 
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${qcStatus === 'Approved' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      Approved
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setQcStatus("Rejected")} 
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${qcStatus === 'Rejected' ? 'bg-white text-rose-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      Rejected Again
                    </button>
                  </div>
                </div>

                {/* REMARKS */}
                <div>
                  <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Remarks</label>
                  <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Re-inspection notes..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all resize-none placeholder:text-slate-400"
                  />
                </div>

                {/* SUBMIT */}
                <button 
                  onClick={handleSubmitRework}
                  disabled={isPending}
                  className="w-full py-4 bg-gradient-to-b from-indigo-400 to-indigo-500 hover:from-indigo-300 hover:to-indigo-400 border border-indigo-400 text-white font-bold text-sm tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPending ? <Loader2 size={18} className="animate-spin text-white" /> : <ClipboardCheck size={18} />}
                  SUBMIT RE-INSPECTION
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <style jsx global>{`
        .animate-slide-left {
          animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale-up {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>
    </div>
  );
}
