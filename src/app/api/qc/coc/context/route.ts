import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { soPartNoForWorkOrder } from "@/lib/coc";

type Person = { id: string; name: string; code: string; idNo: string | null; routings: string[] };

/**
 * Read-only details for one DO + WO pair on the COC form: the WO / DO fields
 * the spec shows read-only, the SO Part No (Final COC drawing no), and the
 * welders, painters, welding processes and machines recorded at the Scanning
 * Terminal for this WO.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deliveryOrderId = searchParams.get("deliveryOrderId") || "";
    const workOrderNo = searchParams.get("workOrderNo") || "";
    if (!deliveryOrderId || !workOrderNo) return NextResponse.json({ error: "deliveryOrderId and workOrderNo are required" }, { status: 400 });

    const [wo, doItems, soPartNo, timesheets] = await Promise.all([
      prisma.workOrder.findUnique({
        where: { workOrderNo },
        select: { jobDescription: true, partName: true, customerPoRef: true, quantity: true, uom: true },
      }),
      prisma.deliveryOrderItem.findMany({
        where: { deliveryOrderId, workOrderNo },
        select: { quantity: true, uomId: true, uom: { select: { uomName: true } } },
      }),
      soPartNoForWorkOrder(prisma, workOrderNo),
      prisma.productionTimesheet.findMany({
        where: { routingProcess: { inProcess: { workOrderNo } } },
        orderBy: { timeIn: "desc" },
        select: {
          employee: { select: { id: true, name: true, code: true, aadharNumber: true } },
          routingProcess: { select: { mainProcess: { select: { process: true } }, routingProcess: { select: { routingProcess: true } } } },
          weldingParameter: { select: { weldingMachine: { select: { id: true, machineNo: true, brand: true } }, weldingTypes: { select: { type: true } } } },
          sprayParameter: { select: { topcoatDftMeasurement: true, topcoatPaintBatchNo: true } },
        },
      }),
    ]);
    if (!wo) return NextResponse.json({ error: "Work order not found" }, { status: 404 });

    const welders = new Map<string, Person>();
    const painters = new Map<string, Person>();
    const machines = new Map<string, { id: string; machineNo: string; brand: string | null }>();
    const weldingProcesses = new Set<string>();
    const topCoats: { employeeId: string; dft: string | null; batchNo: string | null }[] = [];

    const add = (map: Map<string, Person>, e: (typeof timesheets)[number]["employee"], routing: string) => {
      const p = map.get(e.id) ?? { id: e.id, name: e.name, code: e.code, idNo: e.aadharNumber, routings: [] };
      if (routing && !p.routings.includes(routing)) p.routings.push(routing);
      map.set(e.id, p);
    };

    for (const ts of timesheets) {
      const main = ts.routingProcess.mainProcess?.process ?? "";
      const routing = ts.routingProcess.routingProcess?.routingProcess ?? main;
      const label = `${main} ${routing}`.toLowerCase();
      if (ts.weldingParameter || label.includes("weld")) {
        add(welders, ts.employee, routing);
        const m = ts.weldingParameter?.weldingMachine;
        if (m) machines.set(m.id, m);
        for (const t of ts.weldingParameter?.weldingTypes ?? []) weldingProcesses.add(t.type);
      }
      if (ts.sprayParameter || label.includes("paint") || label.includes("spray")) {
        add(painters, ts.employee, routing);
        const sp = ts.sprayParameter;
        if (sp && (sp.topcoatDftMeasurement || sp.topcoatPaintBatchNo)) {
          topCoats.push({ employeeId: ts.employee.id, dft: sp.topcoatDftMeasurement, batchNo: sp.topcoatPaintBatchNo });
        }
      }
    }

    const doQuantity = doItems.reduce((n, i) => n + Number(i.quantity || 0), 0);
    return NextResponse.json({
      wo: {
        description: wo.jobDescription,
        partName: wo.partName,
        customerPoRef: wo.customerPoRef,
        quantity: wo.quantity != null ? Number(wo.quantity) : null,
        uom: wo.uom,
      },
      doItem: doItems.length ? { quantity: doQuantity, uomId: doItems[0].uomId, uomName: doItems[0].uom?.uomName ?? null } : null,
      soPartNo,
      welders: [...welders.values()],
      painters: [...painters.values()],
      weldingMachines: [...machines.values()],
      weldingProcesses: [...weldingProcesses].sort(),
      topCoats,
    });
  } catch (error: any) {
    console.error("COC context error:", error);
    return NextResponse.json({ error: "Could not load work order details." }, { status: 500 });
  }
}
