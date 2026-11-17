"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
getProcessProfilesAction,
  toggleProcessProfileStatus,
  deleteProcessProfileAction,
} from "./actions";

interface ProcessProfile {
  id: string;
  mainProcessId: string;
  mainProcess?: { process: string };
  routingProcess: string;
  welding: boolean;
  sprayPainting: boolean;
  machining: boolean;
  costPerMinute: number | any;
  remark: string | null;
  status: string;
}

export default function ProcessProfilePage() {
  const [items, setItems] = useState<ProcessProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [profileToDelete, setProfileToDelete] = useState<ProcessProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const res = await getProcessProfilesAction();

    if (res.success && res.data) {
      setItems(res.data as ProcessProfile[]);
    } else {
      setErrorMsg(res.error || "Failed to load process profiles.");
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (id: string) => {
    startTransition(async () => {
      const res = await toggleProcessProfileStatus(id);
      if (res.success) {
        loadData();
      } else {
        hotToast.error(res.error || "Failed to change status.");
      }
    });
  };

  const confirmDelete = async () => {
    if (!profileToDelete) return;
    setIsDeleting(true);
    startTransition(async () => {
      const res = await deleteProcessProfileAction(profileToDelete.id);
      if (res.success) {
        setProfileToDelete(null);
        loadData();
      } else {
        hotToast.error(res.error || "Failed to delete process profile.");
      }
      setIsDeleting(false);
    });
  };

  const filteredItems = items.filter(
    (m) =>
      m.routingProcess.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.mainProcess?.process || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.remark?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4 w-full bg-blue-50 text-blue-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900 ">
            Process Profile
          </h1>
          <p className="text-sm text-blue-500 mt-1">
            Maintain list of routing processes and respective costs.
          </p>
        </div>

        <Link
          href="/dashboard/master-profile/process-profile/new"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Process Profile
        </Link>
      </div>

      <div className="rounded-xl border border-blue-200 bg-white p-4">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by routing process, main process..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2 pl-10 pr-4 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden shadow-sm flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-cyan-600" />
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 p-6 text-center">
            <svg className="h-10 w-10 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="font-semibold text-blue-900 ">Error loading process profiles</p>
            <p className="text-sm text-blue-500 ">{errorMsg}</p>
            <button onClick={loadData} className="mt-2 text-sm font-semibold text-cyan-600 hover:text-cyan-500 cursor-pointer">
              Try again
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
            <svg className="h-12 w-12 text-blue-300 " fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
            <p className="mt-3 font-semibold text-blue-900 ">No process profiles found</p>
            <p className="text-sm text-blue-500 mt-1">
              {searchQuery ? "No matches for your criteria." : "Create your first Process Profile to begin."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-blue-200 bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-500 ">
                  <th className="px-6 py-4">Main Process</th>
                  <th className="px-6 py-4">Routing Process</th>
                  <th className="px-6 py-4 text-center">Flags</th>
                  <th className="px-6 py-4 text-right">Cost/Min</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200 ">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="group hover:bg-blue-50 :bg-blue-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-blue-900 whitespace-nowrap">
                      {item.mainProcess?.process || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-900 whitespace-nowrap">
                      {item.routingProcess}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex justify-center gap-1">
                        {item.welding && <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">W</span>}
                        {item.sprayPainting && <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">P</span>}
                        {item.machining && <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">M</span>}
                        {!item.welding && !item.sprayPainting && !item.machining && <span className="text-blue-300">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-900 text-right">
                      {Number(item.costPerMinute).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative inline-block">
                        <SearchableSelect
                          value={item.status}
                          onChange={() => handleToggleStatus(item.id)}
                          disabled={isPending}
                          className={`inline-flex items-center gap-1.5 rounded-full pl-3 pr-7 py-1 text-xs font-bold border appearance-none cursor-pointer outline-none transition-colors ${
                            item.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 "
                              : "bg-blue-100 text-blue-600 border-blue-200 focus:ring-2 focus:ring-blue-500/20 "
                          }`}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </SearchableSelect>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                          <svg className={`h-3.5 w-3.5 ${item.status === "Active" ? "text-emerald-600 " : "text-blue-500 "}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/master-profile/process-profile/${item.id}/edit`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 text-blue-500 hover:text-blue-950 :text-white hover:bg-blue-100 :bg-blue-800/80 hover:border-blue-300 :border-blue-700 transition-all duration-150"
                          title="Edit Profile"
                        >
                          <svg className="h-4.5 w-4.5 text-[18px] block" width="1em" height="1em" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setProfileToDelete(item)}
                          disabled={isPending || isDeleting}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 text-rose-500 hover:text-white hover:bg-rose-500 hover:border-rose-600 :bg-rose-950/30 transition-all duration-150 cursor-pointer disabled:opacity-50"
                          title="Delete Profile"
                        >
                          <svg className="h-4.5 w-4.5 text-[18px] block" width="1em" height="1em" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Premium Deletion Confirmation Modal */}
      {profileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glass backdrop */}
          <div 
            className="absolute inset-0 bg-blue-950/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => !isDeleting && setProfileToDelete(null)}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white border border-blue-200 p-6 text-left align-middle shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95">
            {/* Danger Warning Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 ">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-900 ">
                  Delete Process Profile
                </h3>
                <p className="text-xs text-blue-500 ">
                  This action is highly destructive and cannot be undone.
                </p>
              </div>
            </div>

            {/* Profile Info Block */}
            <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 ">
              <div className="grid grid-cols-3 gap-y-2 text-xs">
                <span className="text-blue-400 font-medium">Main Process:</span>
                <span className="col-span-2 text-blue-900 font-bold">{profileToDelete.mainProcess?.process || "-"}</span>
                
                <span className="text-blue-400 font-medium">Routing:</span>
                <span className="col-span-2 text-blue-900 font-semibold">{profileToDelete.routingProcess}</span>
                
                <span className="text-blue-400 font-medium">Cost/Min:</span>
                <span className="col-span-2 text-blue-900 ">{Number(profileToDelete.costPerMinute).toFixed(2)}</span>
              </div>
            </div>

            <p className="mt-4 text-sm text-blue-600 leading-relaxed">
              Are you sure you want to permanently delete this process profile?
            </p>

            {/* Buttons */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProfileToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-blue-200 text-sm font-semibold text-blue-700 hover:bg-blue-50 :bg-blue-900 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-sm font-semibold text-white shadow-md shadow-rose-500/10 hover:shadow-lg hover:shadow-rose-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
