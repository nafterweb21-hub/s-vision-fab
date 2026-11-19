"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Save,
  Printer,
  Ban,
  Send,
  Lock,
  Building2,
  ClipboardList,
  CalendarDays,
  CalendarClock,
  Wrench,
  PackageCheck,
} from "lucide-react";
import { Badge, MetaChip, StatusBadge, buttonClass } from "@/components/form-ui";
import { PoLineCard, SRF_RECEIVE_TONE, SRF_TONE, SrfFieldsCard, fmtDate, srfQuantityError, type SrfFieldValues } from "../SrfParts";

export default function SubconRequestFormDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [srf, setSrf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [pending, setPending] = useState<"save" | "submit" | "void" | null>(null);
  const [values, setValues] = useState<SrfFieldValues>({
    srfDate: "",
    outsourcedById: "",
    dateRequired: "",
    receivedById: "",
    quantity: 0,
    remark: "",
  });

  const fetchSrf = async () => {
    try {
      const res = await fetch(`/api/purchasing/subcon-request-form/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Subcon Request Form not found.");
        throw new Error("Failed to fetch data.");
      }
      const data = await res.json();
      setSrf(data);
      setValues({
        srfDate: data.srfDate ? new Date(data.srfDate).toISOString().slice(0, 10) : "",
        outsourcedById: data.outsourcedById || "",
        dateRequired: data.dateRequired ? new Date(data.dateRequired).toISOString().slice(0, 10) : "",
        receivedById: data.receivedById || "",
        quantity: Number(data.quantity) || 0,
        remark: data.remark || "",
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchSrf();
    fetch("/api/employees")
      .then((res) => (res.ok ? res.json() : []))
      .then(setEmployees)
      .catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // PO line quantity less the other live forms on it.
  const available =
    srf?.purchaseOrderItem
      ? Number(srf.purchaseOrderItem.quantity) -
        (srf.purchaseOrderItem.subconRequestForms ?? []).reduce((s: number, f: any) => s + Number(f.quantity), 0)
      : null;

  const handleUpdate = async () => {
    if (!values.outsourcedById) return hotToast.error("Outsourced By is required");
    if (!values.dateRequired) return hotToast.error("Date Required is required");
    const qtyError = srfQuantityError(values.quantity, available);
    if (qtyError) return hotToast.error(qtyError);

    setPending("save");
    try {
      const res = await fetch(`/api/purchasing/subcon-request-form/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, quantity: Number(values.quantity) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update Subcon Request Form");
      }
      router.push(
        `/dashboard/saved?module=Subcon Request&id=${srf.srfNo || id}&viewUrl=/dashboard/purchasing/subcon-request-form/${id}&backUrl=/dashboard/purchasing/subcon-request-form`,
      );
    } catch (err: any) {
      hotToast.error(err.message);
      setPending(null);
    }
  };

  const callAction = async (action: "submit" | "void") => {
    const msg =
      action === "submit"
        ? `Submit ${srf.srfNo}? Unsaved changes on this page are not included.`
        : `Void ${srf.srfNo}? Its quantity goes back to the PO line.`;
    if (!await customConfirm(msg)) return;
    setPending(action);
    try {
      const res = await fetch(`/api/purchasing/subcon-request-form/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed: ${action}`);
      }
      hotToast.success(action === "submit" ? `${srf.srfNo} submitted` : `${srf.srfNo} is now Void`);
      await fetchSrf();
    } catch (err: any) {
      hotToast.error(err.message);
    } finally {
      setPending(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-12">
        <Loader2 size={20} className="animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500">Loading form…</p>
      </div>
    );
  }

  if (errorMsg || !srf) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-8 text-rose-700">
        <AlertCircle size={20} />
        <p className="text-[13px] font-medium">{errorMsg || "Subcon Request Form not found."}</p>
        <Link href="/dashboard/purchasing/subcon-request-form" className={buttonClass("secondary", "md")}>
          <ArrowLeft size={14} /> Back to list
        </Link>
      </div>
    );
  }

  const isEditable = srf.status === "Draft";
  const busy = pending !== null;
  const item = srf.purchaseOrderItem;
  const po = item?.purchaseOrder ?? {};
  const receiveStatus: string = srf.receiveStatus || "N/A";

  return (
    <div className="w-full space-y-4">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md print:hidden">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/purchasing/subcon-request-form" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Subcon Request Form
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">SRF</span>
                <span className="truncate font-mono text-lg font-semibold text-slate-900">{srf.srfNo}</span>
              </h1>
              <StatusBadge status={srf.status} tone={SRF_TONE[srf.status] ?? "slate"} size="md" />
              <Badge tone={SRF_RECEIVE_TONE[receiveStatus] ?? "slate"} icon={PackageCheck} size="md">
                {receiveStatus === "N/A" ? "Not returned yet" : receiveStatus}
              </Badge>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Supplier">{po.supplier?.supplierName || "—"}</MetaChip>
              <MetaChip icon={ClipboardList} label="PO" title="Purchase order">{po.poNo || "—"}</MetaChip>
              {po.workOrderNo && <MetaChip icon={Wrench} label="WO" title="Work order">{po.workOrderNo}</MetaChip>}
              <MetaChip icon={CalendarDays} label="SRF" title="SRF date">{fmtDate(values.srfDate)}</MetaChip>
              <MetaChip icon={CalendarClock} label="Required" title="Date required">{fmtDate(values.dateRequired)}</MetaChip>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => router.push("/dashboard/purchasing/subcon-request-form")} className={buttonClass("ghost", "md")}>
              Back
            </button>
            <button type="button" onClick={() => window.open(`/print/subcon-request-form/${id}`, "_blank")} className={buttonClass("secondary", "md")}>
              <Printer size={14} /> Print
            </button>
            {srf.status !== "Void" && (
              <button type="button" onClick={() => callAction("void")} disabled={busy} className={buttonClass("danger", "md")}>
                {pending === "void" ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />} Void
              </button>
            )}
            {isEditable ? (
              <>
                <button type="button" onClick={handleUpdate} disabled={busy} className={buttonClass("secondary", "md")}>
                  {pending === "save" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {pending === "save" ? "Saving…" : "Save Changes"}
                </button>
                <button type="button" onClick={() => callAction("submit")} disabled={busy} className={buttonClass("primary", "md")}>
                  {pending === "submit" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit
                </button>
              </>
            ) : (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            )}
          </div>
        </div>
      </div>

      {!isEditable && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
          <Lock size={14} className="shrink-0 text-slate-400" />
          <span>
            This request form is <strong className="font-semibold text-slate-800">{srf.status}</strong> — read-only.
          </span>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <SrfFieldsCard
          values={values}
          onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
          readOnly={!isEditable}
          srfNo={srf.srfNo}
          employees={employees}
          contactPersons={po.supplier?.contactPersons ?? []}
          available={isEditable ? available : null}
          uom={item?.poUom?.uomName}
          readOnlyNames={{ outsourcedBy: srf.outsourcedBy?.name, receivedBy: srf.receivedBy?.contactPersonName }}
        />
        <PoLineCard item={item} />
      </div>
    </div>
  );
}
