"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ArrowRight, ArrowLeft, Home, FileText } from "lucide-react";

function SavedPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const moduleName = searchParams.get("module") || "Record";
  const recordId = searchParams.get("id");
  const viewUrl = searchParams.get("viewUrl");
  const backUrl = searchParams.get("backUrl") || "/dashboard";

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50/50">
      {/* Background blur effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl -z-10 animate-pulse delay-1000"></div>

      <div className="w-full max-w-lg bg-white border border-indigo-100 shadow-2xl shadow-indigo-100/40 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden transition-all duration-300 hover:shadow-indigo-100/60">
        
        {/* Top Gradient Decorative Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        {/* Animated Checkmark Wrapper */}
        <div className="mx-auto w-24 h-24 mb-8 relative flex items-center justify-center">
          {/* Outer Pulsing Glow */}
          <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping opacity-75"></div>
          {/* Inner Glowing Ring */}
          <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-full blur-sm opacity-40"></div>
          {/* Solid Ring */}
          <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 transform scale-100 animate-bounce-short">
            <Check className="w-10 h-10 text-white stroke-[3px]" />
          </div>
        </div>

        {/* Text Headers */}
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Saved Successfully!
        </h1>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-8 leading-relaxed">
          Your changes to the <span className="font-semibold text-indigo-600">{moduleName}</span> have been securely saved to the database.
        </p>

        {/* Details Card */}
        {recordId && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8 text-left space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Reference Details
            </span>
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <span className="text-sm font-medium text-slate-500">Module</span>
              <span className="text-sm font-bold text-slate-800">{moduleName}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium text-slate-500">Record ID / Ref</span>
              <span className="text-sm font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {recordId}
              </span>
            </div>
          </div>
        )}

        {/* Interactive Action Buttons */}
        <div className="flex flex-col gap-3.5">
          {viewUrl && (
            <Link
              href={viewUrl}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200"
            >
              <FileText size={18} />
              View Saved Record
              <ArrowRight size={16} className="ml-0.5" />
            </Link>
          )}

          <Link
            href={backUrl}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-indigo-600 font-semibold border border-indigo-100 rounded-2xl shadow-sm active:scale-[0.98] transition-all duration-200"
          >
            <ArrowLeft size={16} />
            Back to Module Listing
          </Link>

          <Link
            href="/dashboard"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-2xl active:scale-[0.98] transition-all duration-200"
          >
            <Home size={16} />
            Go to Dashboard
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce-short {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        .animate-bounce-short {
          animation: bounce-short 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function SavedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <SavedPageContent />
    </Suspense>
  );
}
