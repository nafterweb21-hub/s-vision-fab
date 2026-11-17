"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  getSupplierProfiles,
  toggleSupplierStatus,
  deleteSupplierProfile,
} from "./actions";

interface SupplierSummary {
  id: string;
  supplierCode: string;
  supplierName: string;
  remarks: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    contactPersons: number;
    addresses: number;
  };
}

export default function SupplierProfilePage() {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadSuppliers = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const result = await getSupplierProfiles();
    if (result.success && result.data) {
      setSuppliers(result.data as SupplierSummary[]);
    } else {
      setErrorMsg(result.error || "Failed to load supplier profiles.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const run = async () => {
      await loadSuppliers();
    };
    run();
  }, []);

  const handleToggleSupplierStatus = async (id: string) => {
    startTransition(async () => {
      const res = await toggleSupplierStatus(id);
      if (res.success) {
        loadSuppliers();
      } else {
        hotToast.error(res.error || "Failed to change status.");
      }
    });
  };

  const handleDeleteSupplier = async (id: string) => {
    if (
      await customConfirm(
        "Are you sure you want to delete this supplier? This will also delete all associated addresses and contact persons."
      )
    ) {
      startTransition(async () => {
        const res = await deleteSupplierProfile(id);
        if (res.success) {
          loadSuppliers();
        } else {
          hotToast.error(res.error || "Failed to delete supplier.");
        }
      });
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.supplierCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 text-black py-3 w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Supplier Profile
          </h1>
          <p className="text-sm text-blue-600">
            Maintain the master list of suppliers along with their contact persons and addresses.
          </p>
        </div>
        <Link
          href="/dashboard/admin/master-profile/supplier/create"
          className="inline-flex items-center gap-2 rounded-lg glossy-button-blue px-4 py-2.5 text-sm font-bold text-white shadow-md cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Supplier
        </Link>
      </div>

      {/* Search */}
      <div className="rounded-xl glossy-bg p-4 bg-white">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg glossy-input py-2 pl-10 pr-4 text-sm outline-hidden placeholder:text-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Supplier Table */}
      <div className="overflow-hidden rounded-xl glossy-bg bg-white">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        ) : errorMsg ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="font-semibold text-black">Error loading suppliers</p>
            <p className="text-sm text-blue-600">{errorMsg}</p>
            <button
              onClick={loadSuppliers}
              className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-500 cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
            <p className="mt-2 font-semibold text-black">No suppliers found</p>
            <p className="text-sm text-blue-600">
              {searchQuery
                ? "No matches for your criteria."
                : "Create your first Supplier Profile to begin."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-blue-200 bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-700">
                  <th className="px-6 py-4 w-16">SN</th>
                  <th className="px-6 py-4">Supplier Code</th>
                  <th className="px-6 py-4">Supplier Name</th>
                  <th className="px-6 py-4 text-center">Contacts</th>
                  <th className="px-6 py-4 text-center">Addresses</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200">
                {filteredSuppliers.map((supplier, index) => (
                  <tr key={supplier.id} className="group hover:bg-blue-50/40 transition-colors">
                    <td className="px-6 py-4 text-sm text-blue-500">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-bold text-black">
                      {supplier.supplierCode}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-800">
                      {supplier.supplierName}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-blue-850 font-semibold">
                      {supplier._count.contactPersons}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-blue-850 font-semibold">
                      {supplier._count.addresses}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          supplier.status === "Active"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-blue-50 text-blue-600 border-blue-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            supplier.status === "Active" ? "bg-blue-600" : "bg-blue-400"
                          }`}
                        />
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <Link
                          href={`/dashboard/admin/master-profile/supplier/${supplier.id}`}
                          className="rounded-md glossy-button-blue px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                        >
                          Manage
                        </Link>
                        <button
                          onClick={() => handleToggleSupplierStatus(supplier.id)}
                          disabled={isPending}
                          className={`rounded-md px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                            supplier.status === "Active"
                              ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                              : "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                          }`}
                        >
                          {supplier.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          disabled={isPending}
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
