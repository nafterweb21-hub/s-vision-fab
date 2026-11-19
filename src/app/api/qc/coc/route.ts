import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextDocumentNo } from "@/lib/document-numbering";
import { CocRuleError, prepareCocWrite } from "@/lib/coc";

const STATUSES = new Set(["Draft", "Require Approval", "Approved"]);
const DUPLICATE_MSG = "A COC with the same DO, type, work order, welder, painter, machine and part number already exists.";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "All";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get("pageSize") || "10") || 10));

    const where = {
      ...(STATUSES.has(status) ? { status } : {}),
      ...(search
        ? {
            OR: [
              { cocNo: { contains: search, mode: "insensitive" as const } },
              { type: { contains: search, mode: "insensitive" as const } },
              { deliveryOrder: { doNo: { contains: search, mode: "insensitive" as const } } },
              { workOrderNo: { contains: search, mode: "insensitive" as const } },
              { customer: { customerName: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.certificateOfConformity.count({ where }),
      prisma.certificateOfConformity.findMany({
        where,
        include: {
          customer: { select: { customerName: true } },
          deliveryOrder: { select: { doNo: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ total, data, page, pageSize });
  } catch (error: any) {
    console.error("COC List Error:", error);
    return NextResponse.json({ error: "Could not load certificates." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // The number is taken and the COC written in one transaction: the counter's
    // row lock only holds for as long as the transaction does.
    const newCoc = await prisma.$transaction(async (tx) => {
      const data = await prepareCocWrite(tx, body);
      const cocNo = await nextDocumentNo(tx, "CERTIFICATE_OF_CONFORMITY", {
        isTaken: async (no) => (await tx.certificateOfConformity.count({ where: { cocNo: no } })) > 0,
      });
      return tx.certificateOfConformity.create({ data: { ...data, cocNo, status: "Draft" } });
    });

    return NextResponse.json({ success: true, id: newCoc.id, cocNo: newCoc.cocNo });
  } catch (error: any) {
    if (error instanceof CocRuleError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error?.code === "P2002") return NextResponse.json({ error: DUPLICATE_MSG }, { status: 400 });
    console.error("Create COC Error:", error);
    return NextResponse.json({ error: "Could not save the certificate." }, { status: 500 });
  }
}
