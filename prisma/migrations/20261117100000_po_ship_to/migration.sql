-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "consigneeAddress" TEXT,
ADD COLUMN     "consigneeCountry" TEXT DEFAULT 'India',
ADD COLUMN     "consigneeGstin" TEXT,
ADD COLUMN     "consigneeName" TEXT,
ADD COLUMN     "consigneePhone" TEXT,
ADD COLUMN     "consigneeState" TEXT,
ADD COLUMN     "differentShipTo" BOOLEAN NOT NULL DEFAULT false;
