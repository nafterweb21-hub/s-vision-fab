"use client";

import { useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
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

const STATUS_BADGE: Record<string, string> = {
  New: "bg-slate-100 text-slate-700",
  WIP: "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

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

  function setStatus(next: "WIP" | "Completed") {
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
      className={`hover:bg-slate-50/60 ${dnd?.dragging ? "opacity-40" : ""} ${
        dnd?.over ? "bg-blue-50/70 border-t-2 border-blue-400" : ""
      }`}
      onDragEnter={dnd ? dnd.onDragEnter : undefined}
      onDragOver={dnd ? dnd.onDragOver : undefined}
      onDrop={dnd ? dnd.onDrop : undefined}
    >
      {dnd && (
        <td className="px-2 py-2 w-8 align-middle">
          {dnd.enabled ? (
            <span
              draggable
              onDragStart={dnd.onDragStart}
              onDragEnd={dnd.onDragEnd}
              title="Drag to reorder"
              className="inline-flex cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
            >
              <GripVertical size={16} />
            </span>
          ) : (
            <span className="inline-flex text-slate-200" title="Completed steps cannot be reordered">
              <GripVertical size={16} />
            </span>
          )}
        </td>
      )}
      <td className="px-3 py-2 text-slate-600">{rp?.sequence}</td>
      <td className="px-3 py-2">{rp?.mainProcess?.process ?? "-"}</td>
      <td className="px-3 py-2 font-medium text-slate-800">
        {rp?.routingProcess?.routingProcess ?? "-"}
      </td>
      <td className="px-3 py-2 text-slate-600">
        {rp?.assignedEmployee?.name ?? "-"}
      </td>
      <td className="px-3 py-2 text-slate-600">{fmtDate(rp?.targetCompletionDate)}</td>
      <td className="px-3 py-2 text-center">
        {rp?.fullyReceived ? (
          <span className="text-xs text-emerald-700">Yes</span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {expectsParams ? (
          <div className="inline-block m-0.5">
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
          </div>
        ) : (
          <span className="text-slate-400 text-xs">-</span>
        )}
      </td>
      <td className="px-3 py-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rp?.status] ?? "bg-slate-100 text-slate-700"}`}>
          {rp?.status}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
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
            <button
              onClick={() => setStatus("Completed")}
              disabled={isPending}
              className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
            >
              Complete
            </button>
          )}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </td>
    </tr>
  );
}
