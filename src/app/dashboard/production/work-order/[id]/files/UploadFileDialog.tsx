"use client";

import React, { useState, useRef, DragEvent } from "react";
import { toast as hotToast } from "react-hot-toast";
import { saveWorkOrderFile } from "@/app/dashboard/production/work-order/actions";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-md sm:rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-2 sm:p-4 border-b flex items-center justify-between bg-slate-50">
          <h2 className="text-[11px] sm:text-lg font-bold text-slate-800">Upload Files to Work Order</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-0.5 sm:p-1"
            disabled={isUploading}
          >
            <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
          <div>
            <label className="block text-[10px] sm:text-sm font-medium text-slate-700 mb-0.5 sm:mb-1">
              File Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full border-slate-300 rounded sm:rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-[10px] sm:text-sm p-1.5 sm:p-2.5 border"
              disabled={isUploading}
            >
              <option value="" disabled>Select a category...</option>
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
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-md sm:rounded-xl p-4 sm:p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
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
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2 sm:mb-3"></div>
                <p className="text-slate-600 font-medium text-[9px] sm:text-sm">Uploading files to S3...</p>
              </div>
            ) : (
              <>
                <svg
                  className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-slate-400 mb-1.5 sm:mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-slate-700 font-medium text-[10px] sm:text-base">Click to select files</p>
                <p className="text-slate-500 text-[9px] sm:text-sm mt-0.5 sm:mt-1">or drag and drop them here</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
