import type { Tone } from "@/components/form-ui";

/** Tone per Work Order status (plain module so server and client components can both read it). */
export const WO_STATUS_TONE: Record<string, Tone> = {
  Draft: "slate",
  Proceed: "sky",
  WIP: "amber",
  "On Hold": "amber",
  "Pending for QC": "violet",
  Completed: "emerald",
  Rejected: "rose",
  Void: "rose",
  Cancelled: "rose",
};
