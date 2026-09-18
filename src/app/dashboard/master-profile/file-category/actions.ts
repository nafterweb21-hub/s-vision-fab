"use server";

import { revalidatePath } from "next/cache";
import {
  getFileCategories,
  createFileCategory,
  updateFileCategory,
  deleteFileCategory,
} from "@/lib/file-categories";

export async function getFileCategoriesList() {
  try {
    const data = await getFileCategories();
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching file categories:", error);
    return { success: false, error: "Failed to fetch file categories." };
  }
}

export async function getFileCategoryDetail(id: string) {
  try {
    const data = await getFileCategories();
    const item = data.find((d: any) => d.id === id);
    if (!item) return { success: false, error: "File Category not found." };
    return { success: true, data: item };
  } catch (error: any) {
    console.error("Error fetching file category detail:", error);
    return { success: false, error: "Failed to fetch file category details." };
  }
}

export async function createFileCategoryProfile(data: { name: string; remark?: string }) {
  try {
    const newItem = await createFileCategory(data);
    revalidatePath("/dashboard/master-profile/file-category");
    return { success: true, data: newItem };
  } catch (error: any) {
    console.error("Error creating file category:", error);
    return { success: false, error: error.message || "Failed to create file category." };
  }
}

export async function updateFileCategoryProfile(id: string, data: { remark?: string; status?: string }) {
  try {
    const updated = await updateFileCategory(id, data);
    revalidatePath("/dashboard/master-profile/file-category");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating file category:", error);
    return { success: false, error: error.message || "Failed to update file category." };
  }
}

export async function toggleFileCategoryStatus(id: string) {
  try {
    const items = await getFileCategories();
    const item = items.find((i: any) => i.id === id);
    if (!item) return { success: false, error: "File Category not found." };

    const newStatus = item.status === "Active" ? "Inactive" : "Active";
    const updated = await updateFileCategory(id, {
      status: newStatus,
    });
    revalidatePath("/dashboard/master-profile/file-category");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error toggling file category status:", error);
    return { success: false, error: error.message || "Failed to update status." };
  }
}

export async function deleteFileCategoryProfile(id: string) {
  try {
    await deleteFileCategory(id);
    revalidatePath("/dashboard/master-profile/file-category");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting file category:", error);
    return { success: false, error: error.message || "Failed to delete file category." };
  }
}

// -- File Profile Actions --

import { getFileProfiles, saveFileProfile, deleteFileProfile } from "@/lib/file-categories";

export async function getFileProfilesList(categoryId: string) {
  try {
    const data = await getFileProfiles(categoryId);
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching file profiles:", error);
    return { success: false, error: "Failed to fetch file profiles." };
  }
}

export async function createFileProfile(data: {
  fileCategoryId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
}) {
  try {
    const newItem = await saveFileProfile(data);
    revalidatePath(`/dashboard/master-profile/file-category/${data.fileCategoryId}/files`);
    return { success: true, data: newItem };
  } catch (error: any) {
    console.error("Error saving file profile:", error);
    return { success: false, error: error.message || "Failed to save file profile." };
  }
}

export async function deleteFileProfileAction(id: string, categoryId: string) {
  try {
    await deleteFileProfile(id);
    revalidatePath(`/dashboard/master-profile/file-category/${categoryId}/files`);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting file profile:", error);
    return { success: false, error: error.message || "Failed to delete file profile." };
  }
}
