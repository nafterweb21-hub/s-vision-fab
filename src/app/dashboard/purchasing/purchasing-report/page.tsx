"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Field, inputClass, selectTriggerClass } from "@/components/form-ui";
import { REPORT_PO_STATUSES, ReportShell } from "@/components/purchasing/ReportShell";
import * as XLSX from "xlsx";
export default function PurchasingReportPage() {
  const [company, setCompany] = useState("");
  const [poNo, setPoNo] = useState("");
  const [poStatus, setPoStatus] = useState("Issued");
  const [poDateFrom, setPoDateFrom] = useState("");
  const [poDateTo, setPoDateTo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [partNo, setPartNo] = useState("");
  const [partDescription, setPartDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastExport, setLastExport] = useState<{ lines: number; pos: number; at: Date } | null>(null);

  const [companies, setCompanies] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  React.useEffect(() => {
    fetch("/api/purchasing/purchase-order/form-data")
      .then((res) => res.json())
      .then((data) => {
        setCompanies(Array.isArray(data?.companies) ? data.companies : []);
        setSuppliers(Array.isArray(data?.suppliers) ? data.suppliers : []);
        setMaterials(Array.isArray(data?.materials) ? data.materials : []);
      })
      .catch((err) => console.error("Failed to load dropdown data:", err));
  }, []);

  const handleExport = async () => {
    setLoading(true);
    setErrorMsg("");
    setLastExport(null);
    try {
      const params = new URLSearchParams();
      if (company) params.append("company", company);
      if (poNo) params.append("poNo", poNo);
      if (poStatus) params.append("poStatus", poStatus);
      if (poDateFrom) params.append("poDateFrom", poDateFrom);
      if (poDateTo) params.append("poDateTo", poDateTo);
      if (supplier) params.append("supplier", supplier);
      if (partNo) params.append("partNo", partNo);
      if (partDescription) params.append("partDescription", partDescription);

      const res = await fetch(`/api/reports/purchasing-report?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch report data");
      
      const data = await res.json();
      
      if (data.length === 0) {
        throw new Error("No records found for the given criteria.");
      }

      generateExcel(data);
      setLastExport({ lines: data.length, pos: new Set(data.map((d: any) => d.poNo)).size, at: new Date() });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateExcel = (data: any[]) => {
    // Build rows
    const rows = [];
    
    // Row 1: Title
    rows.push(["Purchasing Report"]);
    
    // Row 2: Generated Date
    const now = new Date();
    rows.push([`Generated on ${now.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')} ${now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`]);
    
    // Row 3: Super Headers
    rows.push([
      "", "", "", "", "", "", "", "", "", "", // Up to Currency
      "Amt", "", "", "", "", // Before Tax to Aft Tax
      "", "", "", "", "", "", "", "", "", "", ""
    ]);

    // Row 4: Column Headers
    rows.push([
      "Company", "PO No", "PO Date", "PO Status", "Purchaser", "Supplier", "WO No", "PR No", "Currency", "Exch Rate",
      "Before Tax", "Tax Type", "Tax Rate", "Tax Amt", "Aft Tax",
      "Part No", "Descr", "UOM", "Qty", "Unit Price", "Amt",
      "Total Received", "Total Returned", "NETT Received", "Outstanding Not Delivered", "Deliver Date"
    ]);

    // Used to track totals for footer
    let sumBeforeTax = 0;
    let sumTaxAmt = 0;
    let sumAftTax = 0;

    // To prevent summing duplicate PO totals (since PO sums are attached to every item), 
    // we only add to sum on the first item of a distinct PO.
    const seenPo = new Set();

    // Data Rows
    data.forEach(item => {
      const isNewPo = !seenPo.has(item.poNo);
      if (isNewPo) {
        seenPo.add(item.poNo);
        sumBeforeTax += item.beforeTax;
        sumTaxAmt += item.taxAmt;
        sumAftTax += item.aftTax;
      }

      const row = [
        item.company,
        item.poNo,
        item.poDate ? new Date(item.poDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : "",
        item.poStatus,
        item.purchaser,
        item.supplier,
        item.woNo,
        item.prNo,
        item.currency,
        item.exchRate,
        isNewPo ? item.beforeTax : "",
        isNewPo ? item.taxType : "",
        isNewPo ? item.taxRate : "",
        isNewPo ? item.taxAmt : "",
        isNewPo ? item.aftTax : "",
        item.partNo,
        item.description,
        item.uom,
        item.qty,
        item.unitPrice,
        item.amt,
        item.totalReceived,
        item.totalReturned,
        item.nettReceived,
        item.outstandingNotDelivered,
        item.deliverDate ? new Date(item.deliverDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : ""
      ];

      rows.push(row);
    });

    // Footer Total Row
    const footer = new Array(26).fill("");
    footer[10] = sumBeforeTax; // Before Tax
    footer[13] = sumTaxAmt;    // Tax Amt
    footer[14] = sumAftTax;    // Aft Tax
    rows.push(footer);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Apply basic coloring attempt to outstanding cells
    // The standard SheetJS doesn't natively support this without Pro version,
    // but we can attach 's' tags in case a styled writer is used.
    // Start scanning from row 4 (0-indexed 4 is the first data row)
    for (let r = 4; r < rows.length - 1; r++) { // skip footer
      const itemRow = data[r - 4];
      const outstanding = itemRow.outstandingNotDelivered;
      const deliveryDate = itemRow.deliverDate ? new Date(itemRow.deliverDate) : null;
      
      if (outstanding > 0 && deliveryDate && deliveryDate < now) {
        const cellAddress = XLSX.utils.encode_cell({ r, c: 24 }); // Col 24 = Outstanding Not Delivered
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            fill: { fgColor: { rgb: "FFFF0000" } }, // Red background
            font: { color: { rgb: "FFFFFFFF" } } // White text
          };
        }
      }
    }

    // Merges
    ws['!merges'] = [
      { s: { r: 2, c: 10 }, e: { r: 2, c: 14 } }, // Amt (Before Tax to Aft Tax)
    ];

    // Basic Column Widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchasing Report");
    XLSX.writeFile(wb, `Purchasing_Report_${now.getTime()}.xlsx`);
  };

  const resetFilters = () => {
    setCompany("");
    setPoNo("");
    setPoStatus("Issued");
    setPoDateFrom("");
    setPoDateTo("");
    setSupplier("");
    setPartNo("");
    setPartDescription("");
    setErrorMsg("");
  };
  // PO Status counts as a filter only when it differs from the default (Issued).
  const activeFilters = [!!company, !!poNo, !!poDateFrom, !!poDateTo, !!supplier, !!partNo, !!partDescription, poStatus !== "Issued"].filter(Boolean).length;

  return (
    <ReportShell
      title="Purchasing Report"
      subtitle="Material purchase orders and their delivery status, exported to Excel."
      icon={FileSpreadsheet}
      activeFilters={activeFilters}
      loading={loading}
      error={errorMsg}
      lastExport={lastExport}
      onExport={handleExport}
      onReset={resetFilters}
      note={"PO Status shows the receive status once a PO is Issued. A footer row totals the PO amounts."}
      columnGroups={[
        { label: "Purchase order", columns: ["Company", "PO No", "PO Date", "PO Status", "Purchaser", "Supplier", "WO No", "PR No", "Currency", "Exch Rate"] },
        { label: "PO amounts (first line of each PO)", columns: ["Before Tax", "Tax Type", "Tax Rate", "Tax Amt", "Aft Tax"] },
        { label: "Line", columns: ["Part No", "Descr", "UOM", "Qty", "Unit Price", "Amt", "Deliver Date"] },
        {
          label: "Delivery status",
          columns: ["Total Received", "Total Returned", "NETT Received", "Outstanding Not Delivered"],
          highlight: "Outstanding Not Delivered",
        },
      ]}
      fields={
        <>
        <Field label="Company">
          <SearchableSelect value={company} onChange={(e) => setCompany(e.target.value)} className={selectTriggerClass}>
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.companyName}>
                {c.companyName}
              </option>
            ))}
          </SearchableSelect>
        </Field>
        <Field label="PO No">
          <input type="text" value={poNo} onChange={(e) => setPoNo(e.target.value)} placeholder="e.g. PO1700001" className={`${inputClass} font-mono`} />
        </Field>
        <Field label="PO Status" help="The spec covers Issued POs; pick All to include the rest">
          <SearchableSelect value={poStatus} onChange={(e) => setPoStatus(e.target.value)} className={selectTriggerClass}>
            <option value="">All (except Void)</option>
            {REPORT_PO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SearchableSelect>
        </Field>
        <Field label="PO Date (From)">
          <input type="date" value={poDateFrom} max={poDateTo || undefined} onChange={(e) => setPoDateFrom(e.target.value)} className={inputClass} />
        </Field>
        <Field label="PO Date (To)">
          <input type="date" value={poDateTo} min={poDateFrom || undefined} onChange={(e) => setPoDateTo(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Supplier">
          <SearchableSelect value={supplier} onChange={(e) => setSupplier(e.target.value)} className={selectTriggerClass}>
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.supplierName}>
                {s.supplierName}
              </option>
            ))}
          </SearchableSelect>
        </Field>
        <Field label="Part No">
          <SearchableSelect value={partNo} onChange={(e) => setPartNo(e.target.value)} className={selectTriggerClass}>
            <option value="">All Parts</option>
            {materials.map((m) => (
              <option key={m.id} value={m.partNo}>
                {m.partNo} {m.description ? `- ${m.description}` : ""}
              </option>
            ))}
          </SearchableSelect>
        </Field>
        <Field label="Part Description" className="sm:col-span-2">
          <input type="text" value={partDescription} onChange={(e) => setPartDescription(e.target.value)} placeholder="Contains..." className={inputClass} />
        </Field>
        </>
      }
    />
  );
}
