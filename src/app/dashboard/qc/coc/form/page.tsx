"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { customConfirm } from "@/lib/customConfirm";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, AlertCircle, Send, CheckCircle, Printer } from "lucide-react";
export default function CertificateOfConformityFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  
  // Dummy user for approval flow demonstration
  const dummyUserId = "user-sy"; 

  const [formData, setFormData] = useState<any>({
    date: new Date().toISOString().split("T")[0],
    type: "",
    customerId: "",
    deliveryOrderId: "",
    workOrderNo: "",
    drawingNo: "",
    cocQuantity: 0,
    cocUomId: "",
    // Welding
    sanNo: "",
    welderId: "",
    weldingProcess: "",
    weldingMachineId: "",
    // Spray Painting
    partName: "",
    partNumber: "",
    paintingSanNo: "",
    painterId: "",
    paintingMethodId: "",
    paintingSpecification: "",
    paintThicknessSpecification: "",
    measuredTotalPaintThickness: "",
    paintBatchNo: "",
    inspectionEquipment: "",
  });

  const [metadata, setMetadata] = useState<any>({
    employees: [],
    machines: [],
    uoms: [],
    paintingMethods: [],
    customers: [],
  });
  
  const [customerDOs, setCustomerDOs] = useState<any[]>([]);

  const [errorMsg, setErrorMsg] = useState("");
  const [status, setStatus] = useState("Draft");
  const [cocNo, setCocNo] = useState("");
  
  useEffect(() => {
    fetchMetadata();
    if (isEdit) {
      fetchCoc();
    }
  }, [id]);

  useEffect(() => {
    if (formData.customerId && (!isEdit || isEdit)) {
       fetchCustomerDOs(formData.customerId);
    } else {
       setCustomerDOs([]);
    }
  }, [formData.customerId]);

  const fetchMetadata = async () => {
    try {
      const res = await fetch("/api/qc/coc/form-data");
      if (res.ok) {
        const data = await res.json();
        setMetadata(data);
      }
    } catch (err) {
      console.error("Failed to fetch metadata");
    }
  };

  const fetchCustomerDOs = async (customerId: string) => {
    try {
      const res = await fetch(`/api/sales/delivery-order/customer/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerDOs(data);
      }
    } catch (err) {
      console.error("Failed to fetch DOs");
    }
  };

  const fetchCoc = async () => {
    try {
      const res = await fetch(`/api/qc/coc/${id}`);
      if (!res.ok) throw new Error("Failed to fetch COC details");
      const data = await res.json();
      setFormData({
        ...data,
        date: new Date(data.date).toISOString().split("T")[0],
        sanNo: data.sanNo || "",
        welderId: data.welderId || "",
        weldingProcess: data.weldingProcess || "",
        weldingMachineId: data.weldingMachineId || "",
        partName: data.partName || "",
        partNumber: data.partNumber || "",
        paintingSanNo: data.paintingSanNo || "",
        painterId: data.painterId || "",
        paintingMethodId: data.paintingMethodId || "",
        paintingSpecification: data.paintingSpecification || "",
        paintThicknessSpecification: data.paintThicknessSpecification || "",
        measuredTotalPaintThickness: data.measuredTotalPaintThickness || "",
        paintBatchNo: data.paintBatchNo || "",
        inspectionEquipment: data.inspectionEquipment || "",
        drawingNo: data.drawingNo || "",
      });
      setStatus(data.status);
      setCocNo(data.cocNo);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.type || !formData.customerId || !formData.deliveryOrderId || !formData.workOrderNo || !formData.cocQuantity || !formData.cocUomId) {
      setErrorMsg("Please fill in all mandatory general information (Type, Customer, DO, Work Order, Qty, UOM).");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const url = isEdit ? `/api/qc/coc/${id}` : "/api/qc/coc";
      const method = isEdit ? "PUT" : "POST";
      
      const payload = { ...formData };
      
      // Clean up fields based on type before saving
      if (formData.type !== "Welding") {
         payload.sanNo = null;
         payload.welderId = null;
         payload.weldingProcess = null;
         payload.weldingMachineId = null;
      }
      if (formData.type !== "Spray Painting") {
         payload.partName = null;
         payload.partNumber = null;
         payload.paintingSanNo = null;
         payload.painterId = null;
         payload.paintingMethodId = null;
         payload.paintingSpecification = null;
         payload.paintThicknessSpecification = null;
         payload.measuredTotalPaintThickness = null;
         payload.paintBatchNo = null;
         payload.inspectionEquipment = null;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to save COC");
      
      router.push(`/dashboard/saved?module=Certificate Of Conformity&id=${resData.cocNo || resData.id || ''}&viewUrl=/dashboard/qc/coc/form?id=${resData.id}&backUrl=/dashboard/qc/coc`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!await customConfirm("Are you sure you want to mark this COC as checked and request approval?")) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/qc/coc/${id}/check`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: dummyUserId }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to check");
      fetchCoc(); // Refresh
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!await customConfirm("Are you sure you want to approve this COC?")) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/qc/coc/${id}/approve`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: dummyUserId }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to approve");
      fetchCoc(); // Refresh
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isDraft = status === "Draft";
  const isRequireApproval = status === "Require Approval";
  
  const selectedDO = customerDOs.find(d => d.id === formData.deliveryOrderId);
  const doWorkOrders = selectedDO ? selectedDO.items.map((i: any) => i.workOrder) : [];

  return (
    <div className="py-3 space-y-4 pb-24 w-full">
      <div className="flex items-center justify-between pb-6 border-b border-blue-200">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/qc/coc" className="p-2 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-blue-900">{isEdit ? "Certificate Of Conformity Details" : "New Certificate Of Conformity"}</h1>
            <p className="text-sm text-blue-500">
              {isEdit ? `COC No: ${cocNo} | Status: ${status}` : "Create a new COC for a Delivery Order"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {isEdit && isDraft && (
             <button
               onClick={handleCheck}
               disabled={loading}
               className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg font-semibold transition-colors disabled:opacity-50"
             >
               <Send size={16} /> Submit for Approval
             </button>
           )}
           {isEdit && isRequireApproval && (
             <button
               onClick={handleApprove}
               disabled={loading}
               className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg font-semibold transition-colors disabled:opacity-50"
             >
               <CheckCircle size={16} /> Approve COC
             </button>
           )}
           {isEdit && (formData.type === "Pressure" || formData.type === "Final") && (
             <a
               href={`/print/coc/${id}`}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-semibold transition-colors"
             >
               <Printer size={16} /> Print
             </a>
           )}
           {isDraft && (
             <button
               onClick={handleSave}
               disabled={loading}
               className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50"
             >
               {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
               Save
             </button>
           )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* General Information */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 space-y-4">
          <h3 className="text-lg font-bold text-blue-900 border-b border-blue-100 pb-2">General Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-blue-900">Type <span className="text-rose-500">*</span></label>
              <SearchableSelect
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={!isDraft}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                <option value="">Select Type...</option>
                <option value="Final">Final</option>
                <option value="Pressure">Pressure</option>
                <option value="Spray Painting">Spray Painting</option>
                <option value="Welding">Welding</option>
              </SearchableSelect>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-semibold text-blue-900">Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                disabled={!isDraft}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Customer <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value, deliveryOrderId: "", workOrderNo: "" })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Customer...</option>
              {metadata.customers.map((c: any) => (
                <option key={c.id} value={c.id}>{c.customerName}</option>
              ))}
            </SearchableSelect>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Delivery Order <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.deliveryOrderId}
              onChange={(e) => setFormData({ ...formData, deliveryOrderId: e.target.value, workOrderNo: "" })}
              disabled={!isDraft || !formData.customerId}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Delivery Order...</option>
              {isEdit && formData.deliveryOrder ? (
                 <option value={formData.deliveryOrderId}>{formData.deliveryOrder.doNo}</option>
              ) : (
                customerDOs.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.doNo}</option>
                ))
              )}
            </SearchableSelect>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Work Order <span className="text-rose-500">*</span></label>
            <SearchableSelect
              value={formData.workOrderNo}
              onChange={(e) => {
                const picked = doWorkOrders.find((w: any) => w?.workOrderNo === e.target.value);
                setFormData({
                  ...formData,
                  workOrderNo: e.target.value,
                  partName: formData.partName || picked?.partName || "",
                });
              }}
              disabled={!isDraft || !formData.deliveryOrderId}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">Select Work Order...</option>
              {isEdit && formData.workOrder ? (
                <option value={formData.workOrderNo}>{formData.workOrderNo}</option>
              ) : (
                doWorkOrders.map((wo: any) => (
                  <option key={wo.workOrderNo} value={wo.workOrderNo}>{wo.workOrderNo}</option>
                ))
              )}
            </SearchableSelect>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-blue-900">COC Quantity <span className="text-rose-500">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.cocQuantity}
                onChange={(e) => setFormData({ ...formData, cocQuantity: e.target.value })}
                disabled={!isDraft}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-semibold text-blue-900">COC UOM <span className="text-rose-500">*</span></label>
              <SearchableSelect
                value={formData.cocUomId}
                onChange={(e) => setFormData({ ...formData, cocUomId: e.target.value })}
                disabled={!isDraft}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                <option value="">Select UOM...</option>
                {metadata.uoms.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.uomName}</option>
                ))}
              </SearchableSelect>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-blue-900">Drawing No</label>
            <input
              type="text"
              value={formData.drawingNo}
              onChange={(e) => setFormData({ ...formData, drawingNo: e.target.value })}
              disabled={!isDraft}
              className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>

        </div>

        {/* Specific Fields depending on COC Type */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 space-y-4">
          <h3 className="text-lg font-bold text-blue-900 border-b border-blue-100 pb-2">Specification Details</h3>
          
          {formData.type === "Welding" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-blue-900">SAN No</label>
                <input
                  type="text"
                  value={formData.sanNo}
                  onChange={(e) => setFormData({ ...formData, sanNo: e.target.value })}
                  disabled={!isDraft}
                  className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-blue-900">Welder <span className="text-rose-500">*</span></label>
                <SearchableSelect
                  value={formData.welderId}
                  onChange={(e) => setFormData({ ...formData, welderId: e.target.value })}
                  disabled={!isDraft}
                  className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  <option value="">Select Welder...</option>
                  {metadata.employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                  ))}
                </SearchableSelect>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-blue-900">Welding Process <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.weldingProcess}
                  onChange={(e) => setFormData({ ...formData, weldingProcess: e.target.value })}
                  disabled={!isDraft}
                  className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-blue-900">Welding Machine</label>
                <SearchableSelect
                  value={formData.weldingMachineId}
                  onChange={(e) => setFormData({ ...formData, weldingMachineId: e.target.value })}
                  disabled={!isDraft}
                  className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  <option value="">Select Machine...</option>
                  {metadata.machines.filter((m: any) => m.machineCategory === "Welding Machine").map((m: any) => (
                    <option key={m.id} value={m.id}>{m.machineNo} - {m.brand}</option>
                  ))}
                </SearchableSelect>
              </div>
            </div>
          )}

          {formData.type === "Spray Painting" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-blue-900">Part Name</label>
                  <input
                    type="text"
                    value={formData.partName}
                    onChange={(e) => setFormData({ ...formData, partName: e.target.value })}
                    disabled={!isDraft}
                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-blue-900">Part Number</label>
                  <input
                    type="text"
                    value={formData.partNumber}
                    onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                    disabled={!isDraft}
                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-semibold text-blue-900">SAN No</label>
                <input
                  type="text"
                  value={formData.paintingSanNo}
                  onChange={(e) => setFormData({ ...formData, paintingSanNo: e.target.value })}
                  disabled={!isDraft}
                  className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-blue-900">Painter <span className="text-rose-500">*</span></label>
                <SearchableSelect
                  value={formData.painterId}
                  onChange={(e) => setFormData({ ...formData, painterId: e.target.value })}
                  disabled={!isDraft}
                  className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  <option value="">Select Painter...</option>
                  {metadata.employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                  ))}
                </SearchableSelect>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-blue-900">Painting Method <span className="text-rose-500">*</span></label>
                <SearchableSelect
                  value={formData.paintingMethodId}
                  onChange={(e) => setFormData({ ...formData, paintingMethodId: e.target.value })}
                  disabled={!isDraft}
                  className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  <option value="">Select Method...</option>
                  {metadata.paintingMethods.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.method}</option>
                  ))}
                </SearchableSelect>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-blue-900">Painting Specification</label>
                <input
                  type="text"
                  value={formData.paintingSpecification}
                  onChange={(e) => setFormData({ ...formData, paintingSpecification: e.target.value })}
                  disabled={!isDraft}
                  className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-blue-900">Thickness Spec (µm)</label>
                  <input
                    type="text"
                    value={formData.paintThicknessSpecification}
                    onChange={(e) => setFormData({ ...formData, paintThicknessSpecification: e.target.value })}
                    disabled={!isDraft}
                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-blue-900">Measured Total (µm)</label>
                  <input
                    type="text"
                    value={formData.measuredTotalPaintThickness}
                    onChange={(e) => setFormData({ ...formData, measuredTotalPaintThickness: e.target.value })}
                    disabled={!isDraft}
                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-blue-900">Paint Batch No</label>
                  <input
                    type="text"
                    value={formData.paintBatchNo}
                    onChange={(e) => setFormData({ ...formData, paintBatchNo: e.target.value })}
                    disabled={!isDraft}
                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-blue-900">Inspection Eqp</label>
                  <input
                    type="text"
                    value={formData.inspectionEquipment}
                    onChange={(e) => setFormData({ ...formData, inspectionEquipment: e.target.value })}
                    disabled={!isDraft}
                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          )}

          {(formData.type === "Final" || formData.type === "Pressure") && (
            <div className="py-8 text-center text-blue-500">
              <p>No extra specifications required for {formData.type} COC.</p>
              <p className="text-sm opacity-80 mt-1">Fields are identical in the printout.</p>
            </div>
          )}

          {!formData.type && (
            <div className="py-8 text-center text-blue-400">
              Select a COC Type to see specific fields.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
