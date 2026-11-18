/**
 * Recomputes every Purchase Requisition's PO Status and per-line
 * PO Quantity Issued / Balance Require Purchase from its linked POs.
 *
 *   npx tsx scripts/backfill-pr-po-status.ts
 *
 * Idempotent: it only re-derives values (same logic as on PO save), so it is
 * safe to re-run.
 */
// Must precede the prisma import — it reads DATABASE_URL at module load.
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { recomputePrPoStatus } from '../src/lib/pr-po-status';

async function main() {
  const before = await prisma.purchaseRequisition.findMany({ select: { id: true, prNo: true, revision: true, poStatus: true } });
  for (const pr of before) {
    await prisma.$transaction((tx) => recomputePrPoStatus(tx, pr.id));
  }
  const after = new Map(
    (await prisma.purchaseRequisition.findMany({ select: { id: true, poStatus: true } })).map((p) => [p.id, p.poStatus]),
  );

  const changed = before.filter((p) => after.get(p.id) !== p.poStatus);
  console.log(`Recomputed ${before.length} purchase requisition(s); ${changed.length} PO Status change(s).`);
  for (const p of changed) console.log(`  ${p.prNo}-R${p.revision}: ${p.poStatus} -> ${after.get(p.id)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
