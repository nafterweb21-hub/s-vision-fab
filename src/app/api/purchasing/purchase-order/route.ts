import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextDocumentNo } from "@/lib/document-numbering";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "All";
    const type = url.searchParams.get("type") || "MATERIAL"; // Default to MATERIAL

    const where: any = { type };

    if (status !== "All") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { poNo: { contains: search, mode: "insensitive" } },
        { remark: { contains: search, mode: "insensitive" } },
        { workOrderNo: { contains: search, mode: "insensitive" } },
        { purchaseRequisition: { prNo: { contains: search, mode: "insensitive" } } },
        { purchaser: { name: { contains: search, mode: "insensitive" } } },
        { supplier: { supplierName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const items = await prisma.purchaseOrder.findMany({
      where,
      orderBy: [{ poNo: "desc" }, { revision: "desc" }],
      include: {
        company: { select: { companyName: true } },
        supplier: { select: { supplierName: true } },
        purchaser: { select: { name: true } },
        workOrder: { select: { jobDescription: true } },
        purchaseRequisition: { select: { prNo: true } },
      },
    });

    return NextResponse.json(items);
  } catch (e: any) {
    console.error("GET PO list error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    return await prisma.$transaction(async (tx) => {
      // A PO number is shared across revisions, so only revision 0 takes one.
      const poNo = await nextDocumentNo(tx, "PURCHASE_ORDER", {
        companyId: body.companyId,
        isTaken: async (no) => (await tx.purchaseOrder.count({ where: { poNo: no } })) > 0,
      });

      const finalSupplierId = body.supplierId;
      const finalContactPersonId = body.contactPersonId || null;

      const po = await tx.purchaseOrder.create({
        data: {
          poNo,
          type: body.type || "MATERIAL",
          revision: 0,
          date: new Date(body.date),
          companyId: body.companyId,
          supplierId: finalSupplierId!,
          workOrderNo: body.workOrderNo || null,
          purchaseRequisitionId: body.purchaseRequisitionId || null,
          currencyId: body.currencyId,
          exchangeRate: body.exchangeRate,
          taxTypeId: body.taxTypeId || null,
          taxRate: body.taxRate || 0,
          amountBeforeTax: body.amountBeforeTax || 0,
          taxAmount: body.taxAmount || 0,
          amountAfterTax: body.amountAfterTax || 0,
          roundOff: body.roundOff || 0,
          supplierGst: body.supplierGst || null,
          millCertificate: body.millCertificate || false,
          certOfConformance: body.certOfConformance || false,
          contactPersonId: finalContactPersonId,
          telNo: body.telNo || "",
          faxNo: body.faxNo || "",
          mobileNo: body.mobileNo || "",
          email: body.email || "",
          receiveStatus: "NA",
          purchaserId: body.purchaserId,
          remark: body.remark || "",
          status: "Draft",
          items: {
            create: (body.items || []).map((it: any, i: number) => ({
              fromMaterialProfile: it.fromMaterialProfile || false,
              material: it.material || "",
              description: it.description || "",
              supplierMaterialNo: it.supplierMaterialNo || "",
              shape: it.shape || "",
              size: it.size || "",
              hardness: it.hardness || null,
              thickness: it.thickness || null,
              quantity: it.quantity || 0,
              poUomId: it.poUomId,
              unitPrice: it.unitPrice || 0,
              amount: it.amount || 0,
              taxTypeId: it.taxTypeId || null,
              taxRate: it.taxRate || 0,
              taxAmount: it.taxAmount || 0,
              conversion: it.conversion || 1,
              internalUomId: it.internalUomId || null,
              internalQuantity: it.internalQuantity || 0,
              deliveryDate: it.deliveryDate ? new Date(it.deliveryDate) : new Date(),
              remark: it.remark || "",
              hsnCode: it.hsnCode || null,
              hsnDescription: it.hsnDescription || null,
              materialProfileId: it.materialProfileId || null,
              purchaseRequisitionItemId: it.purchaseRequisitionItemId || null,
              woRoutingProcessId: it.woRoutingProcessId || null,
              masterMainProcessId: it.masterMainProcessId || null,
              masterRoutingProcessId: it.masterRoutingProcessId || null,
              sortOrder: i,
            })),
          },
        },
      });

      return NextResponse.json(po);
    });
  } catch (e: any) {
    console.error("Create PO error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
