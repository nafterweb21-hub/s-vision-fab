import { prisma } from "@/lib/prisma";
import { getStockAggregates, onHand } from "@/lib/stock-balance";

/**
 * Raw materials and consumables are the same record: a stock-keeping row
 * attached to a `MaterialProfile`. Only `itemType` and two optional columns
 * (`materialType`, `grade`, meaningful for raw materials) tell them apart.
 */
export const ITEM_TYPES = ["RAW_MATERIAL", "CONSUMABLE"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export interface StockItem {
  id: string;
  itemType: ItemType;
  materialProfileId: string;
  /** Master data, read through from the linked MaterialProfile. */
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  materialTypeId: string | null;
  materialTypeName: string | null;
  grade: string | null;
  uomId: string;
  uomName: string;
  openingStock: number;
  /** Derived from the PO/GR/GRN/PR trail — never stored. */
  currentStock: number;
  reorderLevel: number;
  unitCost: number;
  supplierId: string | null;
  supplierName: string | null;
  warehouse: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A new material typed straight into the stock form. Creating the
 * `MaterialProfile` here keeps code/name/category in their single home while
 * still letting a storekeeper add an item without visiting the master screen.
 */
export interface NewMaterialInput {
  materialCode: string;
  materialName: string;
  categoryId: string;
  shape: string;
  size?: string | null;
}

export interface StockItemInput {
  /** Attach to an existing material… */
  materialProfileId?: string;
  /** …or create one inline. Exactly one of the two is required. */
  newMaterial?: NewMaterialInput;
  materialTypeId?: string | null;
  grade?: string | null;
  uomId: string;
  openingStock?: number;
  reorderLevel?: number;
  unitCost?: number;
  supplierId?: string | null;
  warehouse?: string | null;
  status?: string;
}

const INCLUDE = {
  materialProfile: {
    select: {
      partNo: true,
      description: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  },
  materialType: { select: { type: true } },
  uom: { select: { uomName: true } },
  supplier: { select: { supplierName: true } },
} as const;

function toStockItem(item: any, currentStock: number): StockItem {
  return {
    id: item.id,
    itemType: item.itemType,
    materialProfileId: item.materialProfileId,
    code: item.materialProfile?.partNo ?? "",
    name: item.materialProfile?.description ?? "",
    categoryId: item.materialProfile?.categoryId ?? "",
    categoryName: item.materialProfile?.category?.name ?? "",
    materialTypeId: item.materialTypeId,
    materialTypeName: item.materialType?.type ?? null,
    grade: item.grade,
    uomId: item.uomId,
    uomName: item.uom?.uomName ?? "",
    openingStock: Number(item.openingStock),
    currentStock,
    reorderLevel: Number(item.reorderLevel),
    unitCost: Number(item.unitCost),
    supplierId: item.supplierId,
    supplierName: item.supplier?.supplierName ?? null,
    warehouse: item.warehouse,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

/** Trimmed, with the required fields proven present. Throws on the first gap. */
function sanitizeNewMaterial(data: NewMaterialInput) {
  const materialCode = data.materialCode?.trim();
  const materialName = data.materialName?.trim();
  const shape = data.shape?.trim();

  if (!materialCode) throw new Error("Material Code is required");
  if (!materialName) throw new Error("Material Name is required");
  if (!data.categoryId) throw new Error("Category is required");
  if (!shape) throw new Error("Shape is required");

  return {
    partNo: materialCode,
    description: materialName,
    categoryId: data.categoryId,
    shape,
    size: data.size?.trim() || null,
  };
}

/**
 * Creates the MaterialProfile for an inline-entered material and returns its id.
 * `partNo` and `description` are both unique, so collisions are reported against
 * the field the user actually typed.
 */
async function createMaterialProfile(tx: any, input: NewMaterialInput): Promise<string> {
  const clean = sanitizeNewMaterial(input);

  const [codeClash, nameClash] = await Promise.all([
    tx.materialProfile.findUnique({ where: { partNo: clean.partNo } }),
    tx.materialProfile.findUnique({ where: { description: clean.description } }),
  ]);
  if (codeClash) throw new Error(`Material Code "${clean.partNo}" already exists`);
  if (nameClash) throw new Error(`Material Name "${clean.description}" already exists`);

  const created = await tx.materialProfile.create({ data: clean, select: { id: true } });
  return created.id;
}

/** Trimmed, with the required fields proven present. Throws on the first gap. */
function sanitize(itemType: ItemType, data: StockItemInput, materialProfileId: string) {
  if (!materialProfileId) throw new Error("Material is required");
  if (!data.uomId) throw new Error("UOM is required");

  return {
    itemType,
    materialProfileId,
    // Only raw materials carry a material type and grade.
    materialTypeId: itemType === "RAW_MATERIAL" ? data.materialTypeId || null : null,
    grade: itemType === "RAW_MATERIAL" ? data.grade?.trim() || null : null,
    uomId: data.uomId,
    openingStock: Number(data.openingStock ?? 0),
    reorderLevel: Number(data.reorderLevel ?? 0),
    unitCost: Number(data.unitCost ?? 0),
    supplierId: data.supplierId || null,
    warehouse: data.warehouse?.trim() || null,
    status: data.status === "Inactive" ? "Inactive" : "Active",
  };
}

/** Attaches the derived on-hand quantity to each row in one batched query. */
async function withStock(rows: any[]): Promise<StockItem[]> {
  const aggregates = await getStockAggregates(rows.map((r) => r.materialProfileId));
  return rows.map((r) => {
    const agg = aggregates.get(r.materialProfileId);
    const opening = Number(r.openingStock);
    return toStockItem(r, agg ? onHand(agg, opening) : opening);
  });
}

export async function getStockItems(itemType: ItemType, search = ""): Promise<StockItem[]> {
  const rows = await prisma.stockItem.findMany({
    where: {
      itemType,
      ...(search
        ? {
            OR: [
              { grade: { contains: search, mode: "insensitive" as const } },
              { warehouse: { contains: search, mode: "insensitive" as const } },
              { materialProfile: { partNo: { contains: search, mode: "insensitive" as const } } },
              { materialProfile: { description: { contains: search, mode: "insensitive" as const } } },
              { materialProfile: { category: { name: { contains: search, mode: "insensitive" as const } } } },
              { materialType: { type: { contains: search, mode: "insensitive" as const } } },
              { supplier: { supplierName: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return withStock(rows);
}

function takenError(existingType: string, itemType: ItemType): string {
  return existingType === itemType
    ? "This material already has a stock record"
    : "This material is already registered as a " +
      (existingType === "RAW_MATERIAL" ? "raw material" : "consumable");
}

export async function createStockItem(itemType: ItemType, data: StockItemInput): Promise<StockItem> {
  if (!data.materialProfileId && !data.newMaterial) throw new Error("Material is required");

  // The material and its stock record are created together or not at all, so a
  // failed stock insert cannot leave an orphaned MaterialProfile behind.
  const created = await prisma.$transaction(async (tx) => {
    const materialProfileId = data.newMaterial
      ? await createMaterialProfile(tx, data.newMaterial)
      : data.materialProfileId!;

    const clean = sanitize(itemType, data, materialProfileId);

    // One stock record per material, so the derived balance has a single owner.
    const existing = await tx.stockItem.findUnique({
      where: { materialProfileId },
      select: { itemType: true },
    });
    if (existing) throw new Error(takenError(existing.itemType, itemType));

    return tx.stockItem.create({ data: clean, include: INCLUDE });
  });

  return (await withStock([created]))[0];
}

export async function updateStockItem(
  itemType: ItemType,
  id: string,
  data: StockItemInput,
): Promise<StockItem> {
  // Editing never re-points a stock record at a different material — the link is
  // its identity — so the form sends back the id it was loaded with.
  const current = await prisma.stockItem.findUnique({
    where: { id },
    select: { materialProfileId: true },
  });
  if (!current) throw new Error("Stock item not found");

  const materialProfileId = data.materialProfileId || current.materialProfileId;
  const clean = sanitize(itemType, data, materialProfileId);

  if (materialProfileId !== current.materialProfileId) {
    const clash = await prisma.stockItem.findUnique({
      where: { materialProfileId },
      select: { id: true, itemType: true },
    });
    if (clash && clash.id !== id) throw new Error(takenError(clash.itemType, itemType));
  }

  const updated = await prisma.stockItem.update({ where: { id }, data: clean, include: INCLUDE });
  return (await withStock([updated]))[0];
}

export async function toggleStockItemStatus(id: string): Promise<StockItem> {
  const current = await prisma.stockItem.findUnique({ where: { id } });
  if (!current) throw new Error("Stock item not found");

  const updated = await prisma.stockItem.update({
    where: { id },
    data: { status: current.status === "Active" ? "Inactive" : "Active" },
    include: INCLUDE,
  });
  return (await withStock([updated]))[0];
}

export async function deleteStockItem(id: string) {
  await prisma.stockItem.delete({ where: { id } });
  return true;
}

/** The subset of the Prisma client `ensureStockItemsForReceipt` needs, so a `$transaction` handle fits. */
type ReceiptDb = Pick<typeof prisma, "goodsReceive" | "stockItem">;

/**
 * Stock is derived from submitted GRs, but the Raw Materials and Consumables
 * pages only list materials that have a StockItem. Submitting a GR for a
 * profile material with no stock record would raise its balance invisibly, so
 * this creates the missing records (as raw materials, opening stock 0) in the
 * same transaction as the submit. Free-text PO lines have no material profile
 * and are skipped. Existing records are left untouched.
 */
export async function ensureStockItemsForReceipt(db: ReceiptDb, goodsReceiveId: string): Promise<number> {
  const gr = await db.goodsReceive.findUnique({
    where: { id: goodsReceiveId },
    select: {
      purchaseOrder: { select: { supplierId: true } },
      items: {
        select: {
          purchaseOrderItem: {
            select: {
              materialProfileId: true,
              internalUomId: true,
              poUomId: true,
              unitPrice: true,
              conversion: true,
              materialProfile: { select: { stockItem: { select: { id: true } } } },
            },
          },
        },
      },
    },
  });
  if (!gr) return 0;

  const missing = new Map<string, { uomId: string; unitCost: number }>();
  for (const { purchaseOrderItem: line } of gr.items) {
    if (!line.materialProfileId || line.materialProfile?.stockItem) continue;
    if (missing.has(line.materialProfileId)) continue;
    const conversion = Number(line.conversion) || 1;
    missing.set(line.materialProfileId, {
      // Balances are kept in the PO line's internal UOM.
      uomId: line.internalUomId || line.poUomId,
      unitCost: Math.round((Number(line.unitPrice) / conversion) * 100) / 100,
    });
  }

  for (const [materialProfileId, m] of missing) {
    await db.stockItem.create({
      data: {
        materialProfileId,
        itemType: "RAW_MATERIAL",
        uomId: m.uomId,
        unitCost: m.unitCost,
        supplierId: gr.purchaseOrder?.supplierId || null,
        status: "Active",
      },
    });
  }
  return missing.size;
}
