"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
getMaterialCategories,
  updateMaterialProfile,
  getMaterialDetail,
} from "../../actions";

interface MaterialCategory {
  id: string;
  name: string;
}

export default function EditMaterialPage() {
  const params = useParams();
  const id = params?.id as string;

  const router = useRouter();
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [editShape, setEditShape] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [description, setDescription] = useState("");
  const [partNo, setPartNo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [categoriesRes, materialRes] = await Promise.all([
          getMaterialCategories(),
          getMaterialDetail(id),
        ]);

        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data as MaterialCategory[]);
        }

        if (materialRes.success && materialRes.data) {
          const material = materialRes.data as any;
          setEditShape(material.shape);
          setEditSize(material.size || "");
          setEditCategoryId(material.categoryId);
          setEditRemark(material.remark || "");
          setDescription(material.description);
          setPartNo(material.partNo);
        } else {
          setFormError(materialRes.error || "Material not found.");
        }
      } catch (err) {
        console.error(err);
        setFormError("Failed to load material data.");
      }
      setIsLoading(false);
    };

    loadData();
  }, [id]);

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!editShape.trim()) return setFormError("Shape is required.");
    if (!editCategoryId) return setFormError("Material Category is required.");

    startTransition(async () => {
      const res = await updateMaterialProfile(id, {
        shape: editShape.trim(),
        size: editSize.trim() || undefined,
        categoryId: editCategoryId,
        remark: editRemark.trim() || undefined,
      });

      if (res.success) {
        router.push("/dashboard/master-profile/material");
      } else {
        setFormError(res.error || "Failed to update material.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-cyan-600" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold tracking-tight text-blue-900 flex items-center gap-3">
            <span>Edit Material Profile</span>
            {partNo && (
              <span className="text-xs bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 text-blue-600 ">
                {partNo}
              </span>
            )}
          </h1>
          <p className="text-sm text-blue-500 mt-1">
            Update existing material details.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-md border border-blue-200 ">
        <form onSubmit={handleUpdateMaterial} className="space-y-6">
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

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 ">
            <p className="text-xs text-blue-500 uppercase font-semibold mb-1">Description</p>
            <p className="text-sm font-medium text-blue-900 ">{description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-blue-800 ">
                Category <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                required
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 "
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </SearchableSelect>
            </div>
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
                value={editShape}
                onChange={(e) => setEditShape(e.target.value)}
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
                value={editSize}
                onChange={(e) => setEditSize(e.target.value)}
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
              value={editRemark}
              onChange={(e) => setEditRemark(e.target.value)}
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
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
