"use client";

import React, { useState, useRef, DragEvent } from "react";
import { toast as hotToast } from "react-hot-toast";
import { saveWorkOrderFile } from "@/app/dashboard/production/work-order/actions";
import { Loader2, UploadCloud, X } from "lucide-react";
import { selectTriggerClass } from "@/components/form-ui";

interface UploadFileDialogProps {
  workOrderNo: string;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadFileDialog({ workOrderNo, categories, onClose, onSuccess }: UploadFileDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories.length > 0 ? categories[0].id : "");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    if (!selectedCategoryId) {
      hotToast.error("Please select a file category first.");
      return;
    }
    
    if (files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/s3-upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to upload ${file.name}`);
        }

        const { url } = await res.json();

        const saveRes = await saveWorkOrderFile({
          workOrderNo,
          fileCategoryId: selectedCategoryId,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          fileUrl: url,
        });

        if (saveRes.success) {
          successCount++;
        } else {
          throw new Error(saveRes.error || `Failed to save ${file.name} to DB`);
        }
      } catch (err: any) {
        hotToast.error(err.message || `Error uploading ${file.name}`);
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      hotToast.success(`Successfully uploaded ${successCount} file(s)`);
      onSuccess();
      onClose();
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={isUploading ? undefined : onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-600/15">
              <UploadCloud size={15} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold leading-tight text-slate-800">Upload files</h2>
              <p className="truncate font-mono text-[11px] leading-tight text-slate-500">{workOrderNo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              File Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className={`${selectTriggerClass} w-full`}
              disabled={isUploading}
            >
              <option value="" disabled>
                Select a category...
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !isUploading) fileInputRef.current?.click();
            }}
            className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
              isDragging ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/30"
            }`}
          >
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) {
                  processFiles(Array.from(e.target.files));
                }
              }}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <p className="text-[13px] font-medium text-slate-600">Uploading files…</p>
              </div>
            ) : (
              <>
                <UploadCloud size={32} className="mx-auto mb-2 text-slate-400" />
                <p className="text-[13px] font-medium text-slate-700">Click to select files</p>
                <p className="mt-0.5 text-xs text-slate-500">or drag and drop them here</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
