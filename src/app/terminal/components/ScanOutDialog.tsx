"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { LogOut, QrCode, X, ArrowLeft, UserRound, Camera } from "lucide-react";
import { toast as hotToast } from "react-hot-toast";
import CameraScanner from "./CameraScanner";
import { scanOut } from "../actions";

type Employee = { id: string; name: string; code: string };

const norm = (v: unknown) => String(v ?? "").trim().toUpperCase();

/** A scanned/typed work order number matches a session by its WO no. or its in-process (WO-...-001) no. */
function sessionMatchesWo(s: any, wo: string) {
  const ip = s.routingProcess?.inProcess;
  const woNo = norm(ip?.workOrder?.workOrderNo);
  const ipNo = norm(ip?.workOrderNo);
  return woNo === wo || ipNo === wo || (!!ipNo && ipNo.startsWith(wo + "-"));
}

/**
 * Scan Out in one dialog:
 *   1. Work order no. (scan the WO QR with the camera, or type it)
 *   2. pick the active session on that work order (auto when there is only one)
 *   3. enter quantity + confirm with Employee ID (scan or type; fixed for a signed-in operator) -> Scan Out
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
  const [woInput, setWoInput] = useState("");
  const [woNo, setWoNo] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [empInput, setEmpInput] = useState("");
  const [good, setGood] = useState<string>("");
  const [rejected, setRejected] = useState<string>("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [camera, setCamera] = useState<"wo" | "emp" | null>(null);
  const [isPending, startTransition] = useTransition();
  const woRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  // Signed-in operators only ever see their own sessions.
  const visibleSessions = useMemo(
    () => (lockedEmployee ? sessions.filter((s) => s.employeeId === lockedEmployee.id) : sessions),
    [sessions, lockedEmployee],
  );
  const woSessions = useMemo(
    () => (woNo ? visibleSessions.filter((s) => sessionMatchesWo(s, woNo)) : []),
    [woNo, visibleSessions],
  );

  function reset() {
    setWoInput("");
    setWoNo(null);
    setSession(null);
    setEmpInput(lockedEmployee?.code ?? "");
    setGood("");
    setRejected("");
    setReason("");
    setError("");
    setCamera(null);
  }

  useEffect(() => {
    if (!isOpen) return;
    reset();
    const t = setTimeout(() => woRef.current?.focus(), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (session) setTimeout(() => qtyRef.current?.focus(), 50);
  }, [session]);

  function findWorkOrder(raw: string) {
    setError("");
    const v = norm(raw);
    if (!v) return;
    const matches = visibleSessions.filter((s) => sessionMatchesWo(s, v));
    if (matches.length === 0) {
      setError(`No active session found for work order "${raw.trim()}".`);
      return;
    }
    setWoNo(v);
    // One active session on the work order -> go straight to the details.
    setSession(matches.length === 1 ? matches[0] : null);
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

    // Confirm the operator: the Employee ID must belong to whoever started this session.
    const code = norm(empInput);
    if (!code) return setError("Enter or scan your Employee ID.");
    const sessionCode =
      norm(session.employee?.code) || norm(employees.find((e) => e.id === session.employeeId)?.code);
    if (code !== sessionCode) {
      const known = employees.some((e) => norm(e.code) === code);
      return setError(
        known
          ? `Employee ID "${empInput.trim()}" did not start this session. Only ${session.employee?.name ?? "its operator"} can scan it out.`
          : `No employee found with ID "${empInput.trim()}".`,
      );
    }

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

  const step = !woNo ? 1 : !session ? 2 : 3;

  function goBack() {
    setError("");
    setCamera(null);
    if (step === 3 && woSessions.length > 1) setSession(null);
    else {
      setSession(null);
      setWoNo(null);
    }
  }

  const cameraPanel = (onScan: (text: string) => void) => (
    <div className="bg-slate-50 border border-slate-200 rounded-lg md:rounded-2xl p-3 min-h-[200px] flex items-center justify-center">
      <CameraScanner
        onScan={(text) => {
          setCamera(null);
          onScan(text);
        }}
        onClose={() => setCamera(null)}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="px-3 py-2 md:px-6 md:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            {step > 1 ? (
              <button onClick={goBack} className="p-1 hover:bg-slate-200 rounded-md text-slate-500" aria-label="Back">
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
          {/* Which work order */}
          {step === 1 && (
            <>
              <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">
                Work Order No.
              </label>
              {camera === "wo" ? (
                cameraPanel((text) => {
                  setWoInput(text);
                  findWorkOrder(text);
                })
              ) : (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      findWorkOrder(woInput);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      ref={woRef}
                      value={woInput}
                      onChange={(e) => setWoInput(e.target.value)}
                      placeholder="Type or scan Work Order No."
                      className="flex-1 min-w-0 px-3 py-2 md:py-3 border border-slate-200 rounded-lg text-sm md:text-base font-semibold uppercase focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                    />
                    <button type="submit" className="px-3 md:px-4 bg-slate-900 text-white rounded-lg text-xs md:text-sm font-bold">
                      Next
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setCamera("wo");
                    }}
                    className="w-full py-3 md:py-4 border-2 border-dashed border-rose-200 rounded-lg md:rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs md:text-sm flex items-center justify-center gap-2"
                  >
                    <Camera size={18} />
                    Scan Work Order QR
                  </button>
                </>
              )}
            </>
          )}

          {/* Which active session */}
          {step === 2 && (
            <div className="space-y-2">
              <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">
                Active sessions on {woNo}
              </div>
              {woSessions.length === 0 ? (
                <div className="text-xs md:text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  No active session on this work order.
                </div>
              ) : (
                woSessions.map((s) => (
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
                    <div className="text-[10px] md:text-xs text-slate-700 mt-0.5 flex items-center gap-1">
                      <UserRound size={12} /> {s.employee?.name} ({s.employee?.code})
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Details + confirm */}
          {step === 3 && (
            <>
              <div className="p-2 md:p-3 border border-slate-200 rounded-lg">
                <div className="text-xs md:text-sm font-bold text-slate-900">
                  {session.routingProcess?.inProcess?.workOrderNo} · {session.routingProcess?.routingProcess?.routingProcess}
                </div>
                <div className="text-[10px] md:text-xs text-slate-500 mt-0.5">
                  {session.routingProcess?.mainProcess?.process} · started by{" "}
                  <span className="font-semibold text-slate-700">{session.employee?.name}</span>
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

              <div>
                <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
                  Employee ID (to confirm)
                </label>
                {camera === "emp" ? (
                  cameraPanel((text) => setEmpInput(text.trim()))
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={empInput}
                      onChange={(e) => setEmpInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                      readOnly={!!lockedEmployee}
                      placeholder="Type or scan Employee ID"
                      className="flex-1 min-w-0 px-3 py-2 md:py-3 border border-slate-200 rounded-lg text-sm md:text-base font-semibold uppercase focus:ring-2 focus:ring-rose-100 focus:border-rose-400 read-only:bg-slate-50 read-only:text-slate-600"
                    />
                    {!lockedEmployee && (
                      <button
                        type="button"
                        onClick={() => setCamera("emp")}
                        className="px-3 border border-slate-200 rounded-lg text-slate-600 hover:border-rose-400 hover:text-rose-600"
                        aria-label="Scan ID card"
                      >
                        <QrCode size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>

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
              disabled={isPending || camera !== null}
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
