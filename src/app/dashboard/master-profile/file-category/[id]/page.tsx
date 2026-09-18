"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getFileCategoryDetail,
  updateFileCategoryProfile,
} from "../actions";

export default function EditFileCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [initialData, setInitialData] = useState<{
    name: string;
    remark: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setIsLoading(true);
      const res = await getFileCategoryDetail(id);
      if (res.success && res.data) {
        const d: any = res.data;
        setInitialData({
          name: d.name,
          remark: d.remark || "",
        });
      } else {
        setErrorMsg(res.error || "Failed to load file category details");
      }
      setIsLoading(false);
    };
    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const remark = formData.get("remark") as string;

    const res = await updateFileCategoryProfile(id, { remark });

    if (res.success) {
      router.push("/dashboard/master-profile/file-category");
    } else {
      setErrorMsg(res.error || "An error occurred while updating");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex p-6 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-cyan-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full bg-blue-50">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900">
            Edit File Category
          </h1>
          <p className="text-sm text-blue-500 mt-1">
            Update the file category details.
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
              <label htmlFor="name" className="block text-sm font-semibold text-blue-900 mb-1.5 opacity-70">
                File Category Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={initialData?.name}
                disabled
                className="w-full rounded-lg border border-blue-200 bg-blue-100/50 px-4 py-2 text-sm text-blue-900 outline-none cursor-not-allowed opacity-70"
              />
              <p className="text-xs text-blue-500 mt-1.5">
                File category name cannot be changed once created.
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
                defaultValue={initialData?.remark}
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
                  Updating...
                </>
              ) : (
                "Update File Category"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
