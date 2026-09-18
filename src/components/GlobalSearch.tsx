"use client";

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

const PAGES = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Roles", href: "/dashboard/admin/roles" },
  { title: "Users", href: "/dashboard/admin/users" },
  { title: "Sales Order", href: "/dashboard/sales/sales-order" },
  { title: "Work Order", href: "/dashboard/production/work-order" },
  { title: "QC Approval", href: "/dashboard/qc/approval" },
  { title: "Delivery Order", href: "/dashboard/sales/delivery-order" },
  { title: "Certificate Of Conformity", href: "/dashboard/qc/coc" },
  { title: "Process Parameter Confirmation", href: "/dashboard/production/process-parameter-confirmation" },
  { title: "Vision One Costing & Quotation", href: "/dashboard/sales/quotation" },
  { title: "Purchase Requisition", href: "/dashboard/purchasing/purchase-requisition" },
  { title: "Purchase Order", href: "/dashboard/purchasing/purchase-order" },
  { title: "Purchase Order Approval", href: "/dashboard/purchasing/purchase-order-approval" },
  { title: "Goods Receive", href: "/dashboard/purchasing/goods-receive" },
  { title: "Goods Return", href: "/dashboard/purchasing/goods-return" },
  { title: "Inventory", href: "/dashboard/inventory" },
  { title: "Purchase Order Subcon", href: "/dashboard/purchasing/purchase-order-subcon" },
  { title: "Subcon Request Form", href: "/dashboard/purchasing/subcon-request-form" },
  { title: "Subcon Return Tracking", href: "/dashboard/purchasing/subcon-return-tracking" },
  { title: "Quotations", href: "/dashboard/sales/quotation" },
  { title: "Invoicing", href: "/dashboard/sales/invoice" },
  { title: "Receipt / Payment Record", href: "/dashboard/sales/receipt" },
  { title: "NCR", href: "/dashboard/qc/ncr" },
  { title: "Company Profile", href: "/dashboard/profiles/company" },
  { title: "Employee Profile", href: "/dashboard/master-profile/employee" },
  { title: "File Category Profile", href: "/dashboard/master-profile/file-category" },
  { title: "Designation Profile", href: "/dashboard/master-profile/designation" },
  { title: "Approval Level Profile", href: "/dashboard/profiles/approval-levels" },
  { title: "Customer Profile", href: "/dashboard/admin/master-profile/customer" },
  { title: "Supplier Profile", href: "/dashboard/admin/master-profile/supplier" },
  { title: "Currency Profile", href: "/dashboard/profiles/currency" },
  { title: "Tax Profile", href: "/dashboard/admin/master-profile/tax" },
  { title: "Payment Terms", href: "/dashboard/profiles/payment-term" },
  { title: "UOM Profile", href: "/dashboard/profiles/uom" },
  { title: "Material Category Profile", href: "/dashboard/profiles/material-categories" },
  { title: "Material Profile", href: "/dashboard/master-profile/material" },
  { title: "Process Profile", href: "/dashboard/master-profile/process-profile" },
  { title: "Main Process Profile", href: "/dashboard/master-profile/main-process" },
  { title: "Incoterm Profile", href: "/dashboard/profiles/incoterm" },
  { title: "Material Type Profile", href: "/dashboard/master-profile/material-type" },
  { title: "Finished Goods Profile (Admin)", href: "/dashboard/admin/master-profile/finished-good" },
  { title: "Finished Good Profile", href: "/dashboard/profiles/finished-good" },
  { title: "Welding Type Profile", href: "/dashboard/master-profile/welding-type" },
  { title: "Joint Profile", href: "/dashboard/master-profile/joint" },
  { title: "Machine Profile", href: "/dashboard/profiles/machine" },
  { title: "Elcometer Profile", href: "/dashboard/profiles/elcometer" },
  { title: "Painting Method Profile", href: "/dashboard/master-profile/painting-method" },
  { title: "Failure Mode Profile", href: "/dashboard/master-profile/failure-mode" },
  { title: "Sales Report", href: "/dashboard/sales/sales-report" },
  { title: "Non Conformance Report", href: "/dashboard/qc/ncr-report" },
  { title: "Purchasing Report", href: "/dashboard/purchasing/purchasing-report" },
  { title: "Subcon Purchasing Report", href: "/dashboard/purchasing/subcon-purchasing-report" },
  { title: "Inventory Report", href: "/dashboard/inventory/report" },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = PAGES.filter((p) =>
    p.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative group hidden md:flex" ref={ref}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors z-10" />
      <input
        type="text"
        placeholder="Search modules..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="pl-9 pr-4 py-2 bg-slate-100/50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-48 focus:w-64 transition-all hover:bg-slate-100 relative z-10"
        onKeyDown={(e) => {
            if (e.key === "Enter" && filtered.length > 0) {
                router.push(filtered[0].href);
                setOpen(false);
                setQuery("");
            }
        }}
      />

      {open && query && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 max-h-80 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  router.push(p.href);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {p.title}
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-slate-500">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
