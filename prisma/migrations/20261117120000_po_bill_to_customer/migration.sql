-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "billToCustomerId" TEXT;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_billToCustomerId_fkey" FOREIGN KEY ("billToCustomerId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

