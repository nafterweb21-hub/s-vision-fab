"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getPaymentTermItems, updatePaymentTermItem } from "../../actions";

export default function EditPaymentTermPage() {
  const params = useParams();
  const id = params?.id as string;

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const fetchItem = async () => {
      setIsLoading(true);
      const res = await getPaymentTermItems();
      if (res.success && res.data) {
        const item = (res.data as any[]).find((i) => i.id === id);
        if (item) {
          setInitialData(item);
        } else {
          setErrorMsg("Payment Term Profile not found.");
        }
      } else {
        setErrorMsg(res.error || "Failed to fetch profile.");
      }
      setIsLoading(false);
    };

    fetchItem();
  }, [id]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const daysStr = formData.get("days")?.toString().trim();

    if (!daysStr) {
      setErrorMsg("Day is required");
      return;
    }

    const days = parseInt(daysStr, 10);
    if (isNaN(days)) {
      setErrorMsg("Day must be a valid number");
      return;
    }

    startTransition(async () => {
      const res = await updatePaymentTermItem(id, formData);
      if (res.success) {
        router.push("/dashboard/profiles/payment-term");
      } else {
        setErrorMsg(res.error || "Failed to update payment term");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-cyan-600" />
      </div>
    );
  }

  if (!initialData && errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <svg className="h-10 w-10 text-rose-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-lg font-semibold text-blue-900">{errorMsg}</p>
        <Link href="/dashboard/profiles/payment-term" className="mt-4 text-cyan-600 hover:text-cyan-500 font-medium">
          ← Back to Payment Terms
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 w-full bg-blue-50 text-blue-900">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-blue-500 mb-2">
          <Link href="/dashboard/profiles/payment-term" className="hover:text-cyan-600 transition-colors">
            Payment Term Profile
          </Link>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-blue-900">Edit Term</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-blue-900 ">Edit Payment Term Profile</h1>
      </div>

      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <svg className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-medium text-rose-800">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-blue-900 mb-1.5">
                Term <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                defaultValue={initialData?.name}
                className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2 px-3 text-sm text-blue-500 outline-none cursor-not-allowed opacity-70"
                disabled
              />
              <p className="text-xs text-blue-400 mt-1">Term cannot be changed once saved.</p>
            </div>

            <div>
              <label htmlFor="days" className="block text-sm font-bold text-blue-900 mb-1.5">
                Day <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                id="days"
                name="days"
                defaultValue={initialData?.days}
                min="0"
                step="1"
                className="w-full rounded-lg border border-blue-200 bg-white py-2 px-3 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
                required
              />
              <p className="text-xs text-blue-500 mt-1">0 decimal point (integers only).</p>
            </div>

            <div>
              <label htmlFor="remark" className="block text-sm font-bold text-blue-900 mb-1.5">
                Remark
              </label>
              <textarea
                id="remark"
                name="remark"
                defaultValue={initialData?.remark || ""}
                rows={4}
                className="w-full rounded-lg border border-blue-200 bg-white py-2 px-3 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow resize-y"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-blue-100 flex items-center justify-end gap-3">
            <Link
              href="/dashboard/profiles/payment-term"
              className="px-5 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-cyan-500 disabled:opacity-70 disabled:cursor-not-allowed min-w-[120px]"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                "Update Term"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
