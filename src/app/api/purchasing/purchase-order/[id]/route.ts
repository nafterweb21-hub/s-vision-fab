import { NextResponse } from "next/server";
import { poShipToData } from "@/lib/po-ship-to";
import { prisma } from "@/lib/prisma";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            poUom: true,
            internalUom: true,
            materialProfile: true,
            woRoutingProcess: {
              include: { mainProcess: true, routingProcess: true }
            },
            masterMainProcess: true,
            masterRoutingProcess: true,
          }
        },
        company: true,
        supplier: true,
        currency: true,
        taxType: true,
        contactPerson: true,
        purchaser: true,
        purchaseRequisition: true,
      },
    });

    if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(po);
  } catch (e: any) {
    console.error("GET PO error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    return await prisma.$transaction(async (tx) => {
      const exist = await tx.purchaseOrder.findUnique({ where: { id } });
      if (!exist) throw new Error("Not found");
      if (exist.status !== "Draft" && exist.status !== "Rejected") {
        throw new Error("Only Draft or Rejected PO can be edited.");
      }

      // Update lines in place (by id) instead of delete-and-recreate, so records
      // that point at a PO line (Subcon Request Forms, moved over on revise)
      // keep their link when the PO is edited.
      const incoming: any[] = body.items || [];
      const existingItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: exist.id },
        select: { id: true, description: true, _count: { select: { subconRequestForms: true } } },
      });
      const existingIds = new Set(existingItems.map((it) => it.id));
      const keptIds = new Set(incoming.map((it) => it.id).filter((x: any) => x && existingIds.has(x)));
      const removed = existingItems.filter((it) => !keptIds.has(it.id));
      const locked = removed.filter((it) => it._count.subconRequestForms > 0);
      if (locked.length) {
        throw new Error(
          `Cannot remove line(s) that have Subcon Request Forms: ${locked
            .map((it) => it.description || it.id)
            .join(", ")}`
        );
      }
      if (removed.length) {
        await tx.purchaseOrderItem.deleteMany({ where: { id: { in: removed.map((it) => it.id) } } });
      }

      const finalSupplierId = body.supplierId;
      const finalContactPersonId = body.contactPersonId || null;

      const updated = await tx.purchaseOrder.update({
        where: { id: exist.id },
        data: {
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
          ...poShipToData(body),
          contactPersonId: finalContactPersonId,
          telNo: body.telNo || "",
          faxNo: body.faxNo || "",
          mobileNo: body.mobileNo || "",
          email: body.email || "",
          purchaserId: body.purchaserId,
          remark: body.remark || "",
        },
      });

      for (const [i, it] of incoming.entries()) {
        const data = {
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
        };
        if (it.id && keptIds.has(it.id)) {
          await tx.purchaseOrderItem.update({ where: { id: it.id }, data });
        } else {
          await tx.purchaseOrderItem.create({ data: { ...data, purchaseOrderId: exist.id } });
        }
      }

      return NextResponse.json(updated);
    });
  } catch (e: any) {
    console.error("PUT PO error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exist = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!exist) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (exist.status !== "Draft") {
      return NextResponse.json({ error: "Only Draft can be deleted" }, { status: 400 });
    }

    await prisma.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("DELETE PO error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
