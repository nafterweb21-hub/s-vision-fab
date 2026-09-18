"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

interface ApprovalLevelFormProps {
  editingProfile?: ApprovalProfile | null;
  users: User[];
}

export default function ApprovalLevelForm({ editingProfile, users }: ApprovalLevelFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields State
  const [formModule, setFormModule] = useState("Purchase Order - Material");
  const [formActionButton, setFormActionButton] = useState("First Level");
  const [formMinRange, setFormMinRange] = useState("0.00");
  const [formMaxRange, setFormMaxRange] = useState("499.99");
  const [formStatus, setFormStatus] = useState("Active");
  const [formApprovers, setFormApprovers] = useState<Array<{ userId: string; status: string }>>([]);

  // Initialize fields if editing
  useEffect(() => {
    if (editingProfile) {
      setFormModule(editingProfile.module);
      setFormActionButton(editingProfile.actionButton || "");
      setFormMinRange(editingProfile.minRange !== null ? editingProfile.minRange.toFixed(2) : "");
      setFormMaxRange(editingProfile.maxRange !== null ? editingProfile.maxRange.toFixed(2) : "");
      setFormStatus(editingProfile.status || "Active");
      setFormApprovers(
        editingProfile.approvers.map((a) => ({
          userId: a.userId,
          status: a.status,
        }))
      );
    }
  }, [editingProfile]);

  // Form Approver rows managers
  const handleAddApproverRow = () => {
    const selectedUserIds = formApprovers.map((a) => a.userId);
    const availableUser = users.find((u) => !selectedUserIds.includes(u.id)) || users[0];
    
    if (!availableUser) {
      hotToast.error("No system users available.");
      return;
    }

    setFormApprovers((prev) => [
      ...prev,
      { userId: availableUser.id, status: "Active" },
    ]);
  };

  const handleRemoveApproverRow = (idx: number) => {
    setFormApprovers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleApproverUserChange = (idx: number, userId: string) => {
    const alreadySelected = formApprovers.some((a, i) => a.userId === userId && i !== idx);
    if (alreadySelected) {
      hotToast.error("Specification Rule: Approval Person must be unique in each value band.");
      return;
    }

    setFormApprovers((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, userId } : a))
    );
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaving(true);

    const minVal = formMinRange === "" ? null : Number(formMinRange);
    const maxVal = formMaxRange === "" ? null : Number(formMaxRange);

    // Validations
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      setErrorMessage("Range Validation: Min Range value cannot be larger than Max Range value.");
      setSaving(false);
      return;
    }

    if (formApprovers.length === 0) {
      setErrorMessage("Configuration Validation: You must assign at least one Approval Person to this band.");
      setSaving(false);
      return;
    }

    // Prepare body
    const body = {
      module: formModule,
      actionButton: formActionButton || null,
      minRange: minVal,
      maxRange: maxVal,
      status: formStatus,
      approvers: formApprovers,
    };

    try {
      const url = editingProfile 
        ? `/api/profiles/approval-levels/${editingProfile.id}` 
        : "/api/profiles/approval-levels";
      
      const method = editingProfile ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save profile.");
      }

      // Navigate back with success toast query parameter
      const msg = editingProfile
        ? "updated"
        : "created";
      router.push(`/dashboard/profiles/approval-levels?toast=${msg}`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full bg-white border border-blue-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
      <form onSubmit={handleSubmit} className="flex flex-col py-8 px-8 space-y-6">

        {/* Error Banner */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 ">
            {errorMessage}
          </div>
        )}

        {/* Fields */}
        <div className="space-y-6">
          
          {/* Module (Dropdown) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              Module Type <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              value={formModule}
              onChange={(e) => setFormModule(e.target.value)}
              disabled={saving}
              className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-semibold outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-blue-900 "
            >
              <option value="Purchase Order - Material">Purchase Order - Material</option>
              <option value="Purchase Order - Subcon">Purchase Order - Subcon</option>
            </SearchableSelect>
            <p className="text-[10px] text-blue-400">
              Approval level profiles govern Purchase and Subcon orders only.
            </p>
          </div>

          {/* Action/Button Level name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              Level Name (Action Button)
            </label>
            <input
              type="text"
              value={formActionButton}
              onChange={(e) => setFormActionButton(e.target.value)}
              placeholder="e.g. First Level, Second Level"
              disabled={saving}
              className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-blue-900 "
            />
            <p className="text-[10px] text-blue-400">
              Label configured in the authorization button flow.
            </p>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              Status <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormStatus("Active")}
                disabled={saving}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold border transition ${
                  formStatus === "Active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-500 "
                    : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 :bg-blue-900"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFormStatus("Inactive")}
                disabled={saving}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold border transition ${
                  formStatus === "Inactive"
                    ? "bg-amber-50 text-amber-700 border-amber-500 "
                    : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 :bg-blue-900"
                }`}
              >
                Inactive
              </button>
            </div>
            <p className="text-[10px] text-blue-400">
              Inactive status disables the level during authorization checks.
            </p>
          </div>

          {/* Range Value Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                Min Range (INR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formMinRange}
                onChange={(e) => setFormMinRange(e.target.value)}
                placeholder="0.00"
                disabled={saving}
                className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-mono outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-blue-900 "
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                Max Range (INR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formMaxRange}
                onChange={(e) => setFormMaxRange(e.target.value)}
                placeholder="1000000.00"
                disabled={saving}
                className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm font-mono outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-blue-900 "
              />
            </div>
          </div>

          {/* APPROVER SUB TABLE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                Authorized Approvers <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddApproverRow}
                disabled={saving}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-500 disabled:opacity-40"
              >
                + Add Approver
              </button>
            </div>

            {formApprovers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-blue-200 p-6 text-center text-xs text-blue-400 ">
                No approvers assigned to this band yet. Click "+ Add Approver" to select people.
              </div>
            ) : (
              <div className="space-y-3">
                {formApprovers.map((item, index) => {
                  const matchedUser = users.find((u) => u.id === item.userId);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 "
                    >
                      {/* Index number */}
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-[10px] font-bold text-blue-500 ">
                        {index + 1}
                      </span>

                      {/* Dropdown to pick User and Status Toggle */}
                      <div className="flex-1 min-w-0 grid gap-2">
                        <div className="flex gap-2">
                          <SearchableSelect
                            value={item.userId}
                            onChange={(e) => handleApproverUserChange(index, e.target.value)}
                            disabled={saving}
                            className="flex-1 min-w-0 rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500 text-blue-900 "
                          >
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </SearchableSelect>
                          
                          {/* Status Toggle Button in Drawer */}
                          <button
                            type="button"
                            onClick={() => {
                              setFormApprovers((prev) =>
                                prev.map((a, i) =>
                                  i === index
                                    ? { ...a, status: a.status === "Active" ? "Inactive" : "Active" }
                                    : a
                                )
                              );
                            }}
                            disabled={saving}
                            className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                              item.status === "Active"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200 "
                                : "bg-amber-50 text-amber-600 border border-amber-200 "
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${item.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                            {item.status}
                          </button>
                        </div>
                        
                        {/* Display Email read-only */}
                        <div className="text-[10px] text-blue-400 truncate pl-1">
                          Email: <span className="font-semibold">{matchedUser?.email || "—"}</span>
                        </div>
                      </div>

                      {/* Remove row */}
                      <button
                        type="button"
                        onClick={() => handleRemoveApproverRow(index)}
                        disabled={saving}
                        className="rounded-lg p-1 text-blue-400 hover:bg-blue-200 hover:text-rose-600 :bg-blue-800"
                        title="Remove Approver"
                      >
                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-blue-100 pt-6 flex items-center justify-between ">
          <button
            type="button"
            onClick={() => router.push("/dashboard/profiles/approval-levels")}
            disabled={saving}
            className="rounded-xl border border-blue-200 px-5 py-3 text-xs font-semibold text-blue-700 hover:bg-blue-50 :bg-blue-850 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
