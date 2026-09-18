import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

import { RecordStatus } from "../src/lib/status";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ---------- Roles ----------
  const roles = ["ADMIN", "SALES", "PRODUCTION", "PURCHASING", "QC", "PLANNER", "VIEWER"];
  for (const role of roles) {
    await prisma.roleProfile.upsert({
      where: { name: role },
      create: { name: role, permissions: [] },
      update: {},
    });
  }

  // ---------- Users ----------
  const defaultPasswordHash = await bcrypt.hash("password123", 10);
  const users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }> = [
    { id: "user-sy", name: "Shyue Yin", email: "sy@visionone.com", role: "PURCHASING" },
    { id: "user-danny", name: "Danny", email: "danny@visionone.com", role: "PURCHASING" },
    { id: "user-simeon", name: "Simeon", email: "simeon@visionone.com", role: "SALES" },
    { id: "user-admin", name: "Admin", email: "admin@visionone.com", role: "ADMIN" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: { ...u, passwordHash: defaultPasswordHash, isActive: true },
      update: { name: u.name, email: u.email, role: u.role, passwordHash: defaultPasswordHash, isActive: true },
    });
  }
  console.log(`  Users: ${users.length}`);

  // ---------- Approval Level Profiles ----------
  const approvalProfiles = [
    {
      id: "prof-1",
      module: "Purchase Order - Material",
      actionButton: "First Level",
      minRange: 0,
      maxRange: 499.99,
      status: "Active",
      approvers: [{ userId: "user-sy" }],
    },
    {
      id: "prof-2",
      module: "Purchase Order - Material",
      actionButton: "Second Level",
      minRange: 500,
      maxRange: 1000000,
      status: "Active",
      approvers: [{ userId: "user-danny" }, { userId: "user-simeon" }],
    },
  ];
  for (const p of approvalProfiles) {
    await prisma.approvalLevelProfile.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        module: p.module,
        actionButton: p.actionButton,
        minRange: p.minRange,
        maxRange: p.maxRange,
        status: p.status,
      },
      update: {
        module: p.module,
        actionButton: p.actionButton,
        minRange: p.minRange,
        maxRange: p.maxRange,
        status: p.status,
      },
    });
    await prisma.approvalPerson.deleteMany({ where: { approvalLevelProfileId: p.id } });
    for (const a of p.approvers) {
      await prisma.approvalPerson.create({
        data: {
          approvalLevelProfileId: p.id,
          userId: a.userId,
          status: "Active",
        },
      });
    }
  }
  console.log(`  Approval profiles: ${approvalProfiles.length}`);

  // ---------- Material Categories ----------
  const categories = [
    { id: "cat-1779428007331", name: "machine", description: null },
    { id: "cat-1779428835038", name: "machine1", description: null },
  ];
  for (const c of categories) {
    await prisma.materialCategory.upsert({
      where: { id: c.id },
      create: { id: c.id, name: c.name, description: c.description },
      update: { description: c.description },
    });
  }
  console.log(`  Material categories: ${categories.length}`);

  // ---------- Material Types ----------
  const materialTypes = [
    { id: "mt-1", type: "Stainless Steel", remark: "Default Material", status: "Active" },
  ];
  for (const t of materialTypes) {
    await prisma.materialType.upsert({
      where: { id: t.id },
      create: t,
      update: { remark: t.remark, status: t.status },
    });
  }
  console.log(`  Material types: ${materialTypes.length}`);

  // ---------- Main Processes ----------
  const mainProcesses = [
    { id: "mprocess-1", process: "Welding", remark: "Main welding process", status: "Active" },
    { id: "mprocess-sizing-material", process: "sizing material", remark: "dfghj", status: "Active" },
    { id: "mprocess-sizing", process: "sizing", remark: "sdfghj", status: "Active" },
  ];
  for (const m of mainProcesses) {
    await prisma.mainProcess.upsert({
      where: { id: m.id },
      create: m,
      update: { remark: m.remark, status: m.status },
    });
  }
  console.log(`  Main processes: ${mainProcesses.length}`);

  // ---------- Process Profiles ----------
  const processProfiles = [
    {
      id: "process-laser",
      mainProcessId: "mprocess-1",
      routingProcess: "LASER",
      welding: true,
      sprayPainting: false,
      machining: false,
      costPerMinute: 90,
      remark: "FGHJK",
      status: "Active",
    },
  ];
  for (const p of processProfiles) {
    await prisma.processProfile.upsert({
      where: { id: p.id },
      create: p,
      update: {
        welding: p.welding,
        sprayPainting: p.sprayPainting,
        machining: p.machining,
        costPerMinute: p.costPerMinute,
        remark: p.remark,
        status: p.status,
      },
    });
  }
  console.log(`  Process profiles: ${processProfiles.length}`);

  // ---------- Employees ----------
  const employees = [
    {
      id: "emp-1",
      code: "EMP001",
      name: "Christopher Robin",
      aadharNumber: "123412341234",
      designation: "MANAGER",
      email: "christopher@visionone.com",
      mobileNo: "98765432",
      doj: new Date("1990-01-01"),
      gender: "Male",
      employmentType: "Citizen",
      status: RecordStatus.Active,
    },
    {
      id: "emp-2",
      code: "EMP002",
      name: "Piglet",
      aadharNumber: "901290129012",
      designation: "OPERATOR",
      email: "piglet@visionone.com",
      mobileNo: "81234567",
      doj: null,
      gender: "Female",
      employmentType: "PR",
      status: RecordStatus.Active,
    },
    {
      id: "emp-3",
      code: "EMP003",
      name: "Subramaniam Ramasamy",
      aadharNumber: "456745674567",
      designation: "Machinist Operator",
      email: "subra.r@visionone.com.sg",
      mobileNo: "82345678",
      doj: new Date("1985-05-15"),
      gender: "Male",
      employmentType: "Employment Pass",
      status: RecordStatus.Inactive,
    },
  ];
  for (const e of employees) {
    await prisma.employee.upsert({
      where: { id: e.id },
      create: e,
      update: {
        aadharNumber: e.aadharNumber,
        designation: e.designation,
        email: e.email,
        mobileNo: e.mobileNo,
        doj: e.doj,
        gender: e.gender,
        employmentType: e.employmentType,
        status: e.status,
      },
    });
  }
  console.log(`  Employees: ${employees.length}`);

  // ---------- Material Profiles ----------
  const materials = [
    {
      id: "mat-1779428038401",
      partNo: "MAT-001",
      description: "Round bar 50MM",
      shape: "ROUND BAR",
      size: "50MM",
      categoryId: "cat-1779428007331",
      remark: "NIL",
      status: "Active",
    },
  ];
  for (const m of materials) {
    await prisma.materialProfile.upsert({
      where: { id: m.id },
      create: m,
      update: { description: m.description, shape: m.shape, size: m.size, remark: m.remark, status: m.status },
    });
  }
  console.log(`  Materials: ${materials.length}`);

  // ---------- Joint Profiles ----------
  const joints = [
    {
      id: "jp-1",
      joint: "Butt Joint",
      remark: "Standard butt joint",
      status: "Inactive",
      createdBy: "Admin",
      updatedBy: "Admin",
    },
    {
      id: "jp-2",
      joint: "Tee Joint",
      remark: "T-shaped intersection",
      status: "Active",
      createdBy: "Admin",
      updatedBy: "Admin",
    },
  ];
  for (const j of joints) {
    await prisma.jointProfile.upsert({
      where: { id: j.id },
      create: j,
      update: { remark: j.remark, status: j.status, updatedBy: j.updatedBy },
    });
  }
  console.log(`  Joint profiles: ${joints.length}`);

  // ---------- Failure Mode Profiles ----------
  const failureModes = [
    {
      id: "fmp-coating",
      failureMode: "COATING",
      remark: "NO",
      status: "Active",
      createdBy: "Admin",
      updatedBy: "Admin",
    },
  ];
  for (const f of failureModes) {
    await prisma.failureModeProfile.upsert({
      where: { id: f.id },
      create: f,
      update: { remark: f.remark, status: f.status, updatedBy: f.updatedBy },
    });
  }
  console.log(`  Failure mode profiles: ${failureModes.length}`);

  // ---------- Painting Methods ----------
  const paintingMethods = [
    { id: "pm-machine", method: "machine", remark: "nil", status: "Active" },
    { id: "pm-gunkote", method: "GUNKOTE", remark: null, status: "Active" },
  ];
  for (const p of paintingMethods) {
    await prisma.paintingMethodProfile.upsert({
      where: { id: p.id },
      create: p,
      update: { remark: p.remark, status: p.status },
    });
  }
  console.log(`  Painting methods: ${paintingMethods.length}`);

  // ---------- Payment Terms ----------
  const paymentTerms = [
    { id: "pt-1", name: "COD", days: 0, remark: "Cash on Delivery", status: "Active" },
    { id: "pt-2", name: "Net 30", days: 30, remark: "Payment due in 30 days", status: "Active" },
    { id: "pt-net40", name: "net 40", days: 30, remark: null, status: "Active" },
  ];
  for (const pt of paymentTerms) {
    await prisma.paymentTermProfile.upsert({
      where: { id: pt.id },
      create: pt,
      update: { days: pt.days, remark: pt.remark, status: pt.status },
    });
  }
  console.log(`  Payment terms: ${paymentTerms.length}`);

  // ---------- Welding Types ----------
  const weldingTypes = [
    { id: "wt-smaw", type: "SMAW", remark: "Shielded metal arc welding", status: "Active" },
  ];
  for (const w of weldingTypes) {
    await prisma.weldingTypeProfile.upsert({
      where: { id: w.id },
      create: w,
      update: { remark: w.remark, status: w.status },
    });
  }
  console.log(`  Welding types: ${weldingTypes.length}`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
