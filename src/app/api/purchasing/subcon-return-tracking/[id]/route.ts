import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { assertRejectWithinReturned, assertReturnWithinSrf, RejectQtyError, ReturnQtyError } from "@/lib/subcon-reject";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const srt = await prisma.subconReturnTracking.findUnique({
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
        { error: "Subcon Return Tracking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(srt);
  } catch (error: any) {
    console.error("Error fetching Subcon Return Tracking:", error);
    return NextResponse.json(
      { error: "Failed to fetch Subcon Return Tracking" },
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
    const { returnedQty, remark, status } = data;

    const existingSrt = await prisma.subconReturnTracking.findUnique({
      where: { id },
    });

    if (!existingSrt) {
      return NextResponse.json(
        { error: "Subcon Return Tracking not found" },
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
      const srt = await tx.subconReturnTracking.update({
        where: { id },
        data: {
          returnedQty: returnedQty !== undefined ? new Prisma.Decimal(returnedQty) : undefined,
          remark,
          status,
        },
      });

      // Voiding a return must not leave more rejected than returned on the SRF.
      if (status === "Void") {
        await assertRejectWithinReturned(tx, existingSrt.subconRequestFormId);
      } else {
        await assertReturnWithinSrf(tx, existingSrt.subconRequestFormId);
      }

      // If status changed to Submitted or Void, update SRF receiveStatus
      if (status === "Submitted" || status === "Void") {
        const srf = await tx.subconRequestForm.findUnique({
          where: { id: existingSrt.subconRequestFormId },
          include: { subconReturnTrackings: true },
        });

        if (srf) {
          const totalReturned = srf.subconReturnTrackings
            .filter((t) => t.status === "Submitted")
            .reduce((sum, t) => sum + Number(t.returnedQty), 0);

          let receiveStatus = "N/A";
          if (totalReturned >= Number(srf.quantity)) {
            receiveStatus = "Fully Received";
          } else if (totalReturned > 0) {
            receiveStatus = "Partially Received";
          }

          await tx.subconRequestForm.update({
            where: { id: existingSrt.subconRequestFormId },
            data: { receiveStatus },
          });

          // Check for Routing Process fullyReceived
          if (receiveStatus === "Fully Received") {
            const srfWithPOItem = await tx.subconRequestForm.findUnique({
              where: { id: existingSrt.subconRequestFormId },
              include: { purchaseOrderItem: true },
            });
            if (srfWithPOItem?.purchaseOrderItem?.woRoutingProcessId) {
               await tx.routingProcess.update({
                  where: { id: srfWithPOItem.purchaseOrderItem.woRoutingProcessId },
                  data: { fullyReceived: true }
               });
            }
          } else {
             // If we voided and it's no longer fully received
             const srfWithPOItem = await tx.subconRequestForm.findUnique({
              where: { id: existingSrt.subconRequestFormId },
              include: { purchaseOrderItem: true },
            });
            if (srfWithPOItem?.purchaseOrderItem?.woRoutingProcessId) {
               await tx.routingProcess.update({
                  where: { id: srfWithPOItem.purchaseOrderItem.woRoutingProcessId },
                  data: { fullyReceived: false }
               });
            }
          }
        }
      }

      return srt;
    });

    return NextResponse.json(updatedSrt);
  } catch (error: any) {
    if (error instanceof ReturnQtyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RejectQtyError) {
      return NextResponse.json(
        {
          error: `Cannot void this return: ${error.totalRejected} rejected qty is recorded against this SRF, which would exceed the remaining returned qty (${error.totalReturned}). Void the related Subcon Reject Tracking first.`,
        },
        { status: 400 }
      );
    }
    console.error("Error updating Subcon Return Tracking:", error);
    return NextResponse.json(
      { error: "Failed to update Subcon Return Tracking" },
      { status: 500 }
    );
  }
}

// No DELETE: per docs/spec (README "No DELETE anywhere"), a Subcon Return Tracking is voided
// through PUT { status: "Void" } so its running number stays contiguous.
