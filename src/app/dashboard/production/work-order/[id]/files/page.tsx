"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast as hotToast } from "react-hot-toast";
import { getWorkOrderFiles, deleteWorkOrderFile } from "../../actions";
import { getFileCategoriesList } from "@/app/dashboard/master-profile/file-category/actions";
import { customConfirm } from "@/lib/customConfirm";
import UploadFileDialog from "./UploadFileDialog";
import { useSession } from "next-auth/react";
import { canCreate, canDelete } from "@/lib/access";

export default function WorkOrderFilesPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const permissions = (session?.user as any)?.permissions;
  const canUpload = canCreate(permissions, 'WORK_ORDER', userRole);
  const canDeleteFile = canDelete(permissions, 'WORK_ORDER', userRole);

  const params = useParams();
  const id = params.id as string;

  const [files, setFiles] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [filesRes, catRes] = await Promise.all([
        getWorkOrderFiles(id),
        getFileCategoriesList()
      ]);

      if (filesRes.success && filesRes.data) {
        setFiles(filesRes.data);
      }
      
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleDelete = async (fileId: string) => {
    if (await customConfirm("Are you sure you want to delete this file?")) {
      const res = await deleteWorkOrderFile(fileId, id);
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
    <div className="p-0 sm:p-4 max-w-7xl mx-auto space-y-1 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-1 justify-between px-1 sm:px-0 mt-1 sm:mt-0">
        <div className="flex items-start md:items-center gap-1 w-full md:w-auto">
          <Link
            href="/dashboard/production/work-order"
            className="p-0.5 sm:p-2 shrink-0 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors mt-0.5 md:mt-0"
          >
            <ArrowLeft size={12} className="sm:w-5 sm:h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-xl md:text-2xl font-bold text-slate-800 break-words leading-tight">Work Order: {id}</h1>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto no-scrollbar">
        <nav className="-mb-px flex space-x-1 sm:space-x-8 min-w-max px-1 sm:px-0">
          <Link
            href={`/dashboard/production/work-order/${id}`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium whitespace-nowrap"
          >
            Order Details
          </Link>
          <Link
            href={`/dashboard/production/work-order/${id}/routing`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium whitespace-nowrap"
          >
            In-Process & Routing
          </Link>
          <Link
            href={`/dashboard/production/work-order/${id}/timesheets`}
            className="border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium whitespace-nowrap"
          >
            Timesheets & Parameters
          </Link>
          <div className="border-b-2 border-blue-600 text-blue-600 py-1.5 sm:py-4 px-1 text-[10px] sm:text-sm font-medium whitespace-nowrap">
            Files
          </div>
        </nav>
      </div>

      <div className="bg-white rounded-md sm:rounded-xl shadow-sm border-y sm:border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-1.5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 sm:gap-4 bg-slate-50">
          <div>
            <h3 className="text-[11px] sm:text-lg font-semibold text-slate-800">Work Order Files</h3>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
              Upload and manage files associated with this work order.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 w-full sm:w-auto">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-[10px] sm:text-sm py-1 sm:py-2 px-2 sm:px-3 border outline-none flex-1 sm:flex-none"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {canUpload && (
              <button
                onClick={() => setIsDialogOpen(true)}
                className="inline-flex items-center justify-center gap-1 sm:gap-2 rounded sm:rounded-lg bg-blue-600 hover:bg-blue-700 px-2 sm:px-4 py-1 sm:py-2 text-[9px] sm:text-sm font-medium text-white shadow-sm transition-colors cursor-pointer flex-1 sm:flex-none"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Upload Files
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center min-h-[300px]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 p-12 text-center min-h-[300px]">
            <svg className="h-12 w-12 text-slate-300 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="font-medium text-slate-700">No files uploaded</p>
            <p className="text-[10px] sm:text-sm text-slate-500 mt-1">Click the upload button to add files to this work order.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left min-w-[500px]">
              <thead className="text-[10px] sm:text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-2 py-2 sm:px-6 sm:py-3 font-semibold">File Name</th>
                  <th className="px-2 py-2 sm:px-6 sm:py-3 font-semibold">Category</th>
                  <th className="px-2 py-2 sm:px-6 sm:py-3 font-semibold">Size</th>
                  <th className="px-2 py-2 sm:px-6 sm:py-3 font-semibold">Uploaded</th>
                  <th className="px-2 py-2 sm:px-6 sm:py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[10px] sm:text-sm">
                {(filterCategory === "All" ? files : files.filter(f => f.fileCategoryId === filterCategory)).map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-2 sm:px-6 sm:py-4 font-medium text-slate-800 break-all max-w-[200px]">
                      {file.fileName}
                    </td>
                    <td className="px-2 py-2 sm:px-6 sm:py-4 text-slate-600">
                      {file.fileCategory?.name || "-"}
                    </td>
                    <td className="px-2 py-2 sm:px-6 sm:py-4 text-slate-600 whitespace-nowrap">
                      {formatSize(file.fileSize)}
                    </td>
                    <td className="px-2 py-2 sm:px-6 sm:py-4 text-slate-600 whitespace-nowrap">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2 sm:px-6 sm:py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 sm:p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Preview"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>
                        <a
                          href={file.fileUrl}
                          download={file.fileName}
                          className="p-1 sm:p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                          title="Download"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                        {canDeleteFile && (
                          <button
                            onClick={() => handleDelete(file.id)}
                            className="p-1 sm:p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isDialogOpen && (
        <UploadFileDialog
          workOrderNo={id}
          categories={categories}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
