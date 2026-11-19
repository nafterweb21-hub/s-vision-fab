import React from "react";
import Link from "next/link";
import { ExternalLink, Info } from "lucide-react";
import { Badge, buttonClass, type Tone } from "@/components/form-ui";
import WorkOrderShell, { type ShellNav, type WorkOrderTab } from "@/app/dashboard/production/work-order/components/WorkOrderShell";

// QC Approval reuses the Work Order header + tabs, read-only. Decisions (accept / reject,
// rework re-inspection) are made in the QC Terminal at /qc.

export const QC_NAV: ShellNav = {
  basePath: "/dashboard/qc/approval",
  backHref: "/dashboard/qc/approval",
  backLabel: "QC Approval",
  tabs: [
    { key: "details", label: "Order Details", path: "" },
    { key: "routing", label: "In-Process & Routing", path: "/routing" },
    { key: "timesheets", label: "Timesheets & Parameters", path: "/timesheets" },
  ],
};

export const QC_TONE: Record<string, Tone> = { Approved: "emerald", Rejected: "rose" };

export function QcBadge({ value, size }: { value?: string | null; size?: "sm" | "md" }) {
  const v = value || "Pending";
  return (
    <Badge tone={QC_TONE[v] ?? "violet"} dot size={size}>
      QC {v}
    </Badge>
  );
}

export function QcTerminalLink({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <Link href="/qc" className={buttonClass("primary", size)}>
      <ExternalLink size={size === "sm" ? 12 : 14} /> Open QC Terminal
    </Link>
  );
}

type Wo = {
  workOrderNo: string;
  status: string;
  qcAcceptance?: string | null;
  projectCode?: string | null;
  deliveryDate?: Date | string | null;
  quantity?: unknown;
  uom?: string | null;
  customer?: { customerName?: string | null } | null;
};

/** WorkOrderShell configured for QC Approval: QC tabs, QC badge, terminal link and a read-only note. */
export function QcShell({ wo, active, children }: { wo: Wo; active: WorkOrderTab; children: React.ReactNode }) {
  return (
    <WorkOrderShell
      nav={QC_NAV}
      active={active}
      wo={{
        workOrderNo: wo.workOrderNo,
        status: wo.status,
        customerName: wo.customer?.customerName,
        projectCode: wo.projectCode,
        deliveryDate: wo.deliveryDate instanceof Date ? wo.deliveryDate.toISOString() : wo.deliveryDate ?? null,
        quantity: wo.quantity != null ? Number(wo.quantity) : null,
        uom: wo.uom,
      }}
      actions={
        <>
          <QcBadge value={wo.qcAcceptance} size="md" />
          <QcTerminalLink />
        </>
      }
      notice={
        <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[13px] text-sky-800">
          <Info size={14} className="shrink-0" />
          Read-only review. Accept / reject and rework re-inspection are done in the QC Terminal.
        </div>
      }
    >
      {children}
    </WorkOrderShell>
  );
}
