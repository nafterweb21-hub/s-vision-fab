# Delivery Order & Certificate of Conformity

---

## Delivery Order (DO)

**Purpose:** track whether WO quantities have been fully delivered to the customer. The actual delivery is done outside the system.

### Rules

- Only finished goods that have passed QC can be delivered.
- **1 DO : 1 SO.** **1 DO : n WO** (a single DO can cover multiple WOs of the same SO).
- **No return / re-delivery.** Internal-fault returns = handled offline; customer-request re-delivery = new sales order.
- **DO No is user-entered**, not system-generated.
- **No approval, no printout.**
- **`COC Required` checkbox**: if unticked, DO can be submitted with no COC. If ticked, ≥1 COC must be created and **all** related COCs must be Approved before the DO can be submitted.
- **End-to-end DO/COC flow:** Create DO → Create COC(s) → COC Check → COC Approval → DO Submission.

### Status flow

`Draft → Submitted | Void`.

### Fields — header

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | DO No | Text | User | Y | Unique. Not system-generated. |
| 2 | DO Date | Date | User | Y | |
| 3 | Customer Name | Dropdown | Sales Order | Y | |
| 4 | SO No | Dropdown | filtered by Customer | Y | |
| 5 | Customer PO Ref | Read-only | from SO | — | |
| 6 | COC Required | Checkbox | User | N | default unticked |
| 7 | Status | Read-only | — | — | Draft / Submitted / Void |
| 8 | Returnable Delivery Challan | Checkbox | User | N | default unticked. For goods not for sale (e.g. sent for testing and return). Printout title becomes "RETURNABLE DELIVERY CHALLAN". |
| 9 | Returnable Note | Textarea | User | N | shown when #8 is ticked; defaults to "Not for sale / Send for testing and return"; printed below the items. |

### Fields — Item

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | Work Order No | Dropdown | filtered by SO | Y | |
| 2 | Quantity | Numeric | User | Y | 0 dec; total ≤ WO Qty |
| 3 | UOM | Read-only | from WO | — | |
| 4 | Delivery Date | Read-only | from WO | — | |
| 5 | Total Value | Numeric | DO Qty × SO line Unit Price (editable) | N | 2 dec. Re-calculated on WO/qty change unless the user typed a different value. Shown only on returnable challans; summed as "Value of Goods" on the form and printout. |

---

## Certificate of Conformity (COC)

**Purpose:** issue a conformity certificate during delivery.

### Rules

- COC can only be **created** when the parent DO has `COC Required = ticked` **and** DO is not yet Submitted.
- **1 DO : n COC. 1 COC : 1 DO.**
- **Four types:** Spray Painting / Welding / Pressure / Final. Pressure and Final use the **same printout** ([Pressure/Final layout](printouts.md#coc-pressure--final)). Welding and Spray Painting each have their own.
- Workflows are identical across all four types.
- One COC ties to exactly **one painter or one machine**. More painters/machines → more COCs.
- **Uniqueness:** the combination of `DO No + COC Type + WO No + Routing Process + Welder + Painter + Part Number + Machine` must be unique.
- Requires **one Check + one Approval** (list of check/approval persons from Approval Level Profile). Approval can only proceed after Check is done.

### Number format

`COCYYXXXXX` → `COC1700003`. Yearly reset.

### Status flow

`Draft → Require Approval → Approved`.

### Steps to create

1. Select Customer, DO No, WO No.
2. Select COC Date and COC Type.
3. Optionally change COC Quantity / UOM.
4. Fill remaining info.
5. COC No auto-generated.

### Fields

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | COC No | Read-only | System | — | `COCYYXXXXX` |
| 2 | Date | Date | User | Y | |
| 3 | Type | Choice | — | Y | Final / Pressure / Spray Paint / Welding (drives printout) |
| 4 | Customer | Dropdown | DO | Y | |
| 5 | DO No | Dropdown | filtered by Customer | Y | |
| 6 | WO No | Dropdown | filtered by DO | Y | |
| 7 | Description | Read-only | from WO | — | |
| 8 | Drawing No | Text | User | N | When Type = Final, always = SO Part No (system-fixed). Otherwise free text. |
| 9 | Customer Ref No | Read-only | from WO | — | |
| 10 | WO Quantity | Read-only | from WO | — | |
| 11 | DO Quantity | Read-only | from DO | — | |
| 12 | WO/DO UOM | Read-only | from WO | — | |
| 13 | COC Quantity | Numeric | User | Y | default = DO Qty |
| 14 | COC UOM | Numeric | User | Y | default = DO UOM |
| 15 | SAN No | Text | User | N | **Welding section** |
| 16 | Welder Name | Dropdown | Scanning Terminal by Routing | N | |
| 17 | Welder ID No | Read-only | Employee NRIC/FIN | — | |
| 18 | Welding Process | Dropdown | Scanning Terminal by WO | N | |
| 19 | Welding Machine Serial No | Dropdown | Scanning Terminal by WO | N | |
| 20 | Part Name | Text | User | N | **Spray Paint section**. Prefilled from the selected Work Order's Part Name when empty; user can override |
| 21 | Part Number | Text | User | N | |
| 22 | Painting SAN No | Text | User | N | |
| 23 | Painter Name | Dropdown | Scanning Terminal by Routing | N | |
| 24 | Painter ID No | Read-only | Employee NRIC/FIN | — | |
| 25 | Painting Method | Dropdown | Painting Method | N | |
| 26 | Painting Specification | Text | User | N | |
| 27 | Paint Thickness Specification | Text | User | N | |
| 28 | Measured Total Paint Thickness | Text | from WO Spray Paint Top Coat DFT | N | |
| 29 | Paint Batch No | Text | from WO Spray Paint Top Coat | N | |
| 30 | Inspection Equipment | Text | User | N | |
| 31 | Checked By | Read-only | activate button | — | |
| 32 | Approved By | Read-only | activate button | — | |
| 33 | Status | Read-only | — | — | Draft / Require Approval / Approved |
