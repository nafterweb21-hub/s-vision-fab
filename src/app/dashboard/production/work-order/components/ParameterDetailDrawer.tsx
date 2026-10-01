"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, Edit, Save } from "lucide-react";
import { updateProcessParameters } from "../actions";
type Props = {
  welding?: any;
  spray?: any;
  machining?: any;
  expectedType?: string | null;
  employees?: any[];
  workOrderNo?: string;
  editable?: boolean;
  supportData?: {
    weldingMachines?: any[];
    machiningMachines?: any[];
    elcometers?: any[];
    joints?: any[];
    materialTypes?: any[];
    weldingTypes?: any[];
  };
  targetTimesheetId?: string | null;
};

function formatDateTimeLocal(dStr?: string | Date | null) {
  if (!dStr) return "";
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function formatDateLocal(dStr?: string | Date | null) {
  if (!dStr) return "";
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ParameterDetailDrawer({
  welding,
  spray,
  machining,
  employees = [],
  workOrderNo = "",
  editable = false,
  supportData = {},
  expectedType = null,
  targetTimesheetId = null,
}: Props) {
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formPayload, setFormPayload] = useState<any>(null);
  const [error, setError] = useState("");

  const has = welding || spray || machining;

  const type = welding ? "Welding" : spray ? "Spray Painting" : machining ? "Machining" : expectedType || "Process Parameter";
  const parameter = welding || spray || machining;

  const handleSave = () => {
    setError("");
    startTransition(async () => {
      const typeKey = welding ? "welding" : spray ? "spray" : machining ? "machining" : 
                      expectedType?.toLowerCase().includes("weld") ? "welding" : 
                      expectedType?.toLowerCase().includes("spray") ? "spray" : "machining";
      
      const idOrTs = parameter?.id || targetTimesheetId;
      if (!idOrTs) {
        setError("Cannot save: No process parameter and no timesheet provided.");
        return;
      }
      
      const res = await updateProcessParameters(idOrTs, typeKey as any, workOrderNo, formPayload, !parameter);
      if (!res.success) {
        setError(res.error || "Failed to update process parameters");
      } else {
        setIsEditing(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setIsEditing(false);
          setError("");
        }}
        className="px-1.5 py-0.5 sm:px-3 sm:py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded sm:rounded-lg text-[9px] sm:text-xs font-semibold hover:bg-blue-100 transition-colors shadow-sm"
      >
        View
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-full h-full flex flex-col">
            <div className="px-3 py-2 sm:px-6 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-[11px] sm:text-lg font-semibold text-slate-800">
                Process Parameter — {type} {isEditing && <span className="text-[9px] sm:text-sm font-normal text-indigo-600">(Editing)</span>}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-0.5 sm:p-1 hover:bg-slate-200 rounded-md text-slate-500 transition-colors"
              >
                <X size={14} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-3 sm:p-6 overflow-y-auto flex-1">
              {error && (
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 text-red-700 rounded-md sm:rounded-lg text-[9px] sm:text-sm">
                  {error}
                </div>
              )}

              {!isEditing ? (
                <>
                  {welding && <WeldingDetail data={welding} />}
                  {spray && <SprayDetail data={spray} />}
                  {machining && <MachiningDetail data={machining} />}
                  {!has && (
                    <div className="text-center py-10 text-slate-500 text-sm">
                      <p className="mb-2 text-base font-semibold text-slate-700">No parameters recorded yet.</p>
                      {!targetTimesheetId ? (
                        <>
                          <p>Please create a Production Timesheet for this process first.</p>
                          <p className="mt-1 text-xs text-slate-400">Process parameters must be attached to a specific timesheet.</p>
                        </>
                      ) : (
                        <p>A timesheet exists. You can now add parameters.</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {(welding || expectedType === "Welding") && (
                    <WeldingEdit
                      data={welding || {}}
                      supportData={supportData}
                      onChange={setFormPayload}
                    />
                  )}
                  {(spray || expectedType === "Spray Painting") && (
                    <SprayEdit
                      data={spray || {}}
                      supportData={supportData}
                      onChange={setFormPayload}
                    />
                  )}
                  {(machining || expectedType === "Machining") && (
                    <MachiningEdit
                      data={machining || {}}
                      supportData={supportData}
                      onChange={setFormPayload}
                    />
                  )}
                </>
              )}
            </div>

            <div className="px-3 py-2 sm:px-6 sm:py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                {editable && !isEditing && (has || targetTimesheetId) && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      // Initialize form payload with current data
                      if (welding || expectedType === "Welding") {
                        setFormPayload({
                          weldingMachineId: welding?.weldingMachineId || "",
                          typeOfJointId: welding?.typeOfJointId || "",
                          electrodeType: welding?.electrodeType || "",
                          weldingPosition: welding?.weldingPosition || "",
                          weldingJoint: welding?.weldingJoint ?? "",
                          weldingSizeMm: welding?.weldingSizeMm ?? "",
                          voltageVolts: welding?.voltageVolts ?? "",
                          currentAmp: welding?.currentAmp ?? "",
                          coolingTimeMins: welding?.coolingTimeMins ?? "",
                          preHeatingC: welding?.preHeatingC ?? "",
                          postHeatingC: welding?.postHeatingC ?? "",
                          heatTreatmentHrc: welding?.heatTreatmentHrc ?? "",
                          remark: welding?.remark || "",
                          materialTypeIds: (welding?.materialTypes ?? []).map((m: any) => m.id),
                          weldingTypeIds: (welding?.weldingTypes ?? []).map((w: any) => w.id),
                        });
                      } else if (spray || expectedType === "Spray Painting") {
                        setFormPayload({
                          paintTankPressurePsi: spray?.paintTankPressurePsi ?? "",
                          sprayNozzleSize: spray?.sprayNozzleSize ?? "",
                          typeOfPaint: spray?.typeOfPaint || "",
                          remark: spray?.remark || "",
                          surfaceStartDatetime: formatDateTimeLocal(spray?.surfaceStartDatetime),
                          surfaceEndDatetime: formatDateTimeLocal(spray?.surfaceEndDatetime),
                          surfaceGeneralWeather: spray?.surfaceGeneralWeather || "",
                          surfaceEnvTemperature: spray?.surfaceEnvTemperature || "",
                          surfaceRelativeHumidity: spray?.surfaceRelativeHumidity || "",
                          surfaceAbrasiveType: spray?.surfaceAbrasiveType || "",
                          surfaceSandpaperGrit: spray?.surfaceSandpaperGrit || "",
                          primerStartDatetime: formatDateTimeLocal(spray?.primerStartDatetime),
                          primerEndDatetime: formatDateTimeLocal(spray?.primerEndDatetime),
                          primerGeneralWeather: spray?.primerGeneralWeather || "",
                          primerEnvTemperature: spray?.primerEnvTemperature || "",
                          primerRelativeHumidity: spray?.primerRelativeHumidity || "",
                          primerPaintBatchNo: spray?.primerPaintBatchNo || "",
                          primerExpiryDate: formatDateLocal(spray?.primerExpiryDate),
                          primerDftMeasurement: spray?.primerDftMeasurement || "",
                          topcoatStartDatetime2: formatDateTimeLocal(spray?.topcoatStartDatetime2),
                          topcoatEndDatetime2: formatDateTimeLocal(spray?.topcoatEndDatetime2),
                          topcoatGeneralWeather2: spray?.topcoatGeneralWeather2 || "",
                          topcoatEnvTemperature2: spray?.topcoatEnvTemperature2 || "",
                          topcoatRelativeHumidity2: spray?.topcoatRelativeHumidity2 || "",
                          topcoatAbrasiveType: spray?.topcoatAbrasiveType || "",
                          topcoatSandpaperGrit: spray?.topcoatSandpaperGrit || "",
                          topcoatPaintBatchNo: spray?.topcoatPaintBatchNo || "",
                          topcoatExpiryDate: formatDateLocal(spray?.topcoatExpiryDate),
                          topcoatDftMeasurement: spray?.topcoatDftMeasurement || "",
                          topcoatAdhesiveTestResult: spray?.topcoatAdhesiveTestResult || "",
                          additionalRemark: spray?.additionalRemark || "",
                          elcometerSerialNoId: spray?.elcometerSerialNoId || "",
                          elcometerName: spray?.elcometerName || "",
                        });
                      } else if (machining || expectedType === "Machining") {
                        setFormPayload({
                          machineSerialNoId: machining?.machineSerialNoId || "",
                          cncProgramNo: machining?.cncProgramNo || "",
                          testRun: machining?.testRun || "",
                          specialTooling: machining?.specialTooling || "",
                          partRuntimeHr: machining?.partRuntimeHr ?? "",
                          partRuntimeMins: machining?.partRuntimeMins ?? "",
                          remark: machining?.remark || "",
                          toolList: (machining?.toolLists ?? []).map((t: any) => Number(t.toolValue)),
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-4 sm:py-2 border border-indigo-200 text-indigo-600 rounded sm:rounded-lg hover:bg-indigo-50 text-[10px] sm:text-sm font-semibold transition-colors"
                  >
                    <Edit size={12} className="sm:w-4 sm:h-4" />
                    {has ? "Update" : "Add Parameters"}
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 sm:gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-2 py-1 sm:px-4 sm:py-2 border border-slate-200 text-slate-600 rounded sm:rounded-lg hover:bg-slate-100 text-[10px] sm:text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded sm:rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-[10px] sm:text-sm font-semibold transition-colors"
                    >
                      <Save size={12} className="sm:w-4 sm:h-4" />
                      {isPending ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setOpen(false)}
                    className="px-2 py-1 sm:px-4 sm:py-2 border border-slate-200 text-slate-600 rounded sm:rounded-lg hover:bg-slate-100 text-[10px] sm:text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value?: any }) {
  return (
    <div>
      <div className="text-[9px] sm:text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-0.5 sm:mt-1 px-2 py-1 sm:px-3 sm:py-1.5 border border-slate-100 rounded bg-slate-50 text-[10px] sm:text-sm text-slate-700 min-h-[24px] sm:min-h-[34px]">
        {value == null || value === "" ? "-" : String(value)}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 sm:mb-5">
      <h4 className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 sm:mb-2.5 pb-0.5 sm:pb-1 border-b border-slate-100">
        {title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4">{children}</div>
    </div>
  );
}

function WeldingDetail({ data }: { data: any }) {
  return (
    <>
      <Section title="Materials & Type">
        <Field label="Type of Material" value={(data.materialTypes ?? []).map((m: any) => m.type ?? m.materialName ?? m.name).join(", ")} />
        <Field label="Type of Welding" value={(data.weldingTypes ?? []).map((w: any) => w.type ?? w.typeName ?? w.name).join(", ")} />
        <Field label="Welding Machine" value={data.weldingMachine?.machineCode ?? data.weldingMachine?.machineName} />
      </Section>
      <Section title="Machine Specs">
        <Field label="Machine No" value={data.weldingMachine?.machineNo} />
        <Field label="Brand" value={data.weldingMachine?.brand} />
        <Field label="Model" value={data.weldingMachine?.model} />
        <Field label="Current" value={data.weldingMachine?.current} />
        <Field label="S/No" value={data.weldingMachine?.serialNo} />
      </Section>
      <Section title="Joint & Process">
        <Field label="Type of Joint" value={data.typeOfJoint?.joint} />
        <Field label="Electrode Type" value={data.electrodeType} />
        <Field label="Welding Position" value={data.weldingPosition} />
        <Field label="Welding Joint" value={data.weldingJoint} />
        <Field label="Welding Size (mm)" value={data.weldingSizeMm} />
      </Section>
      <Section title="Parameters">
        <Field label="Voltage (V)" value={data.voltageVolts} />
        <Field label="Current (A)" value={data.currentAmp} />
        <Field label="Cooling Time (mins)" value={data.coolingTimeMins} />
        <Field label="Pre Heating (°C)" value={data.preHeatingC} />
        <Field label="Post Heating (°C)" value={data.postHeatingC} />
        <Field label="Heat Treatment (HRC)" value={data.heatTreatmentHrc} />
      </Section>
      <Section title="Confirmation Status">
        <Field label="Status" value={data.status} />
        <Field label="Confirmed By" value={data.confirmedBy?.name} />
        <Field label="Confirmed Date" value={data.confirmedDate ? new Date(data.confirmedDate).toLocaleDateString() : null} />
      </Section>
      <Section title="Remark">
        <Field label="Remark" value={data.remark} />
      </Section>
    </>
  );
}

function SprayDetail({ data }: { data: any }) {
  return (
    <>
      <Section title="Spray Configuration">
        <Field label="Paint Tank Pressure (psi)" value={data.paintTankPressurePsi} />
        <Field label="Spray Nozzle Size (Ø)" value={data.sprayNozzleSize} />
        <Field label="Type of Paint" value={data.typeOfPaint} />
        <Field label="Remark" value={data.remark} />
      </Section>
      <Section title="A. Surface Preparation">
        <Field label="Start" value={data.surfaceStartDatetime ? new Date(data.surfaceStartDatetime).toLocaleString() : null} />
        <Field label="End" value={data.surfaceEndDatetime ? new Date(data.surfaceEndDatetime).toLocaleString() : null} />
        <Field label="Weather" value={data.surfaceGeneralWeather} />
        <Field label="Env Temp" value={data.surfaceEnvTemperature} />
        <Field label="Humidity" value={data.surfaceRelativeHumidity} />
        <Field label="Abrasive Type" value={data.surfaceAbrasiveType} />
        <Field label="Sandpaper Grit" value={data.surfaceSandpaperGrit} />
      </Section>
      <Section title="B. Primer Coat">
        <Field label="Start" value={data.primerStartDatetime ? new Date(data.primerStartDatetime).toLocaleString() : null} />
        <Field label="End" value={data.primerEndDatetime ? new Date(data.primerEndDatetime).toLocaleString() : null} />
        <Field label="Weather" value={data.primerGeneralWeather} />
        <Field label="Env Temp" value={data.primerEnvTemperature} />
        <Field label="Humidity" value={data.primerRelativeHumidity} />
        <Field label="Paint Batch No" value={data.primerPaintBatchNo} />
        <Field label="Expiry Date" value={data.primerExpiryDate ? new Date(data.primerExpiryDate).toLocaleDateString() : null} />
        <Field label="DFT Measurement" value={data.primerDftMeasurement} />
      </Section>
      <Section title="C. Top Coat">
        <Field label="Start" value={data.topcoatStartDatetime2 ? new Date(data.topcoatStartDatetime2).toLocaleString() : null} />
        <Field label="End" value={data.topcoatEndDatetime2 ? new Date(data.topcoatEndDatetime2).toLocaleString() : null} />
        <Field label="Weather" value={data.topcoatGeneralWeather2} />
        <Field label="Env Temp" value={data.topcoatEnvTemperature2} />
        <Field label="Humidity" value={data.topcoatRelativeHumidity2} />
        <Field label="Paint Batch No" value={data.topcoatPaintBatchNo} />
        <Field label="Expiry Date" value={data.topcoatExpiryDate ? new Date(data.topcoatExpiryDate).toLocaleDateString() : null} />
        <Field label="DFT Measurement" value={data.topcoatDftMeasurement} />
        <Field label="Adhesive Test Result" value={data.topcoatAdhesiveTestResult} />
      </Section>
      <Section title="Confirmation Status">
        <Field label="Status" value={data.status} />
        <Field label="Elcometer Name" value={data.elcometerName} />
        <Field label="Elcometer Serial No" value={data.elcometer?.serialNo ?? data.elcometer?.elcometerSerialNo} />
        <Field label="Confirmed By" value={data.confirmedBy?.name} />
        <Field label="Confirmed Date" value={data.confirmedDate ? new Date(data.confirmedDate).toLocaleDateString() : null} />
        <Field label="Additional Remark" value={data.additionalRemark} />
      </Section>
    </>
  );
}

function MachiningDetail({ data }: { data: any }) {
  return (
    <>
      <Section title="Machine Specs">
        <Field label="Machine Type" value={data.machine?.machineType} />
        <Field label="Machine Serial No" value={data.machine?.serialNo ?? data.machine?.machineSerialNo} />
        <Field label="Machine No / Name" value={data.machine?.machineNo ?? data.machine?.machineName} />
        <Field label="Brand" value={data.machine?.brand} />
        <Field label="Model" value={data.machine?.model} />
      </Section>
      <Section title="Operation Details">
        <Field label="Operation Type" value={data.operationType} />
        <Field label="CNC Program No" value={data.cncProgramNo} />
        <Field label="Test Run" value={data.testRun} />
        <Field label="Special Tooling" value={data.specialTooling} />
        <Field label="Part Runtime (Hr)" value={data.partRuntimeHr} />
        <Field label="Part Runtime (Mins)" value={data.partRuntimeMins} />
      </Section>
      <Section title="Tool List">
        <Field label="Tools" value={(data.toolLists ?? []).map((t: any) => t.toolValue).join(", ")} />
      </Section>
      <Section title="Confirmation Status">
        <Field label="Status" value={data.status} />
        <Field label="Confirmed By" value={data.confirmedBy?.name} />
        <Field label="Confirmed Date" value={data.confirmedDate ? new Date(data.confirmedDate).toLocaleDateString() : null} />
        <Field label="Remark" value={data.remark} />
      </Section>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// EDIT COMPONENT: Welding
// ──────────────────────────────────────────────────────────────────────────────
function WeldingEdit({
  data,
  supportData = {},
  onChange,
}: {
  data: any;
  supportData: any;
  onChange: (val: any) => void;
}) {
  const [formData, setFormData] = useState({
    weldingMachineId: data.weldingMachineId || "",
    typeOfJointId: data.typeOfJointId || "",
    electrodeType: data.electrodeType || "",
    weldingPosition: data.weldingPosition || "",
    weldingJoint: data.weldingJoint ?? "",
    weldingSizeMm: data.weldingSizeMm ?? "",
    voltageVolts: data.voltageVolts ?? "",
    currentAmp: data.currentAmp ?? "",
    coolingTimeMins: data.coolingTimeMins ?? "",
    preHeatingC: data.preHeatingC ?? "",
    postHeatingC: data.postHeatingC ?? "",
    heatTreatmentHrc: data.heatTreatmentHrc ?? "",
    remark: data.remark || "",
    materialTypeIds: (data.materialTypes ?? []).map((m: any) => m.id),
    weldingTypeIds: (data.weldingTypes ?? []).map((w: any) => w.id),
  });

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const updateField = (field: string, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleCheckboxChange = (field: "materialTypeIds" | "weldingTypeIds", id: string, checked: boolean) => {
    setFormData((prev) => {
      const list = prev[field] as string[];
      const newList = checked ? [...list, id] : list.filter((x) => x !== id);
      return { ...prev, [field]: newList };
    });
  };

  const weldingMachines = supportData.weldingMachines || [];
  const joints = supportData.joints || [];
  const materialTypes = supportData.materialTypes || [];
  const weldingTypes = supportData.weldingTypes || [];

  return (
    <div className="space-y-6">
      <Section title="Materials & Type (Edit)">
        <div className="col-span-3">
          <label className="text-xs font-semibold text-slate-500 block mb-2">Type of Material</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50 max-h-36 overflow-y-auto">
            {materialTypes.map((m: any) => (
              <label key={m.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.materialTypeIds.includes(m.id)}
                  onChange={(e) => handleCheckboxChange("materialTypeIds", m.id, e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                {m.type}
              </label>
            ))}
          </div>
        </div>

        <div className="col-span-3">
          <label className="text-xs font-semibold text-slate-500 block mb-2">Type of Welding</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50 max-h-36 overflow-y-auto">
            {weldingTypes.map((w: any) => (
              <label key={w.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.weldingTypeIds.includes(w.id)}
                  onChange={(e) => handleCheckboxChange("weldingTypeIds", w.id, e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                {w.type}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Welding Machine</label>
          <SearchableSelect
            value={formData.weldingMachineId}
            onChange={(e) => updateField("weldingMachineId", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Select Machine...</option>
            {weldingMachines.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.machineCode} ({m.brand} {m.model})
              </option>
            ))}
          </SearchableSelect>
        </div>
      </Section>

      <Section title="Joint & Process (Edit)">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Type of Joint</label>
          <SearchableSelect
            value={formData.typeOfJointId}
            onChange={(e) => updateField("typeOfJointId", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Select Joint...</option>
            {joints.map((j: any) => (
              <option key={j.id} value={j.id}>
                {j.joint}
              </option>
            ))}
          </SearchableSelect>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Electrode Type</label>
          <input
            type="text"
            value={formData.electrodeType}
            onChange={(e) => updateField("electrodeType", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Welding Position</label>
          <input
            type="text"
            value={formData.weldingPosition}
            onChange={(e) => updateField("weldingPosition", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Welding Joint</label>
          <input
            type="number"
            step="any"
            value={formData.weldingJoint}
            onChange={(e) => updateField("weldingJoint", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Welding Size (mm)</label>
          <input
            type="number"
            step="any"
            value={formData.weldingSizeMm}
            onChange={(e) => updateField("weldingSizeMm", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </Section>

      <Section title="Parameters (Edit)">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Voltage (V)</label>
          <input
            type="number"
            step="any"
            value={formData.voltageVolts}
            onChange={(e) => updateField("voltageVolts", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Current (A)</label>
          <input
            type="number"
            step="any"
            value={formData.currentAmp}
            onChange={(e) => updateField("currentAmp", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Cooling Time (mins)</label>
          <input
            type="number"
            step="any"
            value={formData.coolingTimeMins}
            onChange={(e) => updateField("coolingTimeMins", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Pre Heating (°C)</label>
          <input
            type="number"
            step="any"
            value={formData.preHeatingC}
            onChange={(e) => updateField("preHeatingC", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Post Heating (°C)</label>
          <input
            type="number"
            step="any"
            value={formData.postHeatingC}
            onChange={(e) => updateField("postHeatingC", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Heat Treatment (HRC)</label>
          <input
            type="number"
            step="any"
            value={formData.heatTreatmentHrc}
            onChange={(e) => updateField("heatTreatmentHrc", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </Section>

      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-500 mb-1">Remark</label>
        <textarea
          value={formData.remark}
          onChange={(e) => updateField("remark", e.target.value)}
          rows={3}
          className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// EDIT COMPONENT: Spray Painting
// ──────────────────────────────────────────────────────────────────────────────
function SprayEdit({
  data,
  supportData = {},
  onChange,
}: {
  data: any;
  supportData: any;
  onChange: (val: any) => void;
}) {
  const [formData, setFormData] = useState({
    paintTankPressurePsi: data.paintTankPressurePsi ?? "",
    sprayNozzleSize: data.sprayNozzleSize ?? "",
    typeOfPaint: data.typeOfPaint || "",
    remark: data.remark || "",
    surfaceStartDatetime: formatDateTimeLocal(data.surfaceStartDatetime),
    surfaceEndDatetime: formatDateTimeLocal(data.surfaceEndDatetime),
    surfaceGeneralWeather: data.surfaceGeneralWeather || "",
    surfaceEnvTemperature: data.surfaceEnvTemperature || "",
    surfaceRelativeHumidity: data.surfaceRelativeHumidity || "",
    surfaceAbrasiveType: data.surfaceAbrasiveType || "",
    surfaceSandpaperGrit: data.surfaceSandpaperGrit || "",
    primerStartDatetime: formatDateTimeLocal(data.primerStartDatetime),
    primerEndDatetime: formatDateTimeLocal(data.primerEndDatetime),
    primerGeneralWeather: data.primerGeneralWeather || "",
    primerEnvTemperature: data.primerEnvTemperature || "",
    primerRelativeHumidity: data.primerRelativeHumidity || "",
    primerPaintBatchNo: data.primerPaintBatchNo || "",
    primerExpiryDate: formatDateLocal(data.primerExpiryDate),
    primerDftMeasurement: data.primerDftMeasurement || "",
    topcoatStartDatetime2: formatDateTimeLocal(data.topcoatStartDatetime2),
    topcoatEndDatetime2: formatDateTimeLocal(data.topcoatEndDatetime2),
    topcoatGeneralWeather2: data.topcoatGeneralWeather2 || "",
    topcoatEnvTemperature2: data.topcoatEnvTemperature2 || "",
    topcoatRelativeHumidity2: data.topcoatRelativeHumidity2 || "",
    topcoatAbrasiveType: data.topcoatAbrasiveType || "",
    topcoatSandpaperGrit: data.topcoatSandpaperGrit || "",
    topcoatPaintBatchNo: data.topcoatPaintBatchNo || "",
    topcoatExpiryDate: formatDateLocal(data.topcoatExpiryDate),
    topcoatDftMeasurement: data.topcoatDftMeasurement || "",
    topcoatAdhesiveTestResult: data.topcoatAdhesiveTestResult || "",
    additionalRemark: data.additionalRemark || "",
    elcometerSerialNoId: data.elcometerSerialNoId || "",
    elcometerName: data.elcometerName || "",
  });

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const updateField = (field: string, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const elcometers = supportData.elcometers || [];

  return (
    <div className="space-y-6">
      <Section title="Spray Configuration (Edit)">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Paint Tank Pressure (psi)</label>
          <input
            type="number"
            step="any"
            value={formData.paintTankPressurePsi}
            onChange={(e) => updateField("paintTankPressurePsi", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Spray Nozzle Size (Ø)</label>
          <input
            type="number"
            step="any"
            value={formData.sprayNozzleSize}
            onChange={(e) => updateField("sprayNozzleSize", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Type of Paint</label>
          <input
            type="text"
            value={formData.typeOfPaint}
            onChange={(e) => updateField("typeOfPaint", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col md:col-span-3">
          <label className="text-xs font-semibold text-slate-500 mb-1">Remark</label>
          <textarea
            value={formData.remark}
            onChange={(e) => updateField("remark", e.target.value)}
            rows={2}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
          />
        </div>
      </Section>

      <Section title="A. Surface Preparation (Edit)">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Start Date Time</label>
          <input
            type="datetime-local"
            value={formData.surfaceStartDatetime}
            onChange={(e) => updateField("surfaceStartDatetime", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">End Date Time</label>
          <input
            type="datetime-local"
            value={formData.surfaceEndDatetime}
            onChange={(e) => updateField("surfaceEndDatetime", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">General Weather</label>
          <input
            type="text"
            value={formData.surfaceGeneralWeather}
            onChange={(e) => updateField("surfaceGeneralWeather", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Env Temperature</label>
          <input
            type="text"
            value={formData.surfaceEnvTemperature}
            onChange={(e) => updateField("surfaceEnvTemperature", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Relative Humidity</label>
          <input
            type="text"
            value={formData.surfaceRelativeHumidity}
            onChange={(e) => updateField("surfaceRelativeHumidity", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Abrasive Type</label>
          <input
            type="text"
            value={formData.surfaceAbrasiveType}
            onChange={(e) => updateField("surfaceAbrasiveType", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Sandpaper Grit</label>
          <input
            type="text"
            value={formData.surfaceSandpaperGrit}
            onChange={(e) => updateField("surfaceSandpaperGrit", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </Section>

      <Section title="B. Primer Coat (Edit)">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Start Date Time</label>
          <input
            type="datetime-local"
            value={formData.primerStartDatetime}
            onChange={(e) => updateField("primerStartDatetime", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">End Date Time</label>
          <input
            type="datetime-local"
            value={formData.primerEndDatetime}
            onChange={(e) => updateField("primerEndDatetime", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">General Weather</label>
          <input
            type="text"
            value={formData.primerGeneralWeather}
            onChange={(e) => updateField("primerGeneralWeather", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Env Temperature</label>
          <input
            type="text"
            value={formData.primerEnvTemperature}
            onChange={(e) => updateField("primerEnvTemperature", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Relative Humidity</label>
          <input
            type="text"
            value={formData.primerRelativeHumidity}
            onChange={(e) => updateField("primerRelativeHumidity", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Paint Batch No</label>
          <input
            type="text"
            value={formData.primerPaintBatchNo}
            onChange={(e) => updateField("primerPaintBatchNo", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Expiry Date</label>
          <input
            type="date"
            value={formData.primerExpiryDate}
            onChange={(e) => updateField("primerExpiryDate", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">DFT Measurement</label>
          <input
            type="text"
            value={formData.primerDftMeasurement}
            onChange={(e) => updateField("primerDftMeasurement", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </Section>

      <Section title="C. Top Coat (Edit)">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Start Date Time 2</label>
          <input
            type="datetime-local"
            value={formData.topcoatStartDatetime2}
            onChange={(e) => updateField("topcoatStartDatetime2", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">End Date Time 2</label>
          <input
            type="datetime-local"
            value={formData.topcoatEndDatetime2}
            onChange={(e) => updateField("topcoatEndDatetime2", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">General Weather 2</label>
          <input
            type="text"
            value={formData.topcoatGeneralWeather2}
            onChange={(e) => updateField("topcoatGeneralWeather2", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Env Temperature 2</label>
          <input
            type="text"
            value={formData.topcoatEnvTemperature2}
            onChange={(e) => updateField("topcoatEnvTemperature2", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Relative Humidity 2</label>
          <input
            type="text"
            value={formData.topcoatRelativeHumidity2}
            onChange={(e) => updateField("topcoatRelativeHumidity2", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Abrasive Type</label>
          <input
            type="text"
            value={formData.topcoatAbrasiveType}
            onChange={(e) => updateField("topcoatAbrasiveType", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Sandpaper Grit</label>
          <input
            type="text"
            value={formData.topcoatSandpaperGrit}
            onChange={(e) => updateField("topcoatSandpaperGrit", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Paint Batch No</label>
          <input
            type="text"
            value={formData.topcoatPaintBatchNo}
            onChange={(e) => updateField("topcoatPaintBatchNo", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Expiry Date</label>
          <input
            type="date"
            value={formData.topcoatExpiryDate}
            onChange={(e) => updateField("topcoatExpiryDate", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">DFT Measurement</label>
          <input
            type="text"
            value={formData.topcoatDftMeasurement}
            onChange={(e) => updateField("topcoatDftMeasurement", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Adhesive Test Result</label>
          <input
            type="text"
            value={formData.topcoatAdhesiveTestResult}
            onChange={(e) => updateField("topcoatAdhesiveTestResult", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </Section>

      <Section title="Confirmation & Elcometer (Edit)">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Elcometer Serial No</label>
          <SearchableSelect
            value={formData.elcometerSerialNoId}
            onChange={(e) => {
              const selectedId = e.target.value;
              const found = elcometers.find((el: any) => el.id === selectedId);
              setFormData((prev) => ({
                ...prev,
                elcometerSerialNoId: selectedId,
                elcometerName: found ? found.serialNo : "",
              }));
            }}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Select Elcometer...</option>
            {elcometers.map((el: any) => (
              <option key={el.id} value={el.id}>
                {el.serialNo}
              </option>
            ))}
          </SearchableSelect>
        </div>

        <div className="flex flex-col md:col-span-2">
          <label className="text-xs font-semibold text-slate-500 mb-1">Additional Remark</label>
          <textarea
            value={formData.additionalRemark}
            onChange={(e) => updateField("additionalRemark", e.target.value)}
            rows={2}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
          />
        </div>
      </Section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// EDIT COMPONENT: Machining
// ──────────────────────────────────────────────────────────────────────────────
function MachiningEdit({
  data,
  supportData = {},
  onChange,
}: {
  data: any;
  supportData: any;
  onChange: (val: any) => void;
}) {
  const [formData, setFormData] = useState({
    machineSerialNoId: data.machineSerialNoId || "",
    cncProgramNo: data.cncProgramNo || "",
    testRun: data.testRun || "",
    specialTooling: data.specialTooling || "",
    partRuntimeHr: data.partRuntimeHr ?? "",
    partRuntimeMins: data.partRuntimeMins ?? "",
    remark: data.remark || "",
    toolList: (data.toolLists ?? []).map((t: any) => Number(t.toolValue)),
  });

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const updateField = (field: string, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleToolChange = (index: number, val: string) => {
    const numVal = Number(val);
    setFormData((prev) => {
      const newList = [...prev.toolList];
      newList[index] = isNaN(numVal) ? 0 : numVal;
      return { ...prev, toolList: newList };
    });
  };

  const handleAddTool = () => {
    setFormData((prev) => ({
      ...prev,
      toolList: [...prev.toolList, 0],
    }));
  };

  const handleRemoveTool = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      toolList: prev.toolList.filter((_: any, idx: number) => idx !== index),
    }));
  };

  const machiningMachines = supportData.machiningMachines || [];

  return (
    <div className="space-y-6">
      <Section title="Machine Specs (Edit)">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Machine</label>
          <SearchableSelect
            value={formData.machineSerialNoId}
            onChange={(e) => updateField("machineSerialNoId", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Select Machine...</option>
            {machiningMachines.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.machineNo} ({m.brand} {m.model} - S/N {m.serialNo})
              </option>
            ))}
          </SearchableSelect>
        </div>
      </Section>

      <Section title="Operation Details (Edit)">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">CNC Program No</label>
          <input
            type="text"
            value={formData.cncProgramNo}
            onChange={(e) => updateField("cncProgramNo", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Test Run</label>
          <input
            type="text"
            value={formData.testRun}
            onChange={(e) => updateField("testRun", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Special Tooling</label>
          <input
            type="text"
            value={formData.specialTooling}
            onChange={(e) => updateField("specialTooling", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Part Runtime (Hr)</label>
          <input
            type="number"
            step="any"
            value={formData.partRuntimeHr}
            onChange={(e) => updateField("partRuntimeHr", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-500 mb-1">Part Runtime (Mins)</label>
          <input
            type="number"
            step="any"
            value={formData.partRuntimeMins}
            onChange={(e) => updateField("partRuntimeMins", e.target.value)}
            className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </Section>

      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">Tool List (Edit)</label>
          <button
            type="button"
            onClick={handleAddTool}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-medium"
          >
            <Plus size={14} />
            Add Tool Value
          </button>
        </div>

        {formData.toolList.length > 0 ? (
          <div className="border border-slate-200 rounded-lg overflow-hidden max-w-md">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 font-semibold w-16">SN</th>
                  <th className="px-4 py-2 font-semibold">Tool Value</th>
                  <th className="px-4 py-2 font-semibold text-right w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.toolList.map((toolVal: number, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 font-medium text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="any"
                        value={toolVal === 0 ? "" : toolVal}
                        placeholder="0.00"
                        onChange={(e) => handleToolChange(idx, e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-full"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveTool(idx)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-slate-500 p-4 border border-slate-200 border-dashed rounded-lg bg-slate-50 text-center">
            No tools defined. Click &quot;Add Tool Value&quot; to begin.
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-semibold text-slate-500 mb-1">Remark</label>
        <textarea
          value={formData.remark}
          onChange={(e) => updateField("remark", e.target.value)}
          rows={3}
          className="border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
        />
      </div>
    </div>
  );
}
