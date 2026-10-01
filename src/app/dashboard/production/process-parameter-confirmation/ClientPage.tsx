"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useState } from "react";
import { confirmParameters } from "./actions";
import { Check, AlertCircle } from "lucide-react";
function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(dateStr: string | Date | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ClientPage({ parameters, options, currentEmployeeId }: any) {
  const [activeTab, setActiveTab] = useState<"Welding" | "SprayPainting" | "Machining">("Welding");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBy, setConfirmBy] = useState<string>(currentEmployeeId || "");
  const [elcometerId, setElcometerId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeToolList, setActiveToolList] = useState<any[] | null>(null);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      if (activeTab === "Welding") setSelectedIds(parameters.welding.map((p: any) => p.id));
      else if (activeTab === "SprayPainting") setSelectedIds(parameters.sprayPainting.map((p: any) => p.id));
      else if (activeTab === "Machining") setSelectedIds(parameters.machining.map((p: any) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleTabChange = (tab: "Welding" | "SprayPainting" | "Machining") => {
    setActiveTab(tab);
    setSelectedIds([]);
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) {
      showToast("error", "Please select at least one record to confirm.");
      return;
    }
    if (!confirmBy) {
      showToast("error", "Please select 'Confirm By'.");
      return;
    }
    if (activeTab === "SprayPainting" && !elcometerId) {
      showToast("error", "Please select 'Elcometer Used' for Spray Painting confirmation.");
      return;
    }

    setIsSubmitting(true);
    const res = await confirmParameters(activeTab, selectedIds, confirmBy, elcometerId);
    if (res.success) {
      showToast("success", "Records confirmed successfully.");
      setSelectedIds([]);
    } else {
      showToast("error", res.error || "Failed to confirm records.");
    }
    setIsSubmitting(false);
  };

  const renderWeldingTable = () => {
    const data = parameters.welding;
    return (
      <div className="overflow-x-auto border rounded-lg bg-white custom-scrollbar">
        <table className="w-full text-[9px] md:text-sm text-left whitespace-nowrap">
          <thead className="text-[8px] md:text-xs text-slate-500 uppercase bg-slate-50 border-b">
            <tr>
              <th className="px-2 py-1.5 md:px-4 md:py-3 text-center">
                <input 
                  type="checkbox" 
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 md:w-4 md:h-4"
                />
              </th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Work Order No</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Customer</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Customer PO Ref</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Job Description</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Quantity</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">UOM</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Employee</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Time IN</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Time OUT</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Machine No</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Brand</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Model</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Current</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">S/No</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Type of Joint</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Electrode Type</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Welding Position</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Welding Joint</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Welding Size (mm)</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Voltage (Volts)</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Current (Amp)</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Cooling Time (mins)</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Pre Heating (°C)</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Post Heating (°C)</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Heat Treatment (HRC)</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.length === 0 ? (
              <tr><td colSpan={27} className="px-2 py-4 md:px-4 md:py-8 text-center text-slate-500">No pending records found.</td></tr>
            ) : data.map((row: any) => {
              const wo = row.timesheet?.routingProcess?.inProcess?.workOrder || {};
              const mach = row.weldingMachine || {};
              return (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 md:px-4 md:py-3 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(row.id)}
                      onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 md:w-4 md:h-4"
                    />
                  </td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 font-medium">{wo.workOrderNo}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{wo.customer?.customerName}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{wo.customerPoRef}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{wo.jobDescription}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{wo.quantity}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{wo.uom}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.timesheet?.employee?.name}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.timesheet?.timeIn ? formatDate(row.timesheet.timeIn) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.timesheet?.timeOut ? formatDate(row.timesheet.timeOut) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{mach.machineNo}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{mach.brand}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{mach.model}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{mach.current}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{mach.serialNo}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.typeOfJoint?.joint}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.electrodeType}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.weldingPosition}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.weldingJoint}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.weldingSizeMm}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.voltageVolts}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.currentAmp}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.coolingTimeMins}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.preHeatingC}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.postHeatingC}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.heatTreatmentHrc}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.remark}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSprayPaintingTable = () => {
    const data = parameters.sprayPainting;
    return (
      <div className="overflow-x-auto border rounded-lg bg-white custom-scrollbar">
        <table className="w-full text-[9px] md:text-sm text-left whitespace-nowrap">
          <thead className="text-[8px] md:text-xs text-slate-500 uppercase bg-slate-50 border-b">
            <tr>
              <th className="px-2 py-1.5 md:px-4 md:py-3 text-center" rowSpan={2}>
                <input 
                  type="checkbox" 
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 md:w-4 md:h-4"
                />
              </th>
              <th className="px-2 py-1.5 md:px-4 md:py-3 border-r" colSpan={13}>General Details</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-blue-50/50" colSpan={7}>Surface Preparation</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-green-50/50" colSpan={8}>Primer Coat</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3 bg-amber-50/50" colSpan={17}>Top Coat</th>
            </tr>
            <tr>
              {/* General Details */}
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Work Order No</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Customer</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Customer PO Ref</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Job Description</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Quantity</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">UOM</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Employee</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Time IN</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Time OUT</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Paint Tank Pressure (psi)</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Spray Nozzle Size (Ø)</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Type of Paint</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r">Remark</th>
              
              {/* Surface Preparation */}
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-blue-50/50">Start Date Time</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-blue-50/50">End Date Time</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-blue-50/50">Weather</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-blue-50/50">Temp</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-blue-50/50">Humidity</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-blue-50/50">Abrasive Type</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-blue-50/50">Sandpaper Grit</th>

              {/* Primer Coat */}
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-green-50/50">Start Date Time</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-green-50/50">End Date Time</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-green-50/50">Weather</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-green-50/50">Temp</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-green-50/50">Humidity</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-green-50/50">Paint Batch No</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-green-50/50">Expiry Date</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-green-50/50">DFT Result</th>

              {/* Top Coat */}
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Start Date Time</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">End Date Time</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Weather</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Temp</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Humidity</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Abrasive Type</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Sandpaper Grit</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Start Date Time 2</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">End Date Time 2</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Weather 2</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Temp 2</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Humidity 2</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Paint Batch No</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Expiry Date</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">DFT Result</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 border-r bg-amber-50/50">Adhesive Test</th>
              <th className="px-2 py-1.5 md:px-4 md:py-2 bg-amber-50/50">Additional Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.length === 0 ? (
              <tr><td colSpan={39} className="px-2 py-4 md:px-4 md:py-8 text-center text-slate-500">No pending records found.</td></tr>
            ) : data.map((row: any) => {
              const wo = row.timesheet?.routingProcess?.inProcess?.workOrder || {};
              return (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 md:px-4 md:py-3 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(row.id)}
                      onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 md:w-4 md:h-4"
                    />
                  </td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 font-medium border-r">{wo.workOrderNo}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r">{wo.customer?.customerName}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r">{wo.customerPoRef}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r">{wo.jobDescription}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r">{wo.quantity}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r">{wo.uom}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r">{row.timesheet?.employee?.name}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r">{row.timesheet?.timeIn ? formatDate(row.timesheet.timeIn) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.timesheet?.timeOut ? formatDate(row.timesheet.timeOut) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r">{row.paintTankPressurePsi}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r">{row.sprayNozzleSize}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r">{row.typeOfPaint}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r">{row.remark}</td>
                  
                  {/* Surface Prep */}
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-blue-50/10">{row.surfaceStartDatetime ? formatDate(row.surfaceStartDatetime) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-blue-50/10">{row.surfaceEndDatetime ? formatDate(row.surfaceEndDatetime) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-blue-50/10">{row.surfaceGeneralWeather}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-blue-50/10">{row.surfaceEnvTemperature}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-blue-50/10">{row.surfaceRelativeHumidity}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-blue-50/10">{row.surfaceAbrasiveType}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-blue-50/10">{row.surfaceSandpaperGrit}</td>

                  {/* Primer */}
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-green-50/10">{row.primerStartDatetime ? formatDate(row.primerStartDatetime) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-green-50/10">{row.primerEndDatetime ? formatDate(row.primerEndDatetime) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-green-50/10">{row.primerGeneralWeather}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-green-50/10">{row.primerEnvTemperature}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-green-50/10">{row.primerRelativeHumidity}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-green-50/10">{row.primerPaintBatchNo}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-green-50/10">{row.primerExpiryDate ? formatDateOnly(row.primerExpiryDate) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-green-50/10">{row.primerDftMeasurement}</td>

                  {/* Top Coat */}
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatStartDatetime ? formatDate(row.topcoatStartDatetime) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatEndDatetime ? formatDate(row.topcoatEndDatetime) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatGeneralWeather}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatEnvTemperature}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatRelativeHumidity}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatAbrasiveType}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatSandpaperGrit}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatStartDatetime2 ? formatDate(row.topcoatStartDatetime2) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatEndDatetime2 ? formatDate(row.topcoatEndDatetime2) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatGeneralWeather2}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatEnvTemperature2}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatRelativeHumidity2}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatPaintBatchNo}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatExpiryDate ? formatDateOnly(row.topcoatExpiryDate) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatDftMeasurement}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 border-r bg-amber-50/10">{row.topcoatAdhesiveTestResult}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 bg-amber-50/10">{row.additionalRemark}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMachiningTable = () => {
    const data = parameters.machining;
    return (
      <div className="overflow-x-auto border rounded-lg bg-white custom-scrollbar">
        <table className="w-full text-[9px] md:text-sm text-left whitespace-nowrap">
          <thead className="text-[8px] md:text-xs text-slate-500 uppercase bg-slate-50 border-b">
            <tr>
              <th className="px-2 py-1.5 md:px-4 md:py-3 text-center">
                <input 
                  type="checkbox" 
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 md:w-4 md:h-4"
                />
              </th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Work Order No</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Customer</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Customer PO Ref</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Job Description</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Quantity</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">UOM</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Employee</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Time IN</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Time OUT</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Machine No / Name</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Machine Type</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Machine Serial No</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Brand</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Model</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Operation Type</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">CNC Program No</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Test Run</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Special Tooling</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Part Runtime (Hr)</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Part Runtime (Mins)</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Tool List</th>
              <th className="px-2 py-1.5 md:px-4 md:py-3">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.length === 0 ? (
              <tr><td colSpan={23} className="px-2 py-4 md:px-4 md:py-8 text-center text-slate-500">No pending records found.</td></tr>
            ) : data.map((row: any) => {
              const wo = row.timesheet?.routingProcess?.inProcess?.workOrder || {};
              const mach = row.machine || {};
              return (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 md:px-4 md:py-3 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(row.id)}
                      onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 md:w-4 md:h-4"
                    />
                  </td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3 font-medium">{wo.workOrderNo}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{wo.customer?.customerName}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{wo.customerPoRef}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{wo.jobDescription}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{wo.quantity}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{wo.uom}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.timesheet?.employee?.name}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.timesheet?.timeIn ? formatDate(row.timesheet.timeIn) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.timesheet?.timeOut ? formatDate(row.timesheet.timeOut) : ""}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{mach.machineNo}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{mach.machineType}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{mach.serialNo}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{mach.brand}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{mach.model}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{mach.operationType}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.cncProgramNo}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.testRun}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.specialTooling}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.partRuntimeHr}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.partRuntimeMins}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">
                    <button 
                      onClick={() => setActiveToolList(row.toolLists || [])}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View ({row.toolLists?.length || 0})
                    </button>
                  </td>
                  <td className="px-2 py-1.5 md:px-4 md:py-3">{row.remark}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-2 md:p-6">
      {toastMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`p-4 md:p-6 rounded-2xl shadow-2xl flex items-center gap-2 md:gap-4 animate-in zoom-in-95 duration-200 ${
            toastMessage.type === "success" 
              ? "bg-white border-2 border-emerald-500 text-slate-800" 
              : "bg-white border-2 border-rose-500 text-slate-800"
          }`}>
            <div className={`p-2 md:p-3 rounded-full ${toastMessage.type === "success" ? "bg-emerald-100" : "bg-rose-100"}`}>
              {toastMessage.type === "success" 
                ? <Check className="w-5 h-5 md:w-7 md:h-7 text-emerald-600" /> 
                : <AlertCircle className="w-5 h-5 md:w-7 md:h-7 text-rose-600" />
              }
            </div>
            <span className="font-semibold text-sm md:text-lg">{toastMessage.text}</span>
          </div>
        </div>
      )}

      <div className="mb-2 md:mb-6">
        <h1 className="text-base md:text-2xl font-bold text-slate-800">Process Parameter Confirmation</h1>
        <p className="text-[10px] md:text-sm text-slate-500 mt-0.5 md:mt-1">Review and confirm pending process parameters submitted by operations.</p>
      </div>

      <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-140px)]">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto custom-scrollbar">
          {(["Welding", "SprayPainting", "Machining"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-3 py-2 md:px-6 md:py-3.5 text-[10px] md:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab 
                  ? "bg-white border-b-2 border-indigo-600 text-indigo-700" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab === "SprayPainting" ? "Spray Painting" : tab}
              <span className={`ml-1.5 md:ml-2 inline-flex items-center justify-center px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full text-[8px] md:text-xs font-semibold ${
                activeTab === tab ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"
              }`}>
                {tab === "Welding" && parameters.welding.length}
                {tab === "SprayPainting" && parameters.sprayPainting.length}
                {tab === "Machining" && parameters.machining.length}
              </span>
            </button>
          ))}
        </div>

        {/* Action Bar */}
        <div className="p-2 md:p-4 bg-white border-b border-slate-200 flex flex-wrap gap-2 md:gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-sm">
            <span className="font-medium text-slate-700">{selectedIds.length} selected</span>
            <div className="h-4 md:h-6 w-px bg-slate-300"></div>
            
            <div className="flex items-center gap-1.5 md:gap-2">
              <label className="text-slate-600 font-medium whitespace-nowrap">Confirm By:</label>
              <SearchableSelect 
                value={confirmBy} 
                onChange={(e) => setConfirmBy(e.target.value)}
                className="rounded border-slate-300 py-1 md:py-1.5 pl-2 md:pl-3 pr-6 md:pr-8 text-[10px] md:text-sm focus:border-indigo-500 focus:ring-indigo-500 min-w-[120px] md:min-w-[200px]"
              >
                <option value="">-- Select Employee --</option>
                {options.employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </SearchableSelect>
            </div>

            {activeTab === "SprayPainting" && (
              <div className="flex items-center gap-1.5 md:gap-2 ml-0 md:ml-4">
                <label className="text-slate-600 font-medium whitespace-nowrap">Elcometer:</label>
                <SearchableSelect 
                  value={elcometerId} 
                  onChange={(e) => setElcometerId(e.target.value)}
                  className="rounded border-slate-300 py-1 md:py-1.5 pl-2 md:pl-3 pr-6 md:pr-8 text-[10px] md:text-sm focus:border-indigo-500 focus:ring-indigo-500 min-w-[100px] md:min-w-[150px]"
                >
                  <option value="">-- Select --</option>
                  {options.elcometers.map((elc: any) => (
                    <option key={elc.id} value={elc.id}>{elc.serialNo}</option>
                  ))}
                </SearchableSelect>
              </div>
            )}
          </div>
          
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || selectedIds.length === 0}
            className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm font-semibold rounded-md md:rounded-lg transition-colors flex items-center gap-1.5 md:gap-2 ${
              isSubmitting || selectedIds.length === 0
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            }`}
          >
            {isSubmitting && <div className="h-3 w-3 md:h-4 md:w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Confirm Selected
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50 p-4">
          {activeTab === "Welding" && renderWeldingTable()}
          {activeTab === "SprayPainting" && renderSprayPaintingTable()}
          {activeTab === "Machining" && renderMachiningTable()}
        </div>

      </div>

      {/* Tool List Modal */}
      {activeToolList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg md:rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-xs md:text-sm text-slate-800">Process Parameter Confirmation – Machining – Tool List</h3>
              <button 
                onClick={() => setActiveToolList(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="p-2 md:p-6 max-h-[60vh] overflow-y-auto">
              {activeToolList.length === 0 ? (
                <p className="text-[10px] md:text-sm text-slate-500 text-center py-4">No tools recorded.</p>
              ) : (
                <table className="w-full text-[10px] md:text-sm text-left border">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-2 py-1 md:px-4 md:py-2 w-16 text-center">SN</th>
                      <th className="px-2 py-1 md:px-4 md:py-2">Tool List</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activeToolList.map((t: any, idx: number) => (
                      <tr key={t.id || idx} className="hover:bg-slate-50">
                        <td className="px-2 py-1 md:px-4 md:py-2 text-center text-slate-500">{idx + 1}</td>
                        <td className="px-2 py-1 md:px-4 md:py-2 font-medium">{t.toolValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-4 py-3 md:px-6 md:py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setActiveToolList(null)}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md md:rounded-lg text-[10px] md:text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
