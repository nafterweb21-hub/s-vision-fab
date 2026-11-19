import { Fragment } from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintToolbar from "@/app/print/PrintToolbar";
import PrintBarcode from "./PrintBarcode";
import PrintQRCode from "./PrintQRCode";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dd}-${MONTHS[dt.getMonth()]}-${dt.getFullYear()}`;
}

function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${fmtDate(dt)} ${hh}:${mi}`;
}

// Decimal | number | string | null → display string
function num(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function txt(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="pfield">
      <span className="plabel">{label}</span>
      <span className="value">{value}</span>
    </div>
  );
}

function ParamGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pgroup">
      <div className="pgroup-title">{title}</div>
      <div className="pgrid">{children}</div>
    </div>
  );
}

export default async function PrintWorkOrderPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const wo = await prisma.workOrder.findUnique({
    where: { workOrderNo: id },
    include: {
      customer: true,
      inProcesses: {
        orderBy: { sn: "asc" },
        include: {
          conditionalSn: { select: { sn: true, description: true } },
          routingProcesses: {
            orderBy: { sequence: "asc" },
            include: {
              mainProcess: { select: { process: true } },
              routingProcess: { select: { routingProcess: true } },
              assignedEmployee: { select: { name: true, code: true } },
              productionTimesheets: {
                orderBy: { createdAt: "asc" },
                include: {
                  employee: { select: { name: true, code: true } },
                  weldingParameter: {
                    include: {
                      weldingMachine: true,
                      typeOfJoint: true,
                      materialTypes: true,
                      weldingTypes: true,
                      confirmedBy: { select: { name: true } },
                    },
                  },
                  sprayParameter: {
                    include: {
                      elcometer: true,
                      confirmedBy: { select: { name: true } },
                    },
                  },
                  machiningParameter: {
                    include: {
                      machine: true,
                      toolLists: true,
                      confirmedBy: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!wo) notFound();

  // "Show assigned employee on print" toggle on the WO details card.
  const showAssigned = wo.printAssignedEmployee;
  const routingCols = showAssigned ? 8 : 7;

  const processName = (rp: (typeof wo.inProcesses)[number]["routingProcesses"][number]) =>
    rp.routingProcess?.routingProcess || rp.mainProcess?.process || "—";

  // Flatten every timesheet with its routing/in-process context, in routing order.
  const timesheets = wo.inProcesses.flatMap((ip) =>
    ip.routingProcesses.flatMap((rp) =>
      rp.productionTimesheets.map((ts) => ({
        ts,
        inProcessLabel: `${ip.sn ?? "—"}. ${ip.description}`,
        routingSn: rp.sn,
        processName: processName(rp),
      })),
    ),
  );

  const withParams = timesheets.filter(
    (r) => r.ts.weldingParameter || r.ts.sprayParameter || r.ts.machiningParameter,
  );

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; padding: 0; background: #fff; font-family: var(--print-font); font-size: 10pt; color: #000; }
        .page { width: 210mm; min-height: 297mm; padding: 12mm 14mm; box-sizing: border-box; position: relative; }
        .row { display: flex; justify-content: space-between; align-items: flex-start; }

        .header-logo { width: 45%; background-color: #d8f1f8; text-align: center; padding: 15px 0; color: #2d89c9; font-weight: bold; font-size: 11pt; }
        .header-info { width: 55%; text-align: right; }
        .header-doc-no { font-size: 8.5pt; margin-bottom: 2px; color: #000; }
        .header-wo-no { margin-bottom: 2px; }
        /* QR and barcode sit side by side rather than stacked — the stacked
           pair pushed the whole sheet down by ~40mm. */
        .header-codes { display: flex; justify-content: flex-end; align-items: center; gap: 6px; margin-top: 3px; }
        .header-codes > div { background-color: #d8f1f8; padding: 3px; display: inline-block; line-height: 0; }

        .title { text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; margin: 5mm 0 4mm; }

        .table { width: 100%; border-collapse: collapse; }
        .table td, .table th { border: 1px solid #000; padding: 8px 10px; vertical-align: top; }

        .label { font-weight: bold; color: #000; font-size: 10pt; display: block; margin-bottom: 2px; }
        .value { color: #2d89c9; font-size: 10pt; }

        /* Header fields as a 4-column key/value grid: 4 short rows instead of
           7 full-width stacked ones. */
        .info-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
        .info-table td { border: 1px solid #000; padding: 3px 6px; vertical-align: top; }
        .info-table .k { font-weight: bold; color: #000; width: 17%; white-space: nowrap; }
        .info-table .v { color: #2d89c9; width: 33%; }

        /* ── Routing / timesheet / parameter sections ── */
        .section { margin-top: 5mm; page-break-inside: auto; }
        .section-title { font-size: 11pt; font-weight: bold; text-decoration: underline; margin-bottom: 3mm; }
        .empty { color: #555; font-size: 9pt; font-style: italic; }

        .grid-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
        .grid-table th, .grid-table td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; }
        .grid-table th { background: #d8f1f8; font-weight: bold; color: #000; text-align: left; }
        .grid-table td { color: #2d89c9; }
        .grid-table tr { page-break-inside: avoid; }
        .ip-row td { background: #f1f1f1; color: #000; font-weight: bold; }
        .num { text-align: right; }
        .ctr { text-align: center; }

        .ts-block { margin-bottom: 6mm; page-break-inside: avoid; }
        .ts-block-head { font-size: 9.5pt; font-weight: bold; color: #000; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 2mm; }
        .pgroup { margin-bottom: 3mm; }
        .pgroup-title { font-size: 9pt; font-weight: bold; color: #000; margin-bottom: 1mm; }
        .pgrid { display: flex; flex-wrap: wrap; }
        .pfield { width: 33.33%; box-sizing: border-box; padding: 0 3mm 1.5mm 0; font-size: 8.5pt; }
        .plabel { color: #000; display: block; }
        .pfield .value { font-size: 8.5pt; }

        @media screen {
          body { background: #f1f1f1; }
          .page { box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 20px auto; background: #fff; }
          .print-actions { position: fixed; top: 12px; right: 12px; z-index: 100; }
          .print-actions button { padding: 10px 16px; font-size: 14px; font-weight: 600; background: #1e3a8a; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
          .print-actions button:hover { background: #1e40af; }
        }
        @media print { .print-actions { display: none; } }
      `}</style>

      <PrintToolbar doc="work-order" id={id} label="Print WO" />

      <div className="page">
        <div className="row">
          <div className="header-logo" style={{ backgroundColor: "transparent", padding: 0, textAlign: "left" }}>
            <img src="/logo.jpg" alt="Company Logo" style={{ maxHeight: "40px", objectFit: "contain" }} />
          </div>
          <div className="header-info">
            <div className="header-doc-no">V-OPS-001 Rev F</div>
            <div className="header-wo-no">
              <span style={{ color: "#000" }}>Work Order No : </span>
              <span className="value">{wo.workOrderNo}</span>
            </div>
            <div className="header-codes">
              <div>
                <PrintQRCode value={wo.workOrderNo} size={46} />
              </div>
              <div>
                <PrintBarcode value={wo.workOrderNo} height={26} width={1} />
              </div>
            </div>
          </div>
        </div>

        <div className="title">WORK ORDER SHEET</div>

        <table className="info-table">
          <tbody>
            <tr>
              <td className="k">Customer</td>
              <td className="v">{wo.customer?.customerName || "—"}</td>
              <td className="k">Delivery Date</td>
              <td className="v">{fmtDate(wo.deliveryDate)}</td>
            </tr>
            <tr>
              <td className="k">Internal Quo No</td>
              <td className="v">{wo.internalQuotationNo || "—"}</td>
              <td className="k">Customer Ref No</td>
              <td className="v">{wo.customerPoRef || "—"}</td>
            </tr>
            <tr>
              <td className="k">Project Code</td>
              <td className="v">{wo.projectCode || "—"}</td>
              <td className="k">Qty</td>
              <td className="v">{wo.quantity?.toString() || "0"} {wo.uom || ""}</td>
            </tr>
            <tr>
              <td className="k">Part Name</td>
              <td className="v" colSpan={3}>{wo.partName || "—"}</td>
            </tr>
            <tr>
              <td className="k">Job Description</td>
              <td className="v" colSpan={3}>{wo.jobDescription || "—"}</td>
            </tr>
          </tbody>
        </table>

        {/* ── In-Process & Routing ── */}
        <div className="section">
          <div className="section-title">IN-PROCESS &amp; ROUTING</div>
          {wo.inProcesses.length === 0 ? (
            <div className="empty">No in-process steps defined.</div>
          ) : (
            <table className="grid-table">
              <thead>
                <tr>
                  <th style={{ width: "8%" }}>SN</th>
                  <th style={{ width: showAssigned ? "17%" : "22%" }}>Main Process</th>
                  <th style={{ width: showAssigned ? "17%" : "22%" }}>Routing Process</th>
                  {showAssigned && <th style={{ width: "10%" }}>Assigned</th>}
                  <th style={{ width: "14%" }}>Target Date</th>
                  <th style={{ width: "10%" }}>Status</th>
                  <th style={{ width: "10%" }}>Fully Recd</th>
                  <th style={{ width: "14%" }}>Remark</th>
                </tr>
              </thead>
              <tbody>
                {wo.inProcesses.map((ip) => (
                  <Fragment key={ip.id}>
                    <tr className="ip-row">
                      <td colSpan={routingCols}>
                        {ip.sn ?? "—"}. {ip.description}
                        {ip.allFlag ? " (All)" : ""}
                        {" — Target: "}
                        {fmtDate(ip.targetCompletionDate)}
                        {" | Status: "}
                        {ip.status}
                        {ip.conditionalSn
                          ? ` | Precondition: SN ${ip.conditionalSn.sn} (${ip.conditionalSn.description})`
                          : ""}
                        {ip.remark ? ` | Remark: ${ip.remark}` : ""}
                      </td>
                    </tr>
                    {ip.routingProcesses.length === 0 ? (
                      <tr key={`${ip.id}-none`}>
                        <td colSpan={routingCols} className="empty">
                          No routing processes.
                        </td>
                      </tr>
                    ) : (
                      ip.routingProcesses.map((rp) => (
                        <tr key={rp.id}>
                          <td>{rp.sn}</td>
                          <td>{txt(rp.mainProcess?.process)}</td>
                          <td>{txt(rp.routingProcess?.routingProcess)}</td>
                          {showAssigned && <td>{txt(rp.assignedEmployee?.name)}</td>}
                          <td>{fmtDate(rp.targetCompletionDate)}</td>
                          <td>{rp.status}</td>
                          <td className="ctr">{rp.fullyReceived ? "Yes" : "No"}</td>
                          <td>{txt(rp.remark)}</td>
                        </tr>
                      ))
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Production Timesheets ── */}
        <div className="section">
          <div className="section-title">PRODUCTION TIMESHEETS</div>
          {timesheets.length === 0 ? (
            <div className="empty">No timesheets recorded.</div>
          ) : (
            <table className="grid-table">
              <thead>
                <tr>
                  <th>SN</th>
                  <th>In-Process</th>
                  <th>Process</th>
                  <th>Employee</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th className="num">Total Min</th>
                  <th className="num">Idle Min</th>
                  <th className="ctr">Done</th>
                  <th className="num">Compl Qty</th>
                  <th className="num">Rej Qty</th>
                  <th>Machine</th>
                  <th>QC Status</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map(({ ts, inProcessLabel, routingSn, processName: pn }) => (
                  <tr key={ts.id}>
                    <td>{routingSn}</td>
                    <td>{inProcessLabel}</td>
                    <td>{pn}</td>
                    <td>
                      {ts.employee?.name}
                      {ts.employee?.code ? ` (${ts.employee.code})` : ""}
                    </td>
                    <td>{fmtDateTime(ts.timeIn)}</td>
                    <td>{fmtDateTime(ts.timeOut)}</td>
                    <td className="num">{num(ts.totalMinutes)}</td>
                    <td className="num">{num(ts.totalIdleMinutes)}</td>
                    <td className="ctr">{ts.completed ? "Yes" : ts.isPaused ? "Paused" : "No"}</td>
                    <td className="num">{num(ts.completedQty)}</td>
                    <td className="num">{num(ts.rejectedQty)}</td>
                    <td>{txt(ts.machineCodes)}</td>
                    <td>
                      {ts.qcStatus}
                      {ts.qcRemark ? ` — ${ts.qcRemark}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Process Parameters ── */}
        <div className="section">
          <div className="section-title">PROCESS PARAMETERS</div>
          {withParams.length === 0 ? (
            <div className="empty">No process parameters recorded.</div>
          ) : (
            withParams.map(({ ts, inProcessLabel, routingSn, processName: pn }) => {
              const w = ts.weldingParameter;
              const s = ts.sprayParameter;
              const m = ts.machiningParameter;
              return (
                <div className="ts-block" key={`p-${ts.id}`}>
                  <div className="ts-block-head">
                    SN {routingSn} — {inProcessLabel} — {pn}
                    {ts.employee?.name ? ` — ${ts.employee.name}` : ""}
                  </div>

                  {w && (
                    <>
                      <ParamGroup title="Welding — Materials &amp; Type">
                        <Field
                          label="Type of Material"
                          value={txt(w.materialTypes.map((mt) => mt.type).join(", "))}
                        />
                        <Field
                          label="Type of Welding"
                          value={txt(w.weldingTypes.map((wt) => wt.type).join(", "))}
                        />
                        <Field label="Welding Machine" value={txt(w.weldingMachine?.machineCode)} />
                      </ParamGroup>
                      <ParamGroup title="Welding — Machine Specs">
                        <Field label="Machine No" value={txt(w.weldingMachine?.machineNo)} />
                        <Field label="Brand" value={txt(w.weldingMachine?.brand)} />
                        <Field label="Model" value={txt(w.weldingMachine?.model)} />
                        <Field label="Current" value={num(w.weldingMachine?.current)} />
                        <Field label="S/No" value={txt(w.weldingMachine?.serialNo)} />
                      </ParamGroup>
                      <ParamGroup title="Welding — Joint &amp; Process">
                        <Field label="Type of Joint" value={txt(w.typeOfJoint?.joint)} />
                        <Field label="Electrode Type" value={txt(w.electrodeType)} />
                        <Field label="Welding Position" value={txt(w.weldingPosition)} />
                        <Field label="Welding Joint" value={num(w.weldingJoint)} />
                        <Field label="Welding Size (mm)" value={num(w.weldingSizeMm)} />
                      </ParamGroup>
                      <ParamGroup title="Welding — Parameters">
                        <Field label="Voltage (V)" value={num(w.voltageVolts)} />
                        <Field label="Current (A)" value={num(w.currentAmp)} />
                        <Field label="Cooling Time (mins)" value={num(w.coolingTimeMins)} />
                        <Field label="Pre Heating (°C)" value={num(w.preHeatingC)} />
                        <Field label="Post Heating (°C)" value={num(w.postHeatingC)} />
                        <Field label="Heat Treatment (HRC)" value={num(w.heatTreatmentHrc)} />
                      </ParamGroup>
                      <ParamGroup title="Welding — Confirmation">
                        <Field label="Status" value={txt(w.status)} />
                        <Field label="Confirmed By" value={txt(w.confirmedBy?.name)} />
                        <Field label="Confirmed Date" value={fmtDate(w.confirmedDate)} />
                        <Field label="Remark" value={txt(w.remark)} />
                      </ParamGroup>
                    </>
                  )}

                  {s && (
                    <>
                      <ParamGroup title="Spray Painting — Configuration">
                        <Field label="Paint Tank Pressure (psi)" value={num(s.paintTankPressurePsi)} />
                        <Field label="Spray Nozzle Size (Ø)" value={num(s.sprayNozzleSize)} />
                        <Field label="Type of Paint" value={txt(s.typeOfPaint)} />
                        <Field label="Remark" value={txt(s.remark)} />
                      </ParamGroup>
                      <ParamGroup title="A. Surface Preparation">
                        <Field label="Start" value={fmtDateTime(s.surfaceStartDatetime)} />
                        <Field label="End" value={fmtDateTime(s.surfaceEndDatetime)} />
                        <Field label="Weather" value={txt(s.surfaceGeneralWeather)} />
                        <Field label="Env Temp" value={txt(s.surfaceEnvTemperature)} />
                        <Field label="Humidity" value={txt(s.surfaceRelativeHumidity)} />
                        <Field label="Abrasive Type" value={txt(s.surfaceAbrasiveType)} />
                        <Field label="Sandpaper Grit" value={txt(s.surfaceSandpaperGrit)} />
                      </ParamGroup>
                      <ParamGroup title="B. Primer Coat">
                        <Field label="Start" value={fmtDateTime(s.primerStartDatetime)} />
                        <Field label="End" value={fmtDateTime(s.primerEndDatetime)} />
                        <Field label="Weather" value={txt(s.primerGeneralWeather)} />
                        <Field label="Env Temp" value={txt(s.primerEnvTemperature)} />
                        <Field label="Humidity" value={txt(s.primerRelativeHumidity)} />
                        <Field label="Paint Batch No" value={txt(s.primerPaintBatchNo)} />
                        <Field label="Expiry Date" value={fmtDate(s.primerExpiryDate)} />
                        <Field label="DFT Measurement" value={txt(s.primerDftMeasurement)} />
                      </ParamGroup>
                      <ParamGroup title="C. Top Coat — Surface Preparation">
                        <Field label="Start" value={fmtDateTime(s.topcoatStartDatetime)} />
                        <Field label="End" value={fmtDateTime(s.topcoatEndDatetime)} />
                        <Field label="Weather" value={txt(s.topcoatGeneralWeather)} />
                        <Field label="Env Temp" value={txt(s.topcoatEnvTemperature)} />
                        <Field label="Humidity" value={txt(s.topcoatRelativeHumidity)} />
                        <Field label="Abrasive Type" value={txt(s.topcoatAbrasiveType)} />
                        <Field label="Sandpaper Grit" value={txt(s.topcoatSandpaperGrit)} />
                      </ParamGroup>
                      <ParamGroup title="D. Top Coat">
                        <Field label="Start" value={fmtDateTime(s.topcoatStartDatetime2)} />
                        <Field label="End" value={fmtDateTime(s.topcoatEndDatetime2)} />
                        <Field label="Weather" value={txt(s.topcoatGeneralWeather2)} />
                        <Field label="Env Temp" value={txt(s.topcoatEnvTemperature2)} />
                        <Field label="Humidity" value={txt(s.topcoatRelativeHumidity2)} />
                        <Field label="Paint Batch No" value={txt(s.topcoatPaintBatchNo)} />
                        <Field label="Expiry Date" value={fmtDate(s.topcoatExpiryDate)} />
                        <Field label="DFT Measurement" value={txt(s.topcoatDftMeasurement)} />
                        <Field label="Adhesive Test Result" value={txt(s.topcoatAdhesiveTestResult)} />
                      </ParamGroup>
                      <ParamGroup title="Spray Painting — Confirmation">
                        <Field label="Status" value={txt(s.status)} />
                        <Field label="Elcometer Name" value={txt(s.elcometerName)} />
                        <Field label="Elcometer Serial No" value={txt(s.elcometer?.serialNo)} />
                        <Field label="Confirmed By" value={txt(s.confirmedBy?.name)} />
                        <Field label="Confirmed Date" value={fmtDate(s.confirmedDate)} />
                        <Field label="Additional Remark" value={txt(s.additionalRemark)} />
                      </ParamGroup>
                    </>
                  )}

                  {m && (
                    <>
                      <ParamGroup title="Machining — Machine Specs">
                        <Field label="Machine Type" value={txt(m.machine?.machineType)} />
                        <Field label="Machine Serial No" value={txt(m.machine?.serialNo)} />
                        <Field label="Machine No / Name" value={txt(m.machine?.machineNo)} />
                        <Field label="Brand" value={txt(m.machine?.brand)} />
                        <Field label="Model" value={txt(m.machine?.model)} />
                      </ParamGroup>
                      <ParamGroup title="Machining — Operation Details">
                        <Field label="CNC Program No" value={txt(m.cncProgramNo)} />
                        <Field label="Test Run" value={txt(m.testRun)} />
                        <Field label="Special Tooling" value={txt(m.specialTooling)} />
                        <Field label="Part Runtime (Hr)" value={num(m.partRuntimeHr)} />
                        <Field label="Part Runtime (Mins)" value={num(m.partRuntimeMins)} />
                        <Field
                          label="Tool List"
                          value={txt(m.toolLists.map((t) => String(t.toolValue)).join(", "))}
                        />
                      </ParamGroup>
                      <ParamGroup title="Machining — Confirmation">
                        <Field label="Status" value={txt(m.status)} />
                        <Field label="Confirmed By" value={txt(m.confirmedBy?.name)} />
                        <Field label="Confirmed Date" value={fmtDate(m.confirmedDate)} />
                        <Field label="Remark" value={txt(m.remark)} />
                      </ParamGroup>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

