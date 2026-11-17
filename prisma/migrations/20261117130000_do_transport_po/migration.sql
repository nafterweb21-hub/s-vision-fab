-- AlterTable
ALTER TABLE "DeliveryOrder" ADD COLUMN "poNo" TEXT,
ADD COLUMN "vehicleNo" TEXT,
ADD COLUMN "modeOfTransport" TEXT;

-- Backfill PO No from the linked sales order's customer PO ref.
UPDATE "DeliveryOrder" d SET "poNo" = s."customerPoRef"
FROM "SalesOrder" s WHERE d."salesOrderId" = s."id" AND d."poNo" IS NULL;
