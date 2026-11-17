"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { LogOut, QrCode, X, ArrowLeft, UserRound } from "lucide-react";
import { toast as hotToast } from "react-hot-toast";
import CameraScanner from "./CameraScanner";
import { scanOut } from "../actions";

type Employee = { id: string; name: string; code: string };

/**
 * Scan Out in one dialog:
 *   1. Employee ID (typed or scanned; pre-filled and fixed for a signed-in operator)
 *   2. pick that employee's running job (auto when there is only one)
 *   3. enter quantity → Scan Out
 * Stages that also record parameters (welding / painting / machining) hand the quantity over to the
 * terminal's full Complete Job panel so those details are still captured.
 */
export default function ScanOutDialog({
  isOpen,
  onClose,
  sessions,
  employees,
  lockedEmployee,
  onCompleted,
  onNeedParameters,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** All running sessions on the terminal. */
  sessions: any[];
  employees: Employee[];
  /** Signed-in operator linked to an employee: they can only scan out as themselves. */
  lockedEmployee: Employee | null;
  onCompleted: (session: any) => void;
  onNeedParameters: (session: any, good: number, rejected: number, reason: string) => void;
}) {
  const [empInput, setEmpInput] = useState("");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [session, setSession] = useState<any>(null);
  const [good, setGood] = useState<string>("");
  const [rejected, setRejected] = useState<string>("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const empRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const mySessions = useMemo(
    () => (employee ? sessions.filter((s) => s.employeeId === employee.id) : []),
    [employee, sessions],
  );

  function reset() {
    setEmpInput(lockedEmployee?.code ?? "");
    setEmployee(lockedEmployee);
    setSession(null);
    setGood("");
    setRejected("");
    setReason("");
    setError("");
    setIsCameraOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    reset();
    const t = setTimeout(() => empRef.current?.focus(), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // One running job → go straight to quantity.
  useEffect(() => {
    if (employee && !session && mySessions.length === 1) setSession(mySessions[0]);
  }, [employee, session, mySessions]);

  useEffect(() => {
    if (session) setTimeout(() => qtyRef.current?.focus(), 50);
  }, [session]);

  function findEmployee(raw: string) {
    setError("");
    const v = raw.trim().toUpperCase();
    if (!v) return;
    const e = employees.find((x) => (x.code ?? "").trim().toUpperCase() === v);
    if (!e) {
      setError(`No employee found with ID "${raw.trim()}".`);
      return;
    }
    setEmployee(e);
    setSession(null);
  }

  const wo = session?.routingProcess?.inProcess?.workOrder;
  const target = wo?.quantity != null ? Number(wo.quantity) : null;
  const doneBefore = (session?.routingProcess?.productionTimesheets ?? []).reduce(
    (a: number, t: any) => a + (Number(t.completedQty) || 0),
    0,
  );
  const remaining = target != null ? Math.max(target - doneBefore, 0) : null;
  const flags = session?.routingProcess?.routingProcess;
  const paramStage = flags?.welding ? "welding" : flags?.sprayPainting ? "painting" : flags?.machining ? "machining" : null;

  function submit() {
    setError("");
    const g = Number(good) || 0;
    const r = Number(rejected) || 0;
    if (g < 0 || r < 0) return setError("Quantity cannot be negative.");
    if (g <= 0 && r <= 0) return setError("Enter the quantity produced (or rejected).");
    if (remaining != null && g > remaining) return setError(`Only ${remaining} piece(s) left on this stage.`);
    if (r > 0 && !reason.trim()) return setError("Enter the reject reason.");

    if (paramStage) {
      onNeedParameters(session, g, r, reason.trim());
      return;
    }
    startTransition(async () => {
      const res = await scanOut({
        timesheetId: session.id,
        completedQty: g,
        rejectedQty: r > 0 ? r : undefined,
        rejectReason: r > 0 ? reason.trim() : undefined,
      });
      if (!res.success) {
        setError(res.error || "Scan out failed");
        return;
      }
      hotToast.success(`Scanned out: ${g} piece(s)`);
      onCompleted(session);
    });
  }

  if (!isOpen) return null;

  const step = !employee ? 1 : !session ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="px-3 py-2 md:px-6 md:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            {step > 1 && !(step === 2 && lockedEmployee) && !(step === 3 && mySessions.length === 1 && lockedEmployee) ? (
              <button
                onClick={() => {
                  setError("");
                  if (step === 3 && mySessions.length > 1) setSession(null);
                  else {
                    setSession(null);
                    setEmployee(null);
                  }
                }}
                className="p-1 hover:bg-slate-200 rounded-md text-slate-500"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <LogOut size={16} className="text-rose-600 md:w-5 md:h-5" />
            )}
            <h3 className="text-xs md:text-base font-bold tracking-widest uppercase text-slate-900">Scan Out</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-md text-slate-500" aria-label="Close">
            <X size={16} className="md:w-5 md:h-5" />
          </button>
        </div>

        <div className="p-3 md:p-6 overflow-y-auto space-y-3 md:space-y-4">
          {/* Who */}
          {step === 1 ? (
            <>
              <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Employee ID</label>
              {isCameraOpen ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg md:rounded-2xl p-3 min-h-[200px] flex items-center justify-center">
                  <CameraScanner
                    onScan={(text) => {
                      setIsCameraOpen(false);
                      setEmpInput(text);
                      findEmployee(text);
                    }}
                    onClose={() => setIsCameraOpen(false)}
                  />
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    findEmployee(empInput);
                  }}
                  className="flex gap-2"
                >
                  <input
                    ref={empRef}
                    value={empInput}
                    onChange={(e) => setEmpInput(e.target.value)}
                    placeholder="Type or scan Employee ID"
                    className="flex-1 min-w-0 px-3 py-2 md:py-3 border border-slate-200 rounded-lg text-sm md:text-base font-semibold uppercase focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="px-3 border border-slate-200 rounded-lg text-slate-600 hover:border-rose-400 hover:text-rose-600"
                    aria-label="Scan ID card"
                  >
                    <QrCode size={18} />
                  </button>
                  <button type="submit" className="px-3 md:px-4 bg-slate-900 text-white rounded-lg text-xs md:text-sm font-bold">
                    Next
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 p-2 md:p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <UserRound size={18} className="text-slate-500" />
              <div className="min-w-0">
                <div className="text-xs md:text-sm font-bold text-slate-900 truncate">{employee!.name}</div>
                <div className="text-[10px] md:text-xs text-slate-500">ID: {employee!.code}</div>
              </div>
            </div>
          )}

          {/* Which job */}
          {step === 2 &&
            (mySessions.length === 0 ? (
              <div className="text-xs md:text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                {employee!.name} has no running job to scan out.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">Choose the job</div>
                {mySessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSession(s)}
                    className="w-full text-left p-2 md:p-3 border border-slate-200 rounded-lg hover:border-rose-400 hover:bg-rose-50"
                  >
                    <div className="text-xs md:text-sm font-bold text-slate-900">
                      {s.routingProcess?.inProcess?.workOrderNo} · {s.routingProcess?.mainProcess?.process}
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500">
                      {s.routingProcess?.routingProcess?.routingProcess} · {s.routingProcess?.inProcess?.description}
                    </div>
                  </button>
                ))}
              </div>
            ))}

          {/* How many */}
          {step === 3 && (
            <>
              <div className="p-2 md:p-3 border border-slate-200 rounded-lg">
                <div className="text-xs md:text-sm font-bold text-slate-900">
                  {session.routingProcess?.inProcess?.workOrderNo} · {session.routingProcess?.routingProcess?.routingProcess}
                </div>
                {target != null && (
                  <div className="text-[10px] md:text-xs text-slate-500 mt-0.5">
                    WO qty {target} · done {doneBefore} · <span className="font-bold text-slate-700">remaining {remaining}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Good Qty</label>
                  <input
                    ref={qtyRef}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={good}
                    onChange={(e) => setGood(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    className="w-full px-3 py-2 md:py-3 border border-slate-200 rounded-lg text-lg md:text-2xl font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400"
                  />
                  {remaining != null && remaining > 0 && (
                    <button type="button" onClick={() => setGood(String(remaining))} className="mt-1 text-[10px] md:text-xs font-bold text-emerald-700 hover:underline">
                      All remaining ({remaining})
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Rejected Qty</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={rejected}
                    onChange={(e) => setRejected(e.target.value)}
                    className="w-full px-3 py-2 md:py-3 border border-slate-200 rounded-lg text-lg md:text-2xl font-bold text-rose-700 focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                  />
                </div>
              </div>
              {Number(rejected) > 0 && (
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reject reason"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                />
              )}
              {paramStage && (
                <div className="text-[10px] md:text-xs text-blue-700 bg-blue-50 border border-blue-200 p-2 rounded-lg">
                  This is a {paramStage} stage: after you press Next, fill in the {paramStage} details and press Complete.
                </div>
              )}
            </>
          )}

          {error && <div className="text-xs md:text-sm text-rose-700 bg-rose-50 border border-rose-200 p-2 md:p-3 rounded-lg">{error}</div>}
        </div>

        {step === 3 && (
          <div className="px-3 py-2 md:px-6 md:py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button
              onClick={submit}
              disabled={isPending}
              className="w-full md:w-auto px-4 md:px-6 py-2 md:py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg md:rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogOut size={16} />
              {isPending ? "Scanning out..." : paramStage ? `Next: ${paramStage} details` : "Scan Out"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
