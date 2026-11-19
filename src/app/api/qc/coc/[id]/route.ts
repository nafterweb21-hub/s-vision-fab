import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CocRuleError, prepareCocWrite } from "@/lib/coc";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cocItem = await prisma.certificateOfConformity.findUnique({
      where: { id },
      include: {
        customer: { select: { customerName: true } },
        deliveryOrder: { select: { doNo: true, status: true, cocRequired: true } },
        workOrder: { select: { quantity: true, uom: true } },
        cocUom: { select: { uomName: true } },
        welder: { select: { name: true, code: true, aadharNumber: true } },
        weldingMachine: { select: { machineNo: true, brand: true, model: true } },
        painter: { select: { name: true, code: true, aadharNumber: true } },
        paintingMethod: { select: { method: true } },
        checkedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
    });

    if (!cocItem) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(cocItem);
  } catch (error: any) {
    console.error("Get COC Error:", error);
    return NextResponse.json({ error: "Could not load the certificate." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const current = await prisma.certificateOfConformity.findUnique({ where: { id }, select: { status: true, cocNo: true } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (current.status !== "Draft") {
      return NextResponse.json({ error: `${current.cocNo} is ${current.status}; only Draft COCs can be edited.` }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const data = await prepareCocWrite(tx, body, id);
      await tx.certificateOfConformity.update({ where: { id }, data });
    });

    return NextResponse.json({ success: true, id, cocNo: current.cocNo });
  } catch (error: any) {
    if (error instanceof CocRuleError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A COC with the same DO, type, work order, welder, painter, machine and part number already exists." }, { status: 400 });
    }
    console.error("Update COC Error:", error);
    return NextResponse.json({ error: "Could not save the certificate." }, { status: 500 });
  }
}

// No DELETE handler: records are never deleted (spec cross-cutting rule).
