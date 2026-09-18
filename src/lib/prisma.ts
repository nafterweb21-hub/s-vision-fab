import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma_v14: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[prisma] DATABASE_URL is not set. Add it to your .env file."
    );
  }
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function getOrCreatePrisma(): PrismaClient {
  if (globalForPrisma.prisma_v14) return globalForPrisma.prisma_v14;
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma_v14 = client;
  }
  return client;
}

export const prisma: PrismaClient = getOrCreatePrisma();
