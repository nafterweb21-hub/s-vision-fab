import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { assertRejectWithinReturned, RejectQtyError } from "@/lib/subcon-reject";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const srt = await prisma.subconRejectTracking.findUnique({
      where: { id },
      include: {
        company: true,
        supplier: true,
        purchaseOrder: true,
        subconRequestForm: {
          include: {
            purchaseOrderItem: {
              include: {
                poUom: true,
                woRoutingProcess: {
                  include: {
                    inProcess: true,
                    mainProcess: true,
                    routingProcess: true,
                  }
                }
              }
            }
          }
        },
      },
    });

    if (!srt) {
      return NextResponse.json(
        { error: "Subcon Reject Tracking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(srt);
  } catch (error: any) {
    console.error("Error fetching Subcon Reject Tracking:", error);
    return NextResponse.json(
      { error: "Failed to fetch Subcon Reject Tracking" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { rejectedQty, remark, status } = data;

    const existingSrt = await prisma.subconRejectTracking.findUnique({
      where: { id },
    });

    if (!existingSrt) {
      return NextResponse.json(
        { error: "Subcon Reject Tracking not found" },
        { status: 404 }
      );
    }

    if (existingSrt.status !== "Draft") {
      // Allow Voiding a Submitted record, but otherwise no edits to Submitted
      if (status === "Void" && existingSrt.status === "Submitted") {
        // Just voiding
      } else {
        return NextResponse.json(
          { error: "Cannot edit a submitted/voided tracking" },
          { status: 400 }
        );
      }
    }

    const updatedSrt = await prisma.$transaction(async (tx) => {
      const srt = await tx.subconRejectTracking.update({
        where: { id },
        data: {
          rejectedQty: rejectedQty !== undefined ? new Prisma.Decimal(rejectedQty) : undefined,
          remark,
          status,
        },
      });

      if (srt.status === "Submitted") {
        await assertRejectWithinReturned(tx, srt.subconRequestFormId);
      }

      return srt;
    });

    return NextResponse.json(updatedSrt);
  } catch (error: any) {
    if (error instanceof RejectQtyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error updating Subcon Reject Tracking:", error);
    return NextResponse.json(
      { error: "Failed to update Subcon Reject Tracking" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const srt = await prisma.subconRejectTracking.findUnique({
      where: { id },
    });

    if (!srt) {
      return NextResponse.json(
        { error: "Subcon Reject Tracking not found" },
        { status: 404 }
      );
    }

    if (srt.status !== "Draft") {
      return NextResponse.json(
        { error: "Can only delete draft tracking" },
        { status: 400 }
      );
    }

    await prisma.subconRejectTracking.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Subcon Reject Tracking deleted" });
  } catch (error: any) {
    console.error("Error deleting Subcon Reject Tracking:", error);
    return NextResponse.json(
      { error: "Failed to delete Subcon Reject Tracking" },
      { status: 500 }
    );
  }
}
