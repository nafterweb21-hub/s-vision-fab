import { prisma } from "../src/lib/prisma";

async function run() {
  const wo = await prisma.workOrder.findUnique({
    where: { workOrderNo: 'WO-SO-2026-0004-001' },
    include: {
      inProcesses: {
        include: {
          routingProcesses: {
            include: {
              productionTimesheets: {
                include: {
                  weldingParameter: true
                }
              }
            }
          }
        }
      }
    }
  });
  console.dir(wo, { depth: null });
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
