-- AlterTable
ALTER TABLE "DeliveryOrder" ADD COLUMN "isReturnable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "returnableNote" TEXT;
