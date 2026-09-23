import { prisma } from "@/lib/prisma";

export async function getDesignationProfiles() {
  return await prisma.designationProfile.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDesignationProfileById(id: string) {
  return await prisma.designationProfile.findUnique({
    where: { id },
  });
}

export async function createDesignationProfile(data: {
  designation: string;
  remark?: string;
  createdBy?: string;
}) {
  const existing = await prisma.designationProfile.findUnique({
    where: { designation: data.designation },
  });

  if (existing) {
    if (existing.isDeleted) {
      return await prisma.designationProfile.update({
        where: { id: existing.id },
        data: {
          isDeleted: false,
          remark: data.remark,
          status: "Active",
          updatedBy: data.createdBy,
        },
      });
    } else {
      throw new Error("A Designation Profile with this name already exists.");
    }
  }

  return await prisma.designationProfile.create({
    data: {
      ...data,
      status: "Active",
    },
  });
}

export async function updateDesignationProfile(
  id: string,
  data: {
    designation?: string;
    remark?: string;
    status?: string;
    updatedBy?: string;
  }
) {
  return await prisma.designationProfile.update({
    where: { id },
    data,
  });
}

export async function deleteDesignationProfile(id: string, updatedBy?: string) {
  return await prisma.designationProfile.update({
    where: { id },
    data: {
      isDeleted: true,
      updatedBy,
    },
  });
}
