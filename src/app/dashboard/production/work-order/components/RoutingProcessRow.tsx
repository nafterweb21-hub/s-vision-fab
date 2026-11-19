"use client";

import { useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, GripVertical, Loader2 } from "lucide-react";
import { customConfirm } from "@/lib/customConfirm";
import { StatusBadge, buttonClass, type Tone } from "@/components/form-ui";
import { markRoutingProcessStatus } from "../actions";
import ParameterDetailDrawer from "./ParameterDetailDrawer";
import EditRoutingProcessModal from "./EditRoutingProcessModal";

type DndProps = {
  enabled: boolean;
  dragging: boolean;
  over: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragEnter: () => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: () => void;
};

type Props = {
  rp: any;
  woStatus: string;
  inProcessTargetDate?: string;
  employees?: any[];
  supportData?: any;
  workOrderNo?: string;
  dnd?: DndProps | null;
  mainProcesses?: any[];
  processProfiles?: any[];
  allRoutingProcesses?: any[];
};

function fmtDate(d?: string | Date | null) {
  if (!d) return "-";
  const iso = typeof d === "string" ? d : d.toISOString();
  const [y, m, day] = iso.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

const STATUS_TONE: Record<string, Tone> = { New: "slate", Pending: "slate", WIP: "amber", "Pending for QC": "violet", Completed: "emerald" };

export default function RoutingProcessRow({
  rp,
  woStatus,
  inProcessTargetDate,
  employees = [],
  supportData = {},
  workOrderNo = "",
  dnd = null,
  mainProcesses = [],
  processProfiles = [],
  allRoutingProcesses = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const editable = !["Void", "Cancelled", "Completed"].includes(woStatus);
  const canEditDetails = editable && rp?.status === "New";

  async function setStatus(next: "WIP" | "Completed") {
    if (next === "Completed" && !(await customConfirm(`Mark step ${rp?.sequence} (${rp?.routingProcess?.routingProcess ?? "routing process"}) as Completed?`))) return;
    setError("");
    startTransition(async () => {
      const res = await markRoutingProcessStatus(rp.id, next);
      if (!res.success) setError(res.error || "Failed");
      else router.refresh();
    });
  }

  const allTimesheets = rp?.productionTimesheets || [];
  // Find all timesheets that have process parameters
  const paramsTimesheets = allTimesheets.filter(
    (ts: any) => ts?.weldingParameter || ts?.sprayParameter || ts?.machiningParameter
  );

  const targetTimesheetId = paramsTimesheets.length > 0 ? paramsTimesheets[0]?.id : (allTimesheets.length > 0 ? allTimesheets[0]?.id : null);

  const expectsWelding = rp?.routingProcess?.welding;
  const expectsSpray = rp?.routingProcess?.sprayPainting;
  const expectsMachining = rp?.routingProcess?.machining;
  const expectsParams = expectsWelding || expectsSpray || expectsMachining;
  const expectedType = expectsWelding ? "Welding" : expectsSpray ? "Spray Painting" : expectsMachining ? "Machining" : null;

  return (
    <tr
      className={`align-top transition-colors hover:bg-slate-50/60 ${dnd?.dragging ? "opacity-40" : ""} ${
        dnd?.over ? "bg-indigo-50/70 shadow-[inset_0_2px_0_0_rgb(99_102_241)]" : ""
      }`}
      onDragEnter={dnd ? dnd.onDragEnter : undefined}
      onDragOver={dnd ? dnd.onDragOver : undefined}
      onDrop={dnd ? dnd.onDrop : undefined}
    >
      {dnd && (
        <td className="w-8 py-2.5 pl-3 pr-1">
          {dnd.enabled ? (
            <span
              draggable
              onDragStart={dnd.onDragStart}
              onDragEnd={dnd.onDragEnd}
              title="Drag to reorder"
              className="inline-flex cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing"
            >
              <GripVertical size={14} />
            </span>
          ) : (
            <span className="inline-flex text-slate-200" title="Completed steps cannot be reordered">
              <GripVertical size={14} />
            </span>
          )}
        </td>
      )}
      <td className={`w-10 py-2 pr-2 ${dnd ? "pl-1" : "pl-4"}`}>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1 text-[11px] font-semibold tabular-nums text-slate-600">
          {rp?.sequence}
        </span>
      </td>
      <td className="px-3 py-2">
        <p className="font-medium text-slate-800">{rp?.routingProcess?.routingProcess ?? "—"}</p>
        <p className="text-[11px] text-slate-400">{rp?.mainProcess?.process ?? "—"}</p>
      </td>
      <td className="px-3 py-2 text-slate-600">{rp?.assignedEmployee?.name ?? <span className="text-slate-400">Anyone</span>}</td>
      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{fmtDate(rp?.targetCompletionDate)}</td>
      <td className="px-3 py-2 text-center">
        {rp?.fullyReceived ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={12} /> Yes
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {expectsParams ? (
          <ParameterDetailDrawer
            welding={paramsTimesheets.length > 0 && paramsTimesheets[0]?.weldingParameter ? JSON.parse(JSON.stringify(paramsTimesheets[0]?.weldingParameter)) : null}
            spray={paramsTimesheets.length > 0 && paramsTimesheets[0]?.sprayParameter ? JSON.parse(JSON.stringify(paramsTimesheets[0]?.sprayParameter)) : null}
            machining={paramsTimesheets.length > 0 && paramsTimesheets[0]?.machiningParameter ? JSON.parse(JSON.stringify(paramsTimesheets[0]?.machiningParameter)) : null}
            expectedType={expectedType}
            employees={employees}
            workOrderNo={workOrderNo}
            editable={editable}
            supportData={supportData}
            targetTimesheetId={targetTimesheetId}
          />
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <StatusBadge status={rp?.status} tone={STATUS_TONE[rp?.status] ?? "slate"} />
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {canEditDetails && (
            <EditRoutingProcessModal
              routingProcess={rp}
              inProcessTargetDate={inProcessTargetDate}
              mainProcesses={mainProcesses}
              processProfiles={processProfiles}
              employees={employees}
              existingPairs={allRoutingProcesses.map((r: any) => ({
                mainProcessId: r.mainProcessId,
                routingProcessId: r.routingProcessId,
              }))}
            />
          )}
          {editable && rp?.status !== "Completed" && (
            <button type="button" onClick={() => setStatus("Completed")} disabled={isPending} className={buttonClass("success", "xs")}>
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Complete
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
      </td>
    </tr>
  );
}
