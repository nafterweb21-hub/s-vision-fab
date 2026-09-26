import { prisma } from "../src/lib/prisma";

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
