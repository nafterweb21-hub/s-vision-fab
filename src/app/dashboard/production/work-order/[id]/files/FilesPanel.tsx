"use client";

import React, { useState, useEffect } from "react";
import { Eye, Download, Trash2, Upload, FileText, Loader2, FolderOpen } from "lucide-react";
import { EmptyState, buttonClass, selectTriggerClass } from "@/components/form-ui";
import { toast as hotToast } from "react-hot-toast";
import { getWorkOrderFiles, deleteWorkOrderFile } from "../../actions";
import { getFileCategoriesList } from "@/app/dashboard/master-profile/file-category/actions";
import { customConfirm } from "@/lib/customConfirm";
import UploadFileDialog from "./UploadFileDialog";
import { useSession } from "next-auth/react";
import { canCreate, canDelete } from "@/lib/access";

/** File list + upload for one work order (rendered inside the WO shell by ./page.tsx). */
export default function FilesPanel({ workOrderNo }: { workOrderNo: string }) {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const permissions = (session?.user as any)?.permissions;
  const canUpload = canCreate(permissions, 'WORK_ORDER', userRole);
  const canDeleteFile = canDelete(permissions, 'WORK_ORDER', userRole);

  const id = workOrderNo;

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

  const visible = filterCategory === "All" ? files : files.filter((f) => f.fileCategoryId === filterCategory);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-600/15">
              <FolderOpen size={15} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold leading-tight text-slate-800">Work order files</h2>
              <p className="text-[11px] leading-tight text-slate-500">
                {files.length} file{files.length === 1 ? "" : "s"} · drawings, reports and photos for this work order
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`${selectTriggerClass} w-full sm:w-48`}
              aria-label="Filter by category"
            >
              <option value="All">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {canUpload && (
              <button type="button" onClick={() => setIsDialogOpen(true)} className={buttonClass("primary", "md")}>
                <Upload size={14} /> Upload Files
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            tone="indigo"
            title={files.length === 0 ? "No files uploaded" : "No files in this category"}
            description={files.length === 0 && canUpload ? "Upload drawings, reports or photos for this work order." : undefined}
            action={
              files.length === 0 && canUpload ? (
                <button type="button" onClick={() => setIsDialogOpen(true)} className={buttonClass("primary", "md")}>
                  <Upload size={14} /> Upload Files
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th className="py-2 pl-4 pr-3 font-medium">File</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Size</th>
                  <th className="px-3 py-2 font-medium">Uploaded</th>
                  <th className="px-4 py-2 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((file) => (
                  <tr key={file.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="max-w-[320px] py-2 pl-4 pr-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate font-medium text-slate-800" title={file.fileName}>{file.fileName}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{file.fileCategory?.name || <span className="text-slate-400">—</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">{formatSize(file.fileSize)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                      {new Date(file.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <a href={file.fileUrl} target="_blank" rel="noreferrer" className={iconBtn} title="Preview" aria-label={`Preview ${file.fileName}`}>
                          <Eye size={14} />
                        </a>
                        <a href={file.fileUrl} download={file.fileName} className={iconBtn} title="Download" aria-label={`Download ${file.fileName}`}>
                          <Download size={14} />
                        </a>
                        {canDeleteFile && (
                          <button
                            type="button"
                            onClick={() => handleDelete(file.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="Delete"
                            aria-label={`Delete ${file.fileName}`}
                          >
                            <Trash2 size={14} />
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
        <UploadFileDialog workOrderNo={id} categories={categories} onClose={() => setIsDialogOpen(false)} onSuccess={loadData} />
      )}
    </>
  );
}

const iconBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600";
