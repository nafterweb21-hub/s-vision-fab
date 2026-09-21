/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { toast as hotToast } from "react-hot-toast";

import { useState, useTransition, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Monitor, Plus, ChevronRight, CheckCircle2, Info, AlertCircle, Minus, ChevronDown, Check, Zap, Clock, Box, LogOut, Keyboard, Play } from "lucide-react";
import ProductionIntake from "./ProductionIntake";
import {
  scanIn,
  scanOut,
  togglePauseSession,
  type ScanOutPayload,
} from "../actions";

type Support = {
  employees: { id: string; name: string; code: string }[];
  weldingMachines: any[];
  machiningMachines: any[];
  materialTypes: any[];
  weldingTypes: any[];
  joints: any[];
  elcometers: any[];
};

/** "1h 5m", "27m", or "<1m" for a session under a minute (never "0h 0m"). */
function fmtDuration(minutes: number) {
  const t = Math.round(minutes);
  if (minutes > 0 && t < 1) return "<1m";
  const h = Math.floor(t / 60);
  return h ? `${h}h ${t % 60}m` : `${t}m`;
}

export default function TerminalClient({ support, loggedInEmployee, initialSessions = [], initialRecentCompletes = [], initialAvailable = [], completedTotal = 0 }: { support: Support, loggedInEmployee?: any | null, initialSessions?: any[], initialRecentCompletes?: any[], initialAvailable?: any[], completedTotal?: number }) {
  const router = useRouter();
  const [isScanInOpen, setIsScanInOpen] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>(initialSessions);
  const [recentCompletes, setRecentCompletes] = useState<any[]>(initialRecentCompletes);
  const [availableSessions, setAvailableSessions] = useState<any[]>(initialAvailable);
  const [prevInitialAvailable, setPrevInitialAvailable] = useState(initialAvailable);
  const [startingKey, setStartingKey] = useState<string | null>(null);
  // Times depend on the viewer's time zone, so they must not be rendered on the server: that made the
  // server HTML differ from the browser's (React hydration error #418 on every load).
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [selectedCompleteId, setSelectedCompleteId] = useState<string>("");
  const selectedComplete = recentCompletes.find((c) => c.id === selectedCompleteId);
  if (initialAvailable !== prevInitialAvailable) {
    setPrevInitialAvailable(initialAvailable);
    setAvailableSessions(initialAvailable);
  }
  
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);



  const [actionConfirmEmployeeId, setActionConfirmEmployeeId] = useState("");
  const [actionConfirmError, setActionConfirmError] = useState("");
  const [pendingAction, setPendingAction] = useState<"pause" | "resume" | "complete" | null>(null);

  const executeAction = () => {
    if (!selectedSession) return;

    // If you prefer strict EMP-XXXX matching, we can do that, but comparing code/ID is best
    const match = support.employees.find((emp) => emp.code.toLowerCase() === actionConfirmEmployeeId.toLowerCase());
    
    if (match?.id !== selectedSession.employeeId) {
      setActionConfirmError("Invalid Employee ID for this session.");
      return;
    }
    
    setActionConfirmError("");
    setActionConfirmEmployeeId("");
    
    if (pendingAction === "pause" || pendingAction === "resume") {
      startTransition(async () => {
        const res = await togglePauseSession(selectedSession.id);
        if (res.success) {
          hotToast.success(selectedSession.isPaused ? "Session Resumed" : "Session Paused");
          router.refresh();
        } else {
          hotToast.error("Failed to pause/resume: " + res.error);
        }
      });
    } else if (pendingAction === "complete") {
      doCompleteSession();
    }
    setPendingAction(null);
  };

  useEffect(() => {
    const handlePopState = () => {
      // If the back button is pressed and the modal is open, close it
      if (isScanInOpen) {
        setIsScanInOpen(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isScanInOpen]);

  const openScanInModal = () => {
    // Push a dummy state to history so the back button just pops this state instead of navigating away
    window.history.pushState({ modal: "scan-in" }, "");
    setIsScanInOpen(true);
  };

  const closeScanInModal = () => {
    if (window.history.state?.modal === "scan-in") {
      window.history.back(); // This triggers popstate, which closes the modal
    } else {
      setIsScanInOpen(false);
    }
  };

  const [prevInitialSessions, setPrevInitialSessions] = useState(initialSessions);
  const [prevInitialCompletes, setPrevInitialCompletes] = useState(initialRecentCompletes);

  if (initialSessions !== prevInitialSessions) {
    setPrevInitialSessions(initialSessions);
    setActiveSessions(initialSessions);
  }
  
  if (initialRecentCompletes !== prevInitialCompletes) {
    setPrevInitialCompletes(initialRecentCompletes);
    setRecentCompletes(initialRecentCompletes);
  }
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  function handleIntakeScanOutRequest(routingProcessProfileId: string, employeeId: string, inProcessId: string, mainProcessId: string) {
    const matchingSession = activeSessions.find((s) =>
      s.routingProcess?.inProcessId === inProcessId &&
      s.routingProcess?.mainProcessId === mainProcessId &&
      s.routingProcess?.routingProcessId === routingProcessProfileId &&
      s.employeeId === employeeId
    );

    if (matchingSession) {
      closeScanInModal();
      handleSelectSession(matchingSession);
    } else {
      hotToast.error("No active session found for this combination.");
    }
  }

  const [producedCount, setProducedCount] = useState<number | "">(0);
  const [defectCount, setDefectCount] = useState<number | "">(0);
  const [defectReason, setDefectReason] = useState("");
  const [sessionNote, setSessionNote] = useState("");
  const [weldingForm, setWeldingForm] = useState<any>({});
  const [sprayForm, setSprayForm] = useState<any>({});
  const [machiningForm, setMachiningForm] = useState<any>({});
  const [machineCodes, setMachineCodes] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const [isManualProduced, setIsManualProduced] = useState(false);
  const [isManualDefect, setIsManualDefect] = useState(false);
  const producedInputRef = useRef<HTMLInputElement>(null);
  const defectInputRef = useRef<HTMLInputElement>(null);

  // loggedInEmployee is now provided directly by the server page

  const selectedSession = activeSessions.find((s) => s.id === selectedSessionId);

  const targetQty = selectedSession ? Number(selectedSession.routingProcess?.inProcess?.workOrder?.quantity || 0) : 0;
  const previouslyCompleted = selectedSession 
    ? (selectedSession.routingProcess?.productionTimesheets?.reduce((acc: number, ts: any) => acc + (Number(ts.completedQty) || 0), 0) || 0)
    : 0;
  const maxAllowedQty = Math.max(0, targetQty - previouslyCompleted);
  const remainingQty = Math.max(0, maxAllowedQty - (Number(producedCount) || 0));

  // One tap starts a session for the signed-in operator; the server re-checks sequence, role and identity.
  async function handleStartAvailable(s: any) {
    if (!loggedInEmployee?.id || loggedInEmployee.code === "UNLINKED_USER") {
      hotToast.error("Your account is not linked to an employee, so it cannot start sessions.");
      return;
    }
    setStartingKey(s.key);
    try {
      const res = await scanIn({
        workOrderNo: s.workOrderNo,
        inProcessId: s.inProcessId,
        mainProcessId: s.mainProcessId,
        routingProcessProfileId: s.routingProcessProfileId,
        employeeId: loggedInEmployee.id,
      });
      if (!res.success) {
        hotToast.error(res.error || "Could not start the session.");
        router.refresh();
        return;
      }
      hotToast.success(`Started ${s.workOrderNo} · ${s.routingProcessName}`);
      router.refresh();
    } finally {
      setStartingKey(null);
    }
  }

  function handleScanInSuccess() {
    closeScanInModal();
    router.refresh();
  }

  function handleSelectSession(session: any) {
    setSelectedCompleteId("");
    setSelectedSessionId(session.id);
    setProducedCount(0);
    setDefectCount(0);
    setDefectReason("");
    setSessionNote("");
    setWeldingForm({});
    setSprayForm({});
    setMachiningForm({});
    setMachineCodes("");
  }

  function doCompleteSession() {
    if (!selectedSession) return;
    
    const pCount = Number(producedCount) || 0;
    const dCount = Number(defectCount) || 0;
    
    if (pCount <= 0 && dCount <= 0) {
      hotToast.error("Produced or Defect count must be greater than 0");
      return;
    }

    const payload: ScanOutPayload = {
      timesheetId: selectedSession.id,
      completedQty: pCount,
      rejectedQty: dCount > 0 ? dCount : undefined,
      rejectReason: defectReason || undefined,
      machineCodes: machineCodes || undefined,
    };

    const flags = selectedSession.routingProcess?.routingProcess;
    
    if (flags?.machining && !machiningForm.machineSerialNoId) {
      hotToast.error("Please select a Machine in the Machining form.");
      return;
    }

    if (flags?.welding) {
      if (!weldingForm.weldingTypeIds?.length) {
        hotToast.error("Please select the Type of Welding.");
        return;
      }
      if (!weldingForm.weldingMachineId) {
        hotToast.error("Please select the Welding Machine.");
        return;
      }
      payload.welding = weldingForm;
    }
    if (flags?.sprayPainting) payload.spray = sprayForm;
    if (flags?.machining) payload.machining = machiningForm;

    startTransition(async () => {
      const res = await scanOut(payload);
      if (res.success) {
        setRecentCompletes((prev) => [selectedSession, ...prev]);
        setActiveSessions((prev) => prev.filter((s) => s.id !== selectedSession.id));
        setSelectedSessionId("");
        setProducedCount(0);
        hotToast.success("Session completed successfully");
      } else {
        hotToast.error("Failed to complete session: " + res.error);
      }
    });
  }

  function handleCompleteSession() {
    setPendingAction("complete");
  }



  return (
    <div className="bg-white min-h-0 md:min-h-[calc(100vh-80px)] rounded-lg md:rounded-3xl p-1.5 md:p-6 font-sans text-slate-900 relative overflow-hidden shadow-sm md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
      
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white border border-slate-200 shadow-sm rounded-lg md:rounded-3xl p-1.5 md:p-4 mb-2 md:mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border border-slate-200 hidden sm:block">
            <Monitor className="text-cyan-600" size={28} />
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div>
              <div className="text-[9px] md:text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-0 md:mb-0.5">Terminal</div>
              <div className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
                Shared Production Terminal
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-row items-center gap-1.5 md:gap-4 mt-2 md:mt-0 w-full md:w-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-lg md:rounded-2xl px-1 py-1 md:px-6 md:py-3 flex flex-col items-center justify-center flex-1">
            <div className="text-[7px] md:text-[9px] font-bold tracking-widest text-slate-500 uppercase mb-0 md:mb-1">Active Jobs</div>
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-sm md:text-2xl font-bold text-slate-900 leading-none">{activeSessions.length}</span>
              <span className="text-[8px] md:text-[9px] bg-cyan-100 text-cyan-800 px-1.5 md:px-2 py-0.5 rounded-full font-bold uppercase tracking-wider hidden sm:inline">Running</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg md:rounded-2xl px-1 py-1 md:px-6 md:py-3 flex flex-col items-center justify-center flex-1">
            <div className="text-[7px] md:text-[9px] font-bold tracking-widest text-slate-500 uppercase mb-0 md:mb-1">Total Produced</div>
            <div className="text-sm md:text-2xl font-bold text-emerald-600 leading-none">
              {completedTotal}
            </div>
          </div>
          <button 
            onClick={openScanInModal}
            className="font-bold rounded-lg md:rounded-2xl px-2 py-1.5 md:px-6 md:py-3 flex items-center justify-center gap-1 md:gap-2 transition-colors shadow-sm md:shadow-lg bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/20 flex-1 md:w-auto text-[10px] md:text-base"
          >
            <Plus size={16} strokeWidth={3} className="md:w-[18px] md:h-[18px]" />
            Scan In
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-8">
        
        {/* LEFT SIDEBAR */}
        <div className="lg:col-span-4 space-y-3 md:space-y-8">
          
          <section>
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-4 text-emerald-600">
              <Play size={14} className="md:w-4 md:h-4" fill="currentColor" />
              <h3 className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-slate-500">Available Sessions</h3>
              <span className="ml-auto text-[10px] md:text-xs font-bold text-slate-400">{availableSessions.length}</span>
            </div>

            <div className="space-y-2 md:space-y-3">
              {availableSessions.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl md:rounded-3xl p-3 md:p-6 text-center text-slate-500 text-[10px] md:text-sm">
                  No work is waiting for you right now.
                </div>
              ) : (
                availableSessions.map((s) => (
                  <div
                    key={s.key}
                    className="bg-white border border-slate-200 shadow-sm rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm font-bold text-slate-900 truncate">{s.workOrderNo}</p>
                      <p className="text-[10px] md:text-xs font-semibold text-emerald-700 truncate">
                        {s.mainProcessName} · {s.routingProcessName}
                      </p>
                      <p className="text-[10px] md:text-xs text-slate-500 truncate">
                        {[s.customer, s.quantity != null ? `${s.quantity} ${s.uom}`.trim() : ""].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{s.inProcessName}</p>
                    </div>
                    <button
                      onClick={() => handleStartAvailable(s)}
                      disabled={startingKey !== null}
                      className="shrink-0 px-3 py-2 md:px-4 rounded-lg md:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-50"
                    >
                      {startingKey === s.key ? "Starting..." : "Start"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-4 text-cyan-600">
              <Zap size={14} className="md:w-4 md:h-4" fill="currentColor" />
              <h3 className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-slate-500">Active Sessions</h3>
            </div>
            
            <div className="space-y-2 md:space-y-4 relative">
              {activeSessions.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl md:rounded-3xl p-3 md:p-6 text-center text-slate-500 text-[10px] md:text-sm">
                  No active sessions.
                </div>
              ) : (
                <SearchableSelect
                  value={selectedSessionId || ""}
                  onChange={(e) => {
                    const session = activeSessions.find(s => s.id === e.target.value);
                    if (session) handleSelectSession(session);
                  }}
                  className="w-full bg-white border border-slate-200 shadow-sm rounded-lg md:rounded-2xl px-2 py-1.5 md:px-4 md:py-4 text-[10px] md:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                >
                  <option value="" disabled>Select an Active Session...</option>
                  {[...activeSessions]
                    .sort((a, b) => new Date(b.timeIn || b.createdAt).getTime() - new Date(a.timeIn || a.createdAt).getTime())
                    .map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.routingProcess?.inProcess?.workOrderNo || "Unknown WO"} - {session.routingProcess?.routingProcess?.routingProcess || "Unknown"} ({session.employee?.name || "Unknown Operator"})
                    </option>
                  ))}
                </SearchableSelect>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-4 text-slate-400">
              <Clock size={14} className="md:w-4 md:h-4" />
              <h3 className="text-[10px] md:text-xs font-bold tracking-widest uppercase">Recent Completes</h3>
            </div>
            
            <div className="space-y-2 md:space-y-3">
              {recentCompletes.length === 0 ? (
                <div className="text-slate-400 text-xs italic ml-6">None recently</div>
              ) : (
                <SearchableSelect 
                  className="w-full bg-white border border-slate-200 shadow-sm rounded-lg md:rounded-2xl px-2 py-1.5 md:px-4 md:py-4 text-[10px] md:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  value={selectedCompleteId || ""}
                  onChange={(e) => {
                    setSelectedCompleteId(e.target.value);
                    setSelectedSessionId("");
                  }}
                >
                  <option value="" disabled>View Recent Completes...</option>
                  {[...recentCompletes]
                    .sort((a, b) => new Date(b.timeOut || b.timeIn || b.createdAt).getTime() - new Date(a.timeOut || a.timeIn || a.createdAt).getTime())
                    .map((rc, idx) => (
                    <option key={rc.id || idx} value={rc.id || idx}>
                      {rc.routingProcess?.inProcess?.workOrderNo} - {rc.routingProcess?.routingProcess?.routingProcess} ({mounted && rc.timeOut ? new Date(rc.timeOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) : "--:--"})
                    </option>
                  ))}
                </SearchableSelect>
              )}
              <Link
                href="/terminal/history"
                className="flex items-center justify-between w-full bg-white border border-slate-200 shadow-sm rounded-lg md:rounded-2xl px-2 py-1.5 md:px-4 md:py-3 text-[10px] md:text-sm font-bold text-cyan-700 hover:border-cyan-300 hover:bg-cyan-50/40 transition-colors"
              >
                View full history
                <ChevronRight size={14} />
              </Link>
            </div>
          </section>

        </div>

        {/* MAIN AREA */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg md:rounded-3xl p-1.5 md:p-8 min-h-[200px] lg:min-h-[600px] flex flex-col relative overflow-hidden">
            
            {/* Background decorative element */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
              <svg width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>

            {selectedComplete ? (
              <div className="relative z-10 flex-1">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4 md:mb-8">
                  <div>
                    <div className="inline-block bg-emerald-50 text-emerald-700 text-[9px] md:text-[10px] font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-widest mb-1.5 md:mb-3">
                      Completed Session
                    </div>
                    <h2 className="text-xl md:text-4xl font-bold tracking-tight mb-1 md:mb-2 text-slate-900">
                      {selectedComplete.routingProcess?.routingProcess?.routingProcess || "Unknown Process"}
                    </h2>
                    <div className="text-slate-400 font-bold tracking-widest text-[10px] md:text-sm uppercase">
                      {selectedComplete.routingProcess?.inProcess?.workOrderNo}
                    </div>
                  </div>
                  <div className="flex gap-2 md:gap-4">
                    {[
                      ["Started", selectedComplete.timeIn ? new Date(selectedComplete.timeIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"],
                      ["Finished", selectedComplete.timeOut ? new Date(selectedComplete.timeOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"],
                      ["Duration", selectedComplete.totalMinutes != null ? fmtDuration(Number(selectedComplete.totalMinutes)) : "--"],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg md:rounded-2xl px-2 py-1 md:px-6 md:py-4 flex flex-col items-center justify-center min-w-[60px] md:min-w-[100px]">
                        <div className="text-[7px] md:text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-0 md:mb-1">{label}</div>
                        <div className="text-slate-900 font-bold tracking-wider text-sm">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-sm">
                  {[
                    ["Customer", selectedComplete.routingProcess?.inProcess?.workOrder?.customer?.customerName],
                    ["Completed qty", Number(selectedComplete.completedQty) || 0],
                    ["Rejected qty", Number(selectedComplete.rejectedQty) || 0],
                    ["QC status", selectedComplete.qcStatus],
                    ["Operator", selectedComplete.employee ? `${selectedComplete.employee.name} (${selectedComplete.employee.code})` : null],
                    ["Machines", selectedComplete.machineCodes],
                    ["Reject reason", selectedComplete.rejectReason],
                    ["QC remark", selectedComplete.qcRemark],
                  ]
                    .filter(([, v]) => v !== null && v !== undefined && v !== "")
                    .map(([k, v]) => (
                      <div key={k as string}>
                        <dt className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{k}</dt>
                        <dd className="text-slate-900 font-medium break-words">{v as any}</dd>
                      </div>
                    ))}
                </dl>

                <div className="mt-6 md:mt-10 flex items-center gap-4">
                  <Link href="/terminal/history" className="text-xs md:text-sm font-bold text-cyan-700 hover:underline">
                    Open full history
                  </Link>
                  <button onClick={() => setSelectedCompleteId("")} className="text-xs md:text-sm font-bold text-slate-500 hover:text-slate-700">
                    Close
                  </button>
                </div>
              </div>
            ) : !selectedSession ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <Monitor size={48} className="mb-4 opacity-20" />
                <p>Select an active session to view details</p>
              </div>
            ) : (
              <>
                {/* Session Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-0 mb-4 md:mb-10 relative z-10">
                  <div>
                    <div className="inline-block bg-cyan-50 text-cyan-600 text-[9px] md:text-[10px] font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-widest mb-1.5 md:mb-3">
                      Active Session
                    </div>
                    <h2 className="text-xl md:text-4xl font-bold tracking-tight mb-1 md:mb-2 text-slate-900">
                      {selectedSession.routingProcess?.routingProcess?.routingProcess || "Unknown Process"}
                    </h2>
                    <div className="text-slate-400 font-bold tracking-widest text-[10px] md:text-sm uppercase">
                      {selectedSession.routingProcess?.inProcess?.workOrderNo}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 md:gap-4 mt-2 md:mt-0">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg md:rounded-2xl px-2 py-1 md:px-6 md:py-4 flex flex-col items-center justify-center min-w-[60px] md:min-w-[100px]">
                      <div className="text-[7px] md:text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-0 md:mb-1">Station</div>
                      <div className="text-cyan-500 font-bold uppercase tracking-wider text-[10px] md:text-sm">DEFAULT</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg md:rounded-2xl px-2 py-1 md:px-6 md:py-4 flex flex-col items-center justify-center min-w-[60px] md:min-w-[100px]">
                      <div className="text-[7px] md:text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-0 md:mb-1">Started</div>
                      <div className="text-slate-900 font-bold tracking-wider text-sm">
                        {selectedSession.timeIn ? new Date(selectedSession.timeIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) : "--:--"}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 flex flex-col items-center justify-center min-w-[100px]">
                      <div className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">Duration</div>
                      <div className={`text-sm font-bold tracking-wider ${selectedSession.isPaused ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {(() => {
                          if (!selectedSession.timeIn) return "--:--";
                          let elapsedMs = now.getTime() - new Date(selectedSession.timeIn).getTime();
                          const idleMs = (Number(selectedSession.totalIdleMinutes) || 0) * 60000;
                          elapsedMs -= idleMs;
                          if (selectedSession.isPaused && selectedSession.lastPauseTime) {
                            elapsedMs -= (now.getTime() - new Date(selectedSession.lastPauseTime).getTime());
                          }
                          const totalMins = Math.max(0, Math.floor(elapsedMs / 60000));
                          const hrs = Math.floor(totalMins / 60);
                          const mins = totalMins % 60;
                          return `${hrs}h ${mins}m`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-4 mb-4 md:mb-8 relative z-10">
                  <button
                    onClick={() => setPendingAction(selectedSession.isPaused ? "resume" : "pause")}
                    disabled={isPending}
                    className={`px-3 md:px-6 py-2 md:py-3 rounded-xl font-bold transition-colors shadow-sm text-xs md:text-sm border flex items-center justify-center gap-1.5 md:gap-2 flex-1 sm:min-w-[150px] ${selectedSession.isPaused ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}
                  >
                    {selectedSession.isPaused ? "▶ Resume Job" : "⏸ Pause Job"}
                  </button>
                  <button
                    onClick={handleCompleteSession}
                    disabled={isPending}
                    className="px-3 md:px-6 py-2 md:py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold transition-colors shadow-sm text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 flex-1 sm:min-w-[150px]"
                  >
                    <CheckCircle2 size={16} className="md:w-[18px] md:h-[18px]" />
                    Complete Job / Scan Out
                  </button>
                  {selectedSession.isPaused && (
                    <div className="flex items-center text-amber-600 text-sm font-medium">
                      Job is currently paused. Resume to track time.
                    </div>
                  )}
                </div>

                {/* Process Information Display */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 relative z-10">
                  <h3 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                    <Info size={14} className="text-cyan-600" /> Process Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 font-medium mb-1">Drawing Number</div>
                      <div className="font-semibold text-slate-900 text-xs md:text-sm">DWG-{selectedSession.routingProcess?.inProcess?.workOrderNo?.split('-').pop() || '0000'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-medium mb-1">Machine No.</div>
                      <div className="font-semibold text-slate-900 text-xs md:text-sm">{selectedSession.machineCodes || 'N/A'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-slate-500 font-medium mb-1">Work Instructions</div>
                      <div className="font-medium text-slate-700 text-xs leading-relaxed">Follow standard operating procedure. Ensure calibration before start.</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-slate-500 font-medium mb-1">Safety Instructions</div>
                      <div className="font-medium text-amber-700 bg-amber-50 rounded text-xs leading-relaxed p-2 border border-amber-100 mt-1">
                        Wear PPE (Safety Glasses, Gloves). Beware of pinch points.
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-slate-500 font-medium mb-1">Quality Requirements</div>
                      <div className="font-medium text-slate-700 text-xs leading-relaxed mt-1">
                        Tolerance ±0.05mm. Verify first piece with QA.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Counters Area */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3 md:gap-6 mb-4 md:mb-8 relative z-10">
                  
                  {/* TOTAL PRODUCED */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl md:rounded-[2rem] p-3 md:p-8 flex flex-col items-center justify-center shadow-inner relative group">
                    <div className="absolute top-2 right-2 md:top-6 md:right-6 transition-opacity">
                      <button
                        onClick={() => {
                          setIsManualProduced(true);
                          setTimeout(() => producedInputRef.current?.focus(), 10);
                        }}
                        className={`p-2 rounded-xl transition-colors ${isManualProduced ? 'bg-cyan-100 text-cyan-600' : 'bg-white text-slate-400 hover:text-cyan-500 shadow-sm border border-slate-200'}`}
                        title="Manual Typing"
                      >
                        <Keyboard size={16} className="md:w-5 md:h-5" />
                      </button>
                    </div>
                    <div className="text-[9px] md:text-[10px] font-bold text-cyan-600 tracking-widest uppercase mb-2 md:mb-8 mt-1 md:mt-0">Total Produced</div>
                    <div className="flex items-center justify-center gap-2 md:gap-8 w-full">
                      <button 
                        onClick={() => setProducedCount(Math.max(0, (Number(producedCount) || 0) - 1))}
                        className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
                      >
                        <Minus size={20} className="md:w-6 md:h-6 text-slate-500" />
                      </button>
                      <input 
                        ref={producedInputRef}
                        readOnly={!isManualProduced}
                        onBlur={() => setIsManualProduced(false)}
                        type="number"
                        min="0"
                        value={producedCount}
                        onChange={(e) => {
                          if (e.target.value === "") {
                            setProducedCount("");
                          } else {
                            const val = parseInt(e.target.value, 10);
                            setProducedCount(isNaN(val) ? "" : Math.min(maxAllowedQty, Math.max(0, val)));
                          }
                        }}
                        className={`text-2xl md:text-[2rem] leading-none font-bold tracking-tighter w-16 md:w-48 text-center outline-none focus:ring-0 p-1 md:p-2 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${isManualProduced ? 'text-cyan-600 bg-white border-2 border-cyan-500 rounded-xl md:rounded-2xl shadow-[0_0_0_4px_rgba(6,182,212,0.15)]' : 'text-slate-900 cursor-default border-2 border-transparent bg-transparent'}`}
                      />
                      <button 
                        onClick={() => setProducedCount(Math.min(maxAllowedQty, (Number(producedCount) || 0) + 1))}
                        disabled={(Number(producedCount) || 0) >= maxAllowedQty}
                        className={`w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-colors shadow-lg text-white shrink-0 ${
                          (Number(producedCount) || 0) >= maxAllowedQty 
                            ? 'bg-cyan-300 cursor-not-allowed shadow-none' 
                            : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/30'
                        }`}
                      >
                        <Plus size={20} className="md:w-6 md:h-6" strokeWidth={3} />
                      </button>
                    </div>
                  </div>

                  {/* QUALITY FAILURES */}
                  <div className="bg-rose-50/50 border border-rose-100 rounded-2xl md:rounded-[2rem] p-3 md:p-8 flex flex-col shadow-inner relative group">
                    <div className="absolute top-2 right-2 md:top-6 md:right-6 transition-opacity">
                      <button
                        onClick={() => {
                          setIsManualDefect(true);
                          setTimeout(() => defectInputRef.current?.focus(), 10);
                        }}
                        className={`p-2 rounded-xl transition-colors ${isManualDefect ? 'bg-rose-100 text-rose-600' : 'bg-white text-rose-400 hover:text-rose-500 shadow-sm border border-rose-200'}`}
                        title="Manual Typing"
                      >
                        <Keyboard size={16} className="md:w-5 md:h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-8 mt-1 md:mt-0">
                      <AlertCircle size={14} className="md:w-4 md:h-4 text-rose-500" />
                      <div className="text-[9px] md:text-[10px] font-bold text-rose-500 tracking-widest uppercase">Quality Failures</div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 md:justify-between md:gap-0 mb-3 md:mb-8">
                      <button 
                        onClick={() => setDefectCount(Math.max(0, (Number(defectCount) || 0) - 1))}
                        className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white border border-rose-200 flex items-center justify-center hover:bg-rose-50 transition-colors shrink-0"
                      >
                        <Minus size={18} className="md:w-5 md:h-5 text-rose-400" />
                      </button>
                      <input
                        ref={defectInputRef}
                        readOnly={!isManualDefect}
                        onBlur={() => setIsManualDefect(false)}
                        type="number"
                        min="0"
                        value={defectCount}
                        onChange={(e) => {
                          if (e.target.value === "") {
                            setDefectCount("");
                          } else {
                            const val = parseInt(e.target.value, 10);
                            setDefectCount(isNaN(val) ? "" : Math.max(0, val));
                          }
                        }}
                        className={`text-2xl md:text-[2rem] font-bold tracking-tighter w-14 md:w-24 text-center outline-none focus:ring-0 p-1 md:p-2 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${isManualDefect ? 'text-rose-500 bg-white border-2 border-rose-400 rounded-xl md:rounded-2xl shadow-[0_0_0_4px_rgba(244,63,94,0.15)]' : 'text-slate-900 cursor-default border-2 border-transparent bg-transparent'}`}
                      />
                      <button 
                        onClick={() => setDefectCount((Number(defectCount) || 0) + 1)}
                        className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-rose-500 flex items-center justify-center hover:bg-rose-400 transition-colors text-white shadow-md shadow-rose-500/20 shrink-0"
                      >
                        <Plus size={18} className="md:w-5 md:h-5" />
                      </button>
                    </div>
                    
                    <div className="relative mt-2 md:mt-auto">
                      <SearchableSelect 
                        value={defectReason}
                        onChange={(e) => setDefectReason(e.target.value)}
                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-[10px] md:text-sm font-medium rounded-lg md:rounded-xl px-2 py-1.5 md:px-4 md:py-3.5 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 shadow-sm cursor-pointer"
                      >
                        <option value="">Reason for defect...</option>
                        <option value="scratch">Surface Scratch</option>
                        <option value="dent">Dent / Damage</option>
                        <option value="dimension">Out of Tolerance</option>
                      </SearchableSelect>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Process Parameters Area */}
                {selectedSession.routingProcess?.routingProcess?.welding && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8 relative z-10 shadow-inner">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                      <Zap size={16} className="text-cyan-500" />
                      Welding Parameters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <SearchableSelect 
                        value={weldingForm.weldingMachineId || ""} 
                        onChange={(e) => setWeldingForm({...weldingForm, weldingMachineId: e.target.value})} 
                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                      >
                        <option value="">Select Machine...</option>
                        {support.weldingMachines.map((m) => <option key={m.id} value={m.id}>{m.machineCode} - {m.model}</option>)}
                      </SearchableSelect>
                      <SearchableSelect 
                        value={weldingForm.weldingTypeIds?.[0] || ""} 
                        onChange={(e) => setWeldingForm({...weldingForm, weldingTypeIds: e.target.value ? [e.target.value] : []})} 
                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                      >
                        <option value="">Type of Welding...</option>
                        {support.weldingTypes.map((t: any) => <option key={t.id} value={t.id}>{t.type}</option>)}
                      </SearchableSelect>
                      <input type="number" placeholder="Voltage (V)" value={weldingForm.voltageVolts || ""} onChange={(e) => setWeldingForm({...weldingForm, voltageVolts: e.target.value ? Number(e.target.value) : undefined})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20" />
                      <input type="number" placeholder="Current (A)" value={weldingForm.currentAmp || ""} onChange={(e) => setWeldingForm({...weldingForm, currentAmp: e.target.value ? Number(e.target.value) : undefined})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20" />
                      <input type="text" placeholder="Electrode Type" value={weldingForm.electrodeType || ""} onChange={(e) => setWeldingForm({...weldingForm, electrodeType: e.target.value})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20" />
                      <input type="text" placeholder="Welding Position" value={weldingForm.weldingPosition || ""} onChange={(e) => setWeldingForm({...weldingForm, weldingPosition: e.target.value})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20" />
                      <input type="text" placeholder="Remarks" value={weldingForm.remark || ""} onChange={(e) => setWeldingForm({...weldingForm, remark: e.target.value})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20" />
                    </div>
                  </div>
                )}

                {selectedSession.routingProcess?.routingProcess?.sprayPainting && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8 relative z-10 shadow-inner">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={16} className="text-emerald-500" />
                      Spray Painting Parameters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <input type="text" placeholder="Type of Paint" value={sprayForm.typeOfPaint || ""} onChange={(e) => setSprayForm({...sprayForm, typeOfPaint: e.target.value})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20" />
                      <input type="number" placeholder="Paint Tank Pressure (Psi)" value={sprayForm.paintTankPressurePsi || ""} onChange={(e) => setSprayForm({...sprayForm, paintTankPressurePsi: e.target.value ? Number(e.target.value) : undefined})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20" />
                      <input type="number" placeholder="Spray Nozzle Size" value={sprayForm.sprayNozzleSize || ""} onChange={(e) => setSprayForm({...sprayForm, sprayNozzleSize: e.target.value ? Number(e.target.value) : undefined})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20" />
                      <input type="text" placeholder="Remarks" value={sprayForm.remark || ""} onChange={(e) => setSprayForm({...sprayForm, remark: e.target.value})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  </div>
                )}

                {selectedSession.routingProcess?.routingProcess?.machining && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8 relative z-10 shadow-inner">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                      <Monitor size={16} className="text-indigo-500" />
                      Machining Parameters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <SearchableSelect 
                        value={machiningForm.machineSerialNoId || ""} 
                        onChange={(e) => setMachiningForm({...machiningForm, machineSerialNoId: e.target.value})} 
                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">Select Machine...</option>
                        {support.machiningMachines.map((m) => <option key={m.id} value={m.id}>{m.machineCode} - {m.model}</option>)}
                      </SearchableSelect>
                      <input type="text" placeholder="CNC Program No" value={machiningForm.cncProgramNo || ""} onChange={(e) => setMachiningForm({...machiningForm, cncProgramNo: e.target.value})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20" />
                      <input type="text" placeholder="Special Tooling" value={machiningForm.specialTooling || ""} onChange={(e) => setMachiningForm({...machiningForm, specialTooling: e.target.value})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20" />
                      <input type="number" placeholder="Part Runtime (Hrs)" value={machiningForm.partRuntimeHr || ""} onChange={(e) => setMachiningForm({...machiningForm, partRuntimeHr: e.target.value ? Number(e.target.value) : undefined})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20" />
                      <input type="number" placeholder="Part Runtime (Mins)" value={machiningForm.partRuntimeMins || ""} onChange={(e) => setMachiningForm({...machiningForm, partRuntimeMins: e.target.value ? Number(e.target.value) : undefined})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20" />
                      <input type="text" placeholder="Remarks" value={machiningForm.remark || ""} onChange={(e) => setMachiningForm({...machiningForm, remark: e.target.value})} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                  </div>
                )}

                {/* Bottom Stats & Action */}
                <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr] gap-6 mt-auto relative z-10">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 min-w-[140px] flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full border-2 border-slate-400 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Target</div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 tracking-tight">
                      {targetQty}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 min-w-[140px] flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                      </svg>
                      <div className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Remaining</div>
                    </div>
                    <div className="text-3xl font-bold text-amber-500 tracking-tight">
                      {remainingQty}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-4">
                      <Info size={14} className="text-cyan-500" />
                      <div className="text-[9px] font-bold text-slate-900 tracking-widest uppercase">Session Notes</div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input 
                        type="text"
                        placeholder="Add log entry..."
                        value={sessionNote}
                        onChange={(e) => setSessionNote(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                      />
                      <button 
                        className="bg-cyan-500 text-white p-3 rounded-xl hover:bg-cyan-400 transition-colors"
                        onClick={() => {
                          if (sessionNote.trim()) {
                            hotToast.error("Log entry noted! (Saving will be implemented soon)");
                            setSessionNote("");
                          }
                        }}
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end relative z-10 border-t border-slate-100 pt-8">
                  <button 
                    onClick={handleCompleteSession}
                    disabled={isPending || ((Number(producedCount) || 0) === 0 && (Number(defectCount) || 0) === 0)}
                    className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-slate-100 border border-slate-200 text-slate-900 text-sm font-bold px-8 py-4 rounded-2xl flex items-center gap-3 transition-colors shadow-sm"
                  >
                    <LogOut size={18} className="text-slate-500" />
                    SCAN OUT JOB
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
      
      {/* Action Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Operator Verification</h3>
            <p className="text-sm text-slate-500 mb-6">Scan or enter your Employee ID to confirm this action.</p>
            
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  autoFocus
                  value={actionConfirmEmployeeId}
                  onChange={(e) => setActionConfirmEmployeeId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      executeAction();
                    }
                  }}
                  className="w-full border-2 border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-center text-lg font-mono font-medium tracking-wider"
                  placeholder="EMP-XXXX"
                />
              </div>
              {actionConfirmError && <p className="text-red-500 text-sm text-center font-medium">{actionConfirmError}</p>}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPendingAction(null);
                    setActionConfirmEmployeeId("");
                    setActionConfirmError("");
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan In Full Page Overlay */}
      <ProductionIntake 
        isOpen={isScanInOpen} 
        onClose={closeScanInModal} 
        support={support} 
        onSuccess={handleScanInSuccess}
        loggedInEmployeeId={loggedInEmployee?.id}
        onScanOutRequest={handleIntakeScanOutRequest}
      />
    </div>
  );
}
