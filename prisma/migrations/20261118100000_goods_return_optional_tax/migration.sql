-- A GR may have no tax type (GoodsReceive.taxTypeId is optional), so a return against it must allow none too.
ALTER TABLE "GoodsReturn" ALTER COLUMN "taxTypeId" DROP NOT NULL;
