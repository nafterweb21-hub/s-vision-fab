/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, X, ArrowLeft, UserRound, Camera } from "lucide-react";
import CameraScanner from "./CameraScanner";

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
 * Scan Out lookup:
 *   1. Work order no. (scan the WO QR with the camera, or type it)
 *   2. pick the active session on that work order (skipped when there is only one)
 * The chosen session then opens in the terminal's Active Session panel, where the operator enters
 * the quantity (and any welding / painting / machining details) and presses Scan Out Job.
 */
export default function ScanOutDialog({
  onClose,
  sessions,
  lockedEmployee,
  onSessionPicked,
}: {
  onClose: () => void;
  /** All running sessions on the terminal. */
  sessions: any[];
  /** Signed-in operator linked to an employee: they can only scan out as themselves. */
  lockedEmployee: Employee | null;
  onSessionPicked: (session: any) => void;
}) {
  const [woInput, setWoInput] = useState("");
  const [woNo, setWoNo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [camera, setCamera] = useState(false);
  const woRef = useRef<HTMLInputElement>(null);

  // Signed-in operators only ever see their own sessions.
  const visibleSessions = useMemo(
    () => (lockedEmployee ? sessions.filter((s) => s.employeeId === lockedEmployee.id) : sessions),
    [sessions, lockedEmployee],
  );
  const woSessions = useMemo(
    () => (woNo ? visibleSessions.filter((s) => sessionMatchesWo(s, woNo)) : []),
    [woNo, visibleSessions],
  );

  // The parent mounts this dialog only while it is open, so its state starts fresh every time.
  useEffect(() => {
    const t = setTimeout(() => woRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  function findWorkOrder(raw: string) {
    setError("");
    const v = norm(raw);
    if (!v) return;
    const matches = visibleSessions.filter((s) => sessionMatchesWo(s, v));
    if (matches.length === 0) {
      setError(`No active session found for work order "${raw.trim()}".`);
      return;
    }
    // One active session on the work order -> open it straight away.
    if (matches.length === 1) {
      onSessionPicked(matches[0]);
      return;
    }
    setWoNo(v);
  }

  const step = !woNo ? 1 : 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="px-3 py-2 md:px-6 md:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            {step > 1 ? (
              <button
                onClick={() => {
                  setError("");
                  setWoNo(null);
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
          {/* Which work order */}
          {step === 1 && (
            <>
              <label className="block text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">
                Work Order No.
              </label>
              {camera ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg md:rounded-2xl p-3 min-h-[200px] flex items-center justify-center">
                  <CameraScanner
                    onScan={(text) => {
                      setCamera(false);
                      setWoInput(text);
                      findWorkOrder(text);
                    }}
                    onClose={() => setCamera(false)}
                  />
                </div>
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
                      setCamera(true);
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
                    onClick={() => onSessionPicked(s)}
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

          {error && <div className="text-xs md:text-sm text-rose-700 bg-rose-50 border border-rose-200 p-2 md:p-3 rounded-lg">{error}</div>}
        </div>
      </div>
    </div>
  );
}
