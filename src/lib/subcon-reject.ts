import { Prisma } from "@/generated/prisma";

// A reject records how many of the pieces the subcon already returned (Submitted
// SRTs) were bad. It never changes SRF receive status or the routing process
// `fullyReceived` flag — those are driven by Subcon Return Tracking only.
//
// Call inside the transaction *after* the write, so a violation rolls it back.
// Used both when submitting a reject and when voiding a return.
export async function assertRejectWithinReturned(
  tx: Prisma.TransactionClient,
  subconRequestFormId: string,
) {
  const [returned, rejected] = await Promise.all([
    tx.subconReturnTracking.aggregate({
      where: { subconRequestFormId, status: "Submitted" },
      _sum: { returnedQty: true },
    }),
    tx.subconRejectTracking.aggregate({
      where: { subconRequestFormId, status: "Submitted" },
      _sum: { rejectedQty: true },
    }),
  ]);
  const totalReturned = Number(returned._sum.returnedQty ?? 0);
  const totalRejected = Number(rejected._sum.rejectedQty ?? 0);
  if (totalRejected > totalReturned) {
    throw new RejectQtyError(totalRejected, totalReturned);
  }
}

export class RejectQtyError extends Error {
  constructor(
    readonly totalRejected: number,
    readonly totalReturned: number,
  ) {
    super(
      `Total rejected qty (${totalRejected}) cannot exceed returned qty (${totalReturned}) for this SRF`,
    );
  }
}
