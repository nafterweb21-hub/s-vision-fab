"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { nextDocumentNo, getPreviewNextDocumentNo } from "@/lib/document-numbering";

export interface CustomerProfileInput {
  customerCode?: string;
  customerName: string;
  remarks?: string;
  gstin?: string;
  isSez?: boolean;
  roNumber?: string;
  pan?: string;
  placeOfSupply?: string;
}

export interface ContactPersonInput {
  contactPersonName: string;
  telNo?: string;
  mobileNo?: string;
  faxNo?: string;
  email?: string;
  designation?: string;
  isDefault?: boolean;
}

export interface AddressInput {
  address: string;
  isDefault?: boolean;
}

const CUSTOMER_PATH = "/dashboard/admin/master-profile/customer";

// ==========================================
// 1. CUSTOMER PROFILE CRUD ACTIONS
// ==========================================

export async function getCustomerCodePreview() {
  try {
    return await getPreviewNextDocumentNo("CUSTOMER");
  } catch (error) {
    console.error("Failed to fetch customer code preview:", error);
    return "";
  }
}

export async function getCustomerProfiles() {
  try {
    const customers = await prisma.customerProfile.findMany({
      where: { status: { not: "Void" } },
      include: {
        _count: {
          select: {
            contactPersons: { where: { status: { not: "Void" } } },
            addresses: { where: { status: { not: "Void" } } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, data: customers };
  } catch (error) {
    console.error("Failed to fetch customer profiles:", error);
    return { success: false, error: "Failed to fetch customer profiles." };
  }
}

export async function getCustomerDetail(id: string) {
  try {
    const customer = await prisma.customerProfile.findUnique({
      where: { id },
      include: {
        contactPersons: {
          where: { status: { not: "Void" } },
          orderBy: [
            { isDefault: "desc" },
            { createdAt: "desc" },
          ],
        },
        addresses: {
          where: { status: { not: "Void" } },
          orderBy: [
            { isDefault: "desc" },
            { createdAt: "desc" },
          ],
        },
      },
    });
    if (!customer) {
      return { success: false, error: "Customer not found." };
    }
    return { success: true, data: customer };
  } catch (error) {
    console.error("Failed to fetch customer details:", error);
    return { success: false, error: "Failed to fetch customer details." };
  }
}

export async function createCustomerProfile(data: CustomerProfileInput) {
  try {
    const customerName = data.customerName.trim();
    const remarks = data.remarks?.trim() || "";

    if (!customerName) {
      return { success: false, error: "Customer Name is required." };
    }
    if (!data.gstin || !data.gstin.trim()) {
      return { success: false, error: "GSTIN is required." };
    }

    // Check uniqueness of Customer Name
    const existingName = await prisma.customerProfile.findUnique({
      where: { customerName },
    });
    if (existingName) {
      return { success: false, error: `Customer Name "${customerName}" already exists.` };
    }

    const newCustomer = await prisma.$transaction(async (tx) => {
      const isTaken = async (code: string) => {
        const existing = await tx.customerProfile.findUnique({ where: { customerCode: code } });
        return existing !== null;
      };
      
      const generatedCode = await nextDocumentNo(tx, "CUSTOMER", { isTaken });

      return await tx.customerProfile.create({
        data: {
          customerCode: generatedCode,
          customerName,
          remarks,
          gstin: data.gstin?.trim() || null,
          isSez: data.isSez || false,
          roNumber: data.roNumber?.trim() || null,
          pan: data.pan?.trim() || null,
          placeOfSupply: data.placeOfSupply?.trim() || null,
          status: "Active",
        },
      });
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true, data: newCustomer };
  } catch (error) {
    console.error("Failed to create customer profile:", error);
    return { success: false, error: (error as Error).message || "Failed to create customer profile." };
  }
}

export async function updateCustomerInfo(id: string, data: { remarks?: string; gstin?: string; isSez?: boolean; roNumber?: string; pan?: string; placeOfSupply?: string }) {
  try {
    const existing = await prisma.customerProfile.findUnique({
      where: { id },
    });
    if (!existing) {
      return { success: false, error: "Customer profile not found." };
    }

    if (!data.gstin || !data.gstin.trim()) {
      return { success: false, error: "GSTIN is required." };
    }

    const updated = await prisma.customerProfile.update({
      where: { id },
      data: {
        remarks: data.remarks?.trim() || null,
        gstin: data.gstin?.trim() || null,
        isSez: data.isSez !== undefined ? data.isSez : existing.isSez,
        roNumber: data.roNumber?.trim() || null,
        pan: data.pan?.trim() || null,
        placeOfSupply: data.placeOfSupply?.trim() || null,
      },
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to update customer info:", error);
    return { success: false, error: (error as Error).message || "Failed to update customer info." };
  }
}

export async function toggleCustomerStatus(id: string) {
  try {
    const existing = await prisma.customerProfile.findUnique({
      where: { id },
    });
    if (!existing) {
      return { success: false, error: "Customer profile not found." };
    }

    const newStatus = existing.status === "Active" ? "Inactive" : "Active";
    const updated = await prisma.customerProfile.update({
      where: { id },
      data: {
        status: newStatus,
      },
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to toggle customer status:", error);
    return { success: false, error: (error as Error).message || "Failed to toggle customer status." };
  }
}

export async function deleteCustomerProfile(id: string) {
  try {
    const existing = await prisma.customerProfile.findUnique({
      where: { id },
    });
    if (!existing) {
      return { success: false, error: "Customer profile not found." };
    }

    // Void instead of hard delete (cross-cutting rule: No DELETE — Void only).
    await prisma.customerProfile.update({
      where: { id },
      data: { status: "Void" },
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to void customer profile:", error);
    return { success: false, error: (error as Error).message || "Failed to delete customer profile." };
  }
}

// ==========================================
// 2. CONTACT PERSON CRUD ACTIONS
// ==========================================

export async function addContactPerson(customerId: string, data: ContactPersonInput) {
  try {
    const name = data.contactPersonName.trim();
    if (!name) {
      return { success: false, error: "Contact Person name is required." };
    }

    const isDefault = !!data.isDefault;

    // Check if this is the first non-void contact person. If so, make it default regardless
    const contactCount = await prisma.customerContactPerson.count({
      where: { customerId, status: { not: "Void" } },
    });
    const finalIsDefault = contactCount === 0 ? true : isDefault;

    // If setting default, unset other non-void contact persons
    if (finalIsDefault) {
      await prisma.customerContactPerson.updateMany({
        where: { customerId, status: { not: "Void" } },
        data: { isDefault: false },
      });
    }

    const newContact = await prisma.customerContactPerson.create({
      data: {
        customerId,
        contactPersonName: name,
        telNo: data.telNo?.trim() || null,
        mobileNo: data.mobileNo?.trim() || null,
        faxNo: data.faxNo?.trim() || null,
        email: data.email?.trim() || null,
        designation: data.designation?.trim() || null,
        status: "Active",
        isDefault: finalIsDefault,
      },
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true, data: newContact };
  } catch (error) {
    console.error("Failed to add contact person:", error);
    return { success: false, error: (error as Error).message || "Failed to add contact person." };
  }
}

export async function updateContactPerson(id: string, data: ContactPersonInput) {
  try {
    const name = data.contactPersonName.trim();
    if (!name) {
      return { success: false, error: "Contact Person name is required." };
    }

    const existing = await prisma.customerContactPerson.findUnique({
      where: { id },
    });
    if (!existing) {
      return { success: false, error: "Contact person not found." };
    }

    const updated = await prisma.customerContactPerson.update({
      where: { id },
      data: {
        contactPersonName: name,
        telNo: data.telNo?.trim() || null,
        mobileNo: data.mobileNo?.trim() || null,
        faxNo: data.faxNo?.trim() || null,
        email: data.email?.trim() || null,
        designation: data.designation?.trim() || null,
      },
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to update contact person:", error);
    return { success: false, error: (error as Error).message || "Failed to update contact person." };
  }
}

export async function toggleContactPersonStatus(id: string) {
  try {
    const existing = await prisma.customerContactPerson.findUnique({
      where: { id },
    });
    if (!existing) {
      return { success: false, error: "Contact person not found." };
    }

    const newStatus = existing.status === "Active" ? "Inactive" : "Active";
    const updated = await prisma.customerContactPerson.update({
      where: { id },
      data: { status: newStatus },
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to toggle contact person status:", error);
    return { success: false, error: (error as Error).message || "Failed to toggle contact person status." };
  }
}

export async function setContactPersonDefault(id: string, customerId: string) {
  try {
    // Unset all contact persons for this customer
    await prisma.customerContactPerson.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });

    // Set the selected one to default and ensure it is Active (business rule representation)
    const updated = await prisma.customerContactPerson.update({
      where: { id },
      data: { isDefault: true },
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to set default contact person:", error);
    return { success: false, error: (error as Error).message || "Failed to set default contact person." };
  }
}

export async function deleteContactPerson(id: string) {
  try {
    const existing = await prisma.customerContactPerson.findUnique({
      where: { id },
    });
    if (!existing) {
      return { success: false, error: "Contact person not found." };
    }

    await prisma.customerContactPerson.update({
      where: { id },
      data: { status: "Void", isDefault: false },
    });

    // If we voided the default contact, promote the next non-void one
    if (existing.isDefault) {
      const nextContact = await prisma.customerContactPerson.findFirst({
        where: {
          customerId: existing.customerId,
          status: { not: "Void" },
          id: { not: id },
        },
        orderBy: { createdAt: "asc" },
      });
      if (nextContact) {
        await prisma.customerContactPerson.update({
          where: { id: nextContact.id },
          data: { isDefault: true },
        });
      }
    }

    revalidatePath(CUSTOMER_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to void contact person:", error);
    return { success: false, error: (error as Error).message || "Failed to delete contact person." };
  }
}

// ==========================================
// 3. CUSTOMER ADDRESS CRUD ACTIONS
// ==========================================

export async function addAddress(customerId: string, data: AddressInput) {
  try {
    const addressText = data.address.trim();
    if (!addressText) {
      return { success: false, error: "Address is required." };
    }

    // Check if duplicate (non-void) address exists for this customer
    const existingAddr = await prisma.customerAddress.findFirst({
      where: { customerId, address: addressText, status: { not: "Void" } },
    });
    if (existingAddr) {
      return { success: false, error: "This exact address already exists for this customer." };
    }

    const isDefault = !!data.isDefault;

    // Check if this is the first non-void address. If so, make it default
    const addressCount = await prisma.customerAddress.count({
      where: { customerId, status: { not: "Void" } },
    });
    const finalIsDefault = addressCount === 0 ? true : isDefault;

    if (finalIsDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId, status: { not: "Void" } },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.customerAddress.create({
      data: {
        customerId,
        address: addressText,
        status: "Active",
        isDefault: finalIsDefault,
      },
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true, data: newAddress };
  } catch (error) {
    console.error("Failed to add address:", error);
    return { success: false, error: (error as Error).message || "Failed to add address." };
  }
}

export async function updateAddress(id: string, addressText: string) {
  try {
    const address = addressText.trim();
    if (!address) {
      return { success: false, error: "Address is required." };
    }

    const existing = await prisma.customerAddress.findUnique({
      where: { id },
    });
    if (!existing) {
      return { success: false, error: "Address not found." };
    }

    // Check duplicate (non-void) address for the same customer excluding this row
    const duplicate = await prisma.customerAddress.findFirst({
      where: {
        customerId: existing.customerId,
        address,
        status: { not: "Void" },
        NOT: { id },
      },
    });
    if (duplicate) {
      return { success: false, error: "This exact address already exists for this customer." };
    }

    const updated = await prisma.customerAddress.update({
      where: { id },
      data: {
        address,
      },
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to update address:", error);
    return { success: false, error: (error as Error).message || "Failed to update address." };
  }
}

export async function toggleAddressStatus(id: string) {
  try {
    const existing = await prisma.customerAddress.findUnique({
      where: { id },
    });
    if (!existing) {
      return { success: false, error: "Address not found." };
    }

    const newStatus = existing.status === "Active" ? "Inactive" : "Active";
    const updated = await prisma.customerAddress.update({
      where: { id },
      data: { status: newStatus },
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to toggle address status:", error);
    return { success: false, error: (error as Error).message || "Failed to toggle address status." };
  }
}

export async function setAddressDefault(id: string, customerId: string) {
  try {
    await prisma.customerAddress.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });

    const updated = await prisma.customerAddress.update({
      where: { id },
      data: { isDefault: true },
    });

    revalidatePath(CUSTOMER_PATH);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to set default address:", error);
    return { success: false, error: (error as Error).message || "Failed to set default address." };
  }
}

export async function deleteAddress(id: string) {
  try {
    const existing = await prisma.customerAddress.findUnique({
      where: { id },
    });
    if (!existing) {
      return { success: false, error: "Address not found." };
    }

    await prisma.customerAddress.update({
      where: { id },
      data: { status: "Void", isDefault: false },
    });

    if (existing.isDefault) {
      const nextAddr = await prisma.customerAddress.findFirst({
        where: {
          customerId: existing.customerId,
          status: { not: "Void" },
          id: { not: id },
        },
        orderBy: { createdAt: "asc" },
      });
      if (nextAddr) {
        await prisma.customerAddress.update({
          where: { id: nextAddr.id },
          data: { isDefault: true },
        });
      }
    }

    revalidatePath(CUSTOMER_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to void address:", error);
    return { success: false, error: (error as Error).message || "Failed to delete address." };
  }
}
