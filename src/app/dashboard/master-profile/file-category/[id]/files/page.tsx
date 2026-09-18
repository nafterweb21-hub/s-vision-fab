"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast as hotToast } from "react-hot-toast";
import {
  getFileCategoryDetail,
  getFileProfilesList,
  createFileProfile,
  deleteFileProfileAction,
} from "../../actions";
import { customConfirm } from "@/lib/customConfirm";

interface FileProfile {
  id: string;
  fileCategoryId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  createdAt: string;
}

export default function FileProfilePage() {
  const params = useParams();
  const categoryId = params.id as string;

  const [categoryName, setCategoryName] = useState("");
  const [files, setFiles] = useState<FileProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    const catRes = await getFileCategoryDetail(categoryId);
    if (catRes.success && catRes.data) {
      setCategoryName((catRes.data as any).name);
    }

    const filesRes = await getFileProfilesList(categoryId);
    if (filesRes.success && filesRes.data) {
      setFiles(filesRes.data as any[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (categoryId) {
      loadData();
    }
  }, [categoryId]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    const selectedFiles = Array.from(e.target.files);
    
    let successCount = 0;
    
    for (const file of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to upload file");
        }
        
        const data = await res.json();
        
        // Save to DB
        const saveRes = await createFileProfile({
          fileCategoryId: categoryId,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          fileUrl: data.url,
        });
        
        if (saveRes.success) {
          successCount++;
        } else {
          hotToast.error(saveRes.error || `Failed to save ${file.name}`);
        }
      } catch (err: any) {
        hotToast.error(err.message || `Error uploading ${file.name}`);
      }
    }
    
    if (successCount > 0) {
      hotToast.success(`Successfully uploaded ${successCount} file(s)`);
      loadData();
    }
    
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string) => {
    if (await customConfirm("Are you sure you want to delete this file?")) {
      const res = await deleteFileProfileAction(fileId, categoryId);
      if (res.success) {
        hotToast.success("File deleted successfully");
        loadData();
      } else {
        hotToast.error(res.error || "Failed to delete file");
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-7xl mx-auto w-full bg-blue-50 text-blue-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/master-profile/file-category" className="text-blue-500 hover:text-cyan-600">
              File Category
            </Link>
            <span className="text-blue-300">/</span>
            <h1 className="text-2xl font-bold tracking-tight text-blue-900">
              {categoryName ? `${categoryName} Files` : "Files"}
            </h1>
          </div>
          <p className="text-sm text-blue-500 mt-1">
            Manage files for this category.
          </p>
        </div>

        <button
          onClick={handleUploadClick}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          )}
          Upload Files
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />
      </div>

      <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden shadow-sm flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-cyan-600" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 p-12 text-center">
            <svg className="h-16 w-16 text-blue-300 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="font-semibold text-blue-900 text-lg">No files uploaded yet</p>
            <p className="text-sm text-blue-500 mt-2 max-w-sm">
              Click the "Upload Files" button to add documents, images, or other files to this category.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-blue-200 bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-500">
                  <th className="px-6 py-4 w-16">SN</th>
                  <th className="px-6 py-4">File Name</th>
                  <th className="px-6 py-4">File Type</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Uploaded Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200">
                {files.map((item, index) => (
                  <tr key={item.id} className="group hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-blue-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-900">
                      {item.fileName}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-700">
                      {item.fileType}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-700 whitespace-nowrap">
                      {formatSize(item.fileSize)}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-700 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 text-cyan-600 hover:text-white hover:bg-cyan-600 hover:border-cyan-600 transition-all duration-150"
                          title="Preview File"
                        >
                          <svg className="h-4.5 w-4.5 text-[18px] block" width="1em" height="1em" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>
                        <a
                          href={item.fileUrl}
                          download={item.fileName}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 text-blue-600 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all duration-150"
                          title="Download File"
                        >
                          <svg className="h-4.5 w-4.5 text-[18px] block" width="1em" height="1em" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 text-rose-500 hover:text-white hover:bg-rose-500 hover:border-rose-600 transition-all duration-150 cursor-pointer"
                          title="Delete File"
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
