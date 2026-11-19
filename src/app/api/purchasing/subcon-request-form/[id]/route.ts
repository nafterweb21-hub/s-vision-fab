import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertSrfQuantity, SrfQuantityError } from "@/lib/srf-quantity";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const srf = await prisma.subconRequestForm.findUnique({
      where: { id },
      include: {
        outsourcedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, contactPersonName: true } },
        purchaseOrderItem: {
          include: {
            purchaseOrder: {
              include: {
                company: { select: { companyName: true } },
                supplier: { select: { supplierName: true, contactPersons: true } },
                currency: { select: { code: true } },
              }
            },
            poUom: { select: { uomName: true } },
            masterMainProcess: { select: { process: true } },
            masterRoutingProcess: { select: { routingProcess: true } },
            woRoutingProcess: {
              include: {
                inProcess: { select: { description: true } }
              }
            },
            // Other live forms on this PO line, so the client can show what is still available.
            subconRequestForms: {
              where: { status: { not: "Void" }, id: { not: id } },
              select: { quantity: true },
            },
          }
        }
      },
    });

    if (!srf) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(srf);
  } catch (e: any) {
    console.error("GET SRF error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const existing = await prisma.subconRequestForm.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.status !== "Draft") {
      return NextResponse.json({ error: "Only Draft status can be edited" }, { status: 400 });
    }

    // Same cap as create, leaving this form's own quantity out of the total.
    const quantity =
      body.quantity !== undefined
        ? await assertSrfQuantity(prisma, existing.purchaseOrderItemId, body.quantity, id)
        : existing.quantity;

    const updated = await prisma.subconRequestForm.update({
      where: { id },
      data: {
        srfDate: body.srfDate ? new Date(body.srfDate) : existing.srfDate,
        outsourcedById: body.outsourcedById !== undefined ? body.outsourcedById : existing.outsourcedById,
        dateRequired: body.dateRequired ? new Date(body.dateRequired) : existing.dateRequired,
        receivedById: body.receivedById !== undefined ? body.receivedById : existing.receivedById,
        quantity,
        remark: body.remark !== undefined ? body.remark : existing.remark,
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e instanceof SrfQuantityError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("PUT SRF error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// No DELETE: per docs/spec (README "No DELETE anywhere"), an SRF is voided through
// POST ./transition { action: "void" } so SRF numbers stay contiguous.
