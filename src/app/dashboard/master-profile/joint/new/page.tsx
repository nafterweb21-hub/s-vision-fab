"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createJointProfileItem } from "../actions";

export default function NewJointProfilePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const joint = formData.get("joint")?.toString().trim();

    if (!joint) {
      setErrorMsg("Joint Name is required");
      return;
    }

    startTransition(async () => {
      const res = await createJointProfileItem(formData);
      if (res.success) {
        router.push("/dashboard/master-profile/joint");
      } else {
        setErrorMsg(res.error || "An error occurred while saving.");
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col py-3 space-y-4 w-full">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/master-profile/joint"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 text-blue-500 hover:text-blue-950 hover:bg-blue-100 hover:border-blue-300 transition-all duration-150"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900 ">
            Add Joint Profile
          </h1>
          <p className="text-sm text-blue-500 mt-1">
            Create a new welding joint type for the master list.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 p-4 border border-rose-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-rose-800">{errorMsg}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="joint" className="text-sm font-bold text-blue-900">
                Joint Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="joint"
                name="joint"
                type="text"
                required
                disabled={isPending}
                className="w-full rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm text-blue-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:bg-blue-50 disabled:opacity-50 transition-colors"
                placeholder="e.g. Butt Joint"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="remark" className="text-sm font-bold text-blue-900">
                Remark
              </label>
              <textarea
                id="remark"
                name="remark"
                rows={4}
                disabled={isPending}
                className="w-full rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm text-blue-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:bg-blue-50 disabled:opacity-50 transition-colors resize-none"
                placeholder="Optional remarks..."
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-bold text-blue-900">Status</label>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full pl-3 pr-4 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Active
                </span>
                <p className="text-xs text-blue-500 mt-2">
                  New joint profiles are active by default.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-blue-100">
            <Link
              href="/dashboard/master-profile/joint"
              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 hover:text-blue-900 transition-colors disabled:opacity-50"
              style={{ pointerEvents: isPending ? "none" : "auto" }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-cyan-500 transition-colors disabled:opacity-50"
            >
              {isPending && (
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isPending ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
