const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  const designations = await prisma.designationProfile.findMany();
  console.log("All Designations:");
  console.dir(designations, { depth: null });
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
