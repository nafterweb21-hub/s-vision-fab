"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface ApproverPerson {
  id: string;
  userId: string;
  status: string;
  user?: User;
}

interface ApprovalProfile {
  id: string;
  module: string;
  actionButton: string | null;
  minRange: number | null;
  maxRange: number | null;
  status: string;
  approvers: ApproverPerson[];
}

export default function ApprovalLevelProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profiles, setProfiles] = useState<ApprovalProfile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [profilesRes, usersRes] = await Promise.all([
        fetch("/api/profiles/approval-levels"),
        fetch("/api/users"),
      ]);

      if (!profilesRes.ok || !usersRes.ok) {
        throw new Error("Failed to load backend configurations.");
      }

      const profilesData = await profilesRes.json();
      const usersData = await usersRes.json();

      setProfiles(profilesData);
      setUsers(usersData);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while loading profiles.");
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
      triggerToast("New approval level profile created successfully.");
      router.replace("/dashboard/profiles/approval-levels");
    } else if (toastType === "updated") {
      triggerToast("Approval level profile updated successfully.");
      router.replace("/dashboard/profiles/approval-levels");
    }
  }, [toastType, router]);

  // Navigate to Create dynamic page
  const handleCreateOpen = () => {
    router.push("/dashboard/profiles/approval-levels/create");
  };

  // Navigate to Edit dynamic page
  const handleEditOpen = (profile: ApprovalProfile) => {
    router.push(`/dashboard/profiles/approval-levels/edit/${profile.id}`);
  };

  // Toggle status between Active and Inactive
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/profiles/approval-levels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status.");
      
      // Update local state
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: nextStatus } : p))
      );
      triggerToast(`Approval band successfully set to ${nextStatus}.`);
    } catch (err: any) {
      hotToast.error(err.message || "Could not toggle status.");
    }
  };

  // Void a profile (No delete - Void only)
  const handleVoidProfile = async (id: string) => {
    if (!await customConfirm("Are you sure you want to VOID this approval level profile? Voided profiles cannot be restored and running numbers are maintained.")) {
      return;
    }

    try {
      const res = await fetch(`/api/profiles/approval-levels/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to void profile.");

      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Void" } : p))
      );
      triggerToast("Approval profile voided successfully.");
    } catch (err: any) {
      hotToast.error(err.message || "Failed to void profile.");
    }
  };

  // Filter out voided records for standard display
  const activeProfiles = profiles.filter((p) => p.status !== "Void");
  const voidedProfiles = profiles.filter((p) => p.status === "Void");

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
            <span>Approval Level Profile</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-blue-900 ">
            Approval Level Profile Configuration
          </h2>
          <p className="mt-1 text-xs text-blue-500 ">
            Configure value-banded approval levels and assign authorized approvers for Purchase Orders.
          </p>
        </div>
        <button
          onClick={handleCreateOpen}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 transition-all cursor-pointer"
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Value Band
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-blue-200 bg-white shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <span className="mt-4 text-xs font-medium text-blue-500">Retrieving approval level matrices...</span>
        </div>
      ) : errorMessage && profiles.length === 0 ? (
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
              <h3 className="text-sm font-bold text-blue-900 ">Active Value Bands</h3>
              <p className="text-[11px] text-blue-500 ">Values are shown in local base currency (INR)</p>
            </div>
            
            {activeProfiles.length === 0 ? (
              <div className="p-8 text-center text-xs text-blue-500 ">
                No active approval levels configured. Click "Create Value Band" to add one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-200 text-left">
                  <thead className="bg-blue-50 text-xs font-semibold text-blue-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Module Type</th>
                      <th className="px-6 py-3.5">Approval Level</th>
                      <th className="px-6 py-3.5">Value Range (INR)</th>
                      <th className="px-6 py-3.5">Authorized Approvers</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100 bg-white text-xs text-blue-700 ">
                    {activeProfiles.map((profile) => (
                      <tr key={profile.id} className="hover:bg-blue-50/40 :bg-blue-850/10">
                        {/* Module */}
                        <td className="px-6 py-4">
                          <span className="font-bold text-blue-900 ">{profile.module}</span>
                        </td>
                        
                        {/* Level Name */}
                        <td className="px-6 py-4">
                          <span className="rounded-lg bg-blue-100 px-2.5 py-1 font-mono text-[10px] font-semibold text-blue-600 ">
                            {profile.actionButton || "—"}
                          </span>
                        </td>
                        
                        {/* Range */}
                        <td className="px-6 py-4 font-mono font-semibold">
                          {profile.minRange !== null && profile.maxRange !== null ? (
                            <span>
                              ${profile.minRange.toLocaleString(undefined, { minimumFractionDigits: 2 })} – ${profile.maxRange.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : profile.minRange !== null ? (
                            <span>&ge; ${profile.minRange.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          ) : profile.maxRange !== null ? (
                            <span>&le; ${profile.maxRange.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          ) : (
                            <span className="text-blue-400 italic">No limit</span>
                          )}
                        </td>
                        
                        {/* Approvers list */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {profile.approvers.map((a) => (
                              <div
                                key={a.id}
                                className={`group relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all ${
                                  a.status === "Active"
                                    ? "border-blue-200 bg-blue-50 "
                                    : "border-blue-200 bg-blue-50/50 opacity-60"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    a.status === "Active" ? "bg-emerald-500" : "bg-amber-500"
                                  }`}
                                ></span>
                                <span
                                  className={`font-semibold text-blue-700 ${
                                    a.status === "Inactive" ? "line-through text-blue-400" : ""
                                  }`}
                                >
                                  {a.user?.name || "Unknown"}
                                </span>
                                {/* Tooltip displaying email and status */}
                                <span className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded bg-blue-900 px-2 py-1 text-[10px] text-white group-hover:block whitespace-nowrap border border-blue-800 ">
                                  {a.user?.email || "No Email"} | Status: {a.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Status Toggle Switch */}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(profile.id, profile.status)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition hover:opacity-85 ${
                              profile.status === "Active"
                                ? "bg-emerald-50 text-emerald-600 "
                                : "bg-amber-50 text-amber-600 "
                            }`}
                            title="Click to toggle status"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${profile.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                            {profile.status}
                          </button>
                        </td>

                        {/* Action buttons */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => handleEditOpen(profile)}
                              className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700 :bg-blue-800 cursor-pointer"
                              title="Edit config"
                            >
                              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleVoidProfile(profile.id)}
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

          {/* Voided Profiles Section */}
          {voidedProfiles.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm opacity-60">
              <div className="border-b border-blue-100 bg-blue-50/50 px-6 py-3.5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 ">Voided Audit Records</h3>
                  <p className="text-[10px] text-blue-500">No Delete Rule — Audit records retained permanently</p>
                </div>
                <span className="rounded-full bg-blue-200 px-2 py-0.5 text-[9px] font-bold text-blue-500 ">
                  {voidedProfiles.length} voided
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-200 text-left">
                  <thead className="bg-blue-50 text-xs font-semibold text-blue-500">
                    <tr>
                      <th className="px-6 py-2">Module Type</th>
                      <th className="px-6 py-2">Level</th>
                      <th className="px-6 py-2">Range</th>
                      <th className="px-6 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100 bg-white text-xs text-blue-600">
                    {voidedProfiles.map((profile) => (
                      <tr key={profile.id}>
                        <td className="px-6 py-2.5 font-semibold">{profile.module}</td>
                        <td className="px-6 py-2.5 font-mono text-[10px]">{profile.actionButton}</td>
                        <td className="px-6 py-2.5 font-mono text-[11px]">
                          ${profile.minRange?.toFixed(2)} – ${profile.maxRange?.toFixed(2)}
                        </td>
                        <td className="px-6 py-2.5">
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-600 uppercase">
                            {profile.status}
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
