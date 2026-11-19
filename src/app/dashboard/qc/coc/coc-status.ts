import type { Tone } from "@/components/form-ui";

/** Spec status flow: Draft → Require Approval → Approved. */
export const COC_STATUSES = ["Draft", "Require Approval", "Approved"] as const;
export const COC_STATUS_TONE: Record<string, Tone> = { Draft: "amber", "Require Approval": "violet", Approved: "emerald" };
export const COC_TYPE_TONE: Record<string, Tone> = { Final: "indigo", Pressure: "sky", "Spray Painting": "rose", Welding: "amber" };
