const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  await prisma.workOrder.update({
    where: { workOrderNo: 'WO-SO-2026-0003-001' },
    data: { status: 'WIP' }
  });
  console.log('Successfully updated DB status to WIP');
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
