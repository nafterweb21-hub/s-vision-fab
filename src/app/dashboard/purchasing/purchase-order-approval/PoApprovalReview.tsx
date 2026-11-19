"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Lock,
  ShieldCheck,
  Receipt,
  Building2,
  CalendarDays,
  ClipboardList,
  Wrench,
  Coins,
  Wallet,
  UserRound,
  MapPin,
  Package,
  StickyNote,
  Gavel,
  Check,
  X,
} from "lucide-react";
import {
  Badge,
  Card,
  EmptyState,
  Field,
  MetaChip,
  StatusBadge,
  buttonClass,
  checkboxClass,
  textareaClass,
} from "@/components/form-ui";
import { poApprovalStage, poStatusTone, type TierState } from "../purchase-order/po-status";
import { formatApproverNames, poBaseAmount } from "@/lib/po-approval-rules";
type Item = {
  id?: string;
  fromMaterialProfile: boolean;
  materialProfileId: string;
  purchaseRequisitionItemId?: string;
  material: string;
  description: string;
  supplierMaterialNo: string;
  shape: string;
  size: string;
  poUomId: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  conversion: string;
  internalUomId: string;
  internalQuantity: string;
  deliveryDate: string;
  remark: string;
  woProcessName?: string;
  mainProcessName?: string;
  routingProcessName?: string;
  hardness?: string;
  thickness?: string;
};

/** Display-only snapshot of the loaded PO (bill-to / ship-to text and relation names as fallbacks). */
type PoDoc = {
  company?: { companyName?: string | null } | null;
  supplier?: { supplierName?: string | null } | null;
  contactPerson?: { contactPersonName?: string | null } | null;
  purchaser?: { name?: string | null; code?: string | null } | null;
  purchaseRequisition?: { prNo?: string | null } | null;
  currency?: { code?: string | null } | null;
  taxType?: { taxType?: string | null } | null;
  billToName?: string | null;
  billToAddress?: string | null;
  billToContactPerson?: string | null;
  billToPhone?: string | null;
  billToEmail?: string | null;
  billToFax?: string | null;
  billToGstin?: string | null;
  billToState?: string | null;
  differentShipTo?: boolean | null;
  consigneeName?: string | null;
  consigneeAddress?: string | null;
  consigneeGstin?: string | null;
  consigneePhone?: string | null;
  consigneeState?: string | null;
  consigneeCountry?: string | null;
};

export type PoApprovalKind = "MATERIAL" | "SUBCON";

const BACK: Record<PoApprovalKind, { href: string; label: string }> = {
  MATERIAL: { href: "/dashboard/purchasing/purchase-order-approval", label: "Purchase Order Approvals" },
  SUBCON: { href: "/dashboard/purchasing/purchase-order-subcon-approval", label: "PO Subcon Approval" },
};

/** Approval review shared by the Material and Subcon PO approval screens. */
export default function PoApprovalReview({ kind }: { kind: PoApprovalKind }) {
  const back = BACK[kind];
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<{
    poNo?: string;
    revision?: number;
    status?: string;
    type?: string;
    approvalTier?: number;
    firstApproverName?: string | null;
    firstApprovedAt?: string | null;
    secondApproverName?: string | null;
    secondApprovedAt?: string | null;
    /** Sent back on approve / reject so the server refuses a decision on a PO that changed since loading. */
    updatedAt?: string | null;
  }>({});
  const [evaluation, setEvaluation] = useState<any>(null);
  // Display only.
  const [doc, setDoc] = useState<PoDoc | null>(null);
  const [lastAction, setLastAction] = useState<"approve" | "reject" | null>(null);

  const [companyId, setCompanyId] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [workOrderNo, setWorkOrderNo] = useState("");
  const [purchaseRequisitionId, setPurchaseRequisitionId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [contactPersonId, setContactPersonId] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierTel, setSupplierTel] = useState("");
  const [supplierFax, setSupplierFax] = useState("");
  const [supplierMobile, setSupplierMobile] = useState("");
  const [purchaserId, setPurchaserId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1.00");
  const [taxTypeId, setTaxTypeId] = useState("");
  const [taxRate, setTaxRate] = useState("0.00");
  const [amountBeforeTax, setAmountBeforeTax] = useState("0.00");
  const [taxAmount, setTaxAmount] = useState("0.00");
  const [amountAfterTax, setAmountAfterTax] = useState("0.00");
  const [millCertificate, setMillCertificate] = useState(false);
  const [certOfConformance, setCertOfConformance] = useState(false);

  const [poRemark, setPoRemark] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  // Approval specific
  const [approvalRemark, setApprovalRemark] = useState("");

  const [companies, setCompanies] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const fd = await fetch("/api/purchasing/purchase-order/form-data").then((r) => r.json());
        setCompanies(fd.companies || []);
        setSuppliers(fd.suppliers || []);
        setEmployees(fd.employees || []);
        setCurrencies(fd.currencies || []);
        setTaxes(fd.taxes || []);
        setUoms(fd.uoms || []);
        setMaterials(fd.materials || []);
        setPrs(fd.purchaseRequisitions || []);
        setWorkOrders(fd.workOrders || []);

        const detailRes = await fetch(`/api/purchasing/purchase-order-approval/${id}`).then((r) => r.json());
        if (detailRes.error) throw new Error(detailRes.error);
        const po = detailRes.po || detailRes;
        setEvaluation(detailRes.evaluation || null);
        setDoc(po);

        setMeta({
          poNo: po.poNo,
          revision: po.revision,
          status: po.status,
          type: po.type,
          approvalTier: po.approvalTier || detailRes.evaluation?.requiredTiers || 1,
          firstApproverName: po.firstApproverName,
          firstApprovedAt: po.firstApprovedAt,
          secondApproverName: po.secondApproverName,
          secondApprovedAt: po.secondApprovedAt,
          updatedAt: po.updatedAt,
        });
        setCompanyId(po.companyId);
        setDate(new Date(po.date).toISOString().slice(0, 10));
        setWorkOrderNo(po.workOrderNo || "");
        setPurchaseRequisitionId(po.purchaseRequisitionId || "");
        setSupplierId(po.supplierId);
        setContactPersonId(po.contactPersonId || "");
        setSupplierEmail(po.email || "");
        setSupplierTel(po.telNo || "");
        setSupplierFax(po.faxNo || "");
        setSupplierMobile(po.mobileNo || "");
        setPurchaserId(po.purchaserId);
        setCurrencyId(po.currencyId);
        setExchangeRate(Number(po.exchangeRate || 1).toFixed(4));
        setTaxTypeId(po.taxTypeId);
        setTaxRate(Number(po.taxRate || 0).toFixed(2));
        setAmountBeforeTax(Number(po.amountBeforeTax || 0).toFixed(2));
        setTaxAmount(Number(po.taxAmount || 0).toFixed(2));
        setAmountAfterTax(Number(po.amountAfterTax || 0).toFixed(2));
        setMillCertificate(po.millCertificate || false);
        setCertOfConformance(po.certOfConformance || false);
        setPoRemark(po.remark || "");
        setItems(
          po.items.map((it: any) => ({
            id: it.id,
            fromMaterialProfile: it.fromMaterialProfile,
            materialProfileId: it.materialProfileId || "",
            purchaseRequisitionItemId: it.purchaseRequisitionItemId || "",
            material: it.material || "",
            description: it.description,
            supplierMaterialNo: it.supplierMaterialNo || "",
            shape: it.shape || "",
            size: it.size || "",
            poUomId: it.poUomId,
            quantity: Number(it.quantity).toFixed(2),
            unitPrice: Number(it.unitPrice).toFixed(4),
            amount: Number(it.amount).toFixed(2),
            conversion: Number(it.conversion).toFixed(4),
            internalUomId: it.internalUomId || "",
            internalQuantity: Number(it.internalQuantity || 0).toFixed(2),
            deliveryDate: new Date(it.deliveryDate).toISOString().slice(0, 10),
            remark: it.remark || "",
            woProcessName: it.woRoutingProcess ? `${it.woRoutingProcess.mainProcess?.process} - ${it.woRoutingProcess.routingProcess?.routingProcess}` : "",
            mainProcessName: it.masterMainProcess?.process || "",
            routingProcessName: it.masterRoutingProcess?.routingProcess || "",
            hardness: it.hardness || "",
            thickness: it.thickness || "",
          })),
        );
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAction = async (action: "approve" | "reject") => {
    if (action === "reject" && !approvalRemark.trim()) {
      hotToast.error("Please provide an approval remark for rejection.");
      return;
    }

    if (!await customConfirm(`Are you sure you want to ${action} this Purchase Order?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/purchasing/purchase-order-approval/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, remark: approvalRemark, expectedUpdatedAt: meta.updatedAt }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${action}`);
      }

      router.push(back.href);
      router.refresh();
    } catch (e: any) {
      hotToast.error(e.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-12">
        <Loader2 size={20} className="animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500">Loading details…</p>
      </div>
    );
  }

  // ---- Display-only derived values (no effect on the approval call) ----
  const status = meta.status || "";
  // The server decides the tier count from the live evaluation, so show that when it is available.
  const stage = poApprovalStage({ ...meta, approvalTier: evaluation?.requiredTiers ?? meta.approvalTier });
  const isSubcon = meta.type === "SUBCON";
  const companyName = companies.find((c) => c.id === companyId)?.companyName || doc?.company?.companyName || "";
  const purchaserEmp = employees.find((e) => e.id === purchaserId);
  const purchaserLabel = purchaserEmp ? `${purchaserEmp.name} (${purchaserEmp.code})` : doc?.purchaser?.name || "";
  const prNo = prs.find((pr) => pr.id === purchaseRequisitionId)?.prNo || doc?.purchaseRequisition?.prNo || "";
  const supplier = suppliers.find((s) => s.id === supplierId);
  const supplierName = supplier?.supplierName || doc?.supplier?.supplierName || "";
  const contactName =
    supplier?.contactPersons?.find((cp: { id: string }) => cp.id === contactPersonId)?.contactPersonName ||
    doc?.contactPerson?.contactPersonName ||
    "";
  const workOrderLabel = workOrders.find((w) => w.workOrderNo === workOrderNo)?.workOrderNo || workOrderNo;
  const curCode = currencies.find((c) => c.id === currencyId)?.code || doc?.currency?.code || "";
  const taxLabel = taxes.find((t) => t.id === taxTypeId)?.taxType || doc?.taxType?.taxType || "";
  const uomName = (uomId: string) => uoms.find((u) => u.id === uomId)?.uomName || "";
  const materialCode = (it: Item) => materials.find((m) => m.id === it.materialProfileId)?.partNo || "N/A";
  const billToLines = [doc?.billToAddress, doc?.billToState].filter((s) => s && s.trim());
  const hasBillTo = !!(doc?.billToName || doc?.billToAddress);
  const hasShipTo = !!doc?.differentShipTo && !!(doc?.consigneeName || doc?.consigneeAddress);
  const decisionLocked = !!evaluation && !evaluation.canApprove && !evaluation.canReject;
  // Same conversion the server uses to pick the tier.
  const baseAmount = poBaseAmount(amountAfterTax, exchangeRate);
  const approveLabel =
    evaluation?.isFirstTierPending && evaluation?.requiredTiers === 2
      ? "Approve (1st Tier Sign-off)"
      : "Approve (Issue Purchase Order)";

  return (
    <div className="w-full space-y-4 text-[13px]">
      {/* Document header */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link
              href={back.href}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600"
            >
              <ArrowLeft size={12} /> {back.label}
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {meta.poNo ? (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">PO</span>
                  <span className="truncate font-mono text-xl font-semibold text-slate-900">{meta.poNo}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-px font-mono text-[11px] font-medium text-slate-500">
                    R{meta.revision}
                  </span>
                </h1>
              ) : (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">Review Purchase Order</h1>
              )}
              {status && <StatusBadge status={status} tone={poStatusTone(status)} size="md" />}
              {stage.tiers && (
                <Badge tone={stage.tone} icon={ShieldCheck} size="md">
                  {stage.label}
                </Badge>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Supplier">{supplierName || "—"}</MetaChip>
              <MetaChip icon={CalendarDays} label="PO" title="PO date">{fmtDate(date)}</MetaChip>
              {purchaserLabel && (
                <MetaChip icon={UserRound} title="Purchaser">{purchaserLabel}</MetaChip>
              )}
              {!isSubcon && <MetaChip icon={ClipboardList} label="PR" title="Purchase requisition">{prNo || "Independent"}</MetaChip>}
              {workOrderNo && (
                <MetaChip icon={Wrench} label="WO" title="Work order">{workOrderNo}</MetaChip>
              )}
              <MetaChip icon={Coins} title="Currency and exchange rate">
                {curCode || "—"} @ {exchangeRate}
              </MetaChip>
              <MetaChip icon={Wallet} label="Total" title="Amount after tax">
                <span className="tabular-nums">{curCode} {amountAfterTax}</span>
              </MetaChip>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => router.push(back.href)}
              className={buttonClass("ghost", "md")}
            >
              Back
            </button>
            <a href="#decision" className={buttonClass("primary", "md", "xl:hidden")}>
              <Gavel size={14} /> Decide
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4">
        {/* Main column: read-only PO */}
        <div className="min-w-0 space-y-4">
          <Card icon={FileText} tone="indigo" title="Order details" description={isSubcon ? "Company, purchaser, work order and currency" : "Company, purchaser, source PR, work order and currency"}>
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Company" className="sm:col-span-2">
                <ReadValue>{companyName}</ReadValue>
              </Field>
              <Field label="PO Date">
                <ReadValue>{fmtDate(date)}</ReadValue>
              </Field>
              <Field label="Purchaser">
                <ReadValue>{purchaserLabel}</ReadValue>
              </Field>
              {!isSubcon && (
                <Field label="PR No">
                  <ReadValue mono={!!prNo}>{prNo || "Independent PO"}</ReadValue>
                </Field>
              )}
              <Field label="Work Order">
                <ReadValue mono={!!workOrderLabel}>{workOrderLabel || "None (Non Work Order)"}</ReadValue>
              </Field>
              <Field label="Currency">
                <ReadValue>{curCode}</ReadValue>
              </Field>
              <Field label="Exchange Rate">
                <ReadValue numeric>{exchangeRate}</ReadValue>
              </Field>
              <Field label="Tax Code">
                <ReadValue>{taxLabel}</ReadValue>
              </Field>
              <Field label="Tax Rate %">
                <ReadValue numeric>{taxRate}</ReadValue>
              </Field>
            </div>
          </Card>

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <Card icon={Building2} tone="sky" title="Supplier" description="Supplier and contact on this order">
              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <Field label="Supplier" className="sm:col-span-2">
                  <ReadValue>{supplierName}</ReadValue>
                </Field>
                <Field label="Supplier Contact Person" className="sm:col-span-2">
                  <ReadValue>{contactName}</ReadValue>
                </Field>
                <Field label="Supplier Email" className="sm:col-span-2">
                  <ReadValue>{supplierEmail}</ReadValue>
                </Field>
                <Field label="Supplier Tel No">
                  <ReadValue>{supplierTel}</ReadValue>
                </Field>
                <Field label="Supplier Fax No">
                  <ReadValue>{supplierFax}</ReadValue>
                </Field>
                <Field label="Supplier Mobile No">
                  <ReadValue>{supplierMobile}</ReadValue>
                </Field>
              </div>
            </Card>

            <Card icon={MapPin} tone="violet" title="Bill to / Ship to" description="As recorded on the purchase order">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                <AddressPanel label="Bill to">
                  {hasBillTo ? (
                    <>
                      <p className="font-medium text-slate-800">{doc?.billToName || "—"}</p>
                      {billToLines.map((l, i) => (
                        <p key={i} className="whitespace-pre-line text-slate-600">{l}</p>
                      ))}
                      {doc?.billToContactPerson && <p className="text-slate-600">Attn: {doc.billToContactPerson}</p>}
                      {(doc?.billToPhone || doc?.billToFax) && (
                        <p className="text-slate-500">
                          {[doc?.billToPhone && `Tel ${doc.billToPhone}`, doc?.billToFax && `Fax ${doc.billToFax}`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {doc?.billToEmail && <p className="truncate text-slate-500">{doc.billToEmail}</p>}
                      {doc?.billToGstin && <p className="font-mono text-[11px] text-slate-500">GSTIN {doc.billToGstin}</p>}
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-slate-800">{companyName || "—"}</p>
                      <p className="text-slate-400">No separate bill-to recorded</p>
                    </>
                  )}
                </AddressPanel>
                <AddressPanel label="Ship to">
                  {hasShipTo ? (
                    <>
                      <p className="font-medium text-slate-800">{doc?.consigneeName || "—"}</p>
                      {doc?.consigneeAddress && <p className="whitespace-pre-line text-slate-600">{doc.consigneeAddress}</p>}
                      {(doc?.consigneeState || doc?.consigneeCountry) && (
                        <p className="text-slate-600">{[doc?.consigneeState, doc?.consigneeCountry].filter(Boolean).join(", ")}</p>
                      )}
                      {doc?.consigneePhone && <p className="text-slate-500">Tel {doc.consigneePhone}</p>}
                      {doc?.consigneeGstin && <p className="font-mono text-[11px] text-slate-500">GSTIN {doc.consigneeGstin}</p>}
                    </>
                  ) : (
                    <p className="text-slate-500">Same as bill to</p>
                  )}
                </AddressPanel>
              </div>
            </Card>
          </div>

          {/* Items */}
          <Card
            icon={Package}
            tone="indigo"
            title="Purchase Order Items"
            description={isSubcon ? "Subcon processes on this order" : "Materials on this order"}
            actions={<Badge tone="slate">{items.length} {items.length === 1 ? "line" : "lines"}</Badge>}
            bodyClassName="p-0"
          >
            {items.length === 0 ? (
              <EmptyState icon={Package} tone="slate" title="No lines on this purchase order." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-[13px]">
                  <thead>
                    {isSubcon ? (
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <th className="w-8 py-2 pl-4 pr-1 text-left font-medium">#</th>
                        {workOrderNo ? (
                          <th className="px-3 py-2 text-left font-medium">WO Process</th>
                        ) : (
                          <>
                            <th className="px-3 py-2 text-left font-medium">Main Process</th>
                            <th className="px-3 py-2 text-left font-medium">Routing Process</th>
                          </>
                        )}
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                        <th className="px-3 py-2 text-left font-medium">Hardness</th>
                        <th className="px-3 py-2 text-left font-medium">Thickness</th>
                        <th className="px-3 py-2 text-left font-medium">PO UOM</th>
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                        <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-3 py-2 text-left font-medium">Delivery Date</th>
                        <th className="px-3 py-2 pr-4 text-left font-medium">Remark</th>
                      </tr>
                    ) : (
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <th className="w-8 py-2 pl-4 pr-1 text-left font-medium">#</th>
                        <th className="px-3 py-2 text-left font-medium">Type</th>
                        <th className="px-3 py-2 text-left font-medium">Material Profile / Code</th>
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                        <th className="px-3 py-2 text-left font-medium">Supplier Part No</th>
                        <th className="px-3 py-2 text-left font-medium">Shape</th>
                        <th className="px-3 py-2 text-left font-medium">Size</th>
                        <th className="px-3 py-2 text-left font-medium">PO UOM</th>
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                        <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-3 py-2 text-right font-medium">Conv</th>
                        <th className="px-3 py-2 text-left font-medium">Int UOM</th>
                        <th className="px-3 py-2 text-right font-medium">Int Qty</th>
                        <th className="px-3 py-2 text-left font-medium">Delivery Date</th>
                        <th className="px-3 py-2 pr-4 text-left font-medium">Remark</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={idx} className="align-top transition-colors hover:bg-indigo-50/30">
                        <td className="py-2 pl-4 pr-1 text-[11px] tabular-nums text-slate-400">{idx + 1}</td>
                        {isSubcon ? (
                          <>
                            {workOrderNo ? (
                              <td className="px-3 py-2 text-slate-800">{it.woProcessName || "—"}</td>
                            ) : (
                              <>
                                <td className="px-3 py-2 text-slate-800">{it.mainProcessName || "—"}</td>
                                <td className="px-3 py-2 text-slate-800">{it.routingProcessName || "—"}</td>
                              </>
                            )}
                            <td className="min-w-[200px] px-3 py-2 whitespace-pre-line text-slate-700">{it.description}</td>
                            <td className="px-3 py-2 text-slate-600">{it.hardness || "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{it.thickness || "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{uomName(it.poUomId) || "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-800">{it.quantity}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-800">{it.unitPrice}</td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{it.amount}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">{fmtDate(it.deliveryDate)}</td>
                            <td className="min-w-[150px] px-3 py-2 pr-4 text-xs text-slate-500">{it.remark || "—"}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2">
                              <Badge tone={it.fromMaterialProfile ? "indigo" : "slate"}>
                                {it.fromMaterialProfile ? "Profile" : "FreeText"}
                              </Badge>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-800">
                              {it.fromMaterialProfile ? materialCode(it) : <span className="font-sans text-[13px]">{it.material || "—"}</span>}
                            </td>
                            <td className="min-w-[200px] px-3 py-2 whitespace-pre-line text-slate-700">{it.description}</td>
                            <td className="px-3 py-2 text-slate-600">{it.supplierMaterialNo || "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{it.shape || "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{it.size || "—"}</td>
                            <td className="px-3 py-2 text-slate-600">{uomName(it.poUomId) || "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-800">{it.quantity}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-800">{it.unitPrice}</td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{it.amount}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600">{it.conversion}</td>
                            <td className="px-3 py-2 text-slate-600">{uomName(it.internalUomId) || "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-800">{it.internalQuantity}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">{fmtDate(it.deliveryDate)}</td>
                            <td className="min-w-[150px] px-3 py-2 pr-4 text-xs text-slate-500">{it.remark || "—"}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card icon={StickyNote} tone="amber" title="Quality & remarks" description="Certificates and special instructions">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <label className="inline-flex items-center gap-2 text-[13px] text-slate-700">
                  <input type="checkbox" checked={millCertificate} disabled className={`${checkboxClass} disabled:opacity-60`} />
                  Mill Certificate
                </label>
                <label className="inline-flex items-center gap-2 text-[13px] text-slate-700">
                  <input type="checkbox" checked={certOfConformance} disabled className={`${checkboxClass} disabled:opacity-60`} />
                  Cert. of Conformance
                </label>
              </div>
              <Field label="Remark / Special Instructions">
                <div className="min-h-16 whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] text-slate-700">
                  {poRemark || <span className="text-slate-400">—</span>}
                </div>
              </Field>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Approval progress */}
          <Card
            icon={ShieldCheck}
            tone={stage.tone === "slate" ? "indigo" : stage.tone}
            title="Approval"
            description={
              evaluation
                ? evaluation.requiredTiers === 2
                  ? "Two-Tier Sequential Approval Required"
                  : "Single-Tier Approval Required"
                : stage.tiers === 2
                  ? "Two-tier, value banded"
                  : "Single tier"
            }
            actions={<Badge tone={stage.tone}>{stage.label}</Badge>}
          >
            <div className="space-y-2">
              <ApprovalStep
                n={1}
                title="Tier 1 approval"
                state={stage.tier1}
                who={meta.firstApproverName}
                when={meta.firstApprovedAt}
                authorized={evaluation ? formatApproverNames(evaluation.firstTierApprovers) : null}
                last={stage.tiers !== 2}
              />
              {stage.tiers === 2 ? (
                <ApprovalStep
                  n={2}
                  title="Tier 2 approval"
                  state={stage.tier2}
                  who={meta.secondApproverName}
                  when={meta.secondApprovedAt}
                  authorized={evaluation ? formatApproverNames(evaluation.secondTierApprovers) : null}
                  last
                />
              ) : (
                <p className="pl-8 text-[11px] text-slate-400">Single-tier PO is issued upon 1st Level approval.</p>
              )}
              {evaluation && (
                <p className="border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                  Total PO Value:{" "}
                  <span className="font-semibold tabular-nums text-slate-800">
                    {curCode} {amountAfterTax}
                  </span>
                  <br />
                  Tier basis (base currency):{" "}
                  <span className="font-semibold tabular-nums text-slate-800">{fmtBase(baseAmount)}</span>
                  {Number(exchangeRate) !== 1 && <> ({amountAfterTax} × {exchangeRate})</>}
                  {formatThreshold(evaluation)}
                </p>
              )}
            </div>
          </Card>

          {/* Summary */}
          <section className="overflow-hidden rounded-xl bg-[#111827] text-slate-300 shadow-lg shadow-slate-900/10 ring-1 ring-white/5">
            <header className="flex items-center gap-2.5 border-b border-white/10 px-4 py-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/20">
                <Receipt size={15} />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold leading-tight text-white">Summary</h2>
                <p className="text-[11px] leading-tight text-slate-400">Totals as submitted for approval</p>
              </div>
            </header>
            <dl className="space-y-2 px-4 py-3 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">Lines</dt>
                <dd className="tabular-nums text-slate-200">{items.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">Amount Before Tax</dt>
                <dd className="tabular-nums text-slate-200">{amountBeforeTax}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="truncate text-slate-400">
                  Tax Amount{taxLabel ? ` · ${taxLabel} (${taxRate}%)` : ""}
                </dt>
                <dd className="tabular-nums text-slate-200">{taxAmount}</dd>
              </div>
            </dl>
            <div className="relative border-t border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-gradient-to-b from-indigo-400 to-violet-500" />
              <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-300">Amount After Tax</p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                {curCode && <span className="text-xs font-medium text-indigo-300">{curCode}</span>}
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">{amountAfterTax}</span>
              </p>
              <p className="mt-1 text-[11px] tabular-nums text-slate-400">Exchange rate {exchangeRate}</p>
            </div>
          </section>

          {/* Decision */}
          <section
            id="decision"
            className="scroll-mt-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500" />
            <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-600/15">
                  <Gavel size={15} />
                </span>
                <h2 className="text-[13px] font-semibold leading-tight text-slate-800">Approval Decision</h2>
              </div>
              {evaluation && <Badge tone="indigo">Current Stage: {evaluation.currentStageTitle}</Badge>}
            </header>
            <div className="space-y-3 p-4">
              {evaluation && !evaluation.canApprove && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <Lock size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-amber-900">Action restricted for your current login</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">{evaluation.cannotApproveReason}</p>
                  </div>
                </div>
              )}

              <Field label="Approval / Rejection Remark" htmlFor="approval-remark" help="Optional to approve, required to reject.">
                <textarea
                  id="approval-remark"
                  rows={3}
                  value={approvalRemark}
                  onChange={(e) => setApprovalRemark(e.target.value)}
                  disabled={submitting || (evaluation && !evaluation.canApprove && !evaluation.canReject)}
                  placeholder="Optional remark for approval, required for rejection..."
                  className={textareaClass}
                />
              </Field>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLastAction("approve");
                    handleAction("approve");
                  }}
                  disabled={submitting || (evaluation && !evaluation.canApprove)}
                  title={evaluation && !evaluation.canApprove ? evaluation.cannotApproveReason : undefined}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && lastAction === "approve" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {submitting && lastAction === "approve" ? "Approving…" : approveLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLastAction("reject");
                    handleAction("reject");
                  }}
                  disabled={submitting || (evaluation && !evaluation.canReject)}
                  title={evaluation && !evaluation.canReject ? evaluation.cannotApproveReason : undefined}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-[13px] font-semibold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && lastAction === "reject" ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  {submitting && lastAction === "reject" ? "Rejecting…" : "Reject"}
                </button>
              </div>
              {decisionLocked && (
                <p className="text-center text-[11px] text-slate-400">You can view this order but not decide on it.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ReadValue({ children, mono, numeric }: { children: React.ReactNode; mono?: boolean; numeric?: boolean }) {
  const empty = children === "" || children === null || children === undefined;
  return (
    <div
      className={`flex h-8 w-full min-w-0 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[13px] text-slate-700 ${
        numeric ? "justify-end tabular-nums" : ""
      } ${mono ? "font-mono text-xs" : ""}`}
    >
      <span className="truncate">{empty ? <span className="text-slate-400">—</span> : children}</span>
    </div>
  );
}

function AddressPanel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      {children}
    </div>
  );
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STEP_DOT: Record<TierState, string> = {
  done: "bg-emerald-500 text-white",
  current: "bg-amber-500 text-white ring-4 ring-amber-100",
  waiting: "bg-slate-200 text-slate-500",
  rejected: "bg-rose-500 text-white",
  skipped: "bg-slate-100 text-slate-400",
  none: "bg-slate-100 text-slate-400",
};

const STEP_TEXT: Record<TierState, string> = {
  done: "Approved",
  current: "Awaiting approval",
  waiting: "Waiting",
  rejected: "Rejected",
  skipped: "Skipped",
  none: "Not started",
};

const STEP_TEXT_CLS: Record<TierState, string> = {
  done: "text-emerald-700",
  current: "text-amber-700",
  waiting: "text-slate-500",
  rejected: "text-rose-700",
  skipped: "text-slate-400",
  none: "text-slate-400",
};

function ApprovalStep({
  n,
  title,
  state,
  who,
  when,
  authorized,
  last,
}: {
  n: number;
  title: string;
  state: TierState;
  who?: string | null;
  when?: string | null;
  authorized?: string | null;
  last?: boolean;
}) {
  const stamp = fmtDateTime(when);
  return (
    <div className="relative flex gap-2.5">
      {!last && <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-slate-200" />}
      <span className={`relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${STEP_DOT[state]}`}>
        {state === "done" ? <Check size={13} /> : state === "rejected" ? <X size={13} /> : n}
      </span>
      <div className="min-w-0 pb-2">
        <p className="text-[13px] font-medium leading-tight text-slate-800">{title}</p>
        <p className={`text-[11px] leading-tight ${STEP_TEXT_CLS[state]}`}>{STEP_TEXT[state]}</p>
        {who && (
          <p className="mt-0.5 truncate text-[11px] text-slate-500" title={who}>
            by <span className="font-medium text-slate-700">{who}</span>
            {stamp && <span className="text-slate-400"> · {stamp}</span>}
          </p>
        )}
        {authorized && !who && (
          <p className="mt-0.5 text-[11px] text-slate-500">
            Authorized: <span className="font-medium text-slate-700">{authorized}</span>
          </p>
        )}
      </div>
    </div>
  );
}

const fmtBase = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Bands are in base currency, compared against the base amount. */
function formatThreshold(evaluation: any): string {
  const max = evaluation?.firstLevelMax;
  if (max == null) return "";
  if (evaluation.requiredTiers === 2) return ` (Exceeds ${fmtBase(max)} First Level threshold)`;
  const min = evaluation.firstLevelMin ?? 0;
  return ` (Within ${fmtBase(min)} – ${fmtBase(max)} First Level limit)`;
}
