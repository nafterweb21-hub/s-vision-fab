import { AlertTriangle, PackageCheck, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/form-ui";

// Subcon Return Tracking (SRT) and Subcon Reject Tracking (SRJ) share one UI;
// this maps each to its routes, record fields and wording.

export type TrackingKind = "RETURN" | "REJECT";

export type TrackingConfig = {
  base: string;
  api: string;
  /** Module name for the "saved" page and messages. */
  noun: string;
  /** Document prefix shown in headers (SRT / SRJ). */
  short: string;
  noField: "srtNo" | "srjNo";
  dateField: "srtDate" | "srjDate";
  qtyField: "returnedQty" | "rejectedQty";
  qtyLabel: string;
  verbPast: string;
  subtitle: string;
  icon: LucideIcon;
  tone: Tone;
  headerGradient: string;
};

export const TRACKING_KINDS: Record<TrackingKind, TrackingConfig> = {
  RETURN: {
    base: "/dashboard/purchasing/subcon-return-tracking",
    api: "/api/purchasing/subcon-return-tracking",
    noun: "Subcon Return Tracking",
    short: "SRT",
    noField: "srtNo",
    dateField: "srtDate",
    qtyField: "returnedQty",
    qtyLabel: "Returned Qty",
    verbPast: "returned",
    subtitle: "Receive items back from the subcontractor against a Subcon Request Form.",
    icon: PackageCheck,
    tone: "emerald",
    headerGradient: "from-emerald-500 to-teal-600",
  },
  REJECT: {
    base: "/dashboard/purchasing/subcon-reject-tracking",
    api: "/api/purchasing/subcon-reject-tracking",
    noun: "Subcon Reject Tracking",
    short: "SRJ",
    noField: "srjNo",
    dateField: "srjDate",
    qtyField: "rejectedQty",
    qtyLabel: "Rejected Qty",
    verbPast: "rejected",
    subtitle: "Record returned subcon items that failed inspection.",
    icon: AlertTriangle,
    tone: "rose",
    headerGradient: "from-rose-500 to-pink-600",
  },
};

/** Submitted is the final state of a tracking, so it reads as done (green). */
export const TRACKING_STATUS_TONE: Record<string, Tone> = { Draft: "amber", Submitted: "emerald", Void: "rose" };
