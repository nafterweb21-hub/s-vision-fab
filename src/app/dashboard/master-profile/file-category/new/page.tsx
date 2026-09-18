"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createFileCategoryProfile } from "../actions";

export default function NewFileCategoryPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const remark = formData.get("remark") as string;

    const res = await createFileCategoryProfile({ name, remark });

    if (res.success) {
      router.push("/dashboard/master-profile/file-category");
    } else {
      setErrorMsg(res.error || "An error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full bg-blue-50">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900">
            Add File Category
          </h1>
          <p className="text-sm text-blue-500 mt-1">
            Create a new file category. The name must be unique.
          </p>
        </div>
        <Link
          href="/dashboard/master-profile/file-category"
          className="text-sm font-semibold text-cyan-600 hover:text-cyan-500 transition-colors"
        >
          Cancel
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-rose-500 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-sm font-bold text-rose-800">Error</h3>
                <p className="text-sm text-rose-600 mt-1">{errorMsg}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-blue-900 mb-1.5">
                File Category Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. Invoices"
                className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-blue-500 mt-1.5">
                Once saved, this field cannot be changed.
              </p>
            </div>

            <div>
              <label htmlFor="remark" className="block text-sm font-semibold text-blue-900 mb-1.5">
                Remark
              </label>
              <textarea
                id="remark"
                name="remark"
                rows={4}
                placeholder="Optional remarks..."
                className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end border-t border-blue-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Saving...
                </>
              ) : (
                "Save File Category"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
