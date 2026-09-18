"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
interface MainProcess {
  id: string;
  process: string;
}

export default function CreateProcessProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [mainProcesses, setMainProcesses] = useState<MainProcess[]>([]);

  const [formData, setFormData] = useState({
    mainProcessId: "",
    routingProcess: "",
    welding: false,
    sprayPainting: false,
    machining: false,
    costPerMinute: "",
    remark: "",
    status: "Active"
  });

  useEffect(() => {
    // Load main processes for the dropdown
    const fetchMainProcesses = async () => {
      try {
        const res = await fetch("/api/profiles/main-processes");
        if (res.ok) {
          const data = await res.json();
          setMainProcesses(data.filter((p: any) => p.status === "Active"));
        }
      } catch (e) {
        console.error("Failed to load main processes", e);
      }
    };
    fetchMainProcesses();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...formData,
        costPerMinute: parseFloat(formData.costPerMinute)
      };

      if (isNaN(payload.costPerMinute)) {
        throw new Error("Cost Per Minute must be a valid number.");
      }

      const res = await fetch("/api/profiles/process-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save process profile.");
      }

      router.push("/dashboard/profiles/process-profiles?toast=created");
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link 
          href="/dashboard/profiles/process-profiles" 
          className="rounded-full p-2 text-blue-400 hover:bg-blue-100 hover:text-blue-700 transition :bg-blue-800 :text-blue-300"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-blue-900 ">
            Create Process Profile
          </h2>
          <p className="mt-1 text-xs text-blue-500 ">
            Define a new routing process and its costing details.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm ">
        <div className="border-b border-blue-100 bg-blue-50/50 px-6 py-4 ">
          <h3 className="text-sm font-bold text-blue-900 ">Profile Details</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {errorMsg && (
            <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50/50 p-4 text-sm font-semibold text-rose-800 ">
              {errorMsg}
            </div>
          )}

          <div className="space-y-6">
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-blue-700 ">
                  Main Process <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  name="mainProcessId"
                  required
                  value={formData.mainProcessId}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm text-blue-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition :border-indigo-500"
                >
                  <option value="" disabled>Select a Main Process...</option>
                  {mainProcesses.map(m => (
                    <option key={m.id} value={m.id}>{m.process}</option>
                  ))}
                </SearchableSelect>
                <p className="mt-1.5 text-[11px] text-blue-500">Group categorization for this routing process.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-blue-700 ">
                  Routing Process <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="routingProcess"
                  required
                  value={formData.routingProcess}
                  onChange={handleChange}
                  placeholder="e.g. Laser Cutting 5KW"
                  className="w-full rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm text-blue-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition :border-indigo-500"
                />
                <p className="mt-1.5 text-[11px] text-blue-500">The specific operation name. <span className="font-semibold">Immutable once saved.</span></p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-blue-700 ">
                Process Flags
              </label>
              <div className="flex flex-wrap gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="welding"
                    checked={formData.welding}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-blue-300 text-indigo-600 focus:ring-indigo-600 "
                  />
                  <span className="text-sm font-medium text-blue-700 ">Welding</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="sprayPainting"
                    checked={formData.sprayPainting}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-blue-300 text-indigo-600 focus:ring-indigo-600 "
                  />
                  <span className="text-sm font-medium text-blue-700 ">Spray Painting</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="machining"
                    checked={formData.machining}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-blue-300 text-indigo-600 focus:ring-indigo-600 "
                  />
                  <span className="text-sm font-medium text-blue-700 ">Machining</span>
                </label>
              </div>
              <p className="mt-2 text-[11px] text-blue-500">Ticking these flags requires specific parameter inputs upon scanning out at the production terminal.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-blue-700 ">
                  Cost Per Minute (INR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="costPerMinute"
                  required
                  value={formData.costPerMinute}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-mono text-blue-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition :border-indigo-500"
                />
                <p className="mt-1.5 text-[11px] text-blue-500">Used for costing calculations.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-blue-700 ">
                  Status
                </label>
                <SearchableSelect
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm text-blue-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition :border-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </SearchableSelect>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-blue-700 ">
                Remarks
              </label>
              <textarea
                name="remark"
                value={formData.remark}
                onChange={handleChange}
                rows={3}
                placeholder="Optional notes or details about this routing process..."
                className="w-full rounded-xl border border-blue-300 bg-white px-4 py-3 text-sm text-blue-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition :border-indigo-500"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-blue-100 pt-6 ">
            <Link
              href="/dashboard/profiles/process-profiles"
              className="rounded-xl border border-blue-200 px-5 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 :bg-blue-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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
