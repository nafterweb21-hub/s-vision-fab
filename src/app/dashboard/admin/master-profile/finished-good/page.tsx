"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  getFinishedGoodProfiles,
  updateFinishedGoodRemark,
  toggleFinishedGoodStatus,
  deleteFinishedGoodProfile,
} from "./actions";

interface FinishedGoodProfile {
  id: string;
  partNo: string | null;
  description: string;
  remark: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RawFinishedGoodProfile {
  id: string;
  partNo: string | null;
  description: string;
  remark: string | null;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export default function FinishedGoodProfilePage() {
  const [profiles, setProfiles] = useState<FinishedGoodProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<FinishedGoodProfile | null>(null);

  // Form states
  const [remark, setRemark] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const result = await getFinishedGoodProfiles();
    if (result.success && result.data) {
      const casted = result.data.map((p: RawFinishedGoodProfile) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }));
      setProfiles(casted);
    } else {
      setErrorMsg(result.error || "Failed to load finished good profiles.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const run = async () => {
      await loadData();
    };
    run();
  }, []);

  const handleOpenEditModal = (profile: FinishedGoodProfile) => {
    setSelectedProfile(profile);
    setRemark(profile.remark || "");
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    setFormError(null);

    startTransition(async () => {
      const res = await updateFinishedGoodRemark(selectedProfile.id, remark);

      if (res.success) {
        setIsEditModalOpen(false);
        loadData();
      } else {
        setFormError(res.error || "Failed to update remark.");
      }
    });
  };

  const handleToggleStatus = async (id: string) => {
    startTransition(async () => {
      const res = await toggleFinishedGoodStatus(id);
      if (res.success) {
        loadData();
      } else {
        hotToast.error(res.error || "Failed to toggle status.");
      }
    });
  };

  const handleDeleteProfile = async (id: string) => {
    if (
      await customConfirm(
        "Are you sure you want to delete this Finished Good Profile? This action cannot be undone."
      )
    ) {
      startTransition(async () => {
        const res = await deleteFinishedGoodProfile(id);
        if (res.success) {
          loadData();
        } else {
          hotToast.error(res.error || "Failed to delete finished good profile.");
        }
      });
    }
  };

  // Filter profiles based on search
  const filteredProfiles = profiles.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesPartNo = p.partNo?.toLowerCase().includes(query) || false;
    const matchesDesc = p.description.toLowerCase().includes(query);
    return matchesPartNo || matchesDesc;
  });

  return (
    <div className="space-y-4 bg-white text-black w-full">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Finished Good Profile
          </h1>
          <p className="text-sm text-blue-650">
            Maintain the master list of finished goods to be used in Sales Orders.
          </p>
        </div>

        <Link
          href="/dashboard/admin/master-profile/finished-good/create"
          className="inline-flex items-center gap-2 rounded-lg glossy-button-blue px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/10 cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Finished Good
        </Link>
      </div>

      {/* Search Panel */}
      <div className="rounded-xl glossy-bg p-4 bg-white">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by part no or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg glossy-input py-2 pl-10 pr-4 text-sm outline-hidden placeholder:text-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Main List Table */}
      <div className="overflow-hidden rounded-xl glossy-bg bg-white">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        ) : errorMsg ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 p-6 text-center">
            <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="font-semibold text-black">Error loading profiles</p>
            <p className="text-sm text-blue-650">{errorMsg}</p>
            <button onClick={loadData} className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-500 cursor-pointer">
              Try again
            </button>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
            <svg className="h-12 w-12 text-blue-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21a1.125 1.125 0 01-1.125 1.125H5.625A1.125 1.125 0 014.5 21V3.75c0-.621.504-1.125 1.125-1.125h9.75m4.5 3.493L15 3.75M9 15h.008v.008H9V15zm0-3h.008v.008H9V12zm0-3h.008v.008H9V9z" />
            </svg>
            <p className="mt-2 font-semibold text-black">No Finished Goods found</p>
            <p className="text-sm text-blue-650">
              {searchQuery ? "No matches for your search criteria." : "Get started by adding your first Finished Good."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-blue-200 bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-700">
                  <th className="px-6 py-4.5 w-16">SN</th>
                  <th className="px-6 py-4.5">Part No</th>
                  <th className="px-6 py-4.5">Description</th>
                  <th className="px-6 py-4.5">Remarks</th>
                  <th className="px-6 py-4.5">Status</th>
                  <th className="px-6 py-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200">
                {filteredProfiles.map((profile, index) => (
                  <tr key={profile.id} className="group hover:bg-blue-50/40 transition-colors">
                    <td className="px-6 py-4 text-sm text-blue-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-black">
                      {profile.partNo || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-800 font-medium whitespace-pre-line leading-relaxed max-w-sm">
                      {profile.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-600 whitespace-pre-line leading-relaxed max-w-xs">
                      {profile.remark || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          profile.status === "Active"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-blue-50 text-blue-600 border-blue-200"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${profile.status === "Active" ? "bg-blue-600" : "bg-blue-400"}`} />
                        {profile.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => handleOpenEditModal(profile)}
                          className="rounded-md glossy-button-white px-2.5 py-1.5 text-xs font-bold text-blue-800 cursor-pointer"
                        >
                          Edit Remark
                        </button>
                        <button
                          onClick={() => handleToggleStatus(profile.id)}
                          disabled={isPending}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-bold shadow-xs border transition-all cursor-pointer ${
                            profile.status === "Active"
                              ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                              : "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                          }`}
                        >
                          {profile.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          disabled={isPending}
                          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 shadow-xs hover:bg-red-100 transition cursor-pointer"
                        >
                          Delete
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



      {/* EDIT MODAL */}
      {isEditModalOpen && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="fixed inset-0 bg-blue-950/30 backdrop-blur-xs" onClick={() => setIsEditModalOpen(false)} />

          <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white p-6 shadow-xl border border-blue-200 transition-all">
            <div className="flex items-center justify-between border-b border-blue-200 pb-4">
              <h2 className="text-xl font-bold text-black">Edit Finished Good Profile</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-100 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-6 space-y-5">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-800">
                  <div className="flex gap-2.5">
                    <svg className="h-5 w-5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span>{formError}</span>
                  </div>
                </div>
              )}

              {/* Part No Field (Read only) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-blue-500 uppercase">Part No</span>
                <span className="text-base font-bold text-blue-500 bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg">
                  {selectedProfile.partNo || "—"}
                </span>
              </div>

              {/* Description Field (Read only) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-blue-500 uppercase">Description</span>
                <span className="text-base font-bold text-blue-500 bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg whitespace-pre-line">
                  {selectedProfile.description}
                </span>
              </div>

              {/* Remarks Field (Editable) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-blue-800">Remark</label>
                <textarea
                  placeholder="Enter remark..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={3}
                  className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-blue-200 pt-5 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg glossy-button-white px-5 py-2.5 text-base font-bold text-blue-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-lg glossy-button-blue px-5 py-2.5 text-base font-bold text-white shadow-md disabled:opacity-70 cursor-pointer"
                >
                  {isPending ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
