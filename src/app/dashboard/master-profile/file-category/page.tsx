"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  getFileCategoriesList,
  toggleFileCategoryStatus,
  deleteFileCategoryProfile,
} from "./actions";

interface FileCategoryProfile {
  id: string;
  name: string;
  remark: string | null;
  status: string;
}

export default function FileCategoryProfilePage() {
  const [items, setItems] = useState<FileCategoryProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const res = await getFileCategoriesList();

    if (res.success && res.data) {
      setItems(res.data as unknown as FileCategoryProfile[]);
    } else {
      setErrorMsg(res.error || "Failed to load file categories.");
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (id: string) => {
    startTransition(async () => {
      const res = await toggleFileCategoryStatus(id);
      if (res.success) {
        loadData();
      } else {
        hotToast.error(res.error || "Failed to change status.");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (await customConfirm("Are you sure you want to delete this file category?")) {
      startTransition(async () => {
        const res = await deleteFileCategoryProfile(id);
        if (res.success) {
          loadData();
        } else {
          hotToast.error(res.error || "Failed to delete file category.");
        }
      });
    }
  };

  const filteredItems = items.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.remark?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-7xl mx-auto w-full bg-blue-50 text-blue-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900">
            File Category Profile
          </h1>
          <p className="text-sm text-blue-500 mt-1">
            Maintain the master list of file categories.
          </p>
        </div>

        <Link
          href="/dashboard/master-profile/file-category/new"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add File Category
        </Link>
      </div>

      <div className="rounded-xl border border-blue-200 bg-white p-4">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name or remark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2 pl-10 pr-4 text-sm text-blue-900 outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden shadow-sm flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-cyan-600" />
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 p-6 text-center">
            <svg className="h-10 w-10 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="font-semibold text-blue-900">Error loading file categories</p>
            <p className="text-sm text-blue-500">{errorMsg}</p>
            <button onClick={loadData} className="mt-2 text-sm font-semibold text-cyan-600 hover:text-cyan-500 cursor-pointer">
              Try again
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
            <svg className="h-12 w-12 text-blue-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
            <p className="mt-3 font-semibold text-blue-900">No file categories found</p>
            <p className="text-sm text-blue-500 mt-1">
              {searchQuery ? "No matches for your criteria." : "Create your first File Category to begin."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-blue-200 bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-500">
                  <th className="px-6 py-4 w-16">SN</th>
                  <th className="px-6 py-4">File Category</th>
                  <th className="px-6 py-4">Remark</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200">
                {filteredItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className="group hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-blue-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-900 whitespace-nowrap">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-700">
                      {item.remark || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative inline-block">
                        <SearchableSelect
                          value={item.status}
                          onChange={() => handleToggleStatus(item.id)}
                          disabled={isPending}
                          className={`inline-flex items-center gap-1.5 rounded-full pl-3 pr-7 py-1 text-xs font-bold border appearance-none cursor-pointer outline-none transition-colors ${
                            item.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-2 focus:ring-emerald-500/20"
                              : "bg-blue-100 text-blue-600 border-blue-200 focus:ring-2 focus:ring-blue-500/20"
                          }`}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </SearchableSelect>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                          <svg className={`h-3.5 w-3.5 ${item.status === "Active" ? "text-emerald-600" : "text-blue-500"}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/master-profile/file-category/${item.id}/files`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 text-blue-500 hover:text-blue-950 hover:bg-blue-100 hover:border-blue-300 transition-all duration-150"
                          title="View Files"
                        >
                          <svg className="h-4.5 w-4.5 text-[18px] block" width="1em" height="1em" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/dashboard/master-profile/file-category/${item.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 text-blue-500 hover:text-blue-950 hover:bg-blue-100 hover:border-blue-300 transition-all duration-150"
                          title="Edit Profile"
                        >
                          <svg className="h-4.5 w-4.5 text-[18px] block" width="1em" height="1em" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={isPending}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 text-rose-500 hover:text-white hover:bg-rose-500 hover:border-rose-600 transition-all duration-150 cursor-pointer disabled:opacity-50"
                          title="Delete Profile"
                        >
                          <svg className="h-4.5 w-4.5 text-[18px] block" width="1em" height="1em" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
