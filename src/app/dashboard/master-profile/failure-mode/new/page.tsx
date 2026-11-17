"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createFailureModeProfileItem } from "../actions";

export default function NewFailureModeProfilePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await createFailureModeProfileItem(formData);

    if (res.success) {
      router.push("/dashboard/master-profile/failure-mode");
    } else {
      setErrorMsg(res.error || "Failed to create failure mode profile");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4 w-full bg-blue-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900 ">
            Add Failure Mode
          </h1>
          <p className="text-sm text-blue-500 mt-1">
            Create a new failure mode profile. Once saved, the Failure Mode name cannot be changed.
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
                Failure Mode <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="failureMode"
                name="failureMode"
                required
                placeholder="e.g. Coating, Welding Defect, Dimensional"
                className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2 px-3 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
              />
              <p className="text-xs text-blue-500 mt-1">This value must be unique and cannot be modified after creation.</p>
            </div>

            <div>
              <label htmlFor="remark" className="block text-sm font-medium text-blue-900 mb-1">
                Remark
              </label>
              <textarea
                id="remark"
                name="remark"
                rows={4}
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
              Save Failure Mode
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
