/**
 * Recomputes every material Purchase Order's Receive Status from its submitted Goods
 * Receives / Goods Returns, and re-derives each PO line's Internal Quantity
 * (= Quantity × Conversion) where it was stored wrong.
 *
 *   npx tsx scripts/backfill-po-receive-status.ts          # dry run: report only
 *   npx tsx scripts/backfill-po-receive-status.ts --apply  # write the changes
 *
 * Idempotent: it only re-derives values (same logic as on GR submit / PO save).
 * Over-received lines are listed so someone can void the duplicate GRs.
 */
// Must precede the prisma import — it reads DATABASE_URL at module load.
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { recomputePoReceiveStatus } from '../src/lib/po-receive-status';

const APPLY = process.argv.includes('--apply');

async function main() {
  const lines = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrder: { type: { not: 'SUBCON' } } },
    select: {
      id: true, material: true, quantity: true, conversion: true, internalQuantity: true,
      purchaseOrder: { select: { poNo: true, revision: true } },
      goodsReceiveItems: {
        where: { goodsReceive: { status: 'Submitted' } },
        select: { receiveQty: true, goodsReturnItems: { where: { goodsReturn: { status: 'Submitted' } }, select: { returnQty: true } } },
      },
    },
  });

  const label = (l: (typeof lines)[number]) => `${l.purchaseOrder.poNo}-R${l.purchaseOrder.revision} ${l.material}`;

  const badInternal = lines.filter(
    (l) => Math.abs(Number(l.internalQuantity) - Number(l.quantity) * Number(l.conversion || 1)) > 0.005,
  );
  console.log(`${badInternal.length} PO line(s) with Internal Quantity != Qty x Conversion:`);
  for (const l of badInternal) {
    const want = Number(l.quantity) * Number(l.conversion || 1);
    console.log(`  ${label(l)}: ${Number(l.internalQuantity)} -> ${want}`);
    if (APPLY) await prisma.purchaseOrderItem.update({ where: { id: l.id }, data: { internalQuantity: want } });
  }

  console.log('Over-received PO lines (review and void duplicate GRs):');
  for (const l of lines) {
    const nett = l.goodsReceiveItems.reduce(
      (s, g) => s + Number(g.receiveQty) - g.goodsReturnItems.reduce((r, x) => r + Number(x.returnQty), 0), 0);
    if (nett > Number(l.quantity) + 0.005) console.log(`  ${label(l)}: ordered ${Number(l.quantity)}, nett received ${nett}`);
  }

  const pos = await prisma.purchaseOrder.findMany({ where: { type: { not: 'SUBCON' } }, select: { id: true, poNo: true, revision: true, receiveStatus: true } });
  let changed = 0;
  for (const po of pos) {
    // Compute inside a transaction that is rolled back on a dry run.
    const after = await prisma
      .$transaction(async (tx) => {
        await recomputePoReceiveStatus(tx, po.id);
        const s = (await tx.purchaseOrder.findUnique({ where: { id: po.id }, select: { receiveStatus: true } }))!.receiveStatus;
        if (!APPLY) throw { dryRun: s };
        return s;
      })
      .catch((e) => { if (e && 'dryRun' in e) return e.dryRun as string; throw e; });
    if (after !== po.receiveStatus) {
      changed++;
      console.log(`  ${po.poNo}-R${po.revision}: ${po.receiveStatus} -> ${after}`);
    }
  }
  console.log(`${changed} of ${pos.length} PO Receive Status change(s). ${APPLY ? 'Applied.' : 'Dry run — rerun with --apply to write.'}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
