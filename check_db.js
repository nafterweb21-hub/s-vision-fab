const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const so = await prisma.salesOrder.findFirst({
    where: { orderNo: 'SO-2026-0021' },
    include: {
      salesperson: true,
      customer: true,
      items: {
        include: {
          part: true,
          batches: true
        }
      }
    }
  });
  console.log(JSON.stringify(so, null, 2));
}

main().finally(() => prisma.$disconnect());
