import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { toUserMessage } from "@/lib/api-error";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requirePermission("DELIVERY_ORDER", "e");
  if (authError) return authError;

  try {
    const { id } = await params;
    const doItem = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: { cocs: true },
    });

    if (!doItem) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (doItem.status !== "Draft") {
      return NextResponse.json({ error: "Delivery Order is already submitted." }, { status: 400 });
    }

    // Check COC requirements
    if (doItem.cocRequired) {
      if (doItem.cocs.length === 0) {
        return NextResponse.json({ error: "At least one COC must be created before submitting." }, { status: 400 });
      }

      const allApproved = doItem.cocs.every(coc => coc.status === "Approved");
      if (!allApproved) {
        return NextResponse.json({ error: "All related COCs must be approved in order to submit this Delivery Order." }, { status: 400 });
      }
    }

    await prisma.deliveryOrder.update({
      where: { id },
      data: { status: "Submitted" },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Submit Delivery Order Error:", error);
    return NextResponse.json({ error: toUserMessage(error, "Could not submit the delivery order. Please try again.") }, { status: 500 });
  }
}
