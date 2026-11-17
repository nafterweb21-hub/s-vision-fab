"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
ArrowLeft,
  Search,
  Loader2,
  AlertCircle,
  FileText,
  Save,
} from "lucide-react";

export default function NewSubconRequestFormPage() {
  const router = useRouter();
  
  // Outstanding Items State
  const [outstandingItems, setOutstandingItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState("");
  const [search, setSearch] = useState("");
  
  // Selection & Form State
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Form fields
  const [srfDate, setSrfDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [outsourcedById, setOutsourcedById] = useState<string>("");
  const [dateRequired, setDateRequired] = useState<string>("");
  const [receivedById, setReceivedById] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(0);
  const [remark, setRemark] = useState("");
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOutstandingItems();
    fetchEmployees();
  }, [search]);

  const fetchOutstandingItems = async () => {
    setLoadingItems(true);
    setItemsError("");
    try {
      const res = await fetch(`/api/purchasing/subcon-request-form/outstanding-po-items?search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("Failed to fetch outstanding PO items");
      setOutstandingItems(await res.json());
    } catch (err: any) {
      setItemsError(err.message);
    } finally {
      setLoadingItems(false);
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

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    
    // Pre-fill form
    setOutsourcedById(item.purchaseOrder.purchaser?.id || "");
    setDateRequired(item.deliveryDate ? new Date(item.deliveryDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setReceivedById(item.purchaseOrder.contactPerson?.id || "");
    setQuantity(item.availableQuantity || 0);
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    
    if (quantity <= 0 || quantity > selectedItem.availableQuantity) {
      return hotToast.error(`Quantity must be between 1 and ${selectedItem.availableQuantity}`);
    }

    setSaving(true);
    try {
      const payload = {
        srfDate,
        purchaseOrderItemId: selectedItem.id,
        outsourcedById,
        dateRequired,
        receivedById,
        quantity: Number(quantity),
        remark,
      };

      const res = await fetch("/api/purchasing/subcon-request-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create Subcon Request Form");
      }

      const created = await res.json();
      router.push(`/dashboard/saved?module=Subcon Request&id=${created.srfNo || created.id}&viewUrl=/dashboard/purchasing/subcon-request-form/${created.id}&backUrl=/dashboard/purchasing/subcon-request-form`);
    } catch (err: any) {
      hotToast.error(err.message);
      setSaving(false);
    }
  };

  if (!selectedItem) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between pb-6 border-b border-blue-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-1">
              <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
              <span>/</span>
              <Link href="/dashboard/purchasing/subcon-request-form" className="hover:text-blue-600">Subcon Request Form</Link>
              <span>/</span>
              <span className="text-blue-500">New</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-blue-900">Select Outstanding PO Item</h2>
          </div>
          <Link
            href="/dashboard/purchasing/subcon-request-form"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg shadow-sm"
          >
            <ArrowLeft size={16} /> Back
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-blue-200 p-4 rounded-xl shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-400" />
            <input
              type="text"
              placeholder="Search by PO No, Supplier, or Description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {loadingItems ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-blue-500">Loading outstanding items...</p>
          </div>
        ) : itemsError ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex items-center gap-3 text-rose-700">
            <AlertCircle size={18} />
            <p className="text-sm font-medium">{itemsError}</p>
          </div>
        ) : outstandingItems.length === 0 ? (
          <div className="bg-white border border-blue-200 rounded-xl p-12 text-center shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <FileText size={22} className="text-blue-600" />
            </div>
            <p className="text-blue-600 font-semibold">No outstanding PO items found.</p>
          </div>
        ) : (
          <div className="bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-blue-500 bg-blue-50/50 uppercase tracking-wider border-b border-blue-200">
                  <tr>
                    <th className="px-4 py-3">PO No</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Work Order No</th>
                    <th className="px-4 py-3">Part Description</th>
                    <th className="px-4 py-3">Available Qty</th>
                    <th className="px-4 py-3">UOM</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {outstandingItems.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/30">
                      <td className="px-4 py-3 font-bold text-blue-900">{item.purchaseOrder.poNo}</td>
                      <td className="px-4 py-3 text-blue-700">{item.purchaseOrder.supplier?.supplierName}</td>
                      <td className="px-4 py-3 text-blue-700 font-mono">{item.purchaseOrder.workOrderNo || "—"}</td>
                      <td className="px-4 py-3 text-blue-700 max-w-[200px] truncate" title={item.description}>{item.description || "—"}</td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">{item.availableQuantity}</td>
                      <td className="px-4 py-3 text-blue-700">{item.poUom?.uomName || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSelectItem(item)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Form View
  return (
    <div className="py-3 space-y-4 w-full">
      <div className="flex items-center justify-between pb-6 border-b border-blue-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold tracking-wider uppercase mb-1">
            <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/purchasing/subcon-request-form" className="hover:text-blue-600">Subcon Request Form</Link>
            <span>/</span>
            <span className="text-blue-500">New Form</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-blue-900">Create Subcon Request Form</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedItem(null)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg shadow-sm"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-md disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save Form"}
          </button>
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
              <span className="text-blue-900 font-medium">{selectedItem.purchaseOrder.company?.companyName}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Supplier</span>
              <span className="text-blue-900 font-medium">{selectedItem.purchaseOrder.supplier?.supplierName}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">PO No</span>
              <span className="text-blue-900 font-mono">{selectedItem.purchaseOrder.poNo}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">PO Date</span>
              <span className="text-blue-900">{new Date(selectedItem.purchaseOrder.date).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Work Order No</span>
              <span className="text-blue-900 font-mono">{selectedItem.purchaseOrder.workOrderNo || "—"}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">In-Process Description</span>
              <span className="text-blue-900">{selectedItem.woRoutingProcess?.inProcess?.description || "—"}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Main Process</span>
              <span className="text-blue-900">{selectedItem.masterMainProcess?.process || "—"}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Routing Process</span>
              <span className="text-blue-900">{selectedItem.masterRoutingProcess?.routingProcess || "—"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-blue-400 font-semibold block text-xs">Part Description</span>
              <span className="text-blue-900">{selectedItem.description}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Currency</span>
              <span className="text-blue-900">{selectedItem.purchaseOrder.currency?.code}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">PO UOM</span>
              <span className="text-blue-900">{selectedItem.poUom?.uomName || "—"}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Unit Price</span>
              <span className="text-blue-900">{selectedItem.unitPrice}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Amount</span>
              <span className="text-blue-900">{selectedItem.amount}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Hardness</span>
              <span className="text-blue-900">{selectedItem.hardness || "—"}</span>
            </div>
            <div>
              <span className="text-blue-400 font-semibold block text-xs">Thickness</span>
              <span className="text-blue-900">{selectedItem.thickness || "—"}</span>
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
              <label className="block text-xs font-semibold text-blue-500 mb-1">SRF Date *</label>
              <input
                type="date"
                value={srfDate}
                onChange={(e) => setSrfDate(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">Outsourced By *</label>
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
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">Date Required *</label>
              <input
                type="date"
                value={dateRequired}
                onChange={(e) => setDateRequired(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">Received By</label>
              <SearchableSelect
                value={receivedById}
                onChange={(e) => setReceivedById(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Select Contact Person --</option>
                {selectedItem.purchaseOrder.supplier?.contactPersons?.map((cp: any) => (
                  <option key={cp.id} value={cp.id}>{cp.contactPersonName}</option>
                ))}
              </SearchableSelect>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">Quantity * (Max: {selectedItem.availableQuantity})</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
                max={selectedItem.availableQuantity}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-blue-500 mb-1">Remark</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
