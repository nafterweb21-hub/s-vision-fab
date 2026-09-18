import { SearchableSelect } from "@/components/SearchableSelect";
import { toast as hotToast } from "react-hot-toast";
import { useState, useMemo, useTransition, useEffect } from "react";
import { ArrowLeft, Monitor, Camera, QrCode, Search, Calendar, Clock, Send, Package, ChevronDown, LogOut } from "lucide-react";
import CameraScanner from "./CameraScanner";
import { lookupWorkOrder, scanIn, scanOutQuick } from "../actions";
import { computeGating, type GateRow } from "@/lib/routing-gating";
type Support = {
  employees: { id: string; name: string; code: string; roleProfileId?: string | null }[];
  activeWorkOrders?: { workOrderNo: string }[];
};

type ProductionIntakeProps = {
  isOpen: boolean;
  onClose: () => void;
  support: Support;
  onSuccess: () => void;
  loggedInEmployeeId?: string | null;
  onScanOutRequest?: (routingProcessProfileId: string, employeeId: string, inProcessId: string, mainProcessId: string) => void;
};

export default function ProductionIntake({ isOpen, onClose, support, onSuccess, loggedInEmployeeId, onScanOutRequest }: ProductionIntakeProps) {
  const [woNo, setWoNo] = useState("");
  const [wo, setWo] = useState<any>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [time, setTime] = useState(new Date());
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const [inForm, setInForm] = useState({
    inProcessId: "",
    mainProcessId: "",
    routingProcessProfileId: "",
    employeeId: loggedInEmployeeId || (support.employees[0]?.id ?? ""),
    machineCodes: "",
  });

  const allInProcesses = wo?.inProcesses ?? [];

  // A signed-in operator who is linked to an employee always works as themselves.
  // Accounts with no linked employee (e.g. admin) keep the manual picker.
  const lockedEmployee = useMemo(
    () => (loggedInEmployeeId ? support.employees.find((e) => e.id === loggedInEmployeeId) ?? null : null),
    [support.employees, loggedInEmployeeId],
  );

  const selectedEmployee = useMemo(() => {
    return support.employees.find(e => e.id === inForm.employeeId) || null;
  }, [support.employees, inForm.employeeId]);
  const operatorRoleId = selectedEmployee?.roleProfileId ?? null;

  // Sequence + role gate over the whole work order. Only the current step (and
  // completed steps) that the operator's role may run are "visible".
  const visibleRowIds = useMemo(() => {
    const rows: GateRow[] = [];
    for (const ip of allInProcesses) {
      for (const rp of ip.routingProcesses ?? []) {
        rows.push({
          id: rp.id,
          inProcessSn: ip.sn ?? 0,
          sequence: rp.sequence,
          status: rp.status,
          mainProcessId: rp.mainProcessId,
          allowedRoleIds: (rp.mainProcess?.allowedRoles ?? []).map((x: any) => x.id),
        });
      }
    }
    return new Set(computeGating(rows, operatorRoleId).filter((g) => g.visible).map((g) => g.id));
  }, [allInProcesses, operatorRoleId]);

  function visMainOpts(ip: any): { id: string; label: string }[] {
    const seen = new Map<string, { id: string; label: string }>();
    (ip?.routingProcesses ?? [])
      .filter((rp: any) => visibleRowIds.has(rp.id))
      .forEach((rp: any) => {
        if (rp.mainProcess && !seen.has(rp.mainProcess.id)) {
          seen.set(rp.mainProcess.id, { id: rp.mainProcess.id, label: rp.mainProcess.process });
        }
      });
    return Array.from(seen.values());
  }
  function visRoutingOpts(ip: any, mainId: string): { id: string; label: string }[] {
    const seen = new Map<string, { id: string; label: string }>();
    (ip?.routingProcesses ?? [])
      .filter((rp: any) => rp.mainProcessId === mainId && visibleRowIds.has(rp.id))
      .forEach((rp: any) => {
        if (rp.routingProcess && !seen.has(rp.routingProcess.id)) {
          seen.set(rp.routingProcess.id, { id: rp.routingProcess.id, label: rp.routingProcess.routingProcess });
        }
      });
    return Array.from(seen.values());
  }

  const inProcessOptions = useMemo(
    () =>
      allInProcesses.filter((ip: any) =>
        (ip.routingProcesses ?? []).some((rp: any) => visibleRowIds.has(rp.id)),
      ),
    [allInProcesses, visibleRowIds],
  );
  const selectedInProcess = inProcessOptions.find((ip: any) => ip.id === inForm.inProcessId);

  const mainProcessOptions = useMemo(
    () => visMainOpts(selectedInProcess),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedInProcess, visibleRowIds],
  );
  const routingProcessOptions = useMemo(
    () => visRoutingOpts(selectedInProcess, inForm.mainProcessId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedInProcess, inForm.mainProcessId, visibleRowIds],
  );

  // Keep the cascade valid as gating changes: drop selections that are no longer
  // visible and auto-select when exactly one option remains.
  useEffect(() => {
    if (!wo) return;
    setInForm((prev) => {
      let ip = prev.inProcessId;
      if (ip && !inProcessOptions.some((o: any) => o.id === ip)) ip = "";
      if (!ip && inProcessOptions.length === 1) ip = inProcessOptions[0].id;

      const chosenIp = inProcessOptions.find((o: any) => o.id === ip);
      const mpOpts = visMainOpts(chosenIp);
      let mp = prev.mainProcessId;
      if (mp && !mpOpts.some((o) => o.id === mp)) mp = "";
      if (!mp && mpOpts.length === 1) mp = mpOpts[0].id;

      const rpOpts = visRoutingOpts(chosenIp, mp);
      let rp = prev.routingProcessProfileId;
      if (rp && !rpOpts.some((o) => o.id === rp)) rp = "";
      if (!rp && rpOpts.length === 1) rp = rpOpts[0].id;

      let employeeId = prev.employeeId;
      if (rp) {
        const matchingRp = (chosenIp?.routingProcesses ?? []).find(
          (r: any) => r.routingProcess?.id === rp && r.mainProcessId === mp && visibleRowIds.has(r.id)
        );
        if (matchingRp?.assignedEmployeeId && !lockedEmployee) {
          employeeId = matchingRp.assignedEmployeeId;
        }
      }

      if (ip === prev.inProcessId && mp === prev.mainProcessId && rp === prev.routingProcessProfileId && employeeId === prev.employeeId) {
        return prev;
      }
      return { ...prev, inProcessId: ip, mainProcessId: mp, routingProcessProfileId: rp, employeeId };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wo, inProcessOptions, visibleRowIds]);

  function lookup(searchStr?: string) {
    setError("");
    const target = searchStr || woNo.trim();
    if (!target) return;
    
    startTransition(async () => {
      const res = await lookupWorkOrder(target);
      if (!res.ok) {
        setError(res.error);
        setWo(null);
        return;
      }
      setWo(res.wo);
      // The gating effect auto-selects singletons and drops invalid choices once
      // the work order (and the operator's role) resolve.
      setInForm(prev => ({
        ...prev,
        inProcessId: "",
        mainProcessId: "",
        routingProcessProfileId: "",
      }));
    });
  }

  function doScanIn() {
    setError("");
    if (!inForm.inProcessId || !inForm.mainProcessId || !inForm.routingProcessProfileId || !inForm.employeeId) {
      setError("Please complete all production selections.");
      return;
    }
    startTransition(async () => {
      const res = await scanIn({ workOrderNo: wo.workOrderNo, ...inForm });
      if (!res.success) {
        setError(res.error || "Scan IN failed");
        return;
      }
      // Reset form
      setWo(null);
      setWoNo("");
      setInForm({ inProcessId: "", mainProcessId: "", routingProcessProfileId: "", employeeId: loggedInEmployeeId || (support.employees[0]?.id ?? ""), machineCodes: "" });
      onSuccess();
    });
  }

  function doScanOut() {
    setError("");
    if (!inForm.inProcessId || !inForm.mainProcessId || !inForm.routingProcessProfileId || !inForm.employeeId) {
      setError("Please complete all production selections.");
      return;
    }
    if (onScanOutRequest) {
      onScanOutRequest(inForm.routingProcessProfileId, inForm.employeeId, inForm.inProcessId, inForm.mainProcessId);
    } else {
      setError("Scan out from intake is not configured.");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden h-screen">
      
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 bg-white px-3 py-2 md:px-6 md:py-4 sticky top-0 z-10 shadow-sm gap-2 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 md:gap-6">
            <button 
              onClick={onClose}
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
          
            <div className="flex items-center gap-2 md:gap-3">
              <h1 className="text-base md:text-xl font-black italic tracking-tighter text-slate-900 leading-none">PRODUCTION INTAKE</h1>
              <div className="hidden sm:flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest ml-2 md:ml-4">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500"></div>
                Scan Node #012
              </div>
            </div>
          </div>
          
          <button onClick={onClose} className="md:hidden flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
            <Monitor size={12} />
            DASHBOARD
          </button>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Monitor size={16} />
            LIVE DASHBOARD
          </button>
          
          <div className="flex items-center gap-6 border-l border-slate-200 pl-6">
            <div>
              <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-0.5">System Time</div>
              <div className="text-sm font-mono font-bold text-cyan-600">
                {time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit', hour12: false})}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900">{selectedEmployee ? selectedEmployee.name : "Unknown"}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">{selectedEmployee ? selectedEmployee.code : "N/A"}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-200 uppercase">
                {selectedEmployee ? selectedEmployee.name.charAt(0) : "?"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-2 md:p-8 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 min-h-0 overflow-y-auto items-start">
        
        {/* LEFT PANEL: WORK ORDER CAPTURE */}
        <div className="bg-white border border-slate-200 rounded-xl md:rounded-3xl p-3 md:p-6 shadow-sm flex flex-col min-h-[300px] md:min-h-0 h-full">
          <div className="flex items-center justify-between mb-3 md:mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <QrCode size={20} className="text-emerald-600" />
              </div>
              <h2 className="text-sm font-bold tracking-widest uppercase text-slate-900">Work Order Capture</h2>
            </div>
            <Camera size={24} className="md:w-8 md:h-8 text-slate-200" />
          </div>

          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg md:rounded-2xl flex flex-col items-center justify-center relative min-h-0 overflow-hidden mb-3 md:mb-6 min-h-[150px] md:min-h-[200px]">
            <div className="absolute top-2 right-2 md:top-4 md:right-4 w-6 h-6 md:w-8 md:h-8 rounded-full bg-black/5 flex items-center justify-center text-[10px] md:text-xs font-bold text-slate-400 z-10">
              i
            </div>
            
            {isCameraOpen ? (
              <div className="w-full h-full p-4 flex items-center justify-center">
                <CameraScanner 
                  onScan={(decodedText) => {
                    setIsCameraOpen(false);
                    setWoNo(decodedText);
                    lookup(decodedText);
                  }}
                  onClose={() => setIsCameraOpen(false)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center text-center p-4 md:p-8">
                <div className="w-10 h-10 md:w-16 md:h-16 border-2 border-slate-300 rounded-lg md:rounded-xl mb-3 md:mb-6 relative">
                  <div className="absolute inset-1.5 md:inset-2 border-2 border-slate-400 rounded-md md:rounded-lg border-dashed"></div>
                  <div className="absolute bottom-[-6px] right-[-6px] md:bottom-[-10px] md:right-[-10px] bg-slate-50 p-0.5 md:p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 w-4 h-4 md:w-6 md:h-6">
                      <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"></path>
                      <path d="M2 20h20"></path>
                      <path d="M14 12v.01"></path>
                    </svg>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCameraOpen(true)}
                  className="font-bold text-sm md:text-base text-slate-900 mb-1"
                >
                  Request Camera Permissions
                </button>
                
                <label className="cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        try {
                          const { Html5Qrcode } = await import("html5-qrcode");
                          const scanner = new Html5Qrcode("hidden-qr-reader");
                          const decodedText = await scanner.scanFile(file, false);
                          setWoNo(decodedText);
                          lookup(decodedText);
                        } catch (err) {
                          console.error("Error decoding file:", err);
                          hotToast.error("Could not find a valid QR/Barcode in this image.");
                        }
                        // Reset input so the same file can be selected again
                        e.target.value = "";
                      }
                    }}
                  />
                  <span className="text-[10px] md:text-sm font-medium text-slate-500 underline decoration-slate-300 hover:text-slate-700">
                    Scan an Image File
                  </span>
                </label>
              </div>
            )}
            
            {/* Hidden div required by html5-qrcode for file scanning */}
            <div id="hidden-qr-reader" className="hidden"></div>
          </div>

          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-3">Manual ID Entry</div>
            <div className="relative">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
              <input 
                value={woNo}
                onChange={(e) => setWoNo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookup()}
                type="text" 
                placeholder="WO Number..." 
                className="w-full bg-white border-2 border-slate-200 rounded-lg md:rounded-xl py-2 md:py-4 pl-8 md:pl-12 pr-16 md:pr-24 text-xs md:text-base font-bold text-slate-900 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 shadow-sm"
              />
              <button 
                onClick={() => lookup()}
                disabled={isPending || !woNo.trim()}
                className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 md:px-4 py-1 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-sm font-bold transition-colors disabled:opacity-50"
              >
                Search
              </button>
            </div>
            {error && <div className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-lg">{error}</div>}
            <p className="text-center text-[10px] md:text-sm text-slate-500 font-medium mt-2 md:mt-3">
              Enter or scan a Work Order to begin...
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: PRODUCTION SELECTION */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
              <Package size={20} className="text-cyan-600" />
            </div>
            <h2 className="text-sm font-bold tracking-widest uppercase text-slate-900">Production Selection</h2>
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-4 mb-3 md:mb-6">
            <div className="border border-slate-200 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 md:gap-2 text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">
                <Calendar size={12} className="md:w-4 md:h-4" /> Date
              </div>
              <div className="text-xs md:text-sm font-bold text-slate-900">
                {time.toLocaleDateString('en-GB')}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 md:gap-2 text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">
                <Clock size={12} className="md:w-4 md:h-4" /> Capture
              </div>
              <div className="text-xs md:text-sm font-bold text-slate-900 font-mono">
                {time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
              </div>
            </div>
          </div>

          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-3">Work Order Selection</div>
          
          <div className="mb-6">
            {wo ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{wo.workOrderNo}</div>
                    <div className="text-xs text-slate-500">{wo.customer?.customerName || "No Customer"}</div>
                    {wo.quantity != null && (
                      <div className="text-xs font-bold text-cyan-700 mt-1">
                        TOTAL QTY: {wo.quantity} {wo.uom || ''}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => { setWo(null); setWoNo(""); }}
                    className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
                <div className="relative">
                  <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
                  <input 
                    value={woNo}
                    onChange={(e) => setWoNo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        lookup();
                      }
                    }}
                    type="text" 
                    placeholder="Enter or scan WO..." 
                    className="w-full pl-8 md:pl-12 pr-16 md:pr-24 py-2.5 md:py-4 bg-white border-2 border-slate-200 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all shadow-sm"
                  />
                  <button 
                    onClick={() => lookup()}
                    className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-sm font-bold transition-colors"
                  >
                    Search
                  </button>
                </div>
            )}
          </div>

          {wo && inProcessOptions.length === 0 && (
            <div className="mb-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-4 rounded-xl font-medium">
              No process is available to start right now. Earlier routing processes must be completed first, or your role is not permitted for the current step.
            </div>
          )}

          {wo && (
            <div className="space-y-4 md:space-y-8 relative mb-6">
              
              {/* Step 1 */}
              <div className="relative">
                <div className="absolute left-[-16px] md:left-[-24px] top-1.5 md:top-2 w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-cyan-500 ring-4 ring-cyan-500/20"></div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 md:mb-3">
                  1. Select Next Operation
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Select
                      label="In-Process"
                      value={inForm.inProcessId}
                      onChange={(v) =>
                        setInForm({ inProcessId: v, mainProcessId: "", routingProcessProfileId: "", employeeId: inForm.employeeId, machineCodes: inForm.machineCodes })
                      }
                      options={inProcessOptions.map((ip: any) => ({ id: ip.id, label: `${ip.sn}. ${ip.description}` }))}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Select
                      label="Main Process"
                      value={inForm.mainProcessId}
                      onChange={(v) => setInForm({ ...inForm, mainProcessId: v, routingProcessProfileId: "" })}
                      options={mainProcessOptions}
                      disabled={!inForm.inProcessId}
                    />
                  </div>
                  <div className="col-span-2">
                    <Select
                      label="Routing Process"
                      value={inForm.routingProcessProfileId}
                      onChange={(v) => setInForm({ ...inForm, routingProcessProfileId: v })}
                      options={routingProcessOptions}
                      disabled={!inForm.mainProcessId}
                      dropdownPosition="top"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="absolute left-[-16px] md:left-[-24px] top-1.5 md:top-2 w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20"></div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 md:mb-3">
                  2. Operator Login
                </label>
                {lockedEmployee ? (
                  <div
                    aria-readonly="true"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-100 text-slate-900 flex items-center justify-between gap-3"
                  >
                    <span>{lockedEmployee.name} ({lockedEmployee.code})</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Logged in</span>
                  </div>
                ) : (
                  <Select
                    label="Employee"
                    value={inForm.employeeId}
                    onChange={(v) => setInForm({ ...inForm, employeeId: v })}
                    dropdownPosition="top"
                    options={support.employees.map((e) => ({
                      id: e.id,
                      label: `${e.name} (${e.code})`,
                    }))}
                  />
                )}
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="absolute left-[-16px] md:left-[-24px] top-1.5 md:top-2 w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-amber-500 ring-4 ring-amber-500/20"></div>
                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 md:mb-3">
                  3. Machine Assignment <span className="text-slate-400 font-normal normal-case ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={inForm.machineCodes}
                  onChange={(e) => setInForm({ ...inForm, machineCodes: e.target.value })}
                  placeholder="Enter Machine Number (Optional)"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          )}

          <div className="mt-auto flex flex-col sm:flex-row gap-2 md:gap-4">
            <button 
              onClick={doScanIn}
              disabled={isPending || !wo || !inForm.employeeId || !inForm.routingProcessProfileId}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Send size={18} />
              {isPending ? "Starting..." : "SCAN IN"}
            </button>
        </div>
        </div>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
  dropdownPosition = "bottom",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  disabled?: boolean;
  dropdownPosition?: "bottom" | "top";
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 tracking-wider uppercase">{label}</label>
      <SearchableSelect
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        dropdownPosition={dropdownPosition}
        className="mt-1.5 w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 text-slate-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none disabled:opacity-50 shadow-sm transition-all"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </SearchableSelect>
    </div>
  );
}
