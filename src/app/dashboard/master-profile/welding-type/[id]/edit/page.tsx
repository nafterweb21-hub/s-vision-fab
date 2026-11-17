"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getWeldingTypeProfiles, updateWeldingTypeProfile } from "../../actions";

interface WeldingTypeProfile {
  id: string;
  type: string;
  remark: string | null;
  status: string;
}

export default function EditWeldingTypePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<WeldingTypeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setIsLoading(true);
      const res = await getWeldingTypeProfiles();
      if (res.success && res.data) {
        const found = (res.data as WeldingTypeProfile[]).find((i) => i.id === id);
        if (found) {
          setItem(found);
        } else {
          setErrorMsg("Welding type not found.");
        }
      } else {
        setErrorMsg(res.error || "Failed to load welding type data.");
      }
      setIsLoading(false);
    };

    if (id) loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateWeldingTypeProfile(id, formData);

    if (res.success) {
      router.push("/dashboard/master-profile/welding-type");
    } else {
      setErrorMsg(res.error || "An error occurred");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-blue-50 ">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-cyan-600" />
      </div>
    );
  }

  if (errorMsg && !item) {
    return (
      <div className="flex-1 p-6 bg-blue-50 ">
        <div className="max-w-2xl mx-auto rounded-xl border border-rose-200 bg-rose-50 p-6 text-center ">
          <p className="font-semibold text-rose-800 ">{errorMsg}</p>
          <Link href="/dashboard/master-profile/welding-type" className="mt-4 inline-block text-sm font-semibold text-cyan-600 hover:text-cyan-500">
            Back to List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 w-full bg-blue-50">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900 ">
            Edit Welding Type
          </h1>
          <p className="text-sm text-blue-500 mt-1">
            Update the remarks for this welding type.
          </p>
        </div>
        <Link
          href="/dashboard/master-profile/welding-type"
          className="text-sm font-semibold text-cyan-600 hover:text-cyan-500 transition-colors"
        >
          Cancel
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
        {errorMsg && item && (
          <div className="bg-rose-50 border-b border-rose-200 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-rose-500 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-sm font-bold text-rose-800 ">Error</h3>
                <p className="text-sm text-rose-600 mt-1">{errorMsg}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="type" className="block text-sm font-semibold text-blue-500 mb-1.5">
                Type
              </label>
              <input
                id="type"
                name="type"
                type="text"
                defaultValue={item?.type}
                disabled
                className="w-full rounded-lg border border-blue-200 bg-blue-100 px-4 py-2 text-sm text-blue-500 outline-none cursor-not-allowed"
              />
              <p className="text-xs text-blue-400 mt-1.5">
                The type field cannot be changed after creation.
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
                defaultValue={item?.remark || ""}
                placeholder="Optional remarks..."
                className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end border-t border-blue-100 ">
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
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
