// Updated for prisma_v14
import { prisma } from "@/lib/prisma";

export async function getFileCategories() {
  return prisma.fileCategoryProfile.findMany({ orderBy: { name: "asc" } });
}

export async function createFileCategory(data: { name: string; remark?: string }) {
  const existing = await prisma.fileCategoryProfile.findUnique({ where: { name: data.name } });
  if (existing) throw new Error("File Category already exists");

  return prisma.fileCategoryProfile.create({
    data: {
      name: data.name,
      remark: data.remark,
    },
  });
}

export async function updateFileCategory(
  id: string,
  data: { remark?: string | null; status?: string }
) {
  return prisma.fileCategoryProfile.update({
    where: { id },
    data: {
      remark: data.remark,
      status: data.status,
    },
  });
}

export async function deleteFileCategory(id: string) {
  await prisma.fileCategoryProfile.delete({ where: { id } });
  return true;
}

export async function getFileProfiles(categoryId: string) {
  return prisma.fileProfile.findMany({
    where: { fileCategoryId: categoryId },
    orderBy: { createdAt: "desc" },
  });
}

export async function saveFileProfile(data: {
  fileCategoryId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
}) {
  return prisma.fileProfile.create({
    data,
  });
}

export async function deleteFileProfile(id: string) {
  await prisma.fileProfile.delete({ where: { id } });
  return true;
}
