/**
 * Test data for the Subcon chain: PO-Subcon → Approval → SRF → SRT.
 *
 *   npm run db:seed:subcon
 *
 * Masters are upserted by fixed id. Documents (WO, POs, SRFs, SRTs) are only
 * created when no PO carrying the TEST_TAG remark exists yet, so re-running is
 * safe. Document numbers come from the real counters (nextDocumentNo), so the
 * shared PO sequence stays consistent with the app.
 *
 * Depends on prisma/seed.ts having run (users, employees) and on at least one
 * CompanyProfile, Currency, TaxProfile and CustomerProfile existing.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { nextDocumentNo } from "../src/lib/document-numbering";

const TEST_TAG = "[SUBCON TEST]";
const WO_NO = "WO-SUBCON-TEST-001";

const day = (offset: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};

async function main() {
  console.log("Seeding subcon test data...");

  // ---------- Prerequisites ----------
  const company =
    (await prisma.companyProfile.findFirst({ where: { allowPoForWo: true, status: "Active" } })) ??
    (await prisma.companyProfile.findFirst({ where: { status: "Active" } }));
  if (!company) throw new Error("No CompanyProfile found — create one first.");
  if (!company.allowPoForWo) {
    console.warn(`  ! Company "${company.companyName}" has allowPoForWo = false; with-WO POs will be created anyway.`);
  }

  const currency =
    (await prisma.currency.findFirst({ where: { isDefault: true } })) ?? (await prisma.currency.findFirst());
  if (!currency) throw new Error("No Currency found.");

  const tax =
    (await prisma.taxProfile.findFirst({ where: { taxRate: 18, status: "Active" } })) ??
    (await prisma.taxProfile.findFirst({ where: { status: "Active" } }));
  if (!tax) throw new Error("No TaxProfile found.");
  const taxRate = Number(tax.taxRate);

  const customer = await prisma.customerProfile.findFirst();
  if (!customer) throw new Error("No CustomerProfile found (needed for the test Work Order).");

  const purchaser = await prisma.employee.findFirst({ where: { id: "emp-1" } }) ?? (await prisma.employee.findFirst());
  if (!purchaser) throw new Error("No Employee found — run npm run db:seed first.");

  // ---------- UOM ----------
  const pcs = await prisma.uomProfile.upsert({
    where: { uomName: "Pcs" },
    create: { uomName: "Pcs" },
    update: {},
  });
  const kg = await prisma.uomProfile.upsert({
    where: { uomName: "KG" },
    create: { uomName: "KG" },
    update: {},
  });

  // ---------- Approval levels for "Purchase Order - Subcon" ----------
  // Tier 1 only up to 9,999.99; above that needs a second tier.
  const approvalProfiles = [
    { id: "prof-subcon-1", actionButton: "First Level", minRange: 0, maxRange: 9999.99, approvers: ["user-sy"] },
    { id: "prof-subcon-2", actionButton: "Second Level", minRange: 10000, maxRange: 10000000, approvers: ["user-danny", "user-simeon"] },
  ];
  for (const p of approvalProfiles) {
    await prisma.approvalLevelProfile.upsert({
      where: { id: p.id },
      create: { id: p.id, module: "Purchase Order - Subcon", actionButton: p.actionButton, minRange: p.minRange, maxRange: p.maxRange, status: "Active" },
      update: { module: "Purchase Order - Subcon", actionButton: p.actionButton, minRange: p.minRange, maxRange: p.maxRange, status: "Active" },
    });
    for (const userId of p.approvers) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) continue;
      await prisma.approvalPerson.upsert({
        where: { approvalLevelProfileId_userId: { approvalLevelProfileId: p.id, userId } },
        create: { approvalLevelProfileId: p.id, userId, status: "Active" },
        update: { status: "Active" },
      });
    }
  }
  console.log("  Approval profiles (Subcon): tier1 ≤ 9,999.99 → user-sy; tier2 → user-danny / user-simeon");

  // ---------- Main + routing processes typically outsourced ----------
  const mainProcesses = [
    { id: "mprocess-heat-treatment", process: "Heat Treatment" },
    { id: "mprocess-surface-finishing", process: "Surface Finishing" },
  ];
  for (const m of mainProcesses) {
    await prisma.mainProcess.upsert({ where: { id: m.id }, create: m, update: {} });
  }
  const routingProfiles = [
    { id: "rp-hardening", mainProcessId: "mprocess-heat-treatment", routingProcess: "Hardening", costPerMinute: 0 },
    { id: "rp-annealing", mainProcessId: "mprocess-heat-treatment", routingProcess: "Annealing", costPerMinute: 0 },
    { id: "rp-powder-coating", mainProcessId: "mprocess-surface-finishing", routingProcess: "Powder Coating", costPerMinute: 0 },
    { id: "rp-galvanizing", mainProcessId: "mprocess-surface-finishing", routingProcess: "Hot Dip Galvanizing", costPerMinute: 0 },
  ];
  for (const r of routingProfiles) {
    await prisma.processProfile.upsert({ where: { id: r.id }, create: r, update: {} });
  }
  const bending = await prisma.processProfile.findUnique({ where: { routingProcess: "Bending" } });
  const welding = await prisma.processProfile.findUnique({ where: { routingProcess: "Arc Welding" } });
  console.log(`  Processes: ${mainProcesses.length} main, ${routingProfiles.length} routing`);

  // ---------- Subcon suppliers ----------
  const suppliers = [
    {
      id: "sup-subcon-heat",
      supplierCode: "SUBHT01",
      supplierName: "Precision Heat Treat Works",
      address: "Plot 14, SIDCO Industrial Estate, Ambattur, Chennai 600098",
      contact: { id: "scp-subcon-heat", contactPersonName: "Ravi Kumar", telNo: "044-26251234", mobileNo: "9840012345", email: "ravi@pht.example" },
    },
    {
      id: "sup-subcon-coat",
      supplierCode: "SUBCT01",
      supplierName: "Shine Coatings & Galvanizers",
      address: "No. 7, Guindy Industrial Estate, Chennai 600032",
      contact: { id: "scp-subcon-coat", contactPersonName: "Meena S", telNo: "044-22501111", mobileNo: "9884054321", email: "meena@shine.example" },
    },
  ];
  for (const s of suppliers) {
    await prisma.supplierProfile.upsert({
      where: { id: s.id },
      create: { id: s.id, supplierCode: s.supplierCode, supplierName: s.supplierName, remarks: TEST_TAG },
      update: {},
    });
    await prisma.supplierContactPerson.upsert({
      where: { id: s.contact.id },
      create: { ...s.contact, supplierId: s.id, isDefault: true },
      update: {},
    });
    await prisma.supplierAddress.upsert({
      where: { id: `${s.id}-addr` },
      create: { id: `${s.id}-addr`, supplierId: s.id, address: s.address, isDefault: true },
      update: {},
    });
  }
  const [heatSup, coatSup] = suppliers;
  console.log(`  Suppliers: ${suppliers.map((s) => s.supplierName).join(", ")}`);

  // ---------- Documents (only once) ----------
  const existing = await prisma.purchaseOrder.findFirst({ where: { type: "SUBCON", remark: { startsWith: TEST_TAG } } });
  if (existing) {
    console.log(`  Subcon test documents already exist (e.g. ${existing.poNo}) — skipping document creation.`);
    return;
  }

  // ---------- Work Order with outsourced routing steps ----------
  await prisma.workOrder.upsert({
    where: { workOrderNo: WO_NO },
    create: {
      workOrderNo: WO_NO,
      date: day(-10),
      customerId: customer.id,
      jobDescription: "Bracket assembly — subcon test",
      partName: "Mounting Bracket MB-200",
      quantity: 200,
      uom: "Pcs",
      deliveryDate: day(30),
      status: "WIP",
      remark: TEST_TAG,
    },
    update: {},
  });
  const inProcA = await prisma.workOrderInProcess.create({
    data: { workOrderNo: WO_NO, sn: 1, description: "Mounting bracket", targetCompletionDate: day(20), status: "WIP" },
  });
  const inProcB = await prisma.workOrderInProcess.create({
    data: { workOrderNo: WO_NO, sn: 2, description: "Base plate", targetCompletionDate: day(25), status: "New" },
  });

  const rp = async (inProcessId: string, sn: string, sequence: number, profileId: string | undefined, mainProcessId: string | undefined, target: number) =>
    prisma.routingProcess.create({
      data: { inProcessId, sn, sequence, routingProcessId: profileId ?? null, mainProcessId: mainProcessId ?? null, targetCompletionDate: day(target) },
    });

  // Mounting bracket: Bending (in-house) → Hardening (subcon) → Powder Coating (subcon) → Arc Welding (in-house)
  if (bending) await rp(inProcA.id, "1", 1, bending.id, bending.mainProcessId, 3);
  const aHardening = await rp(inProcA.id, "2", 2, "rp-hardening", "mprocess-heat-treatment", 8);
  const aCoating = await rp(inProcA.id, "3", 3, "rp-powder-coating", "mprocess-surface-finishing", 14);
  if (welding) await rp(inProcA.id, "4", 4, welding.id, welding.mainProcessId, 18);
  // Base plate: Annealing (subcon) → Galvanizing (subcon)
  const bAnnealing = await rp(inProcB.id, "1", 1, "rp-annealing", "mprocess-heat-treatment", 10);
  const bGalv = await rp(inProcB.id, "2", 2, "rp-galvanizing", "mprocess-surface-finishing", 20);
  console.log(`  Work Order: ${WO_NO} (2 in-processes, outsourced steps: Hardening, Powder Coating, Annealing, Galvanizing)`);

  // ---------- PO helper ----------
  type Line = {
    description: string;
    qty: number;
    uomId: string;
    price: number;
    routing: { id: string; mainProcessId: string; woRoutingProcessId?: string };
    hardness?: string;
    thickness?: string;
    deliveryIn: number;
  };
  type PoSpec = {
    label: string;
    supplier: (typeof suppliers)[number];
    withWo: boolean;
    lines: Line[];
    status: string;
    receiveStatus?: string;
    approvalTier?: number;
    firstApproved?: boolean;
    secondApproved?: boolean;
  };

  const users = Object.fromEntries(
    (await prisma.user.findMany({ where: { id: { in: ["user-sy", "user-danny"] } } })).map((u) => [u.id, u]),
  );

  const createPo = async (spec: PoSpec) => {
    const amountBeforeTax = spec.lines.reduce((s, l) => s + l.qty * l.price, 0);
    const taxAmount = +(amountBeforeTax * taxRate / 100).toFixed(2);
    const amountAfterTax = +(amountBeforeTax + taxAmount).toFixed(2);
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const poNo = await nextDocumentNo(tx, "PURCHASE_ORDER", {
        companyId: company.id,
        isTaken: async (no) => (await tx.purchaseOrder.count({ where: { poNo: no } })) > 0,
      });
      const c = spec.supplier.contact;
      return tx.purchaseOrder.create({
        data: {
          poNo,
          type: "SUBCON",
          revision: 0,
          date: day(-5),
          companyId: company.id,
          supplierId: spec.supplier.id,
          workOrderNo: spec.withWo ? WO_NO : null,
          currencyId: currency.id,
          exchangeRate: currency.exchangeRate,
          taxTypeId: tax.id,
          taxRate,
          amountBeforeTax,
          taxAmount,
          amountAfterTax,
          contactPersonId: c.id,
          telNo: c.telNo,
          mobileNo: c.mobileNo,
          email: c.email,
          purchaserId: purchaser.id,
          remark: `${TEST_TAG} ${spec.label}`,
          status: spec.status,
          receiveStatus: spec.receiveStatus ?? "NA",
          approvalTier: spec.approvalTier ?? 1,
          ...(spec.firstApproved && users["user-sy"]
            ? { firstApproverId: "user-sy", firstApproverName: users["user-sy"].name, firstApprovedAt: now, approverName: users["user-sy"].name }
            : {}),
          ...(spec.secondApproved && users["user-danny"]
            ? { secondApproverId: "user-danny", secondApproverName: users["user-danny"].name, secondApprovedAt: now, approverName: users["user-danny"].name }
            : {}),
          items: {
            create: spec.lines.map((l, i) => ({
              description: l.description,
              quantity: l.qty,
              poUomId: l.uomId,
              unitPrice: l.price,
              amount: l.qty * l.price,
              taxTypeId: tax.id,
              taxRate,
              taxAmount: +(l.qty * l.price * taxRate / 100).toFixed(2),
              deliveryDate: day(l.deliveryIn),
              hardness: l.hardness ?? null,
              thickness: l.thickness ?? null,
              masterMainProcessId: l.routing.mainProcessId,
              masterRoutingProcessId: l.routing.id,
              woRoutingProcessId: spec.withWo ? l.routing.woRoutingProcessId ?? null : null,
              sortOrder: i,
            })),
          },
        },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
    });
  };

  const R = {
    aHardening: { id: "rp-hardening", mainProcessId: "mprocess-heat-treatment", woRoutingProcessId: aHardening.id },
    aCoating: { id: "rp-powder-coating", mainProcessId: "mprocess-surface-finishing", woRoutingProcessId: aCoating.id },
    bAnnealing: { id: "rp-annealing", mainProcessId: "mprocess-heat-treatment", woRoutingProcessId: bAnnealing.id },
    bGalv: { id: "rp-galvanizing", mainProcessId: "mprocess-surface-finishing", woRoutingProcessId: bGalv.id },
    hardening: { id: "rp-hardening", mainProcessId: "mprocess-heat-treatment" },
    galv: { id: "rp-galvanizing", mainProcessId: "mprocess-surface-finishing" },
  };

  // 1. Draft — test edit / submit (single tier, ~4.7k)
  const po1 = await createPo({
    label: "1. Draft — submit me",
    supplier: heatSup, withWo: true, status: "Draft",
    lines: [{ description: "Through-harden brackets to 45–50 HRC", qty: 200, uomId: pcs.id, price: 20, routing: R.aHardening, hardness: "45-50 HRC", deliveryIn: 7 }],
  });

  // 2. Pending single-tier approval — approve as Shyue Yin (sy@visionone.com) → Issued
  const po2 = await createPo({
    label: "2. Pending single-tier approval",
    supplier: coatSup, withWo: true, status: "Pending For Approval", approvalTier: 1,
    lines: [{ description: "Powder coat RAL 7035, 60–80 µm", qty: 200, uomId: pcs.id, price: 18, routing: R.aCoating, thickness: "60-80 µm", deliveryIn: 12 }],
  });

  // 3. Pending first tier of a two-tier approval (> 9,999.99)
  const po3 = await createPo({
    label: "3. Pending two-tier approval (tier 1)",
    supplier: coatSup, withWo: true, status: "Pending First Tier Approval", approvalTier: 2,
    lines: [
      { description: "Hot dip galvanize base plates", qty: 850, uomId: kg.id, price: 22, routing: R.bGalv, thickness: "85 µm", deliveryIn: 20 },
    ],
  });

  // 4. Tier 1 approved, awaiting tier 2 — approve as Danny (danny@visionone.com)
  const po4 = await createPo({
    label: "4. Pending second-tier approval",
    supplier: heatSup, withWo: false, status: "Pending Second Tier Approval", approvalTier: 2, firstApproved: true,
    lines: [{ description: "Vacuum harden die blocks (stock, no WO)", qty: 60, uomId: pcs.id, price: 250, routing: R.hardening, hardness: "58-60 HRC", deliveryIn: 15 }],
  });

  // 5. Issued, two lines, no SRF yet — appears in SRF "Outstanding PO item"
  const po5 = await createPo({
    label: "5. Issued — create SRFs",
    supplier: heatSup, withWo: true, status: "Issued", receiveStatus: "Not Received", firstApproved: true,
    lines: [
      { description: "Harden mounting brackets (batch 2)", qty: 120, uomId: pcs.id, price: 20, routing: R.aHardening, hardness: "45-50 HRC", deliveryIn: 6 },
      { description: "Anneal base plates", qty: 300, uomId: kg.id, price: 12, routing: R.bAnnealing, deliveryIn: 9 },
    ],
  });

  // 6. Issued, SRF submitted in two batches; partial returns — create remaining SRT
  const po6 = await createPo({
    label: "6. Issued — SRF out, partially returned",
    supplier: coatSup, withWo: true, status: "Issued", receiveStatus: "Partially Received", firstApproved: true,
    lines: [
      { description: "Powder coat brackets RAL 9005", qty: 150, uomId: pcs.id, price: 18, routing: R.aCoating, thickness: "60-80 µm", deliveryIn: 10 },
    ],
  });

  // 7. Issued without WO, fully returned — completed chain for reports
  const po7 = await createPo({
    label: "7. Issued (no WO) — fully returned",
    supplier: coatSup, withWo: false, status: "Issued", receiveStatus: "Fully Received", firstApproved: true,
    lines: [{ description: "Galvanize spare angle frames", qty: 400, uomId: kg.id, price: 15, routing: R.galv, thickness: "70 µm", deliveryIn: -1 }],
  });

  // ---------- SRF / SRT ----------
  const createSrf = async (poItemId: string, qty: number, status: string, receiveStatus: string, contactId: string, dateRequired: number, remark: string) =>
    prisma.$transaction(async (tx) => {
      const srfNo = await nextDocumentNo(tx, "SUBCON_REQUEST_FORM", {
        isTaken: async (no) => (await tx.subconRequestForm.count({ where: { srfNo: no } })) > 0,
      });
      return tx.subconRequestForm.create({
        data: {
          srfNo, srfDate: day(-3), purchaseOrderItemId: poItemId, outsourcedById: purchaser.id,
          dateRequired: day(dateRequired), receivedById: contactId, quantity: qty, status, receiveStatus,
          remark: `${TEST_TAG} ${remark}`,
        },
      });
    });

  const createSrt = async (po: { id: string; supplierId: string }, srfId: string, qty: number, status: string, remark: string) =>
    prisma.$transaction(async (tx) => {
      const srtNo = await nextDocumentNo(tx, "SUBCON_RETURN_TRACKING", {
        companyId: company.id,
        isTaken: async (no) => (await tx.subconReturnTracking.count({ where: { srtNo: no } })) > 0,
      });
      return tx.subconReturnTracking.create({
        data: {
          srtNo, srtDate: day(-1), companyId: company.id, supplierId: po.supplierId, purchaseOrderId: po.id,
          subconRequestFormId: srfId, returnedQty: qty, status, remark: `${TEST_TAG} ${remark}`,
        },
      });
    });

  // PO6: batch 1 = 100 submitted, 60 returned (submitted) → Partially Received, 40 outstanding
  //      batch 2 = 50 still Draft → submit it, then return it
  const srf6a = await createSrf(po6.items[0].id, 100, "Submitted", "Partially Received", coatSup.contact.id, 8, "batch 1 — 40 pcs still at subcon");
  await createSrt(po6, srf6a.id, 60, "Submitted", "first return");
  const srf6b = await createSrf(po6.items[0].id, 50, "Draft", "N/A", coatSup.contact.id, 10, "batch 2 — draft, submit me");

  // PO7: fully done
  const srf7 = await createSrf(po7.items[0].id, 400, "Submitted", "Fully Received", coatSup.contact.id, -1, "all handed over");
  await createSrt(po7, srf7.id, 250, "Submitted", "return 1");
  await createSrt(po7, srf7.id, 150, "Submitted", "return 2");

  console.log("\n  Subcon POs created:");
  for (const [po, note] of [
    [po1, "Draft → submit (single tier)"],
    [po2, "Pending For Approval → approve as sy@visionone.com"],
    [po3, "Pending First Tier → sy, then danny/simeon"],
    [po4, "Pending Second Tier (no WO) → approve as danny@visionone.com"],
    [po5, "Issued, 2 lines → create SRFs from Outstanding PO items"],
    [po6, `Issued → ${srf6a.srfNo} 60/100 returned (create SRT for 40); ${srf6b.srfNo} Draft (50)`],
    [po7, `Issued no-WO → ${srf7.srfNo} fully returned`],
  ] as const) {
    console.log(`    ${po.poNo}  ${Number(po.amountAfterTax).toFixed(2).padStart(10)}  ${note}`);
  }
  console.log("\n  Users (password: password123): sy@visionone.com (tier 1), danny@visionone.com (tier 2), admin@visionone.com");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
