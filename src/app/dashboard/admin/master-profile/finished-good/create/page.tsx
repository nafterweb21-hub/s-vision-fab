"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createFinishedGoodProfile } from "../actions";

export default function CreateFinishedGoodPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [partNo, setPartNo] = useState("");
  const [description, setDescription] = useState("");
  const [remark, setRemark] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const descVal = description.trim();
    if (!descVal) {
      setFormError("Description is required.");
      return;
    }

    startTransition(async () => {
      const res = await createFinishedGoodProfile({
        partNo: partNo.trim() || undefined,
        description: descVal,
        remark: remark.trim() || undefined,
      });

      if (res.success) {
        // Redirect back to main page
        router.push("/dashboard/admin/master-profile/finished-good");
      } else {
        setFormError(res.error || "Failed to create finished good profile.");
      }
    });
  };

  return (
    <div className="space-y-4 bg-white text-black w-full">
      {/* Navigation & Header */}
      <div className="space-y-2">
        <Link
          href="/dashboard/admin/master-profile/finished-good"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Finished Goods
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Create Finished Good Profile
          </h1>
          <p className="text-sm text-blue-550">
            Add a new finished good to the master list.
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div className="rounded-xl border border-blue-200 bg-white p-6 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              <div className="flex gap-2.5">
                <svg className="h-5 w-5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="font-medium">{formError}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Left Column */}
            <div className="flex flex-col gap-5 justify-between">
              {/* Part No Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-blue-800">Part No</label>
                <input
                  type="text"
                  placeholder="e.g. PN-12345"
                  value={partNo}
                  onChange={(e) => setPartNo(e.target.value)}
                  className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden w-full focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-blue-500">
                  Once saved, Part No cannot be changed. Must be unique if provided.
                </p>
              </div>

              {/* Description Field */}
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-sm font-bold text-blue-800">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  placeholder="Enter finished good description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden resize-none w-full flex-1 min-h-[140px] focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-blue-500">
                  Once saved, Description cannot be changed. Must be unique.
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col">
              {/* Remarks Field */}
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-sm font-bold text-blue-800">Remark</label>
                <textarea
                  placeholder="Enter remark..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden resize-none w-full flex-1 min-h-[220px] md:min-h-full focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-blue-200 pt-5 mt-6">
            <Link
              href="/dashboard/admin/master-profile/finished-good"
              className="rounded-lg glossy-button-white px-5 py-2.5 text-base font-bold text-blue-800 text-center cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg glossy-button-blue px-5 py-2.5 text-base font-bold text-white shadow-md disabled:opacity-70 cursor-pointer min-w-[100px]"
            >
              {isPending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Create"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
