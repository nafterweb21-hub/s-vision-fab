-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "billToAddress" TEXT,
ADD COLUMN     "billToContactPerson" TEXT,
ADD COLUMN     "billToEmail" TEXT,
ADD COLUMN     "billToFax" TEXT,
ADD COLUMN     "billToGstin" TEXT,
ADD COLUMN     "billToName" TEXT,
ADD COLUMN     "billToPhone" TEXT,
ADD COLUMN     "billToState" TEXT;
