"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
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
  Trash2,
} from "lucide-react";

export default function SubconRequestFormDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const router = useRouter();
  
  const [srf, setSrf] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [srfDate, setSrfDate] = useState("");
  const [outsourcedById, setOutsourcedById] = useState("");
  const [dateRequired, setDateRequired] = useState("");
  const [receivedById, setReceivedById] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [remark, setRemark] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchSrf();
    fetchEmployees();
  }, [id]);

  const fetchSrf = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchasing/subcon-request-form/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Subcon Request Form not found.");
        throw new Error("Failed to fetch data.");
      }
      const data = await res.json();
      setSrf(data);
      
      setSrfDate(data.srfDate ? new Date(data.srfDate).toISOString().slice(0, 10) : "");
      setOutsourcedById(data.outsourcedById || "");
      setDateRequired(data.dateRequired ? new Date(data.dateRequired).toISOString().slice(0, 10) : "");
      setReceivedById(data.receivedById || "");
      setQuantity(Number(data.quantity) || 0);
      setRemark(data.remark || "");
      
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) setEmployees(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const payload = {
        srfDate,
        outsourcedById,
        dateRequired,
        receivedById,
        quantity: Number(quantity),
        remark,
      };

      const res = await fetch(`/api/purchasing/subcon-request-form/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update Subcon Request Form");
      }

      router.push(`/dashboard/saved?module=Subcon Request&id=${srf.srfNo || id}&viewUrl=/dashboard/purchasing/subcon-request-form/${id}&backUrl=/dashboard/purchasing/subcon-request-form`);
    } catch (err: any) {
      hotToast.error(err.message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!await customConfirm("Are you sure you want to delete this Subcon Request Form?")) return;
    
    try {
      const res = await fetch(`/api/purchasing/subcon-request-form/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      router.push("/dashboard/purchasing/subcon-request-form");
    } catch (err: any) {
      hotToast.error(err.message);
    }
  };

  const callAction = async (action: "submit" | "void") => {
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
      fetchSrf();
    } catch (err: any) {
      hotToast.error(err.message);
    }
  };

  const handlePrint = () => {
    window.open(`/print/subcon-request-form/${id}`, "_blank");
  };

  if (loading) {
    return (
      <div className="p-6 h-screen flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-blue-500">Loading form...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-rose-700">
          <AlertCircle size={24} />
          <p className="text-sm font-medium">{errorMsg}</p>
          <Link href="/dashboard/purchasing/subcon-request-form" className="text-xs bg-white px-4 py-2 border border-rose-200 rounded-md hover:bg-rose-50 mt-2">
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  const isEditable = srf.status === "Draft";

  return (
    <div className="py-3 space-y-4 w-full">
      <div className="flex items-center justify-between pb-6 border-b border-blue-200 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-1">
            <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/purchasing/subcon-request-form" className="hover:text-blue-600">Subcon Request Form</Link>
            <span>/</span>
            <span className="text-blue-500">{srf.srfNo}</span>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-blue-900">{srf.srfNo}</h2>
            <StatusPill status={srf.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg shadow-sm"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg shadow-sm"
          >
            <Printer size={14} /> Print
          </button>
          
          {isEditable && (
            <>
              <button
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg shadow-sm"
              >
                <Trash2 size={14} /> Delete
              </button>
              <button
                onClick={() => callAction("submit")}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 border border-blue-600 rounded-lg shadow-sm"
              >
                <Send size={14} /> Submit
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-600 rounded-lg shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                {saving ? "Saving" : "Save Changes"}
              </button>
            </>
          )}

          {srf.status !== "Void" && srf.status !== "Draft" && (
            <button
              onClick={() => callAction("void")}
              className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg shadow-sm"
            >
              <Ban size={14} /> Void
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Read Only Info */}
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider border-b border-blue-100 pb-2">
            Imported PO Details
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Company</span>
              <span className="text-blue-900 font-medium">{srf.purchaseOrderItem.purchaseOrder.company?.companyName}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Supplier</span>
              <span className="text-blue-900 font-medium">{srf.purchaseOrderItem.purchaseOrder.supplier?.supplierName}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">PO No</span>
              <span className="text-blue-900 font-mono">{srf.purchaseOrderItem.purchaseOrder.poNo}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">PO Date</span>
              <span className="text-blue-900">{new Date(srf.purchaseOrderItem.purchaseOrder.date).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Work Order No</span>
              <span className="text-blue-900 font-mono">{srf.purchaseOrderItem.purchaseOrder.workOrderNo || "—"}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">In-Process Description</span>
              <span className="text-blue-900">{srf.purchaseOrderItem.woRoutingProcess?.inProcess?.description || "—"}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Main Process</span>
              <span className="text-blue-900">{srf.purchaseOrderItem.masterMainProcess?.process || "—"}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Routing Process</span>
              <span className="text-blue-900">{srf.purchaseOrderItem.masterRoutingProcess?.routingProcess || "—"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-blue-400 font-semibold block text-xs">Part Description</span>
              <span className="text-blue-900">{srf.purchaseOrderItem.description}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Currency</span>
              <span className="text-blue-900">{srf.purchaseOrderItem.purchaseOrder.currency?.code}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">PO UOM</span>
              <span className="text-blue-900">{srf.purchaseOrderItem.poUom?.uomName || "—"}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Unit Price</span>
              <span className="text-blue-900">{srf.purchaseOrderItem.unitPrice}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Amount</span>
              <span className="text-blue-900">{srf.purchaseOrderItem.amount}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Hardness</span>
              <span className="text-blue-900">{srf.purchaseOrderItem.hardness || "—"}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Thickness</span>
              <span className="text-blue-900">{srf.purchaseOrderItem.thickness || "—"}</span>
            </div>
          </div>
        </div>

        {/* Editable Form */}
        <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider border-b border-blue-100 pb-2">
            Subcon Request Form Data
          </h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">SRF No</label>
              <input
                type="text"
                value={srf.srfNo}
                readOnly
                className="w-full px-3 py-2 bg-blue-50/50 border border-blue-200 rounded-lg text-blue-900 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">SRF Date *</label>
              <input
                type="date"
                value={srfDate}
                onChange={(e) => setSrfDate(e.target.value)}
                readOnly={!isEditable}
                className={`w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${!isEditable ? "bg-blue-50/50 text-blue-900" : "bg-blue-50"}`}
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">Outsourced By *</label>
              {isEditable ? (
                <SearchableSelect
                  value={outsourcedById}
                  onChange={(e) => setOutsourcedById(e.target.value)}
                  className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">-- Select Purchaser --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </SearchableSelect>
              ) : (
                <input
                  type="text"
                  value={srf.outsourcedBy?.name || ""}
                  readOnly
                  className="w-full px-3 py-2 bg-blue-50/50 border border-blue-200 rounded-lg text-blue-900 focus:outline-none"
                />
              )}
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">Date Required *</label>
              <input
                type="date"
                value={dateRequired}
                onChange={(e) => setDateRequired(e.target.value)}
                readOnly={!isEditable}
                className={`w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${!isEditable ? "bg-blue-50/50 text-blue-900" : "bg-blue-50"}`}
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">Received By</label>
              {isEditable ? (
                <SearchableSelect
                  value={receivedById}
                  onChange={(e) => setReceivedById(e.target.value)}
                  className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Select Contact Person --</option>
                  {srf.purchaseOrderItem.purchaseOrder.supplier?.contactPersons?.map((cp: any) => (
                    <option key={cp.id} value={cp.id}>{cp.contactPersonName}</option>
                  ))}
                </SearchableSelect>
              ) : (
                <input
                  type="text"
                  value={srf.receivedBy?.contactPersonName || ""}
                  readOnly
                  className="w-full px-3 py-2 bg-blue-50/50 border border-blue-200 rounded-lg text-blue-900 focus:outline-none"
                />
              )}
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">Quantity *</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
                readOnly={!isEditable}
                className={`w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${!isEditable ? "bg-blue-50/50 text-blue-900" : "bg-blue-50"}`}
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">Remark</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={4}
                readOnly={!isEditable}
                className={`w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${!isEditable ? "bg-blue-50/50 text-blue-900" : "bg-blue-50"}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "Submitted"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "Draft"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "Void"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}
