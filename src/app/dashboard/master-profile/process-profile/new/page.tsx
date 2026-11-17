"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProcessProfileAction, getMainProcessesAction } from "../actions";
export default function NewProcessProfilePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [mainProcesses, setMainProcesses] = useState<{id: string, process: string}[]>([]);

  useEffect(() => {
    async function load() {
      const res = await getMainProcessesAction();
      if (res.success && res.data) {
        setMainProcesses(res.data);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createProcessProfileAction(formData);
      if (res.success) {
        router.push("/dashboard/master-profile/process-profile");
      } else {
        setErrorMsg(res.error || "Failed to create process profile");
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col p-4 w-full bg-blue-50 text-blue-900">
      <div className="mb-6">
        <Link
          href="/dashboard/master-profile/process-profile"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors mb-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Process Profiles
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-blue-900 ">
          Create Process Profile
        </h1>
        <p className="text-sm text-blue-500 mt-1">
          Add a new routing process to the master list.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-100 p-4">
            <p className="text-sm font-semibold text-rose-600 flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {errorMsg}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="mainProcessId" className="block text-sm font-bold text-blue-900 mb-1.5">
                Main Process <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                id="mainProcessId"
                name="mainProcessId"
                required
                className="w-full rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm text-blue-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              >
                <option value="">Select a main process</option>
                {mainProcesses.map((mp) => (
                  <option key={mp.id} value={mp.id}>{mp.process}</option>
                ))}
              </SearchableSelect>
            </div>

            <div>
              <label htmlFor="routingProcess" className="block text-sm font-bold text-blue-900 mb-1.5">
                Routing Process <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="routingProcess"
                name="routingProcess"
                required
                className="w-full rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm text-blue-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                placeholder="Enter routing process name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-blue-100 p-4 rounded-xl bg-blue-50/50">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="welding"
                  className="h-5 w-5 rounded border-blue-300 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm font-bold text-blue-900 group-hover:text-cyan-700 transition-colors">Welding</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="sprayPainting"
                  className="h-5 w-5 rounded border-blue-300 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm font-bold text-blue-900 group-hover:text-cyan-700 transition-colors">Spray Painting</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="machining"
                  className="h-5 w-5 rounded border-blue-300 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm font-bold text-blue-900 group-hover:text-cyan-700 transition-colors">Machining</span>
              </label>
            </div>

            <div>
              <label htmlFor="costPerMinute" className="block text-sm font-bold text-blue-900 mb-1.5">
                Cost Per Minute ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                id="costPerMinute"
                name="costPerMinute"
                required
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm text-blue-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="remark" className="block text-sm font-bold text-blue-900 mb-1.5">
                Remark
              </label>
              <textarea
                id="remark"
                name="remark"
                rows={4}
                className="w-full rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm text-blue-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
                placeholder="Optional notes or description"
              ></textarea>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-blue-100 ">
            <Link
              href="/dashboard/master-profile/process-profile"
              className="px-5 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-cyan-500 transition-colors focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Process Profile"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
