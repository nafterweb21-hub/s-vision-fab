"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupplierProfileWithDetails, getSupplierCodePreview } from "../actions";

export default function CreateSupplierPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Create form - Supplier Info
  const [supplierName, setSupplierName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState("Loading...");

  React.useEffect(() => {
    getSupplierCodePreview().then(code => setPreviewCode(code || "Auto-generated"));
  }, []);

  // Create form - Contact Person section
  const [contactName, setContactName] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactMobile, setContactMobile] = useState("");
  const [contactFax, setContactFax] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactDesignation, setContactDesignation] = useState("");

  // Create form - Address section
  const [addressText, setAddressText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = supplierName.trim();

    if (!name) {
      setFormError("Supplier Name is required.");
      return;
    }

    const contactData = contactName.trim()
      ? {
          contactPersonName: contactName.trim(),
          telNo: contactTel.trim() || undefined,
          mobileNo: contactMobile.trim() || undefined,
          faxNo: contactFax.trim() || undefined,
          email: contactEmail.trim() || undefined,
          designation: contactDesignation.trim() || undefined,
        }
      : undefined;

    const addressData = addressText.trim()
      ? {
          address: addressText.trim(),
        }
      : undefined;

    startTransition(async () => {
      const res = await createSupplierProfileWithDetails(
        { supplierName: name, remarks: remarks.trim() || undefined },
        contactData,
        addressData
      );

      if (res.success) {
        router.push("/dashboard/admin/master-profile/supplier");
      } else {
        setFormError(res.error || "Failed to create supplier profile.");
      }
    });
  };

  return (
    <div className="space-y-4 bg-white text-black p-4 rounded-2xl shadow-sm border border-blue-100 w-full">
      {/* Navigation & Header */}
      <div className="space-y-2">
        <Link
          href="/dashboard/admin/master-profile/supplier"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Suppliers
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Create Supplier Profile
          </h1>
          <p className="text-sm text-blue-555">
            Add a new supplier to the system.
          </p>
        </div>
      </div>

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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT PANEL — Supplier Profile (Span 5) */}
            <div className="lg:col-span-5 flex flex-col gap-4.5 lg:border-r lg:border-blue-100 pr-0 lg:pr-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span>
                <h3 className="text-base font-bold text-black">Supplier Profile</h3>
              </div>

              {/* Code */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-blue-700">Supplier Code</label>
                <input
                  type="text"
                  disabled
                  value={previewCode}
                  className="rounded-lg glossy-input px-3 py-2 text-sm outline-hidden w-full bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-blue-700">Supplier Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Supplies Pte Ltd"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="rounded-lg glossy-input px-3 py-2 text-sm outline-hidden w-full focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-blue-500">Once saved, cannot be changed. Must be unique.</p>
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1 flex-1 min-h-[140px]">
                <label className="text-sm font-bold text-blue-700">Remarks</label>
                <textarea
                  placeholder="Enter remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="rounded-lg glossy-input px-3 py-2 text-sm outline-hidden resize-none w-full min-h-[120px] focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* RIGHT PANEL — Contact Person + Address (Span 7) */}
            <div className="lg:col-span-7 flex flex-col gap-5 justify-between lg:pl-6">
              {/* Contact Person */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
                  <h3 className="text-base font-bold text-black">Contact Person</h3>
                  <span className="text-xs text-blue-500">(optional)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-sm font-bold text-blue-700">Contact Person</label>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="rounded-lg glossy-input px-3 py-2 text-sm w-full outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-blue-700">Tel No</label>
                    <input
                      type="text"
                      placeholder="Telephone"
                      value={contactTel}
                      onChange={(e) => setContactTel(e.target.value)}
                      className="rounded-lg glossy-input px-3 py-2 text-sm w-full outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-blue-700">Mobile No</label>
                    <input
                      type="text"
                      placeholder="Mobile"
                      value={contactMobile}
                      onChange={(e) => setContactMobile(e.target.value)}
                      className="rounded-lg glossy-input px-3 py-2 text-sm w-full outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-blue-700">Fax No</label>
                    <input
                      type="text"
                      placeholder="Fax"
                      value={contactFax}
                      onChange={(e) => setContactFax(e.target.value)}
                      className="rounded-lg glossy-input px-3 py-2 text-sm w-full outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-blue-700">Email</label>
                    <input
                      type="email"
                      placeholder="Email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="rounded-lg glossy-input px-3 py-2 text-sm w-full outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-sm font-bold text-blue-700">Designation</label>
                    <input
                      type="text"
                      placeholder="Job title"
                      value={contactDesignation}
                      onChange={(e) => setContactDesignation(e.target.value)}
                      className="rounded-lg glossy-input px-3 py-2 text-sm w-full outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-blue-100 my-1" />

              {/* Address */}
              <div className="flex flex-col gap-3 flex-1 min-h-[140px]">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">3</span>
                  <h3 className="text-base font-bold text-black">Address</h3>
                  <span className="text-xs text-blue-500">(optional)</span>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-bold text-blue-700">Address</label>
                  <textarea
                    placeholder="Enter full address..."
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    className="rounded-lg glossy-input px-3 py-2 text-sm resize-none w-full flex-1 min-h-[90px] focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-blue-200 pt-5 mt-6">
            <Link
              href="/dashboard/admin/master-profile/supplier"
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
  );
}
