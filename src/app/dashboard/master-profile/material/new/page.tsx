"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getMaterialCategories,
  createMaterialProfile,
  createMaterialCategory,
} from "../actions";
import Link from "next/link";
interface MaterialCategory {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

export default function CreateMaterialPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [isPending, startTransition] = useTransition();

  // Create Material Form States
  const [newPartNo, setNewPartNo] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newShape, setNewShape] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newRemark, setNewRemark] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Category Form States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [catFormError, setCatFormError] = useState<string | null>(null);

  const loadCategories = async () => {
    const categoriesRes = await getMaterialCategories();
    if (categoriesRes.success && categoriesRes.data) {
      setCategories(categoriesRes.data as MaterialCategory[]);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newDescription.trim()) return setFormError("Description is required.");
    if (!newShape.trim()) return setFormError("Shape is required.");
    if (!newCategoryId) return setFormError("Material Category is required.");

    startTransition(async () => {
      const res = await createMaterialProfile({
        partNo: newPartNo.trim() || undefined,
        description: newDescription.trim(),
        shape: newShape.trim(),
        size: newSize.trim() || undefined,
        categoryId: newCategoryId,
        remark: newRemark.trim() || undefined,
      });

      if (res.success) {
        router.push("/dashboard/master-profile/material");
      } else {
        setFormError(res.error || "Failed to create material.");
      }
    });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError(null);

    if (!newCatName.trim()) return setCatFormError("Category Name is required.");

    startTransition(async () => {
      const res = await createMaterialCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      });

      if (res.success) {
        setIsCategoryModalOpen(false);
        setNewCatName("");
        setNewCatDesc("");
        // Reload categories
        const catRes = await getMaterialCategories();
        if (catRes.success && catRes.data) {
          setCategories(catRes.data as MaterialCategory[]);
          // Auto-select the new category
          setNewCategoryId(res.data?.id || "");
        }
      } else {
        setCatFormError(res.error || "Failed to create category.");
      }
    });
  };

  return (
    <div className="flex-1 w-full space-y-4 bg-blue-50 p-4 text-blue-900">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-blue-200 pb-4">
        <Link
          href="/dashboard/master-profile/material"
          className="p-2 rounded-lg hover:bg-blue-200 :bg-blue-800 transition-colors"
        >
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900 ">
            Create Material Profile
          </h1>
          <p className="text-sm text-blue-500 mt-1">
            Add a new material to the master list.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-md border border-blue-200 ">
        <form onSubmit={handleCreateMaterial} className="space-y-6">
          {formError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-sm text-rose-800 ">
              <div className="flex gap-2.5">
                <svg className="h-5 w-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{formError}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Part No */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-blue-800 ">
                Part No
              </label>
              <input
                type="text"
                placeholder="e.g. MAT-1001"
                value={newPartNo}
                onChange={(e) => setNewPartNo(e.target.value)}
                className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 "
              />
              <p className="text-[10px] text-blue-500">Optional. Cannot be changed later.</p>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-blue-800 ">
                Category <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <SearchableSelect
                  required
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 "
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SearchableSelect>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="rounded-lg bg-blue-100 px-3 border border-blue-200 text-blue-600 hover:bg-blue-200 :bg-blue-700 transition-colors"
                  title="Add new category"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-blue-800 ">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Material description..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 resize-none "
            />
            <p className="text-[10px] text-blue-500">Cannot be changed later.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Shape */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-blue-800 ">
                Shape <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Round Bar"
                value={newShape}
                onChange={(e) => setNewShape(e.target.value)}
                className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 "
              />
            </div>

            {/* Size */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-blue-800 ">
                Size
              </label>
              <input
                type="text"
                placeholder="e.g. 50mm"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 "
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-blue-800 ">
              Remarks
            </label>
            <textarea
              rows={3}
              placeholder="Additional remarks..."
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 resize-none "
            />
          </div>



          {/* Form Buttons */}
          <div className="flex items-center justify-end gap-4 border-t border-blue-200 pt-6 mt-8">
            <Link
              href="/dashboard/master-profile/material"
              className="rounded-lg px-6 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 :bg-blue-800 transition-colors cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-70 transition-colors cursor-pointer"
            >
              {isPending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Save Material"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)} />

          <div className="relative w-full max-w-sm transform overflow-hidden rounded-xl bg-white p-6 shadow-2xl border border-blue-200 transition-all">
            <h3 className="text-md font-bold text-blue-900 mb-4">Add Material Category</h3>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              {catFormError && (
                <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded">
                  {catFormError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-blue-800 ">Category Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 "
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-blue-800 ">Description</label>
                <textarea
                  rows={2}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 resize-none "
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-blue-100 :bg-blue-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-900 text-white "
                >
                  {isPending ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
