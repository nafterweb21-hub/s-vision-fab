"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface IncotermProfile {
  id: string;
  incoterm: string;
  remark: string | null;
  status: string;
}

export default function materialTypesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [types, setCategories] = useState<IncotermProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/profiles/incoterm");
      if (!res.ok) {
        throw new Error("Failed to load backend configurations.");
      }
      const data = await res.json();
      setCategories(data);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while loading incoterms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Toast listener for sub-page redirect notifications
  const toastType = searchParams.get("toast");
  useEffect(() => {
    if (toastType === "created") {
      triggerToast("New Incoterm created successfully.");
      router.replace("/dashboard/profiles/incoterm");
    } else if (toastType === "updated") {
      triggerToast("Incoterm updated successfully.");
      router.replace("/dashboard/profiles/incoterm");
    }
  }, [toastType, router]);

  // Navigate to Create page
  const handleCreateOpen = () => {
    router.push("/dashboard/profiles/incoterm/create");
  };

  // Navigate to Edit page
  const handleEditOpen = (incoterm: IncotermProfile) => {
    router.push(`/dashboard/profiles/incoterm/edit/${incoterm.id}`);
  };

  // Toggle status between Active and Inactive
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/profiles/incoterm/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status.");
      
      // Update local state
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
      );
      triggerToast(`Incoterm status successfully set to ${nextStatus}.`);
    } catch (err: any) {
      hotToast.error(err.message || "Could not toggle status.");
    }
  };

  // Void a type (No delete - Void only)
  const handleVoidIncoterm = async (id: string) => {
    if (!await customConfirm("Are you sure you want to VOID this Incoterm? Voided records cannot be restored and running audit logs are permanently maintained.")) {
      return;
    }

    try {
      const res = await fetch(`/api/profiles/incoterm/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to void incoterm.");

      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "Void" } : c))
      );
      triggerToast("Incoterm voided successfully.");
    } catch (err: any) {
      hotToast.error(err.message || "Failed to void incoterm.");
    }
  };

  // Filter types by status
  const activeCategories = types.filter((c) => c.status !== "Void");
  const voidedCategories = types.filter((c) => c.status === "Void");

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-blue-900 px-4 py-3.5 text-xs font-bold text-white shadow-xl border border-blue-800 transition-all duration-300 transform translate-y-0">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          {toastMessage}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <a href="/dashboard/profiles" className="hover:underline">Master Profiles</a>
            <span>/</span>
            <span>Incoterm Profile</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-blue-900 ">
            Incoterm Configuration
          </h2>
          <p className="mt-1 text-xs text-blue-500 ">
            Define and manage the Incoterms (international commercial terms) used on sales and purchase documents.
          </p>
        </div>
        <button
          onClick={handleCreateOpen}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 transition-all cursor-pointer"
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Incoterm
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-blue-200 bg-white shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <span className="mt-4 text-xs font-medium text-blue-500">Retrieving incoterms...</span>
        </div>
      ) : errorMessage && types.length === 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-center text-rose-800 shadow-sm">
          <p className="text-sm font-semibold">{errorMessage}</p>
          <button
            onClick={loadData}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Main Table Card */}
          <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm ">
            <div className="border-b border-blue-100 bg-blue-50/50 px-6 py-4.5 ">
              <h3 className="text-sm font-bold text-blue-900 ">Active Incoterms</h3>
              <p className="text-[11px] text-blue-500 ">Manage incoterms configured across the ERP</p>
            </div>
            
            {activeCategories.length === 0 ? (
              <div className="p-8 text-center text-xs text-blue-500 ">
                No active incoterms configured. Click "Create Incoterm" to add one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-200 text-left">
                  <thead className="bg-blue-50 text-xs font-semibold text-blue-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Incoterm</th>
                      <th className="px-6 py-3.5">Remarks</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100 bg-white text-xs text-blue-700 ">
                    {activeCategories.map((c) => (
                      <tr key={c.id} className="hover:bg-blue-50/40 :bg-blue-850/10">
                        {/* Name */}
                        <td className="px-6 py-4 font-bold text-blue-900 ">
                          {c.incoterm}
                        </td>
                        
                        {/* Remark */}
                        <td className="px-6 py-4 max-w-xs truncate text-blue-500 ">
                          {c.remark || <span className="text-blue-300 italic">—</span>}
                        </td>

                        {/* Status Toggle Switch */}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(c.id, c.status)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition hover:opacity-85 ${
                              c.status === "Active"
                                ? "bg-emerald-50 text-emerald-600 "
                                : "bg-amber-50 text-amber-600 "
                            }`}
                            title="Click to toggle status"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${c.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                            {c.status}
                          </button>
                        </td>

                        {/* Action buttons */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => handleEditOpen(c)}
                              className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700 :bg-blue-800 cursor-pointer"
                              title="Edit config"
                            >
                              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleVoidIncoterm(c.id)}
                              className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 :bg-rose-950/25 cursor-pointer"
                              title="Void record"
                            >
                              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

          {/* Voided Categories Section */}
          {voidedCategories.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm opacity-60">
              <div className="border-b border-blue-100 bg-blue-50/50 px-6 py-3.5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 ">Voided Audit Records</h3>
                  <p className="text-[10px] text-blue-500">No Delete Rule — Audit records retained permanently</p>
                </div>
                <span className="rounded-full bg-blue-200 px-2 py-0.5 text-[9px] font-bold text-blue-500 ">
                  {voidedCategories.length} voided
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-200 text-left">
                  <thead className="bg-blue-50 text-xs font-semibold text-blue-500">
                    <tr>
                      <th className="px-6 py-2">Incoterm</th>
                      <th className="px-6 py-2">Remarks</th>
                      <th className="px-6 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100 bg-white text-xs text-blue-600">
                    {voidedCategories.map((c) => (
                      <tr key={c.id}>
                        <td className="px-6 py-2.5 font-semibold">{c.incoterm}</td>
                        <td className="px-6 py-2.5 truncate max-w-xs">{c.remark || "—"}</td>
                        <td className="px-6 py-2.5">
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-600 uppercase">
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
