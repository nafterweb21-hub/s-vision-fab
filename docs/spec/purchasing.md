# Purchasing (Material / Non-Material)

Covers the material/non-material purchase chain. **Subcon purchasing is separate** — see [subcon.md](subcon.md).

Chain: **Purchase Requisition → Purchase Order → PO Approval → Goods Receive → (Goods Return)**.

Both with-WO and without-WO purchases use the same chain. The only company gate: `Vision Laser` cannot have with-WO POs (Company Profile flag).

---

## Purchase Requisition (PR)

**Purpose:** mandatory prerequisite before any material / non-material PO can be issued.

### Rules

- Two flavours: with-WO, without-WO. (Vision Laser is without-WO only.)
- **1 PR : 1 WO** (or none). **1 WO : n PR**.
- Items can come from Material Profile (auto-populated fields) or be free-text (not from profile).
- `Cancel Quantity` is for items the purchaser decides not to buy (drawn internally). System shows `Balance Require Purchase = PR Qty − PO Qty Issued`.
- Supplier / unit price / amount are **not** captured on a PR (those belong to the PO).
- Email notification to designated persons on PR submit.
- **No approval, no printout** for PR.

  *(However a `Purchase Requisition` printout is defined in §3.3.10 — keep both possibilities in mind.)*

### Number format

`PRYYXXXXX-RN` → `PR1700003-R2`. 5-digit running, **reset yearly**.

### Status flow

Status: `Draft → Submitted | Void`.
PO Status: `N/A → Partially Issued → Fully Issued | Cancelled`.

### Fields — header

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | Company | Dropdown | Company | Y | |
| 2 | PR No | Read-only | System | — | `PRYYXXXXX-RN` |
| 3 | PR Date | Date | User | Y | Default today; forward OK |
| 4 | Work Order | Dropdown | Work Order | N | |
| 5 | Work Description | Read-only | from WO | — | |
| 6 | Requested By | Dropdown | Employee | Y | default login |
| 7 | Remark | Multi-text | User | N | |
| 8 | Status | Read-only | — | — | Draft / Void / Submitted |
| 9 | PO Status | Read-only | Computed | — | N/A / Partially Issued / Fully Issued / Cancelled |

### Fields — Detail (from Material Profile vs free-text)

Both variants share the same columns; the "from Profile" variant has Material / Description / Shape / Size / UOM **read-only from Material**, while the free-text variant has them as user inputs (with UOM read-only from Material reference when applicable).

Common: Quantity (Numeric, Y, 2 dec), Cancel Quantity (Numeric, N, 2 dec), PR Quantity (= Qty − Cancel Qty, 2 dec), Delivery Date (Date, Y), Remark, PO Quantity Issued (computed), Balance Require Purchase (= PR Qty − PO Qty Issued).

---

## Purchase Order (PO) — Material

**Purpose:** order material / non-material from supplier. Subcon goes through PO-Subcon.

### Rules

- **PR is mandatory** before issuing a PO.
- **1 PO : 1 PR. 1 PR : n PO.**
- Within one PO, items may come from Material Profile or be free-text.
- **All POs require approval.** See [PO Approval](#po-approval) below.
- Supplier email is optional; a PO can be submitted for approval with a blank email (the supplier auto-email on approval is skipped when blank).
- Exchange rate = latest from Currency Profile at PO creation.
- No discount columns — unit price / amount are the final net.
- For each line, purchaser indicates **how much of the PR quantity** this PO consumes, so the system can compute outstanding PR.
- Total PO qty **may exceed** PR qty (oversupply). For subsequent purchases of the same material, raise a new PR.
- Cost-allocation guidance (scenario in §3.2.8): if WO-A needs 12 and WO-B needs 3, bulk-buy 20 is cheaper. Options:
  - PO1 = 17 → WO-A, PO2 = 3 → WO-B (extra 5 lumped into A).
  - PO1 = 12 → WO-A, PO2 = 3 → WO-B, PO3 = 5 → no WO (extra 5 not in any job cost).
- Job cost per WO = sum of issued POs tied to that WO.
- One PO printout style; no handwritten signature required.

### Number format

`POYYXXXXX-RN` → `PO1700003-R2`. **Material PO and Subcon PO share the same sequence.**

### Status flow

`Draft → Pending For Approval → Rejected | Approved → Issued`.
Revisions: original goes to `Old Version`, new row is `Revised`.
Receive Status (auto): `NA / Not Received / Partially Received / Fully Received`.

### PO Approval

- **Two tiers**, value-banded via Approval Level Profile.
- If `PO Amount After Tax` falls in Tier-1: one Tier-1 approver suffices.
- If it falls in Tier-2: Tier-1 must approve first, then any Tier-2 approver.
- Tier-1 rejection skips Tier-2 entirely.
- On approve: PO Status → Issued, record removed from Approval module. System auto-emails the supplier (CC purchaser) with the PO PDF attached.
- On reject: PO Status → Rejected, email to purchaser. Purchaser revises and re-submits.
- The PO Approval module is read-only; the only user input is `Approval Remark` (Multi-text, N).

### Fields — PO header (material)

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | Company | Dropdown | Company | Y | |
| 2 | PO No | Read-only | System | — | `POYYXXXXX` |
| 3 | Revision | Read-only | System | — | |
| 4 | PO Date | Date | User | Y | default today; forward OK |
| 5 | Supplier | Dropdown | Supplier | Y | |
| 6 | Work Order No | Dropdown | Work Order | N | Disabled if Company `Allow to create PO for WO` is unticked |
| 7 | PR No | Dropdown | PR (filtered by WO) | N | |
| 8 | Currency | Dropdown | Currency | Y | |
| 9 | Exchange Rate | Read-only | latest | — | |
| 10 | Tax Type | Dropdown | Tax | Y | |
| 11 | Tax Rate | Read-only | from Tax Type | — | |
| 12 | PO Amount Before Tax | Read-only | Σ items | — | |
| 13 | Tax Amount | Read-only | Before × Rate | — | |
| 14 | PO Amount After Tax | Read-only | Before + Tax | — | |
| 15 | Mill Certificate | Checkbox | User | N | default unticked |
| 16 | Certificate of Conformance | Checkbox | User | N | default unticked |
| 17 | Contact Person | Dropdown | Supplier Contact | Y | populates Tel/Fax/Mobile/Email below; editable |
| 18–21 | Tel / Fax / Mobile / Email | Text | from Contact | N | email optional |
| 22–23 | Approval By / Date (Tier 1) | Read-only | System | — | |
| 24–25 | Approval By / Date (Tier 2) | Read-only | System | — | |
| 26 | Receive Status | Read-only | Computed | — | |
| 27 | Purchaser | Dropdown | Employee | Y | default login |
| 28 | Remark | Multi-text | User | N | |
| 29 | Status | Read-only | — | — | Draft / Void / Old Version / Revised / Pending For Approval / Rejected / Approved / Issued |

### Fields — PO Detail (material)

Both "from Material Profile" and "not from Material Profile" share columns. The from-profile variant has Material / Description / Shape / Size read-only; the free-text variant lets you input them.

Common: Supplier Material No (auto-populated = "Material<br>Description", editable), Quantity (Y, 2 dec), PO UOM (default = PR UOM, editable), Unit Price (Y, 2 dec), Amount (= Qty × Unit Price), Conversion (Y, 2 dec, default 1), Internal UOM (from Material), Internal Quantity (= Qty × Conversion), Total Received, Total Returned, NETT Received (= Total Received − Total Returned), Delivery Date (Y), Remark.

---

## Goods Receive (GR)

**Purpose:** receive purchased items against a PO. (Subcon items don't come through this module — see SRT in [subcon.md](subcon.md).)

### Rules

- **1 GR : 1 PO. 1 PO : n GR.** A PO line can be received in multiple GRs.
- Receive Quantity cannot exceed remaining PO Quantity. To receive more, **revise the PO upward** (which re-triggers approval). To cancel quantity, revise PO downward.
- **Receive UOM must equal PO UOM.**
- Exchange rate is snapped from Currency Profile at GR creation, then **frozen** even if GR date is later changed.
- **No location, no extra cost column, no approval, no printout.**
- Extra physical quantity not needed → don't enter it (handle offline).
- One invoice per receive: `1 receive : 1 invoice`.

### Number format

`GRYYXXXXX` → `GR1700003`. Yearly reset.

### Status flow

`Draft → Submitted | Void`.

### Fields — header

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | Company | Dropdown | Company | Y | |
| 2 | GR No | Read-only | System | — | `GRYYXXXXX` |
| 3 | GR Date | Date | User | Y | default today |
| 4 | Supplier | Dropdown | Supplier | Y | |
| 5 | PO No | Dropdown | PO (by Supplier) | Y | |
| 6 | PR No | Read-only | from PO | — | |
| 7 | WO No | Read-only | from PO | — | |
| 8 | Currency | Read-only | from PO | — | |
| 9 | Exchange Rate | Read-only | snapped on create | — | frozen |
| 10–11 | Tax Type / Rate | Read-only | from PO | — | |
| 12–13 | DO No / DO Date | Text/Date | User | N | supplier DO info |
| 14–15 | Invoice No / Invoice Date | Text/Date | User | N | |
| 16 | Remark | Multi-text | User | N | |
| 17 | Creator | Dropdown | Employee | Y | default login |
| 18 | Status | Read-only | — | — | Draft / Void / Submitted |

### Fields — Detail

Both Material-Profile / free-text variants. All columns are mirrors from the selected PO; the **only user inputs** are `Receive Quantity` (Numeric, Y, 2 dec) and `Remark`. `Amount = Receive Qty × Unit Price`, `Internal Quantity = Receive Qty × Conversion`.

---

## Goods Return (RTN)

**Purpose:** return previously-received items to supplier.

### Rules

- **1 RTN : 1 GR. 1 GR : n RTN.**
- Return Qty ≤ Receive Qty.
- Return UOM must equal PO UOM.
- Returning updates the PO Receive Status.
- If no replacement is coming, purchaser must revise the PO downward to get the right Receive Status.
- **No approval, no printout.**

### Number format

`RTNYYXXXXX` → `RTN1700003`. (The source occasionally calls this "RET" in prose but the format prefix is **RTN**.) Yearly reset.

### Status flow

`Draft → Submitted | Void`.

### Fields — header

| # | Field | Type | Source | Mand | Notes |
|---|---|---|---|---|---|
| 1 | Company | Dropdown | Company | Y | |
| 2 | RTN No | Read-only | System | — | `RTNYYXXXXX` |
| 3 | RTN Date | Date | User | Y | default today |
| 4 | Supplier | Dropdown | Supplier | Y | |
| 5 | PO No | Dropdown | PO (by Supplier) | Y | |
| 6 | GR No | Dropdown | GR (by PO) | — | |
| 7 | PR No | Read-only | from PO | — | |
| 8 | WO No | Read-only | from PO | — | |
| 9 | Currency | Read-only | from PO | — | |
| 10 | Exchange Rate | Read-only | snapped on create | — | |
| 11–12 | Tax Type / Rate | Read-only | from PO | — | |
| 13 | Remark | Multi-text | User | N | |
| 14 | Creator | Dropdown | Employee | Y | default login |
| 15 | Status | Read-only | — | — | Draft / Void / Submitted |

### Fields — Detail

Mirrors the GR detail; only user input is `Return Quantity` (Y, 2 dec) and `Remark`. `Amount = Return Qty × Unit Price`, `Internal Quantity = Return Qty × Conversion`.
