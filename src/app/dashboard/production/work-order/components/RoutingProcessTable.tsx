"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import RoutingProcessRow from "./RoutingProcessRow";
import { reorderRoutingProcesses } from "../actions";

type Props = {
  inProcessId: string;
  inProcessTargetDate: string;
  rows: any[]; // routing processes, already sequence-ordered & serialized
  woStatus: string;
  employees: any[];
  supportData: any;
  workOrderNo: string;
  mainProcesses?: any[];
  processProfiles?: any[];
};

export default function RoutingProcessTable({
  inProcessId,
  inProcessTargetDate,
  rows: initialRows,
  woStatus,
  employees,
  supportData,
  workOrderNo,
  mainProcesses = [],
  processProfiles = [],
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-sync local state whenever the server sends a fresh order/status
  // (e.g. after a status change refresh).
  const signature = initialRows.map((r) => `${r.id}:${r.sequence}:${r.status}:${r.mainProcessId}:${r.routingProcessId}:${r.assignedEmployeeId}:${r.targetCompletionDate}:${r.remark}`).join("|");
  useEffect(() => {
    setRows(initialRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const editable = !["Void", "Cancelled", "Completed"].includes(woStatus);
  const movableCount = rows.filter((r) => r.status !== "Completed").length;
  const dndEnabled = editable && movableCount > 1;

  // Completed rows stay pinned as a prefix; the first non-completed index is the
  // highest slot a row may be dropped into.
  const firstMovableIdx = rows.findIndex((r) => r.status !== "Completed");

  function resetDrag() {
    setDragId(null);
    setOverId(null);
  }

  function handleDrop(targetId: string) {
    const draggedId = dragId;
    resetDrag();
    if (saving || !draggedId || draggedId === targetId) return;

    const from = rows.findIndex((r) => r.id === draggedId);
    let to = rows.findIndex((r) => r.id === targetId);
    if (from < 0 || to < 0) return;
    // Never allow a row to land above a completed one.
    if (firstMovableIdx >= 0 && to < firstMovableIdx) to = firstMovableIdx;

    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    // No effective change.
    if (next.every((r, i) => r.id === rows[i].id)) return;

    const reindexed = next.map((r, i) => ({ ...r, sequence: i + 1 }));
    setRows(reindexed); // optimistic
    save(reindexed.map((r) => r.id));
  }

  function save(orderedIds: string[]) {
    setSaving(true);
    reorderRoutingProcesses(inProcessId, orderedIds)
      .then((res) => {
        if (res.success) {
          toast.success("Routing sequence updated successfully.");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update sequence");
          setRows(initialRows); // revert
        }
      })
      .catch(() => {
        toast.error("Failed to update sequence");
        setRows(initialRows);
      })
      .finally(() => setSaving(false));
  }

  return (
    <div className={`w-full overflow-x-auto transition-opacity ${saving ? "opacity-60" : ""}`}>
      <table className="w-full min-w-[860px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {dndEnabled && <th className="w-8 py-2 pl-3 pr-1" aria-label="Reorder" />}
            <th className={`w-10 py-2 pr-2 font-medium ${dndEnabled ? "pl-1" : "pl-4"}`}>SN</th>
            <th className="px-3 py-2 font-medium">Main · Routing Process</th>
            <th className="px-3 py-2 font-medium">Assigned</th>
            <th className="px-3 py-2 font-medium">Target</th>
            <th className="px-3 py-2 text-center font-medium">Subcon recv.</th>
            <th className="px-3 py-2 text-center font-medium">Parameters</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-4 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((rp) => (
            <RoutingProcessRow
              key={rp.id}
              rp={rp}
              woStatus={woStatus}
              inProcessTargetDate={inProcessTargetDate}
              employees={employees}
              supportData={supportData}
              workOrderNo={workOrderNo}
              mainProcesses={mainProcesses}
              processProfiles={processProfiles}
              allRoutingProcesses={rows}
              dnd={
                dndEnabled
                  ? {
                      enabled: editable && rp.status !== "Completed",
                      dragging: dragId === rp.id,
                      over: overId === rp.id && dragId !== rp.id,
                      onDragStart: () => setDragId(rp.id),
                      onDragEnd: resetDrag,
                      onDragEnter: () => dragId && setOverId(rp.id),
                      onDragOver: (e) => e.preventDefault(),
                      onDrop: () => handleDrop(rp.id),
                    }
                  : null
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
