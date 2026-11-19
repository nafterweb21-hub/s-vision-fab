"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PoBillShipTo, { emptyPoShipTo, poShipToFromRecord, applyPoCustomer, type PoCustomer, type PoShipTo } from "@/components/purchasing/PoBillShipTo";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  FileText,
  AlertCircle,
  Lock,
  Truck,
  Package,
  StickyNote,
  ShieldCheck,
  PackageCheck,
  Receipt,
  Building2,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  Wrench,
  Coins,
  Wallet,
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
  iconButtonDangerClass,
  inputClass,
  inputSmClass,
  readOnlyClass,
  selectTriggerClass,
  selectTriggerSmClass,
  textareaClass,
} from "@/components/form-ui";
import { poApprovalStage, poReceiveLabel, poReceiveTone, poStatusTone } from "../po-status";
import { ApprovalStep, ReceiveTrack } from "@/components/purchasing/PoStatusPanels";
type FormData = {
  companies: { id: string; companyName: string; allowPoForWo: boolean }[];
  customers: PoCustomer[];
  employees: { id: string; name: string; email: string; code: string }[];
  workOrders: { workOrderNo: string; jobDescription: string | null; customerId: string | null }[];
  suppliers: { id: string; supplierName: string; contactPersons: any[] }[];
  currencies: { id: string; code: string; name: string; exchangeRate: string | number }[];
  taxes: { id: string; taxType: string; taxRate: string | number }[];
  uoms: { id: string; uomName: string }[];
  materials: { id: string; partNo: string | null; description: string; shape: string; size: string | null }[];
  purchaseRequisitions: { id: string; prNo: string; workOrderNo: string | null; items: any[] }[];
};

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
  hsnCode: string;
  hsnDescription: string;
  taxTypeId: string;
  taxRate: string;
  taxAmount: string;
};

type Meta = {
  poNo?: string;
  revision?: number;
  status?: string;
  receiveStatus?: string;
  // Display only: linked PR number and the approval trail.
  prNo?: string;
  approvalTier?: number | null;
  firstApproverName?: string | null;
  firstApprovedAt?: string | null;
  secondApproverName?: string | null;
  secondApprovedAt?: string | null;
};

export default function PurchaseOrderEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";

  const [data, setData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [meta, setMeta] = useState<Meta>({});

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
  const [amountBeforeTax, setAmountBeforeTax] = useState("0.00");
  const [taxAmount, setTaxAmount] = useState("0.00");
  const [amountAfterTax, setAmountAfterTax] = useState("0.00");
  const [roundOff, setRoundOff] = useState("0.00");
  const [supplierGst, setSupplierGst] = useState("");
  const [millCertificate, setMillCertificate] = useState(false);
  const [certOfConformance, setCertOfConformance] = useState(false);

  const [remark, setRemark] = useState("");
  const [shipTo, setShipTo] = useState<PoShipTo>(emptyPoShipTo);

  // Selecting a work order auto-fills the Consignee | Shipped to with that work order's customer.
  function handleWorkOrderChange(woNo: string) {
    setWorkOrderNo(woNo);
    const customerId = data?.workOrders?.find((w) => w.workOrderNo === woNo)?.customerId;
    if (customerId) setShipTo((prev) => applyPoCustomer(prev, data?.customers, customerId));
  }
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const fd = await fetch("/api/purchasing/purchase-order/form-data").then((r) => r.json());
        setData(fd);

        if (!isNew) {
          const po = await fetch(`/api/purchasing/purchase-order/${id}`).then((r) => r.json());
          if (po.error) throw new Error(po.error);
          setMeta({
            poNo: po.poNo,
            revision: po.revision,
            status: po.status,
            receiveStatus: po.receiveStatus,
            prNo: po.purchaseRequisition?.prNo,
            approvalTier: po.approvalTier,
            firstApproverName: po.firstApproverName,
            firstApprovedAt: po.firstApprovedAt,
            secondApproverName: po.secondApproverName,
            secondApprovedAt: po.secondApprovedAt,
          });
          setReadOnly(po.status !== "Draft" && po.status !== "Rejected");
          setCompanyId(po.companyId);
          setDate(new Date(po.date).toISOString().slice(0, 10));
          setWorkOrderNo(po.workOrderNo || "");
          setPurchaseRequisitionId(po.purchaseRequisitionId || "");
          setSupplierId(po.supplierId || "");
          setContactPersonId(po.contactPersonId || "");
          setSupplierEmail(po.email || "");
          setSupplierTel(po.telNo || "");
          setSupplierFax(po.faxNo || "");
          setSupplierMobile(po.mobileNo || "");
          setPurchaserId(po.purchaserId);
          setCurrencyId(po.currencyId);
          setExchangeRate(Number(po.exchangeRate || 1).toFixed(4));
          setAmountBeforeTax(Number(po.amountBeforeTax || 0).toFixed(2));
          setTaxAmount(Number(po.taxAmount || 0).toFixed(2));
          setAmountAfterTax(Number(po.amountAfterTax || 0).toFixed(2));
          setRoundOff(Number(po.roundOff || 0).toFixed(2));
          setSupplierGst(po.supplierGst || "");
          setMillCertificate(po.millCertificate || false);
          setCertOfConformance(po.certOfConformance || false);
          setRemark(po.remark || "");
          setShipTo(poShipToFromRecord(po));
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
              hsnCode: it.hsnCode || "",
              hsnDescription: it.hsnDescription || "",
              taxTypeId: it.taxTypeId || "",
              taxRate: Number(it.taxRate || 0).toFixed(2),
              taxAmount: Number(it.taxAmount || 0).toFixed(2),
            })),
          );
        } else {
          // Defaults
          if (fd.companies?.length > 0) setCompanyId(fd.companies[0].id);
          if (fd.employees?.length > 0) setPurchaserId(fd.employees[0].id);
          const defCurr = fd.currencies?.find((c: any) => c.isDefault);
          if (defCurr) {
            setCurrencyId(defCurr.id);
            setExchangeRate(Number(defCurr.exchangeRate).toFixed(4));
          }
          // Add default empty item
          setItems([{
            fromMaterialProfile: true,
            materialProfileId: "",
            material: "",
            description: "",
            supplierMaterialNo: "",
            shape: "",
            size: "",
            poUomId: "",
            quantity: "1.00",
            unitPrice: "0.00",
            amount: "0.00",
            conversion: "1.00",
            internalUomId: "",
            internalQuantity: "1.00",
            deliveryDate: new Date().toISOString().slice(0, 10),
            remark: "",
            hsnCode: "",
            hsnDescription: "",
            taxTypeId: "",
            taxRate: "0.00",
            taxAmount: "0.00",
          }]);

          // "Convert to PO" from the PR list: prefill company, work order, consignee and items from the PR.
          const prId = new URLSearchParams(window.location.search).get("prId");
          const pr = prId ? fd.purchaseRequisitions?.find((p: any) => p.id === prId) : null;
          if (pr) {
            if (pr.companyId) setCompanyId(pr.companyId);
            if (pr.workOrderNo) {
              setWorkOrderNo(pr.workOrderNo);
              const customerId = fd.workOrders?.find((w: any) => w.workOrderNo === pr.workOrderNo)?.customerId;
              if (customerId) setShipTo((prev) => applyPoCustomer(prev, fd.customers, customerId));
            }
            handlePrChange(pr.id, fd);
          } else if (prId) {
            setError("The selected Purchase Requisition is not available for conversion (it must be Submitted).");
          }
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const selectedSupplier = useMemo(
    () => data?.suppliers?.find((s) => s.id === supplierId) || null,
    [data, supplierId],
  );

  const contactPersons = useMemo(() => selectedSupplier?.contactPersons || [], [selectedSupplier]);

  useEffect(() => {
    if (!supplierId) {
      setContactPersonId("");
      return;
    }
    if (selectedSupplier && isNew) {
      const def = contactPersons.find(c => c.isDefault) || contactPersons[0];
      if (def) {
        setContactPersonId(def.id);
        setSupplierEmail(def.email || "");
        setSupplierTel(def.telNo || "");
        setSupplierFax(def.faxNo || "");
        setSupplierMobile(def.mobileNo || "");
      } else {
        setContactPersonId("");
        setSupplierEmail("");
        setSupplierTel("");
        setSupplierFax("");
        setSupplierMobile("");
      }
    }
  }, [selectedSupplier, contactPersons, isNew]);

  const handleContactPersonChange = (cid: string) => {
    setContactPersonId(cid);
    const c = contactPersons.find(cp => cp.id === cid);
    if (c) {
      setSupplierEmail(c.email || "");
      setSupplierTel(c.telNo || "");
      setSupplierFax(c.faxNo || "");
      setSupplierMobile(c.mobileNo || "");
    }
  };

  const handleCurrencyChange = (cid: string) => {
    setCurrencyId(cid);
    const curr = data?.currencies?.find(c => c.id === cid);
    if (curr) {
      setExchangeRate(Number(curr.exchangeRate).toFixed(4));
    }
  };

  const handlePrChange = (prId: string, fd: FormData | null = data) => {
    setPurchaseRequisitionId(prId);
    if (prId) {
      const pr = fd?.purchaseRequisitions?.find(p => p.id === prId);
      if (pr) {
        const newItems: Item[] = pr.items.map(it => ({
          fromMaterialProfile: it.fromMaterialProfile,
          materialProfileId: it.materialProfileId || "",
          purchaseRequisitionItemId: it.id,
          material: it.material || "",
          description: it.description || "",
          supplierMaterialNo: "",
          shape: it.shape || "",
          size: it.size || "",
          poUomId: it.uomId || "",
          quantity: Number(it.quantity - (it.cancelQuantity || 0) - (it.poQuantityIssued || 0)).toFixed(2),
          unitPrice: "0.00",
          amount: "0.00",
          conversion: "1.00",
          internalUomId: it.uomId || "",
          internalQuantity: Number(it.quantity - (it.cancelQuantity || 0) - (it.poQuantityIssued || 0)).toFixed(2),
          deliveryDate: new Date().toISOString().slice(0, 10),
          remark: it.remark || "",
          hsnCode: "",
          hsnDescription: "",
          taxTypeId: "",
          taxRate: "0.00",
          taxAmount: "0.00",
        })).filter(it => Number(it.quantity) > 0);
        setItems(newItems);
      }
    }
  };

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((cur) =>
      cur.map((it, i) => {
        if (i !== idx) return it;

        const updated = { ...it, ...patch };

        // Auto-populate from profile
        if (patch.fromMaterialProfile !== undefined) {
          // Toggle profile/freetext
          updated.materialProfileId = "";
          updated.material = "";
          updated.description = "";
          updated.shape = "";
          updated.size = "";
        } else if (updated.fromMaterialProfile && patch.materialProfileId) {
          const profile = data?.materials?.find((m) => m.id === patch.materialProfileId);
          if (profile) {
            updated.material = profile.partNo || "";
            updated.description = profile.description;
            updated.shape = profile.shape;
            updated.size = profile.size || "";
          }
        }

        // Recalculations
        if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
          const q = Number(updated.quantity) || 0;
          const p = Number(updated.unitPrice) || 0;
          updated.amount = (q * p).toFixed(2);
        }

        if (patch.taxTypeId !== undefined) {
          const tax = data?.taxes?.find((t) => t.id === patch.taxTypeId);
          if (tax) {
            updated.taxRate = Number(tax.taxRate).toFixed(2);
          } else {
            updated.taxRate = "0.00";
          }
        }

        const q = Number(updated.quantity) || 0;
        const p = Number(updated.unitPrice) || 0;
        const amt = q * p;
        const tRate = Number(updated.taxRate) || 0;
        updated.taxAmount = (amt * (tRate / 100)).toFixed(2);

        if (patch.quantity !== undefined || patch.conversion !== undefined) {
          const q = Number(updated.quantity) || 0;
          const c = Number(updated.conversion) || 1;
          updated.internalQuantity = (q * c).toFixed(2);
        }

        return updated;
      }),
    );
  }

  useEffect(() => {
    let totalItems = 0;
    let totalTax = 0;
    items.forEach((it) => {
      const amt = Number(it.amount) || 0;
      const tRate = Number(it.taxRate) || 0;
      const tAmt = amt * (tRate / 100);
      totalItems += amt;
      totalTax += tAmt;
    });
    setAmountBeforeTax(totalItems.toFixed(2));
    setTaxAmount(totalTax.toFixed(2));

    let finalTotal = totalItems + totalTax + (Number(roundOff) || 0);
    const currency = data?.currencies?.find((c: any) => c.id === currencyId);
    if ((currency as any)?.roundingMode === "UP") {
      finalTotal = Math.ceil(finalTotal);
    } else if ((currency as any)?.roundingMode === "DOWN") {
      finalTotal = Math.floor(finalTotal);
    }

    setAmountAfterTax(finalTotal.toFixed(2));
  }, [items, roundOff, currencyId, data]);

  function addItem() {
    setItems((cur) => [
      ...cur,
      {
        fromMaterialProfile: true,
        materialProfileId: "",
        material: "",
        description: "",
        supplierMaterialNo: "",
        shape: "",
        size: "",
        poUomId: "",
        quantity: "1.00",
        unitPrice: "0.00",
        amount: "0.00",
        conversion: "1.00",
        internalUomId: "",
        internalQuantity: "1.00",
        deliveryDate: new Date().toISOString().slice(0, 10),
        remark: "",
        hsnCode: "",
        hsnDescription: "",
        taxTypeId: "",
        taxRate: "0.00",
        taxAmount: "0.00",
      },
    ]);
  }

  function removeItem(idx: number) {
    setItems((cur) => cur.filter((_, i) => i !== idx));
  }

  async function onSave() {
    setError("");

    if (!companyId) return setError("Company is required");
    if (!supplierId) {
      return setError("Supplier is required");
    }
    if (!purchaserId) return setError("Purchaser is required");
    if (!currencyId) return setError("Currency is required");
    if (!items.length) return setError("At least one item is required");

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const ln = i + 1;
      if (it.fromMaterialProfile && !it.materialProfileId) {
        return setError(`Line ${ln}: Material Profile is required`);
      }
      if (!it.fromMaterialProfile && !it.description.trim()) {
        return setError(`Line ${ln}: Description is required`);
      }
      if (!it.poUomId) {
        return setError(`Line ${ln}: PO UOM is required`);
      }
    }

    setSaving(true);
    try {
      const payload = {
        ...shipTo,
        companyId,
        supplierId,
        date,
        workOrderNo: workOrderNo || null,
        purchaseRequisitionId: purchaseRequisitionId || null,
        purchaserId,
        contactPersonId: contactPersonId || null,
        email: supplierEmail,
        telNo: supplierTel,
        faxNo: supplierFax,
        mobileNo: supplierMobile,
        currencyId,
        exchangeRate: Number(exchangeRate),
        taxTypeId: null,
        taxRate: 0,
        amountBeforeTax: Number(amountBeforeTax),
        taxAmount: Number(taxAmount),
        amountAfterTax: Number(amountAfterTax),
        roundOff: Number(roundOff),
        supplierGst: supplierGst || null,
        millCertificate,
        certOfConformance,
        remark,
        items: items.map((it, idx) => ({
          id: it.id,
          fromMaterialProfile: it.fromMaterialProfile,
          materialProfileId: it.fromMaterialProfile ? it.materialProfileId : null,
          purchaseRequisitionItemId: it.purchaseRequisitionItemId || null,
          material: it.material || null,
          description: it.description,
          supplierMaterialNo: it.supplierMaterialNo || null,
          shape: it.shape || null,
          size: it.size || null,
          poUomId: it.poUomId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          amount: Number(it.amount),
          conversion: Number(it.conversion),
          internalUomId: it.internalUomId || null,
          internalQuantity: Number(it.internalQuantity),
          deliveryDate: it.deliveryDate,
          remark: it.remark || null,
          hsnCode: it.hsnCode || null,
          hsnDescription: it.hsnDescription || null,
          taxTypeId: it.taxTypeId || null,
          taxRate: Number(it.taxRate) || 0,
          taxAmount: Number(it.taxAmount) || 0,
        })),
      };

      const url = isNew ? `/api/purchasing/purchase-order` : `/api/purchasing/purchase-order/${id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }

      const saved = await res.json();
      router.push(`/dashboard/saved?module=Purchase Order&id=${saved.poNo || saved.id}&viewUrl=/dashboard/purchasing/purchase-order/${saved.id}&backUrl=/dashboard/purchasing/purchase-order`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-12">
        <Loader2 size={20} className="animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500">Loading…</p>
      </div>
    );
  }

  // ---- Display-only derived values (no effect on the payload) ----
  const status = isNew ? "Draft" : meta.status || "Draft";
  const stage = poApprovalStage(isNew ? null : meta);
  const receiveStatus = meta.receiveStatus || "NA";
  const selectedWorkOrder = data?.workOrders?.find((w) => w.workOrderNo === workOrderNo);
  const prNo = data?.purchaseRequisitions?.find((p) => p.id === purchaseRequisitionId)?.prNo || meta.prNo || "";
  const currency = data?.currencies?.find((c) => c.id === currencyId);
  const baseCurrency = data?.currencies?.find((c) => (c as { isDefault?: boolean }).isDefault);
  const showBase = !!currency && !!baseCurrency && baseCurrency.id !== currency.id;
  const totalNum = Number(amountAfterTax) || 0;
  const baseTotal = totalNum * (Number(exchangeRate) || 0);
  const curCode = currency?.code || "";
  const deliveryBy = items
    .map((it) => it.deliveryDate)
    .filter(Boolean)
    .sort()[0];
  const taxRows = (() => {
    const map = new Map<string, { label: string; amount: number }>();
    for (const it of items) {
      const rate = Number(it.taxRate) || 0;
      const amt = (Number(it.amount) || 0) * (rate / 100);
      if (!it.taxTypeId && amt === 0) continue;
      const tax = data?.taxes?.find((t) => t.id === it.taxTypeId);
      const key = it.taxTypeId || `rate:${rate}`;
      const label = tax ? `${tax.taxType} (${Number(tax.taxRate)}%)` : `Tax ${rate}%`;
      const row = map.get(key) ?? { label, amount: 0 };
      row.amount += amt;
      map.set(key, row);
    }
    return [...map.values()];
  })();
  const materialLabel = (it: Item) => {
    if (it.fromMaterialProfile) {
      const m = data?.materials?.find((x) => x.id === it.materialProfileId);
      return m ? `${m.partNo ? `${m.partNo} · ` : ""}${m.description}` : "";
    }
    return [it.material, it.description].filter((s) => s && s.trim()).join(" · ");
  };

  return (
    <div className="w-full space-y-4">
      {/* Document header / action bar */}
      <div className="sticky top-0 z-20 -mx-1 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-md">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-500 to-violet-500" />
        <div className="flex flex-col gap-2.5 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <Link href="/dashboard/purchasing/purchase-order" className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600">
              <ArrowLeft size={12} /> Purchase Orders
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {isNew || !meta.poNo ? (
                <h1 className="text-lg font-semibold leading-tight text-slate-900">
                  {isNew ? "New Purchase Order" : "Edit Purchase Order"}
                </h1>
              ) : (
                <h1 className="flex min-w-0 items-baseline gap-2 leading-tight">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">PO</span>
                  <span className="truncate font-mono text-lg font-semibold text-slate-900">{meta.poNo}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-px font-mono text-[11px] font-medium text-slate-500">
                    R{meta.revision}
                  </span>
                </h1>
              )}
              <StatusBadge status={status} tone={poStatusTone(status)} size="md" label={isNew ? "New · Draft" : status} />
              <Badge tone={stage.tone} icon={ShieldCheck} size="md">
                {stage.label}
              </Badge>
              {!isNew && (
                <Badge tone={poReceiveTone(receiveStatus)} icon={PackageCheck} size="md">
                  {poReceiveLabel(receiveStatus)}
                </Badge>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <MetaChip icon={Building2} title="Supplier">{selectedSupplier?.supplierName || "No supplier yet"}</MetaChip>
              <MetaChip icon={CalendarDays} label="PO" title="PO date">{fmtDate(date)}</MetaChip>
              {deliveryBy && (
                <MetaChip icon={CalendarClock} label="Delivery" title="Earliest line delivery date">{fmtDate(deliveryBy)}</MetaChip>
              )}
              <MetaChip icon={ClipboardList} label="PR" title="Purchase requisition">{prNo || "Independent"}</MetaChip>
              <MetaChip icon={Wrench} label="WO" title={selectedWorkOrder?.jobDescription || "Work order"}>
                {workOrderNo || "Non Work Order"}
              </MetaChip>
              {currency && (
                <MetaChip icon={Coins} title="Currency and exchange rate">
                  {currency.code} @ {exchangeRate}
                </MetaChip>
              )}
              <MetaChip icon={Wallet} label="Total" title="Amount after tax">
                <span className="tabular-nums">{curCode} {fmtMoney(totalNum)}</span>
              </MetaChip>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => router.push("/dashboard/purchasing/purchase-order")} className={buttonClass("ghost", "md")}>
              Back
            </button>
            {readOnly && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
                <Lock size={13} /> View only
              </span>
            )}
            <button type="button" onClick={onSave} disabled={saving || readOnly} className={buttonClass("primary", "md")}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
      {readOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
          <Lock size={14} className="shrink-0 text-slate-400" />
          <span>
            This purchase order is <strong className="font-semibold text-slate-800">{meta.status}</strong> — read-only.
          </span>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          {/* Order details */}
          <Card icon={FileText} tone="indigo" title="Order details" description="Company, purchaser, source PR, work order and currency">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Company" required className="sm:col-span-2">
                <SearchableSelect
                  value={companyId}
                  disabled={readOnly || !isNew}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className={selectTriggerClass}
                >
                  <option value="">— Select —</option>
                  {data?.companies?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </SearchableSelect>
              </Field>

              <Field label="PO Date" required>
                <input
                  type="date"
                  value={date}
                  disabled={readOnly}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Purchaser" required>
                <SearchableSelect
                  value={purchaserId}
                  disabled={readOnly}
                  onChange={(e) => setPurchaserId(e.target.value)}
                  className={selectTriggerClass}
                >
                  <option value="">— Select —</option>
                  {data?.employees?.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.code})
                    </option>
                  ))}
                </SearchableSelect>
              </Field>

              <Field label="PR No">
                <SearchableSelect
                  value={purchaseRequisitionId}
                  disabled={readOnly || !isNew}
                  onChange={(e) => handlePrChange(e.target.value)}
                  className={selectTriggerClass}
                >
                  <option value="">— Independent PO —</option>
                  {data?.purchaseRequisitions
                    ?.filter(pr => !workOrderNo || pr.workOrderNo === workOrderNo)
                    .map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.prNo}
                      </option>
                    ))}
                </SearchableSelect>
              </Field>

              <Field label="Work Order">
                <SearchableSelect
                  value={workOrderNo}
                  disabled={readOnly}
                  onChange={(e) => handleWorkOrderChange(e.target.value)}
                  className={selectTriggerClass}
                >
                  <option value="">— None (Non Work Order) —</option>
                  {data?.workOrders?.map((w) => (
                    <option key={w.workOrderNo} value={w.workOrderNo}>
                      {w.workOrderNo} - {w.jobDescription?.substring(0,20)}...
                    </option>
                  ))}
                </SearchableSelect>
              </Field>

              <Field label="Currency" required>
                <SearchableSelect
                  value={currencyId}
                  disabled={readOnly}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className={selectTriggerClass}
                >
                  <option value="">— Select —</option>
                  {data?.currencies?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}
                    </option>
                  ))}
                </SearchableSelect>
              </Field>

              <Field label="Exchange Rate" required help="Latest rate from the currency profile">
                <input
                  type="number"
                  step="0.0001"
                  value={exchangeRate}
                  disabled={true}
                  readOnly
                  className={`${readOnlyClass} text-right tabular-nums`}
                />
              </Field>
            </div>
          </Card>

          {/* Supplier + Consignee side by side */}
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <Card icon={Truck} tone="sky" title="Supplier" description="Contact details are taken from the supplier's contact person" className="h-full">
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <Field label="Supplier" required className="sm:col-span-2">
                  <SearchableSelect
                    value={supplierId}
                    disabled={readOnly || !isNew}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className={selectTriggerClass}
                  >
                    <option value="">— Select —</option>
                    {data?.suppliers?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.supplierName}
                      </option>
                    ))}
                  </SearchableSelect>
                </Field>

                <Field label="Supplier Contact Person">
                  <SearchableSelect
                    value={contactPersonId}
                    disabled={readOnly || !supplierId}
                    onChange={(e) => handleContactPersonChange(e.target.value)}
                    className={selectTriggerClass}
                  >
                    <option value="">— Select —</option>
                    {contactPersons.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.contactPersonName}
                      </option>
                    ))}
                  </SearchableSelect>
                </Field>

                <Field label="Supplier GST">
                  <input
                    type="text"
                    value={supplierGst}
                    disabled={readOnly}
                    onChange={(e) => setSupplierGst(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                </Field>

                <Field label="Supplier Email">
                  <input
                    type="email"
                    value={supplierEmail}
                    disabled={readOnly}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Supplier Tel No">
                  <input
                    type="text"
                    value={supplierTel}
                    disabled={readOnly}
                    onChange={(e) => setSupplierTel(e.target.value)}
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>

                <Field label="Supplier Fax No">
                  <input
                    type="text"
                    value={supplierFax}
                    disabled={readOnly}
                    onChange={(e) => setSupplierFax(e.target.value)}
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>

                <Field label="Supplier Mobile No">
                  <input
                    type="text"
                    value={supplierMobile}
                    disabled={readOnly}
                    onChange={(e) => setSupplierMobile(e.target.value)}
                    className={`${inputClass} tabular-nums`}
                  />
                </Field>
              </div>
            </Card>

            <PoBillShipTo
              customers={data?.customers}
              value={shipTo}
              onChange={setShipTo}
              readOnly={readOnly}
            />
          </div>

          {/* Items */}
          <Card
            icon={Package}
            tone="amber"
            title={
              <span className="inline-flex items-center gap-1.5">
                Purchase Order Items
                {items.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-1.5 text-[11px] font-semibold tabular-nums text-amber-700 ring-1 ring-inset ring-amber-600/15">
                    {items.length}
                  </span>
                )}
              </span>
            }
            description="Quantity, price, tax and internal conversion per line"
            actions={
              !readOnly && items.length > 0 ? (
                <button type="button" onClick={addItem} className={buttonClass("link", "sm")}>
                  <Plus size={14} /> Add Item
                </button>
              ) : undefined
            }
            bodyClassName={items.length === 0 ? "p-4" : "p-0"}
          >
            {items.length === 0 ? (
              <EmptyState
                boxed
                icon={Package}
                tone="amber"
                title="No items yet"
                description="Add the materials to buy, pick one from the Material Profile or describe it in free text. Choosing a PR fills the lines for you."
                action={
                  !readOnly && (
                    <button type="button" onClick={addItem} className={buttonClass("primary", "md")}>
                      <Plus size={14} /> Add first item
                    </button>
                  )
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1244px] table-fixed text-left text-[13px]">
                  <colgroup>
                    <col className="w-8" />
                    <col />
                    <col className="w-44" />
                    <col className="w-32" />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-28" />
                    <col className="w-32" />
                    <col className="w-32" />
                    {!readOnly && <col className="w-9" />}
                  </colgroup>
                  <thead className="border-b border-slate-100 bg-slate-50/70 align-bottom text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pl-3 pr-1 font-medium">#</th>
                      <th className="px-1.5 py-2 font-medium">Type · Material / Description</th>
                      <th className="px-1.5 py-2 font-medium">
                        <span className="flex items-end gap-1">
                          <span className="min-w-0 flex-1">HSN<span className="block normal-case text-slate-400">Supplier PN</span></span>
                          <span className="w-16 shrink-0 text-right">Int Qty<span className="block normal-case text-transparent" aria-hidden>.</span></span>
                        </span>
                      </th>
                      <th className="px-1.5 py-2 text-right font-medium">Conv · Int UOM</th>
                      <th className="px-1.5 py-2 font-medium">Shape<span className="block normal-case text-slate-400">Size</span></th>
                      <th className="px-1.5 py-2 text-right font-medium">Qty<span className="block normal-case text-slate-400">PO UOM</span></th>
                      <th className="px-1.5 py-2 text-right font-medium">Unit Price<span className="block normal-case text-slate-400">Amount</span></th>
                      <th className="px-1.5 py-2 text-right font-medium">Tax<span className="block normal-case text-slate-400">Tax amount</span></th>
                      <th className="px-1.5 py-2 font-medium">Delivery Date<span className="block normal-case text-slate-400">Remark</span></th>
                      {!readOnly && <th className="px-1.5 py-2"><span className="sr-only">Remove</span></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => {
                      const label = materialLabel(it);
                      const fromPr = !!it.purchaseRequisitionItemId;
                      return (
                        <tr key={idx} className="align-top transition-colors hover:bg-slate-50/60 focus-within:bg-indigo-50/30">
                          <td className="py-2 pl-3 pr-1">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-semibold tabular-nums text-white">
                              {idx + 1}
                            </span>
                          </td>

                          <td className="px-1.5 py-1.5">
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1">
                                <div className="w-24 shrink-0">
                                  <SearchableSelect compact
                                    value={it.fromMaterialProfile ? "Profile" : "Free"}
                                    disabled={readOnly || !!it.purchaseRequisitionItemId}
                                    onChange={(e) => updateItem(idx, { fromMaterialProfile: e.target.value === "Profile" })}
                                    className={selectTriggerSmClass}
                                  >
                                    <option value="Profile">Profile</option>
                                    <option value="Free">FreeText</option>
                                  </SearchableSelect>
                                </div>
                                <div className="min-w-0 flex-1">
                                  {it.fromMaterialProfile ? (
                                    <SearchableSelect compact
                                      value={it.materialProfileId}
                                      disabled={readOnly || !!it.purchaseRequisitionItemId}
                                      onChange={(e) => updateItem(idx, { materialProfileId: e.target.value })}
                                      className={selectTriggerSmClass}
                                    >
                                      <option value="">— Select —</option>
                                      {data?.materials?.map((m) => (
                                        <option key={m.id} value={m.id}>
                                          {m.partNo ? `${m.partNo} — ` : ""}{m.description.slice(0, 30)}
                                        </option>
                                      ))}
                                    </SearchableSelect>
                                  ) : (
                                    <textarea
                                      rows={1}
                                      value={it.material}
                                      disabled={readOnly || !!it.purchaseRequisitionItemId}
                                      onChange={(e) => updateItem(idx, { material: e.target.value.replace(/\n/g, " ") })}
                                      onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                                      className={lineTextareaClass}
                                      placeholder="e.g. PART-A"
                                    />
                                  )}
                                </div>
                              </div>
                              <textarea
                                rows={1}
                                value={it.description}
                                disabled={readOnly || !!it.purchaseRequisitionItemId}
                                onChange={(e) => updateItem(idx, { description: e.target.value })}
                                className={lineTextareaClass}
                                placeholder="Material description"
                                title={label || undefined}
                              />
                              {fromPr && (
                                <span className="inline-flex w-fit items-center gap-1 text-[10px] font-medium text-sky-700">
                                  <ClipboardList size={10} /> From PR{prNo ? ` ${prNo}` : ""}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-1.5 py-1.5">
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={it.hsnCode}
                                  disabled={readOnly}
                                  onChange={(e) => updateItem(idx, { hsnCode: e.target.value })}
                                  className={`${inputSmClass} min-w-0 font-mono`}
                                  placeholder="HSN Code"
                                />
                                <div
                                  className="flex h-7 w-16 shrink-0 items-center justify-end rounded-md bg-slate-50 px-2 text-right tabular-nums text-slate-700 ring-1 ring-inset ring-slate-200"
                                  title="Internal quantity (Qty × Conversion)"
                                >
                                  {it.internalQuantity}
                                </div>
                              </div>
                              <input
                                type="text"
                                value={it.supplierMaterialNo}
                                disabled={readOnly}
                                onChange={(e) => updateItem(idx, { supplierMaterialNo: e.target.value })}
                                className={inputSmClass}
                                placeholder="Supplier PN"
                                title={it.supplierMaterialNo}
                              />
                            </div>
                          </td>

                          <td className="px-1.5 py-1.5">
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  step="0.0001"
                                  min="0"
                                  value={it.conversion}
                                  disabled={readOnly}
                                  onChange={(e) => updateItem(idx, { conversion: e.target.value })}
                                  className={`${inputSmClass} min-w-0 text-right tabular-nums`}
                                  placeholder="Conv"
                                  title="Conversion"
                                />
                                <div className="w-14 shrink-0">
                                  <SearchableSelect compact
                                    value={it.internalUomId}
                                    disabled={readOnly || !!it.purchaseRequisitionItemId}
                                    onChange={(e) => updateItem(idx, { internalUomId: e.target.value })}
                                    className={selectTriggerSmClass}
                                  >
                                    <option value="">—</option>
                                    {data?.uoms?.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.uomName}
                                      </option>
                                    ))}
                                  </SearchableSelect>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-1.5 py-1.5">
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={it.shape}
                                disabled={readOnly || !!it.purchaseRequisitionItemId}
                                onChange={(e) => updateItem(idx, { shape: e.target.value })}
                                className={inputSmClass}
                                placeholder="Shape"
                              />
                              <input
                                type="text"
                                value={it.size}
                                disabled={readOnly || !!it.purchaseRequisitionItemId}
                                onChange={(e) => updateItem(idx, { size: e.target.value })}
                                className={inputSmClass}
                                placeholder="Size"
                              />
                            </div>
                          </td>

                          <td className="px-1.5 py-1.5">
                            <div className="flex flex-col gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.quantity}
                                disabled={readOnly}
                                onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                                className={`${inputSmClass} text-right tabular-nums`}
                                placeholder="Qty"
                              />
                              <SearchableSelect compact
                                value={it.poUomId}
                                disabled={readOnly}
                                onChange={(e) => updateItem(idx, { poUomId: e.target.value })}
                                className={selectTriggerSmClass}
                              >
                                <option value="">—</option>
                                {data?.uoms?.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.uomName}
                                  </option>
                                ))}
                              </SearchableSelect>
                            </div>
                          </td>

                          <td className="px-1.5 py-1.5">
                            <div className="flex flex-col gap-1">
                              <input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={it.unitPrice}
                                disabled={readOnly}
                                onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                                className={`${inputSmClass} text-right tabular-nums`}
                                placeholder="Unit Price"
                              />
                              <div className="flex h-7 items-center justify-end px-2 text-right font-semibold tabular-nums text-slate-900">
                                {it.amount}
                              </div>
                            </div>
                          </td>

                          <td className="px-1.5 py-1.5">
                            <div className="flex flex-col gap-1">
                              <SearchableSelect compact
                                value={it.taxTypeId}
                                disabled={readOnly}
                                onChange={(e) => updateItem(idx, { taxTypeId: e.target.value })}
                                className={selectTriggerSmClass}
                              >
                                <option value="">— Select Tax —</option>
                                {data?.taxes?.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.taxType} ({t.taxRate}%)
                                  </option>
                                ))}
                              </SearchableSelect>
                              <div className={`flex h-7 items-center justify-end px-2 text-right tabular-nums ${Number(it.taxAmount) > 0 ? "text-slate-700" : "text-slate-300"}`}>
                                {it.taxAmount}
                              </div>
                            </div>
                          </td>

                          <td className="px-1.5 py-1.5">
                            <div className="flex flex-col gap-1">
                              <input
                                type="date"
                                value={it.deliveryDate}
                                disabled={readOnly}
                                onChange={(e) => updateItem(idx, { deliveryDate: e.target.value })}
                                className={`${inputSmClass} px-1`}
                              />
                              <textarea
                                rows={1}
                                value={it.remark}
                                disabled={readOnly}
                                onChange={(e) => updateItem(idx, { remark: e.target.value })}
                                className={lineRemarkClass}
                                placeholder="Remark"
                              />
                            </div>
                          </td>

                          {!readOnly && (
                            <td className="px-0.5 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className={iconButtonDangerClass}
                                title="Remove"
                                aria-label={`Remove line ${idx + 1}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50/70 text-[13px]">
                    <tr>
                      <td colSpan={5} className="py-2 pl-3 pr-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {items.length} line{items.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-3.5 py-2 text-right font-semibold tabular-nums text-slate-900">{amountBeforeTax}</td>
                      <td className="px-3.5 py-2 text-right font-medium tabular-nums text-slate-700">{taxAmount}</td>
                      <td colSpan={readOnly ? 2 : 3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {/* Quality controls and remarks */}
          <Card icon={StickyNote} tone="violet" title="Certificates & remarks" description="Documents required from the supplier, and special instructions">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors ${millCertificate ? "border-violet-200 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                  <input
                    type="checkbox"
                    checked={millCertificate}
                    onChange={(e) => setMillCertificate(e.target.checked)}
                    disabled={readOnly}
                    className={checkboxClass}
                  />
                  Mill Certificate
                </label>
                <label className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors ${certOfConformance ? "border-violet-200 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                  <input
                    type="checkbox"
                    checked={certOfConformance}
                    onChange={(e) => setCertOfConformance(e.target.checked)}
                    disabled={readOnly}
                    className={checkboxClass}
                  />
                  Cert. of Conformance
                </label>
              </div>
              <Field label="Remark / Special Instructions">
                <textarea
                  rows={3}
                  value={remark}
                  disabled={readOnly}
                  onChange={(e) => setRemark(e.target.value)}
                  className={textareaClass}
                  placeholder="Input any additional details for this purchase order..."
                />
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
            description={stage.tiers === 2 ? "Two-tier, value banded" : stage.tiers === 1 ? "Single tier" : "Decided on submit"}
            actions={<Badge tone={stage.tone}>{stage.label}</Badge>}
          >
            {stage.tiers === null ? (
              <div className="space-y-2 text-xs text-slate-600">
                <ApprovalStep n={1} title="Tier 1 approval" state="none" />
                <ApprovalStep n={2} title="Tier 2 approval" state="none" last />
                <p className="pt-1 text-[11px] text-slate-500">
                  On submit, the Amount After Tax in base currency (× exchange rate) picks the band in the Approval Level Profile: one Tier 1 approver, or Tier 1 then Tier 2.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <ApprovalStep
                  n={1}
                  title="Tier 1 approval"
                  state={stage.tier1}
                  who={meta.firstApproverName}
                  when={meta.firstApprovedAt}
                  last={stage.tiers === 1}
                />
                {stage.tiers === 2 ? (
                  <ApprovalStep n={2} title="Tier 2 approval" state={stage.tier2} who={meta.secondApproverName} when={meta.secondApprovedAt} last />
                ) : (
                  <p className="pl-8 text-[11px] text-slate-400">Tier 2 not required for this amount.</p>
                )}
              </div>
            )}
          </Card>

          {/* Summary — dark anchor echoing the sidebar */}
          <section className="overflow-hidden rounded-xl bg-[#111827] text-slate-300 shadow-lg shadow-slate-900/10 ring-1 ring-white/5">
            <header className="flex items-center gap-2.5 border-b border-white/10 px-4 py-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/20">
                <Receipt size={15} />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold leading-tight text-white">Summary</h2>
                <p className="text-[11px] leading-tight text-slate-400">Live totals for this purchase order</p>
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
              {taxRows.map((t) => (
                <div key={t.label} className="flex items-center justify-between gap-3">
                  <dt className="truncate text-slate-400">{t.label}</dt>
                  <dd className="tabular-nums text-slate-200">{t.amount.toFixed(2)}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2">
                <dt className="text-slate-400">Tax Amount</dt>
                <dd className="tabular-nums text-slate-200">{taxAmount}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">
                  <label htmlFor="po-round-off">Round Off</label>
                </dt>
                <dd>
                  <input
                    id="po-round-off"
                    type="number"
                    step="0.01"
                    value={roundOff}
                    disabled={readOnly}
                    onChange={(e) => setRoundOff(e.target.value)}
                    className="h-7 w-24 rounded-md border border-white/15 bg-white/5 px-2 text-right text-[13px] tabular-nums text-white transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </dd>
              </div>
            </dl>
            <div className="relative border-t border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-gradient-to-b from-indigo-400 to-violet-500" />
              <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-300">Amount After Tax</p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                {curCode && <span className="text-xs font-medium text-indigo-300">{curCode}</span>}
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">{amountAfterTax}</span>
              </p>
              {showBase && (
                <p className="mt-1 text-[11px] tabular-nums text-slate-400">
                  ≈ {baseCurrency?.code} {fmtMoney(baseTotal)} <span className="text-slate-500">at {exchangeRate}</span>
                </p>
              )}
            </div>
          </section>

          {/* Receiving */}
          {!isNew && (
            <Card
              icon={PackageCheck}
              tone={poReceiveTone(receiveStatus)}
              title="Receiving"
              description="Updated when Goods Receives and Returns are submitted"
              actions={<Badge tone={poReceiveTone(receiveStatus)} dot>{poReceiveLabel(receiveStatus)}</Badge>}
            >
              <ReceiveTrack status={receiveStatus} />
            </Card>
          )}
        </div>
      </div>
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

const fmtMoney = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const lineTextareaClass =
  "block min-h-7 w-full resize-none break-words rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] leading-snug text-slate-900 placeholder:text-slate-400 transition-colors field-sizing-content focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const lineRemarkClass =
  "block min-h-7 w-full resize-y break-words rounded-md border border-slate-300 bg-white px-2 py-1 text-xs leading-snug text-slate-900 placeholder:text-slate-400 transition-colors field-sizing-content focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
