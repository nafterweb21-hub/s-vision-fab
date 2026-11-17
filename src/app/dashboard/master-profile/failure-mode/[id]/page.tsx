"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getFailureModeProfileItems, updateFailureModeProfileItem } from "../actions";

interface FailureModeProfile {
  id: string;
  failureMode: string;
  remark: string | null;
  status: string;
}

export default function EditFailureModeProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [initialData, setInitialData] = useState<FailureModeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      const res = await getFailureModeProfileItems();
      if (res.success && res.data) {
        const profile = (res.data as FailureModeProfile[]).find((p) => p.id === id);
        if (profile) {
          setInitialData(profile);
        } else {
          setErrorMsg("Failure mode profile not found.");
        }
      } else {
        setErrorMsg(res.error || "Failed to load profile.");
      }
      setIsLoading(false);
    };

    if (id) fetchProfile();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateFailureModeProfileItem(id, formData);

    if (res.success) {
      router.push("/dashboard/master-profile/failure-mode");
    } else {
      setErrorMsg(res.error || "Failed to update failure mode profile");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-blue-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-cyan-600" />
      </div>
    );
  }

  if (errorMsg && !initialData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-blue-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-200 text-center max-w-md w-full">
          <svg className="h-12 w-12 text-rose-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-rose-900 mb-2">Error</h2>
          <p className="text-rose-600 mb-6">{errorMsg}</p>
          <Link
            href="/dashboard/master-profile/failure-mode"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Back to List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4 w-full bg-blue-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900 ">
            Edit Failure Mode
          </h1>
          <p className="text-sm text-blue-500 mt-1">
            Update remark for this failure mode. The failure mode name cannot be modified.
          </p>
        </div>
        <Link
          href="/dashboard/master-profile/failure-mode"
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          &larr; Back to List
        </Link>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-rose-50 p-4 border border-rose-200 text-rose-600 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="failureMode" className="block text-sm font-medium text-blue-900 mb-1">
                Failure Mode
              </label>
              <input
                type="text"
                id="failureMode"
                value={initialData?.failureMode || ""}
                disabled
                className="w-full rounded-lg border border-blue-100 bg-blue-50/50 py-2 px-3 text-sm text-blue-500 cursor-not-allowed"
              />
              <p className="text-xs text-blue-400 mt-1">This field is locked and cannot be changed.</p>
            </div>

            <div>
              <label htmlFor="remark" className="block text-sm font-medium text-blue-900 mb-1">
                Remark
              </label>
              <textarea
                id="remark"
                name="remark"
                rows={4}
                defaultValue={initialData?.remark || ""}
                placeholder="Optional remark..."
                className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2 px-3 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-blue-100 flex justify-end gap-3">
            <Link
              href="/dashboard/master-profile/failure-mode"
              className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Update Failure Mode
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
