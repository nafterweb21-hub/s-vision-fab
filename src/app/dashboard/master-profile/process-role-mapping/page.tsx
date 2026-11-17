"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { SearchableSelect } from "@/components/SearchableSelect";
import { getProcessProfilesAction, updateProcessProfileAction } from "./actions";
import { getMainProcessesAction } from "../main-process/actions";

type Role = { id: string; name: string };
type ProcessProfile = {
  id: string;
  mainProcessId: string;
  routingProcess: string;
  welding: boolean;
  sprayPainting: boolean;
  machining: boolean;
  allowedRoles: Role[];
};

type MainProcess = {
  id: string;
  process: string;
};

export default function ProcessRoleMappingPage() {
  const [isPending, startTransition] = useTransition();
  const [processes, setProcesses] = useState<ProcessProfile[]>([]);
  const [mainProcesses, setMainProcesses] = useState<MainProcess[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedMainProcessId, setSelectedMainProcessId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  async function loadProcesses() {
    const [resSub, resMain] = await Promise.all([
      getProcessProfilesAction(),
      getMainProcessesAction(),
    ]);
    if (resSub.success && resSub.data) {
      console.log("Sub Processes loaded:", resSub.data);
      setProcesses(resSub.data as any);
    } else {
      console.error("Failed to load sub processes:", resSub.error);
      showToast("error", "Failed to load Sub Processes: " + resSub.error);
    }
    if (resMain.success && resMain.data) setMainProcesses(resMain.data as any);
    else console.error("Failed to load main processes:", resMain.error);
  }

  useEffect(() => {
    loadProcesses();
    (async () => {
      try {
        const { getActiveRoleProfiles } = await import("@/lib/roles.actions");
        setRoles(await getActiveRoleProfiles());
      } catch (error) {
        console.error("Failed to load roles", error);
      }
    })();
  }, []);

  const filteredProcesses = useMemo(
    () => processes.filter((p) => p.mainProcessId === selectedMainProcessId),
    [processes, selectedMainProcessId],
  );

  const selected = useMemo(
    () => processes.find((p) => p.id === selectedId) || null,
    [processes, selectedId],
  );

  function handleSelectMainProcess(id: string) {
    setSelectedMainProcessId(id);
    setSelectedId("");
    setAllowedRoleIds([]);
  }

  // When a process is picked, prefill its current role set.
  function handleSelect(id: string) {
    setSelectedId(id);
    const proc = processes.find((p) => p.id === id);
    setAllowedRoleIds((proc?.allowedRoles ?? []).map((r) => r.id));
  }

  const toggleRole = (rid: string) =>
    setAllowedRoleIds((prev) =>
      prev.includes(rid) ? prev.filter((r) => r !== rid) : [...prev, rid],
    );

  function handleSave() {
    if (!selected) return;
    startTransition(async () => {
      const res = await updateProcessProfileAction(selected.id, {
        allowedRoleIds,
      });
      if (res.success) {
        showToast("success", `Roles updated for "${selected.routingProcess}".`);
        await loadProcesses();
      } else {
        showToast("error", res.error || "Failed to update roles.");
      }
    });
  }

  const dirty = useMemo(() => {
    if (!selected) return false;
    const current = new Set((selected.allowedRoles ?? []).map((r) => r.id));
    if (current.size !== allowedRoleIds.length) return true;
    return allowedRoleIds.some((id) => !current.has(id));
  }, [selected, allowedRoleIds]);

  return (
    <div className="flex-1 py-3 w-full space-y-4">
      {notification && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border text-sm font-semibold ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/master-profile/main-process"
          className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900">Process Role Mapping</h1>
          <p className="text-sm text-blue-500">
            Select a main process, then a sub process (routing process) to choose which roles may run it in the production terminal.
          </p>
        </div>
      </div>
      <div className="bg-slate-100 p-4 text-xs font-mono overflow-auto max-h-48 rounded hidden">
        <div>selectedMainProcessId: {selectedMainProcessId}</div>
        <div>processes count: {processes.length}</div>
        <div>filtered count: {filteredProcesses.length}</div>
        <div>processes: {JSON.stringify(processes, null, 2)}</div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 space-y-6">
        <div className="space-y-1 max-w-md">
          <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
            Main Process <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            value={selectedMainProcessId}
            onChange={(e) => handleSelectMainProcess(e.target.value)}
            className="w-full rounded-lg border border-blue-200 px-4 py-2.5 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-cyan-500 transition-all bg-white"
          >
            <option value="">-- Select a Main Process --</option>
            {mainProcesses.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.process}
              </option>
            ))}
          </SearchableSelect>
        </div>

        {selectedMainProcessId && (
          <div className="space-y-1 max-w-md pt-2 border-t border-blue-100">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Sub Process <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              value={selectedId}
              onChange={(e) => handleSelect(e.target.value)}
              className="w-full rounded-lg border border-blue-200 px-4 py-2.5 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-cyan-500 transition-all bg-white"
            >
              <option value="">-- Select a Sub Process --</option>
              {filteredProcesses.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.routingProcess}
                  {p.allowedRoles.length ? ` (${p.allowedRoles.length} role${p.allowedRoles.length > 1 ? "s" : ""})` : ""}
                </option>
              ))}
            </SearchableSelect>
          </div>
        )}

        {selected ? (
          <div className="space-y-4 pt-4 border-t border-blue-100">
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Process Types
              </label>
              <div className="flex gap-2">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${selected.welding ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Welding: {selected.welding ? "Yes" : "No"}</span>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${selected.sprayPainting ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Spray Painting: {selected.sprayPainting ? "Yes" : "No"}</span>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${selected.machining ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Machining: {selected.machining ? "Yes" : "No"}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-blue-50">
              <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Allowed Roles
              </label>
              <p className="text-[10px] text-blue-400">
                Only operators with a selected role may run this process. Leave all unchecked to allow everyone.
              </p>
              {roles.length === 0 ? (
                <p className="text-xs text-blue-400">No active roles found.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {roles.map((r) => {
                    const checked = allowedRoleIds.includes(r.id);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => toggleRole(r.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          checked
                            ? "bg-cyan-600 text-white border-cyan-600"
                            : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending || !dirty}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Saving..." : "Save Roles"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-blue-400 border-t border-blue-100 pt-6">
            Select a sub process above to assign its roles.
          </p>
        )}
      </div>
    </div>
  );
}

