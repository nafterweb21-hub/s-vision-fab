"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, FileText } from "lucide-react";
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

export default function PurchaseOrderApprovalDetailPage() {
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
  }>({});
  const [evaluation, setEvaluation] = useState<any>(null);

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
        body: JSON.stringify({ action, remark: approvalRemark }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${action}`);
      }

      router.push("/dashboard/purchasing/purchase-order-approval");
      router.refresh();
    } catch (e: any) {
      hotToast.error(e.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-blue-500">Loading details…</p>
      </div>
    );
  }

  return (
    <div className="py-3 space-y-4 w-full">
      <div className="flex items-center justify-between pb-6 border-b border-blue-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold uppercase mb-1">
            <Link href="/dashboard/purchasing/purchase-order-approval" className="hover:text-blue-600 inline-flex items-center gap-1">
              <ArrowLeft size={12} /> Purchase Order Approvals
            </Link>
            {meta.poNo && (
              <>
                <span>/</span>
                <span className="text-blue-500">
                  {meta.poNo}-R{meta.revision}
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] border bg-sky-50 text-sky-700 border-sky-200">
                  {meta.status}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-blue-900">
              Review Purchase Order
            </h2>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">{error}</div>
      )}

      {/* 2-Tier Approval Workflow Banner */}
      {evaluation && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Approval Workflow</span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {evaluation.requiredTiers === 2 ? "Two-Tier Sequential Approval Required" : "Single-Tier Approval Required"}
              </h3>
            </div>
            <div className="text-xs font-medium text-slate-500">
              Total PO Value: <span className="font-bold text-slate-800 font-mono text-sm">${amountAfterTax}</span>
              {formatThreshold(evaluation)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: First Tier */}
            <div className={`p-4 rounded-xl border ${meta.firstApproverName ? "bg-emerald-50/70 border-emerald-200" : evaluation.isFirstTierPending ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-100" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>Step 1: First Level</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">Tier 1</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">First Tier Sign-off</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized: <span className="font-semibold text-slate-700">{evaluation.firstTierApprovers?.map((a: any) => a.name).join(", ") || "Shyue Yin"}</span>
                  </p>
                </div>
                {meta.firstApproverName ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 size={13} /> Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Pending
                  </span>
                )}
              </div>
              {meta.firstApproverName && (
                <div className="mt-3 pt-2 border-t border-emerald-200/60 text-xs text-emerald-800">
                  Signed off by <span className="font-bold">{meta.firstApproverName}</span> {meta.firstApprovedAt ? `on ${new Date(meta.firstApprovedAt).toLocaleDateString()}` : ""}
                </div>
              )}
            </div>

            {/* Step 2: Second Tier */}
            <div className={`p-4 rounded-xl border ${meta.secondApproverName || (evaluation.requiredTiers === 1 && meta.firstApproverName) ? "bg-emerald-50/70 border-emerald-200" : evaluation.isSecondTierPending ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-100" : "bg-slate-50 border-slate-200 opacity-80"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>Step 2: Second Level</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">Tier 2</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">
                    {evaluation.requiredTiers === 2 ? "Second Tier Sign-off" : "Not Required for Single Tier"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {evaluation.requiredTiers === 2 ? (
                      <>Authorized: <span className="font-semibold text-slate-700">{evaluation.secondTierApprovers?.map((a: any) => a.name).join(", ") || "Danny, Simeon"}</span></>
                    ) : (
                      "Single-tier PO is issued upon 1st Level approval"
                    )}
                  </p>
                </div>
                {meta.secondApproverName ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 size={13} /> Approved
                  </span>
                ) : evaluation.requiredTiers === 1 ? (
                  <span className="text-xs text-slate-400 font-semibold">N/A</span>
                ) : evaluation.isSecondTierPending ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Awaiting Sign-off
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">Awaiting Step 1</span>
                )}
              </div>
              {meta.secondApproverName && (
                <div className="mt-3 pt-2 border-t border-emerald-200/60 text-xs text-emerald-800">
                  Signed off by <span className="font-bold">{meta.secondApproverName}</span> {meta.secondApprovedAt ? `on ${new Date(meta.secondApprovedAt).toLocaleDateString()}` : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Fields - Read Only */}
      <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Field label="Company">
          <SearchableSelect value={companyId} disabled className={inputCls}>
            <option value="">— Select —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="PO Date">
          <input type="date" value={date} disabled className={inputCls} />
        </Field>

        <Field label="Purchaser">
          <SearchableSelect value={purchaserId} disabled className={inputCls}>
            <option value="">— Select —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="PR No">
          <SearchableSelect value={purchaseRequisitionId} disabled className={inputCls}>
            <option value="">— Independent PO —</option>
            {prs.map((pr) => (
              <option key={pr.id} value={pr.id}>{pr.prNo}</option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="Supplier">
          <SearchableSelect value={supplierId} disabled className={inputCls}>
            <option value="">— Select Supplier —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.supplierName}</option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="Supplier Contact Person">
          <SearchableSelect value={contactPersonId} disabled className={inputCls}>
            <option value="">— Select —</option>
            {suppliers.find(s => s.id === supplierId)?.contactPersons?.map((cp: any) => (
              <option key={cp.id} value={cp.id}>{cp.contactPersonName}</option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="Supplier Email">
          <input type="email" value={supplierEmail} disabled className={inputCls} />
        </Field>

        <Field label="Supplier Tel No">
          <input type="text" value={supplierTel} disabled className={inputCls} />
        </Field>

        <Field label="Supplier Fax No">
          <input type="text" value={supplierFax} disabled className={inputCls} />
        </Field>

        <Field label="Supplier Mobile No">
          <input type="text" value={supplierMobile} disabled className={inputCls} />
        </Field>
        
        <Field label="Work Order">
          <SearchableSelect value={workOrderNo} disabled className={inputCls}>
            <option value="">— None (Non Work Order) —</option>
            {workOrders.map((w) => (
              <option key={w.workOrderNo} value={w.workOrderNo}>{w.workOrderNo}</option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="Currency">
          <SearchableSelect value={currencyId} disabled className={inputCls}>
            <option value="">— Select —</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="Exchange Rate">
          <input type="number" value={exchangeRate} disabled className={inputCls} />
        </Field>

        <Field label="Tax Code">
          <SearchableSelect value={taxTypeId} disabled className={inputCls}>
            <option value="">— Select —</option>
            {taxes.map((t) => (
              <option key={t.id} value={t.id}>{t.taxType}</option>
            ))}
          </SearchableSelect>
        </Field>

        <Field label="Tax Rate %">
          <input type="number" value={taxRate} disabled className={inputCls} />
        </Field>
      </div>

      {/* Items Section - Read Only */}
      <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900">Purchase Order Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider">
              {meta.type === "SUBCON" ? (
                <tr>
                  {workOrderNo ? (
                    <th className="px-3 py-2 text-left w-56">WO Process</th>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left w-48">Main Process</th>
                      <th className="px-3 py-2 text-left w-48">Routing Process</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-left w-56">Description</th>
                  <th className="px-3 py-2 text-left w-24">Hardness</th>
                  <th className="px-3 py-2 text-left w-24">Thickness</th>
                  <th className="px-3 py-2 text-left w-28">PO UOM</th>
                  <th className="px-3 py-2 text-right w-24">Qty</th>
                  <th className="px-3 py-2 text-right w-32">Unit Price</th>
                  <th className="px-3 py-2 text-right w-32">Amount</th>
                  <th className="px-3 py-2 text-left w-40">Delivery Date</th>
                  <th className="px-3 py-2 text-left min-w-[150px]">Remark</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-3 py-2 text-left w-24">Type</th>
                  <th className="px-3 py-2 text-left w-48">Material Profile / Code</th>
                  <th className="px-3 py-2 text-left w-56">Description</th>
                  <th className="px-3 py-2 text-left w-40">Supplier Part No</th>
                  <th className="px-3 py-2 text-left w-32">Shape</th>
                  <th className="px-3 py-2 text-left w-32">Size</th>
                  <th className="px-3 py-2 text-left w-28">PO UOM</th>
                  <th className="px-3 py-2 text-right w-24">Qty</th>
                  <th className="px-3 py-2 text-right w-32">Unit Price</th>
                  <th className="px-3 py-2 text-right w-32">Amount</th>
                  <th className="px-3 py-2 text-right w-24">Conv</th>
                  <th className="px-3 py-2 text-left w-28">Int UOM</th>
                  <th className="px-3 py-2 text-right w-24">Int Qty</th>
                  <th className="px-3 py-2 text-left w-40">Delivery Date</th>
                  <th className="px-3 py-2 text-left min-w-[150px]">Remark</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-blue-100">
              {items.map((it, idx) => (
                <tr key={idx} className="bg-white">
                  {meta.type === "SUBCON" ? (
                    <>
                      {workOrderNo ? (
                        <td className="px-3 py-2 align-top">
                          <input type="text" value={it.woProcessName} disabled className={inputCls} />
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-2 align-top">
                            <input type="text" value={it.mainProcessName} disabled className={inputCls} />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input type="text" value={it.routingProcessName} disabled className={inputCls} />
                          </td>
                        </>
                      )}
                      <td className="px-3 py-2 align-top">
                        <textarea rows={1} value={it.description} disabled className={inputCls} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="text" value={it.hardness} disabled className={inputCls} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="text" value={it.thickness} disabled className={inputCls} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <SearchableSelect value={it.poUomId} disabled className={inputCls}>
                          <option value="">—</option>
                          {uoms.map((u) => <option key={u.id} value={u.id}>{u.uomName}</option>)}
                        </SearchableSelect>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="number" value={it.quantity} disabled className={`${inputCls} text-right`} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="number" value={it.unitPrice} disabled className={`${inputCls} text-right`} />
                      </td>
                      <td className="px-3 py-2 align-top text-right font-mono text-blue-900 font-semibold pt-4">
                        {it.amount}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="date" value={it.deliveryDate} disabled className={inputCls} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="text" value={it.remark} disabled className={inputCls} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 align-top">
                        <input type="text" value={it.fromMaterialProfile ? "Profile" : "FreeText"} disabled className={inputCls} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        {it.fromMaterialProfile ? (
                          <SearchableSelect value={it.materialProfileId} disabled className={inputCls}>
                            <option value="">— Select —</option>
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>{m.partNo || "N/A"}</option>
                            ))}
                          </SearchableSelect>
                        ) : (
                          <input type="text" value={it.material} disabled className={inputCls} />
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea rows={1} value={it.description} disabled className={inputCls} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="text" value={it.supplierMaterialNo} disabled className={inputCls} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="text" value={it.shape} disabled className={inputCls} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="text" value={it.size} disabled className={inputCls} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <SearchableSelect value={it.poUomId} disabled className={inputCls}>
                          <option value="">—</option>
                          {uoms.map((u) => <option key={u.id} value={u.id}>{u.uomName}</option>)}
                        </SearchableSelect>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="number" value={it.quantity} disabled className={`${inputCls} text-right`} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="number" value={it.unitPrice} disabled className={`${inputCls} text-right`} />
                      </td>
                      <td className="px-3 py-2 align-top text-right font-mono text-blue-900 font-semibold pt-4">
                        {it.amount}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="number" value={it.conversion} disabled className={`${inputCls} text-right`} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <SearchableSelect value={it.internalUomId} disabled className={inputCls}>
                          <option value="">—</option>
                          {uoms.map((u) => <option key={u.id} value={u.id}>{u.uomName}</option>)}
                        </SearchableSelect>
                      </td>
                      <td className="px-3 py-2 align-top text-right font-mono text-blue-900 pt-4">
                        {it.internalQuantity}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="date" value={it.deliveryDate} disabled className={inputCls} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input type="text" value={it.remark} disabled className={inputCls} />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quality Controls and Remarks */}
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-blue-900">
              <input type="checkbox" checked={millCertificate} disabled className="w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500 disabled:opacity-50" />
              Mill Certificate
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-blue-900">
              <input type="checkbox" checked={certOfConformance} disabled className="w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500 disabled:opacity-50" />
              Cert. of Conformance
            </label>
          </div>
          <Field label="Remark / Special Instructions">
            <textarea rows={3} value={poRemark} disabled className={inputCls} />
          </Field>
        </div>

        {/* Totals Summary */}
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-6 flex flex-col justify-end space-y-3">
          <div className="flex items-center justify-between text-sm text-blue-700">
            <span>Amount Before Tax:</span>
            <span className="font-mono font-medium">{amountBeforeTax}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-blue-700">
            <span>Tax Amount:</span>
            <span className="font-mono font-medium">{taxAmount}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-bold text-blue-900 border-t border-blue-100 pt-3">
            <span>Amount After Tax:</span>
            <span className="font-mono">{amountAfterTax}</span>
          </div>
        </div>
      </div>

      {/* Approval Action Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <CheckCircle2 size={18} /> Approval Decision
          </h3>
          {evaluation && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-200 w-fit">
              Current Stage: {evaluation.currentStageTitle}
            </span>
          )}
        </div>

        {evaluation && !evaluation.canApprove && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-xl text-sm flex items-start gap-3 shadow-xs">
            <span className="text-lg">🔒</span>
            <div>
              <p className="font-bold text-amber-950">Action restricted for your current login</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">{evaluation.cannotApproveReason}</p>
            </div>
          </div>
        )}
        
        <Field label="Approval / Rejection Remark">
          <textarea
            rows={2}
            value={approvalRemark}
            onChange={(e) => setApprovalRemark(e.target.value)}
            disabled={submitting || (evaluation && !evaluation.canApprove && !evaluation.canReject)}
            placeholder="Optional remark for approval, required for rejection..."
            className="w-full px-3 py-2 text-sm bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
          />
        </Field>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => handleAction("reject")}
            disabled={submitting || (evaluation && !evaluation.canReject)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            Reject
          </button>
          
          <button
            onClick={() => handleAction("approve")}
            disabled={submitting || (evaluation && !evaluation.canApprove)}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {evaluation?.isFirstTierPending && evaluation?.requiredTiers === 2
              ? "Approve (1st Tier Sign-off)"
              : "Approve (Issue Purchase Order)"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none disabled:text-slate-700 disabled:cursor-not-allowed";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-blue-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function formatThreshold(evaluation: any): string {
  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const max = evaluation?.firstLevelMax;
  if (max == null) return "";
  if (evaluation.requiredTiers === 2) return ` (Exceeds $${fmt(max)} First Level threshold)`;
  const min = evaluation.firstLevelMin ?? 0;
  return ` (Within $${fmt(min)} – $${fmt(max)} First Level limit)`;
}
