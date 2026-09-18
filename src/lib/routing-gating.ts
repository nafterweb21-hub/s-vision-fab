// ──────────────────────────────────────────────────────────────────────────────
// Routing process gating (pure — safe to import from both server and client)
//
// Two independent gates decide whether an operator may see / scan a routing
// process in the Production Terminal:
//
//   1. SEQUENCE gate — processes run strictly serial across the WHOLE work order,
//      ordered by (in-process sn, routing sequence). Only the earliest
//      not-yet-completed process ("current step") is available; every process
//      after it is "locked" (future) and hidden from everyone. Already-completed
//      processes are neither locked nor available.
//
//   2. ROLE gate — each Main Process may be restricted to one or more roles.
//      An operator may only see/run a process whose Main Process allows their
//      role. A Main Process with NO roles configured is open to everyone
//      (backward compatible — restriction only applies once roles are assigned).
//
// A process is VISIBLE in the scan-in dropdown when the operator's role is
// permitted AND the process is either the current step or already completed.
// ──────────────────────────────────────────────────────────────────────────────

export type GateRow = {
  id: string;
  inProcessSn: number;
  sequence: number;
  status: string;
  mainProcessId: string | null;
  /** Role ids allowed on this row's Main Process. Empty = open to all. */
  allowedRoleIds: string[];
};

export type GatedRow = GateRow & {
  completed: boolean;
  available: boolean; // the single current step (serial front)
  locked: boolean; // a future step, blocked until earlier ones complete
  permitted: boolean; // operator's role may run this process
  visible: boolean; // should appear in the scan-in dropdown for this operator
};

/** Serial order across the whole work order. */
function serialCompare(a: GateRow, b: GateRow): number {
  if (a.inProcessSn !== b.inProcessSn) return a.inProcessSn - b.inProcessSn;
  return a.sequence - b.sequence;
}

export function isRolePermitted(
  allowedRoleIds: string[] | undefined,
  roleId: string | null | undefined,
): boolean {
  if (!allowedRoleIds || allowedRoleIds.length === 0) return true; // unmapped = open
  return !!roleId && allowedRoleIds.includes(roleId);
}

export function computeGating(
  rows: GateRow[],
  roleId: string | null | undefined,
): GatedRow[] {
  const ordered = [...rows].sort(serialCompare);
  // The current step is the earliest process (serial order) not yet completed.
  const frontId = ordered.find((r) => r.status !== "Completed")?.id ?? null;

  return ordered.map((r) => {
    const completed = r.status === "Completed";
    const available = !completed && r.id === frontId;
    const locked = !completed && !available;
    const permitted = isRolePermitted(r.allowedRoleIds, roleId);
    const visible = permitted && available;
    return { ...r, completed, available, locked, permitted, visible };
  });
}
