"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState } from "react";
import { Factory } from "lucide-react";
import { Field, inputClass, selectTriggerClass } from "@/components/form-ui";
import { REPORT_PO_STATUSES, ReportShell } from "@/components/purchasing/ReportShell";
import * as XLSX from "xlsx";
export default function SubconPurchasingReportPage() {
  const [company, setCompany] = useState("");
  const [poNo, setPoNo] = useState("");
  const [poStatus, setPoStatus] = useState("Issued");
  const [poDateFrom, setPoDateFrom] = useState("");
  const [poDateTo, setPoDateTo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [mainProcess, setMainProcess] = useState("");
  const [routingProcess, setRoutingProcess] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastExport, setLastExport] = useState<{ lines: number; pos: number; at: Date } | null>(null);

  const [companies, setCompanies] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [mainProcessesList, setMainProcessesList] = useState<any[]>([]);
  const [routingProcessesList, setRoutingProcessesList] = useState<any[]>([]);

  React.useEffect(() => {
    fetch("/api/purchasing/purchase-order/form-data")
      .then((res) => res.json())
      .then((data) => {
        setCompanies(Array.isArray(data?.companies) ? data.companies : []);
        setSuppliers(Array.isArray(data?.suppliers) ? data.suppliers : []);
        setMainProcessesList(Array.isArray(data?.mainProcesses) ? data.mainProcesses : []);
        setRoutingProcessesList(Array.isArray(data?.processProfiles) ? data.processProfiles : []);
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
      if (itemDescription) params.append("itemDescription", itemDescription);
      if (mainProcess) params.append("mainProcess", mainProcess);
      if (routingProcess) params.append("routingProcess", routingProcess);

      const res = await fetch(`/api/reports/subcon-purchasing-report?${params.toString()}`);
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
    const rows = [];
    
    // Row 1: Title
    rows.push(["Subcon Purchasing Report"]);
    
    // Row 2: Generated Date
    const now = new Date();
    rows.push([`Generated on ${now.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')} ${now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`]);
    
    // Row 3: Super Headers
    rows.push([
      "", "", "", "", "", "", "", "", "", "", // Up to Currency
      "Amt", "", "", "", "", // Before Tax to Aft Tax
      "", "", "", "", "", "", "", "", "", "", "", "", "Outstanding Qty", "", ""
    ]);

    // Row 4: Column Headers
    rows.push([
      "Company", "PO No", "PO Date", "PO Status", "Purchaser", "Supplier", "WO No", "PR No", "Currency", "Exch Rate",
      "Before Tax", "Tax Type", "Tax Rate", "Tax Amt", "Aft Tax",
      "In-Process Description", "Main Process*", "Routing Process*", "Descr", "Hardness", "Thickness", "UOM", "Qty", "Unit Price", "Amt",
      "Qty Acknowledged by Subcon", "Qty Returned by Subcon", "Qty Rejected", "Not Acknowledged by Subcon", "Not Returned by Subcon", "Deliver Date"
    ]);

    let sumBeforeTax = 0;
    let sumTaxAmt = 0;
    let sumAftTax = 0;
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
        item.inProcessDescription,
        item.mainProcess,
        item.routingProcess,
        item.description,
        item.hardness,
        item.thickness,
        item.uom,
        item.qty,
        item.unitPrice,
        item.amt,
        item.qtyAcknowledged,
        item.qtyReturned,
        item.qtyRejected,
        item.qtyNotAcknowledged,
        item.qtyNotReturned,
        item.deliverDate ? new Date(item.deliverDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : ""
      ];

      rows.push(row);
    });

    // Footer Total Row
    const footer = new Array(31).fill("");
    footer[10] = sumBeforeTax; 
    footer[13] = sumTaxAmt;    
    footer[14] = sumAftTax;    
    rows.push(footer);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Apply basic coloring attempt to outstanding cells (Not Returned)
    for (let r = 4; r < rows.length - 1; r++) { 
      const itemRow = data[r - 4];
      const outstanding = itemRow.qtyNotReturned;
      const deliveryDate = itemRow.deliverDate ? new Date(itemRow.deliverDate) : null;
      
      if (outstanding > 0 && deliveryDate && deliveryDate < now) {
        const cellAddress = XLSX.utils.encode_cell({ r, c: 29 }); // Col 29 = Not Returned by Subcon
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
      { s: { r: 2, c: 28 }, e: { r: 2, c: 29 } }, // Outstanding Qty
    ];

    // Basic Column Widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Subcon Purchasing Report");
    XLSX.writeFile(wb, `Subcon_Purchasing_Report_${now.getTime()}.xlsx`);
  };

  // Narrow the routing list to the chosen main process (the filters match by name).
  const selectedMain = mainProcessesList.find((mp) => mp.process === mainProcess);
  const visibleRoutingProcesses = selectedMain
    ? routingProcessesList.filter((rp) => rp.mainProcessId === selectedMain.id)
    : routingProcessesList;

  const resetFilters = () => {
    setCompany("");
    setPoNo("");
    setPoStatus("Issued");
    setPoDateFrom("");
    setPoDateTo("");
    setSupplier("");
    setItemDescription("");
    setMainProcess("");
    setRoutingProcess("");
    setErrorMsg("");
  };
  // PO Status counts as a filter only when it differs from the default (Issued).
  const activeFilters = [!!company, !!poNo, !!poDateFrom, !!poDateTo, !!supplier, !!itemDescription, !!mainProcess, !!routingProcess, poStatus !== "Issued"].filter(Boolean).length;

  return (
    <ReportShell
      title="Subcon Purchasing Report"
      subtitle="Subcon purchase orders and what subcontractors have acknowledged and returned, exported to Excel."
      icon={Factory}
      activeFilters={activeFilters}
      loading={loading}
      error={errorMsg}
      lastExport={lastExport}
      onExport={handleExport}
      onReset={resetFilters}
      note={"Acknowledged comes from Submitted request forms, returned and rejected from Submitted trackings. A footer row totals the PO amounts."}
      columnGroups={[
        { label: "Purchase order", columns: ["Company", "PO No", "PO Date", "PO Status", "Purchaser", "Supplier", "WO No", "PR No", "Currency", "Exch Rate"] },
        { label: "PO amounts (first line of each PO)", columns: ["Before Tax", "Tax Type", "Tax Rate", "Tax Amt", "Aft Tax"] },
        {
          label: "Line",
          columns: ["In-Process Description", "Main Process", "Routing Process", "Descr", "Hardness", "Thickness", "UOM", "Qty", "Unit Price", "Amt", "Deliver Date"],
        },
        {
          label: "Subcon status",
          columns: ["Qty Acknowledged", "Qty Returned", "Qty Rejected", "Not Acknowledged", "Not Returned"],
          highlight: "Not Returned",
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
        <Field label="Item Description">
          <input type="text" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="Contains..." className={inputClass} />
        </Field>
        <Field label="Main Process">
          <SearchableSelect
            value={mainProcess}
            onChange={(e) => {
              setMainProcess(e.target.value);
              setRoutingProcess("");
            }}
            className={selectTriggerClass}
          >
            <option value="">All Main Processes</option>
            {mainProcessesList.map((mp) => (
              <option key={mp.id} value={mp.process}>
                {mp.process}
              </option>
            ))}
          </SearchableSelect>
        </Field>
        <Field label="Routing Process" help={mainProcess ? `Routing processes under ${mainProcess}` : undefined}>
          <SearchableSelect value={routingProcess} onChange={(e) => setRoutingProcess(e.target.value)} className={selectTriggerClass}>
            <option value="">All Routing Processes</option>
            {visibleRoutingProcesses.map((rp) => (
              <option key={rp.id} value={rp.routingProcess}>
                {rp.routingProcess}
              </option>
            ))}
          </SearchableSelect>
        </Field>
        </>
      }
    />
  );
}
