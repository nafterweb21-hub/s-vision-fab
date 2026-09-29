"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getGeneralSetting() {
  try {
    let setting = await prisma.generalSetting.findFirst();
    if (!setting) {
      setting = await prisma.generalSetting.create({
        data: {},
      });
    }
    return { success: true, data: setting };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateGeneralSetting(data: any) {
  try {
    let setting = await prisma.generalSetting.findFirst();
    if (!setting) {
      setting = await prisma.generalSetting.create({
        data: {
          logoUrl: data.logoUrl,
          enableSignature: data.enableSignature,
          signatureUrl: data.signatureUrl,
          invoiceBackgroundUrl: data.invoiceBackgroundUrl,
          enableInvoiceBackground: data.enableInvoiceBackground,
          invoiceFooterUrl: data.invoiceFooterUrl,
          enableInvoiceFooter: data.enableInvoiceFooter,
        },
      });
    } else {
      setting = await prisma.generalSetting.update({
        where: { id: setting.id },
        data: {
          logoUrl: data.logoUrl,
          enableSignature: data.enableSignature,
          signatureUrl: data.signatureUrl,
          invoiceBackgroundUrl: data.invoiceBackgroundUrl,
          enableInvoiceBackground: data.enableInvoiceBackground,
          invoiceFooterUrl: data.invoiceFooterUrl,
          enableInvoiceFooter: data.enableInvoiceFooter,
        },
      });
    }
    revalidatePath("/dashboard/settings/general");
    return { success: true, data: setting };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
