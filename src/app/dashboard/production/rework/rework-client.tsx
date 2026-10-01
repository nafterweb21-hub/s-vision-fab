"use client";

import { useState, useTransition } from "react";
import { Wrench, CheckCircle2, Clock, AlertCircle, FileText, ArrowRight, X } from "lucide-react";
import { startRework, completeRework } from "./actions";

export default function ReworkClient({ initialReworks }: { initialReworks: any[] }) {
  const [reworks, setReworks] = useState(initialReworks);
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRework, setActiveRework] = useState<any>(null);
  const [reworkedQty, setReworkedQty] = useState<number>(0);

  const handleStartRework = (id: string) => {
    startTransition(async () => {
      await startRework(id);
      // Optimistic update
      setReworks(prev => prev.map(r => r.id === id ? { ...r, status: "Rework In Progress", reworkStartTime: new Date() } : r));
    });
  };

  const openCompleteModal = (rework: any) => {
    setActiveRework(rework);
    setReworkedQty(Number(rework.rejectedQty)); // Default to the full rejected qty
    setModalOpen(true);
  };

  const handleCompleteRework = () => {
    if (!activeRework) return;
    startTransition(async () => {
      await completeRework(activeRework.id, reworkedQty);
      // Remove from active list
      setReworks(prev => prev.filter(r => r.id !== activeRework.id));
      setModalOpen(false);
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 sm:gap-3">
            <Wrench className="text-amber-500 w-5 h-5 sm:w-8 sm:h-8" />
            Rework Queue
          </h1>
          <p className="text-[10px] sm:text-base text-slate-500 mt-0.5 sm:mt-2 font-medium">Manage and process QC rejected items for rework.</p>
        </div>
        <div className="px-2 py-1.5 sm:px-4 sm:py-2 bg-amber-50 border border-amber-200 text-amber-700 font-bold rounded-lg sm:rounded-xl shadow-sm text-[10px] sm:text-sm flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
          <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
          {reworks.length} Pending Reworks
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {reworks.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="text-emerald-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Queue Empty</h3>
            <p className="text-slate-500 font-medium mt-1">No items require rework at the moment.</p>
          </div>
        ) : (
          reworks.map(rwk => {
            const wo = rwk.workOrder;
            const inProgress = rwk.status === "Rework In Progress";

            return (
              <div key={rwk.id} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                <div className={`h-1.5 sm:h-2 w-full ${inProgress ? 'bg-amber-400' : 'bg-rose-400'}`} />
                <div className="p-3 sm:p-5 flex-1 flex flex-col">
                  
                  <div className="flex justify-between items-start mb-2 sm:mb-4">
                    <div>
                      <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 sm:mb-1 block">Rework Task</span>
                      <h3 className="font-bold text-slate-800 text-sm sm:text-lg">{rwk.reworkNo}</h3>
                    </div>
                    <div className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest rounded sm:rounded-lg border text-center ${inProgress ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      {rwk.status}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg sm:rounded-xl p-2 sm:p-4 border border-slate-100 mb-2 sm:mb-4 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-slate-700 mb-1 sm:mb-2">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                      Work Order: {wo.workOrderNo}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 mb-2 sm:mb-3 truncate">
                      {wo.jobDescription || "Standard Production"}
                    </div>
                    
                    <div className="bg-rose-50/50 rounded sm:rounded-lg p-2 sm:p-3 border border-rose-100/50">
                      <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-rose-500 block mb-0.5 sm:mb-1">Reason for Rejection</span>
                      <p className="text-[10px] sm:text-xs font-medium text-rose-900 italic">"{rwk.rejectionReason}"</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-5 pt-2 sm:pt-4 border-t border-slate-100">
                    <div>
                      <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5 sm:mb-1">Qty to Rework</span>
                      <div className="text-base sm:text-xl font-black text-slate-800">{Number(rwk.rejectedQty)}</div>
                    </div>
                    <div>
                      <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5 sm:mb-1">Client</span>
                      <div className="text-[10px] sm:text-sm font-bold text-slate-700 truncate">{wo.customer?.customerName || "N/A"}</div>
                    </div>
                  </div>

                  {inProgress ? (
                    <button 
                      onClick={() => openCompleteModal(rwk)}
                      disabled={isPending}
                      className="w-full py-2 sm:py-3 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-[10px] sm:text-sm tracking-widest rounded sm:rounded-xl transition-all shadow-[0_4px_10px_rgba(16,185,129,0.2)] disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2"
                    >
                      COMPLETE REWORK <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStartRework(rwk.id)}
                      disabled={isPending}
                      className="w-full py-2 sm:py-3 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-bold text-[10px] sm:text-sm tracking-widest rounded sm:rounded-xl transition-all shadow-[0_4px_10px_rgba(245,158,11,0.2)] disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2"
                    >
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" /> START REWORK
                    </button>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>

      {modalOpen && activeRework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          <div className="relative bg-white rounded-xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-3 sm:p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm sm:text-lg font-black text-slate-800 flex items-center gap-1.5 sm:gap-2">
                <CheckCircle2 className="text-emerald-500 w-4 h-4 sm:w-5 sm:h-5" />
                Complete Rework
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-6 space-y-3 sm:space-y-5">
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Rework Task</label>
                <div className="px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 border border-slate-200 rounded sm:rounded-xl font-bold text-slate-800 text-[10px] sm:text-sm">
                  {activeRework.reworkNo}
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Completed Qty</label>
                <input 
                  type="number" 
                  value={reworkedQty}
                  onChange={(e) => setReworkedQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white border border-slate-200 rounded sm:rounded-xl font-bold text-slate-800 text-[10px] sm:text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition-all"
                />
                <p className="text-[8px] sm:text-[10px] font-medium text-slate-400 mt-1 sm:mt-2 leading-tight">
                  Enter the quantity that has been successfully reworked and is ready for QC. (Target: {Number(activeRework.rejectedQty)})
                </p>
              </div>

              <button 
                onClick={handleCompleteRework}
                disabled={isPending}
                className="w-full mt-1 sm:mt-2 py-2 sm:py-4 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-[10px] sm:text-sm tracking-widest rounded sm:rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {isPending ? 'PROCESSING...' : 'SUBMIT TO QC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
