/* eslint-disable @typescript-eslint/no-explicit-any */
// Sales Order status rules shared by the list and the create/edit form.
// Spec (docs/spec/sales-order.md): Draft → Confirmed → (Revised → Old Version) | Closed | Void.
import type { ButtonVariant, Tone } from "@/components/form-ui";

export const SO_STATUSES = ["Draft", "Confirmed", "Revised", "Old Version", "Closed", "Void"] as const;
export type SoStatus = (typeof SO_STATUSES)[number];

/** Canonical spelling is "Old Version" (spec + every other module). "Old Revise" was a UI-only typo; accept it on read. */
export function normalizeSoStatus(status: string | null | undefined): string {
  if (!status) return "Draft";
  if (status === "Old Revise") return "Old Version";
  return status;
}

export const SO_STATUS_TONE: Record<SoStatus, Tone> = {
  Draft: "amber",
  Confirmed: "emerald",
  Revised: "blue",
  "Old Version": "slate",
  Closed: "indigo",
  Void: "rose",
};

export function soStatusTone(status: string | null | undefined): Tone {
  return SO_STATUS_TONE[normalizeSoStatus(status) as SoStatus] ?? "slate";
}

/** Closed / Void / Old Version orders are view-only. */
export function isSoReadOnly(status: string | null | undefined): boolean {
  const s = normalizeSoStatus(status);
  return s === "Closed" || s === "Void" || s === "Old Version";
}

export type SoTransition = {
  to: SoStatus;
  label: string;
  variant: ButtonVariant;
  /** Confirmation prompt shown before the change (destructive / hard to undo). */
  confirm?: string;
  /** Whether the action is offered as a row action on the list page. */
  inList: boolean;
};

/**
 * Status actions available for an order, in display order (primary action last).
 * Mirrors the form's action bar; the list shows the `inList` subset.
 */
export function soTransitions(status: string | null | undefined, opts: { isNew?: boolean; orderNo?: string } = {}): SoTransition[] {
  const s = normalizeSoStatus(status);
  const ref = opts.orderNo ? `Sales Order ${opts.orderNo}` : "this sales order";
  const confirmMsg = `Confirm ${ref}? Work Order numbers will be generated for each delivery batch and the revision number will increase.`;
  const closeMsg = `Close ${ref}? A closed order becomes view-only.`;
  const voidMsg = `Void ${ref}? This cannot be undone — a voided order becomes view-only.`;
  const oldMsg = `Mark ${ref} as Old Version? It becomes view-only.`;

  if (opts.isNew) return [{ to: "Draft", label: "Save Draft", variant: "primary", inList: false }];

  switch (s) {
    case "Draft":
      return [
        { to: "Void", label: "Void", variant: "danger", confirm: voidMsg, inList: true },
        { to: "Draft", label: "Save Draft", variant: "secondary", inList: false },
        { to: "Confirmed", label: "Confirm", variant: "primary", confirm: confirmMsg, inList: true },
      ];
    case "Confirmed":
      return [
        { to: "Old Version", label: "Mark Old Version", variant: "secondary", confirm: oldMsg, inList: false },
        { to: "Closed", label: "Close", variant: "secondary", confirm: closeMsg, inList: true },
        { to: "Revised", label: "Revise", variant: "primary", inList: true },
      ];
    case "Revised":
      return [
        { to: "Old Version", label: "Mark Old Version", variant: "secondary", confirm: oldMsg, inList: false },
        { to: "Closed", label: "Close", variant: "secondary", confirm: closeMsg, inList: true },
        { to: "Confirmed", label: "Confirm", variant: "primary", confirm: confirmMsg, inList: true },
      ];
    default:
      return [];
  }
}

export function canTransition(from: string | null | undefined, to: string): boolean {
  return soTransitions(from).some((t) => t.to === to);
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data?.error || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Change a sales order's status from outside the form.
 * The PUT /api/sales/sales-order/[id] contract needs the FULL order (it validates header fields and
 * recreates the items), so this fetches the order and PUTs it back exactly as the form does:
 * `{ ...order, status, customerSelection: { type: "profile", profileId }, items }`.
 */
export async function changeSalesOrderStatus(id: string, to: SoStatus): Promise<any> {
  const res = await fetch(`/api/sales/sales-order/${id}`);
  if (!res.ok) throw new Error(await readError(res, "Failed to load sales order"));
  const order = await res.json();

  if (!canTransition(order.status, to)) {
    throw new Error(`Cannot change a ${normalizeSoStatus(order.status)} order to ${to}. Refresh the list and try again.`);
  }

  const payload = {
    ...order,
    status: to,
    taxTypeId: order.taxTypeId || null,
    customerSelection: { type: "profile", profileId: order.customerId || "" },
    items: order.items || [],
  };

  const put = await fetch(`/api/sales/sales-order/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!put.ok) throw new Error(await readError(put, "Failed to update status"));
  return put.json();
}
