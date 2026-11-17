# Work Order

**Purpose:** track production from creation through routing processes to QC. Aggregates timesheet and process parameters scanned at the Production Terminal.
**Feeds:** Production Terminal, Process Parameter Confirmation, QC Approval, NCR, PO-Subcon (routing process tagging), Delivery Order, COC, all reports.

A Work Order No is **auto-generated** when its parent SO is confirmed, but the WO record must be **created** in this module before operations begin.

## Structure (4 levels)

```
Work Order
└── In Process Description (component / sub-assembly / final assy)
    └── Routing Process (a row from Process Profile + target date)
        ├── Employee (auto from terminal scan IN/OUT)
        └── Process Parameter  (Welding | Spray Painting | Machining)
```

## Number format

`8XXXXX-A-B` (`A` = part index in SO, `B` = batch index of that part) → `800003-2-5`.

## Status flow

```
Draft     — on WO creation
Proceed   — planner has set routing process and clicked [Proceed]; production may scan in
WIP       — at least one routing process started
On Hold   — paused; workers may scan OUT, cannot scan IN
Pending for QC — all routing processes complete; awaiting QC
Completed — QC approved; delivery allowed
Void      — allowed only while Draft
Cancelled — cancel a Proceed or WIP WO
```

## Creation flow

1. Click `[Outstanding Work]` → popup shows SO batches without a WO yet.
2. Select a batch → `[Create New Work Order]` → WO created with status Draft.

## Top-level rules

- **Quantity is fixed** — you cannot change WO quantity or split a WO. Different splits require different SO batches.
- Materials / quantities used per in-process-assembly are **not** captured.
- WO tracks only the main product as described by Job Description and Part Name; no assembly parts or inventory.
- **No in-system rework.** If quantity is rejected mid-run, raise NCR (offline rework). The WO can still proceed to the next routing process with the original quantity as a whole; next process does **not** wait for NCR to be submitted.
- Customer return = a **new** sales order, not a modification of the existing WO.
- **Optional routing**: if the WO has no in-house routing (subcon-only), planner can flag that. WO goes to WIP when subcon PO is issued and to Completed when subcon items are fully received.
- NCR can be raised any time before the WO is Completed.
- Delivery requires WO Completed (QC approved).

## Routing process rules

- **One WO = one set of routing process planning.**
- Planner plans routing processes for main assembly, in-process-assemblies, in-process-components.
- Only **Target Completion Date** is required per process (no start date).
- Target Completion Dates appear in the Monthly Schedule report (auto-refresh every 5 min).
- **QC is always the last routing process.** No in-process QC. QC time is **not** counted as routing cost.
- Purchaser can issue a PO-Subcon **only after** routing is set.
- A routing process tagged with subcon cannot start until that subcon PO is **fully received**.
- Within one in-process-assembly: routing runs **strictly in sequence**, no parallel.
- Across different in-process-assemblies: routing can run **concurrently** provided the planner sets `Conditional SN` preconditions correctly.
- A new in-process or routing process added later can only be **appended after** existing completed and WIP ones.
- User can advance to the next routing process only when **all WO quantity** for the current routing process is completed.

## Timesheet

- Populated by Production Terminal scan IN/OUT.
- Total minute & process cost is computed (Cost Per Minute × minutes).
- Authorized user may overwrite timesheet info.

## Process parameters

- Three forms — **Welding / Spray Painting / Machining** — chosen by the flag set on the Process Profile row.
- All parameter values flow in from Production Terminal scan-out; only Supervisor can confirm them (Process Parameter Confirmation module).

## Label printing

The Label Expiry Date / Qty / UOM fields exist on the WO header for the Delivery Label printout only — **they do not save into the system** (Qty/UOM default from WO; user may override before printing).

## Fields — Work Order (header)

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | Work Order No | Read-only | System | — | `8XXXXX-A-B` |
| 2 | Date | Date | User | Y | Default today; forward OK, backdate no |
| 3 | Customer | Read-only | from SO | — | |
| 4 | Internal Quotation No | Read-only | from SO | — | |
| 5 | Customer PO Ref | Read-only | from SO | — | |
| 6 | Project Code | Read-only | from SO | — | |
| 7 | Delivery Date | Read-only | from SO | — | |
| 8 | Job Description | Read-only | from SO | — | |
| 8a | Part Name | Text | from SO (Finished Good description) | N | Prefilled at WO creation; editable until Void / Cancelled / Completed. Shown on the WO printout and used to prefill the CoC Part Name |
| 9 | Quantity | Read-only | from SO | — | |
| 10 | UOM | Read-only | from SO | — | |
| 11 | Amount | Read-only | from SO | — | |
| 12 | Remark | Multi-text | User | N | |
| 13 | Routing Process | Hyperlink | — | — | drills into In-Process list |
| 14 | QC Acceptance | Read-only | QC Approval | — | N/A / Rejected / Approved (must be Approved to deliver) |
| 15 | QC By | Read-only | QC Approval | — | |
| 16 | QC Date | Read-only | QC Approval | — | |
| 17 | Label Expiry Date | Date | User | N | Print-only, not stored |
| 18 | Label Qty | Numeric | User | Y | Print-only |
| 19 | Label UOM | Dropdown | UOM | Y | Print-only |
| 20 | Upload | Hyperlink | — | — | |
| 21 | Status | Read-only | — | — | Draft / Void / Proceed / WIP / On Hold / Pending for QC / Completed / Cancelled |

## Fields — Work Order In Process

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | SN | Read-only | System | — | Sort key |
| 2 | Description | Text | User | Y | Unique within WO |
| 3 | Conditional SN | Dropdown | prior SNs in this WO | N | Precondition |
| 4 | All | Checkbox | User | N | |
| 5 | Target Completion Date | Date | User | Y | |
| 6 | Routing Process | Hyperlink | — | — | |
| 7 | Remark | Multi-text | User | N | |
| 8 | Status | Read-only | Detail page | — | New / WIP / Completed |
| 9 | Upload | Hyperlink | — | — | |

## Fields — Work Order In Process → Routing Process

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | SN | Text | User | Y | Y; sort key |
| 2 | Main Process | Dropdown | Process Profile | Y | |
| 3 | Routing Process | Dropdown | Process Profile (filtered by Main) | Y | |
| 4 | Target Completion Date | Date | User | Y | |
| 5 | Fully Received? | Read-only | System | — | Only for subcon-engaging steps |
| 6 | Employee | Hyperlink | — | — | drills into scan log |
| 7 | Remark | Multi-text | User | N | |
| 8 | Status | Read-only | System | — | New / WIP / Completed |
| 9 | Upload | Hyperlink | — | — | |

## Fields — In-Process → Routing Process → Employee (per scan)

All read-only, from Production Terminal: Employee Name, Time IN, Time OUT, Total Minute (computed from IN/OUT), Completed (flag), Completed Qty, Machine Code (comma-separated if multiple), Process Parameter (hyperlink).

## Fields — Process Parameter (Welding)

All values are populated from Production Terminal scan-out; Status / Confirmed By / Confirmed Date come from Process Parameter Confirmation.

Type of Material (multi-select), Type of Welding (multi-select), Welding Machine, Machine No, Brand, Model, Current, S/No (last five from Machine Profile based on Welding Machine), Type of Joint, Electrode Type, Welding Position (1F–4F / 1G–6G), Welding Joint (int), Welding Size (mm, int), Voltage (V, int), Current (A, int), Cooling Time (mins, int), Pre Heating (°C, int), Post Heating (°C, int), Heat Treatment (HRC, int), Remark, Status, Confirmed By, Confirmed Date.

## Fields — Process Parameter (Spray Painting)

Three sequential blocks: **A. Surface Preparation (Blasting / Power Tool / Solvent)**, **B. Primer Coat**, **C. Top Coat**. Each block: Start Date Time, End Date Time, General Weather Condition (Dry/Wet), Environmental Temperature, Relative Humidity, plus for Surface Prep: Abrasive Type, Sandpaper Grit (for Sand Blasting only). Primer & Top Coat each have Paint Batch No, Expiry Date, DFT Measurement Result. Top Coat additionally has Adhesive Test Result. Header has Paint Tank Pressure (psi), Spray Nozzle Size (Ø), Type of Paint, Remark, Additional Remark. Footer (from Confirmation): Status, Elcometer Name, Elcometer Serial No, Confirmed By, Confirmed Date.

## Fields — Process Parameter (Machining)

Machine Type, Machine Serial No, Machine No/Name, Brand, Model (last four from Machine Profile by Serial No), Operation Type, CNC Program No, Test Run, Special Tooling, Part Runtime (Hr), Part Runtime (Mins), Tool List (hyperlink to a sub-list — `Tool List` field, 1 decimal), Remark, Status, Confirmed By, Confirmed Date.
