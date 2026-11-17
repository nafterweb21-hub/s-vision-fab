# Subcon Purchasing

Subcon (sub-contractor / outsource) chain — **separate from material purchasing**. No PR.

Chain: **PO-Subcon → PO-Subcon Approval → Subcon Request Form (SRF) → Subcon Return Tracking (SRT)**.

---

## PO — Subcon

**Purpose:** order outsourced services. May tie to a work order's specific routing process, or be free of any WO.

### Rules

- Two flavours: with-WO, without-WO. (Vision Laser is without-WO only; gated by `Allow to create PO for WO` on Company Profile.)
- **1 PO : 1 WO : n Part Descriptions : n Routing Processes.**
- One WO can issue multiple PO-Subcons.
- If one Part requires multiple processes, the purchaser **splits the lines** so each line maps to exactly one routing process.
- **No PR required** (unlike material POs).
- Same value-banded **two-tier approval** as material POs (see Approval Level Profile). On approve, **no auto-email to supplier** — purchaser sends manually.
- One PO-Subcon printout style; no signature.
- Exchange rate = latest from Currency Profile at PO creation; frozen thereafter.
- **No quantity/UOM conversion** on PO-Subcon items.
- PO UOM can differ from WO UOM.
- A routing process can only start once **all** PO-Subcon quantity for that routing process is fully received (via SRT).
- No discount columns — unit price / amount are the final net.
- Bulk-buy cost-allocation guidance is identical to material POs (split into multiple POs to attribute extra qty to a specific WO or to no WO).

### Number format

`POYYXXXXX-RN`. **Shared sequence with material POs.** Yearly reset.

### Status flow

Identical to material PO: `Draft / Void / Old Version / Revised / Pending For Approval / Rejected / Approved / Issued`. Receive Status: `NA / Not Received / Partially Received / Fully Received`.

### Steps to create

1. Select Company, Date, Purchaser, Supplier, Work Order No (if any), Currency.
2. PO No auto-generated.
3. Add PO items by picking **In-Process / Main Process / Routing Process** when WO is set; or just Main Process + Routing Process when no WO.
4. Fill in Description (to supplier), Quantity, UOM, Unit Price, Delivery Date.

### Fields — header

Same shape as material PO header, **without `PR No`**.

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | Company | Dropdown | Company | Y | |
| 2 | PO No | Read-only | System | — | `POYYXXXXX` |
| 3 | Revision | Read-only | System | — | |
| 4 | PO Date | Date | User | Y | default today |
| 5 | Supplier | Dropdown | Supplier | Y | |
| 6 | Work Order No | Dropdown | Work Order | N | Disabled by Company flag |
| 7 | Currency | Dropdown | Currency | Y | |
| 8 | Exchange Rate | Read-only | latest | — | snapped, frozen |
| 9 | Tax Type | Dropdown | Tax | Y | |
| 10 | Tax Rate | Read-only | from Tax | — | |
| 11 | PO Amount Before Tax | Read-only | Σ items | — | |
| 12 | Tax Amount | Read-only | Before × Rate | — | |
| 13 | PO Amount After Tax | Read-only | Before + Tax | — | |
| 14 | Mill Certificate | Checkbox | User | N | default unticked |
| 15 | Certificate of Conformance | Checkbox | User | N | default unticked |
| 16 | Contact Person | Dropdown | Supplier Contact | Y | populates Tel/Fax/Mobile/Email; editable |
| 17–20 | Tel / Fax / Mobile / Email | Text | from Contact | N | email optional |
| 21–22 | Approval By / Date (Tier 1) | Read-only | System | — | |
| 23–24 | Approval By / Date (Tier 2) | Read-only | System | — | |
| 25 | Receive Status | Read-only | Computed | — | NA / Not Received / Partially Received / Fully Received |
| 26 | Purchaser | Dropdown | Employee | Y | default login |
| 27 | Remark | Multi-text | User | N | |
| 28 | Status | Read-only | — | — | (same set as material PO) |

### Fields — Detail

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | Description | Text | User | Y | |
| 2 | Quantity | Numeric | User | Y | 0 dec |
| 3 | UOM | Dropdown | UOM | — | default = WO UOM, editable |
| 4 | Unit Price | Numeric | User | Y | 2 dec |
| 5 | Amount | Read-only | Qty × Unit Price | Y | 2 dec |
| 6 | In-Process Description | Read-only | from WO | Y | when with-WO |
| 7 | Main Process | Read-only | from WO | Y | |
| 8 | Routing Process | Read-only | from WO | Y | |
| 9 | Hardness | Text | User | N | |
| 10 | Thickness | Text | User | N | |
| 11 | Delivery Date | Date | User | Y | |
| 12 | Remark | Multi-text | User | N | |
| 13 | Quantity Acknowledged by Subcon | Read-only | Computed (Σ SRF) | — | |
| 14 | Quantity Returned by Subcon | Read-only | Computed (Σ SRT) | — | |

---

## PO — Subcon Approval

Same mechanism as material PO Approval, **but on Approve the system does not auto-email the supplier or attach the PO PDF** — only the purchaser is notified, and they send the PO out manually.

Read-only module; only user input is `Approval Remark`.

---

## Subcon Request Form (SRF)

**Purpose:** delivery note to the subcontractor — acknowledges items handed over. Mandatory once a PO-Subcon is Issued.

### Rules

- **1 SRF : 1 PO line : 1 Routing Process.**
- **1 PO line : n SRF** — items can be handed over in batches.
- Total SRF quantity per PO line ≤ PO line quantity.
- **No approval, no extra cost column, no UOM conversion.**
- Has its own printout.

### Number format

`SRFYYXXXXX` → `SRF1700003`. Yearly reset.

### Status flow

`Draft → Submitted | Void`. Receive Status (auto, against SRT): `N/A / Partially Received / Fully Received`.

### Steps to create

1. `[Outstanding PO item]` → list of unfulfilled PO-Subcon items.
2. Select a row → form is created with header fields imported.
3. SRF No auto-generated. Fill remaining info.

### Fields

Almost entirely imported from the selected PO item — read-only. User inputs:

| # | Field | Type | Mand | Notes |
|---|---|---|---|---|
| 7 | Outsourced By | Dropdown (Employee) | Y | default = PO Purchaser |
| 14 | Date Required | Date | Y | default = PO Delivery Date |
| 15 | Received By | Dropdown (Employee) | — | default = PO Contact Person |
| 16 | Quantity | Numeric | Y | 0 dec; default = PO Qty |
| 22 | Remark | Multi-text | N | |
| 23 | Status | Read-only | — | Draft / Void / Submitted |
| 24 | Receive Status | Read-only | — | N/A / Partially Received / Fully Received |

Other read-only header fields imported from PO: Company, SRF No (system), Supplier, PO No, PO Date, Currency, Work Order No, In-Process Description, Main Process, Routing Process, Part Description, PO UOM, Unit Price, Amount, Hardness, Thickness.

---

## Subcon Return Tracking (SRT)

**Purpose:** receive items back from subcon after work is done. The routing process upstream can only start once SRT is **fully received** for the relevant PO line.

### Rules

- **1 SRT : 1 SRF. 1 SRF : n SRT.**
- Σ SRT quantity ≤ SRF quantity.
- SRT UOM must equal PO UOM.
- **No extra cost, no location, no conversion, no approval, no printout.**

### Number format

`SRTYYXXXXX` → `SRT1700003`. Yearly reset.

### Status flow

`Draft → Submitted | Void`.

### Steps to create

1. Select Company, Supplier, PO No, SRF No.
2. Insert `Returned Qty` (default = subcon-acknowledged qty).
3. SRT No auto-generated.

### Fields

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | Company | Dropdown | Company | Y | |
| 2 | SRT No | Read-only | System | — | `SRTYYXXXXX` |
| 3 | SRT Date | Date | User | Y | default today |
| 4 | Supplier | Dropdown | Supplier | Y | |
| 5 | PO No | Dropdown | PO-Subcon | Y | only POs not fully returned |
| 6 | WO No | Read-only | from PO | — | |
| 7 | SRF No | Dropdown | SRF | Y | only SRFs not fully returned |
| 8 | In-Process Description | Read-only | from SRF | — | |
| 9 | Main Process | Read-only | from SRF | — | |
| 10 | Routing Process | Read-only | from SRF | — | |
| 11 | Part Description | Read-only | from SRF | — | |
| 12 | Date Required | Read-only | from SRF | — | |
| 13 | Acknowledged Quantity | Read-only | from SRF | — | |
| 14 | UOM | Read-only | from SRF | — | |
| 15 | Unit Price | Read-only | from SRF | — | |
| 16 | Amount | Read-only | from SRF | — | |
| 17 | Hardness | Read-only | from SRF | — | |
| 18 | Thickness | Read-only | from SRF | — | |
| 19 | Returned Qty | Numeric | User | Y | 0 dec; default = ack qty |
| 20 | Remark | Multi-text | User | N | |
| 21 | Status | Read-only | — | — | Draft / Void / Submitted |
