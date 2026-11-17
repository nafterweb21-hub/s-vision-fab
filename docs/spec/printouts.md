# Printouts

Universal rules for all printouts:

- **PDF only.**
- **Blank A4** paper (no pre-printed letterhead) — except Delivery Label which is a **102 × 51 mm sticker**.
- **Font:** Calibri 10.
- **Color code:** Black = fixed/hardcoded text, Blue = dynamic text from data.
- Printable regardless of record status (Draft included).
- Auto-fetched company info from Company Profile (logo, address, phone, fax, GST reg no, footer image).
- Footer line (where applicable): `This is computer-generated document. No signature is required.`
- "Requirement (AS9100 product) - Supplier shall:" block appears on PO, PO-Subcon, SRF, PR when Company Profile `AS9100 Requirement Note Required?` is ticked. Content fixed per source.

---

## 1. Work Order

Source module: Work Order. Form code `V-OPS-001 Rev F`.

Shows: `WORK ORDER SHEET` heading, WO No (with **barcode** of the WO No), Customer, Delivery Date, Internal Quo No, Customer Ref No, Project Code, Part Name, Job Description, Qty.

---

## 2. Delivery Label (sticker)

Source module: Work Order. Sticker `102 × 51 mm`.

Fields:
- `SKU` = SO Item Part No (+ barcode of SKU)
- `Desc` = SO Item Description
- `Proj Code` = SO Project Code
- `PO Number` = SO Customer PO Ref
- `Expiry Date` = chosen at print time (not stored)
- `EUC` = `NIL`
- `Qty` = default WO Qty, editable at print time (not stored)
- `UOM` = default WO UOM, editable at print time (not stored) (+ Qty UOM barcode)

---

## 3. Non-Conformance Report (NCR)

Source module: NCR. Form code `SP-08-F01 Rev I`. Heading: `NON-CONFORMANCE REPORT [ IN HOUSE ]`. Includes Company Profile address.

Shows all NCR fields: Product Description, Date, CNR No, Work Order No, Cust Ref No, Part No, Qty, Project No, Raised By, Description of Non-Conformance, Disposition Decision quantities, Customer signature line for Use-As-Is, Cause of Discrepancy department + Failure Mode checkboxes, Corrective Action + reason, Root Cause, Responsible Staff + sign/date, Corrective/Preventive Action + sign/date, Follow-Up, Action Taken, Verified/Confirmed By + signature/date.

---

## 4. Purchase Order

Source module: Purchase Order. Includes company letterhead (logo, address, phone/fax, GST reg).

Shows: `PURCHASE ORDER` heading, **To** block (supplier address, Attn, Tel, Fax, Email), PO No, Date, Purchaser, Email, items table (Item / Material / Shape / Size / Delivery Date / Qty / UOM / Unit Price / Amount), Total / GST line / Total in currency, `Require` block (Mill Certificate / Cert of Conformance checkboxes), Remark, AS9100 supplier-shall block (if applicable), `Approved By` line.

---

## 5. Purchase Order — Subcon

Same shape as Purchase Order printout but heading is `PURCHASE ORDER - SUBCON`. Items table columns differ: Item / Material / **Main Process** / **Routing Process** / Delivery Date / Qty / UOM / Unit Price / Amount. Material block on each row also shows `Thickness` and `Hardness` lines.

---

## 6. Subcon Request Form

Source module: SRF. Form code `V-PUR-003 Rev C`. Heading: `SUB-CONTRACTOR REQUEST FORM`.

Shows: Work Order, Date of Purchase, Sub-Contractor, Date Required, Outsource By, Date, then the chosen Main Process checkbox group (e.g. ☑ Fabricate of Parts), Part Description, Qty, Process, Hardness, Thickness, Remark, AS9100 supplier-shall block, `Received By: ____` signature line.

---

## 7. COC — Pressure / Final

Source module: COC. Form code `V-QA-011 Rev B`. **Pressure and Final share this layout.**

Heading: `CERTIFICATE OF CONFORMITY`. Shows: Customer, Description, Drawing No, PO No (= Customer PO Ref), Work Order No, Quantity, Vision One DO, Date Issued.

Body: *"THIS IS TO CERTIFY THAT THE FOLLOWING PARTS STATED IN THE COC ARE MANUFACTURED ACCORDING TO THE REQUIREMENTS AS STATED IN THE `<CUSTOMER>` DRAWINGS."*

Two signature blocks side-by-side: **Checked By: QC INSPECTOR `<name>`** | **Approved By: QC MANAGER `<name>`**, then **Authorised Signature** lines. Footer image from Company Profile.

---

## 8. COC — Welding

Source module: COC. Same heading and basic layout as Pressure/Final, plus:

- `SAN NO`
- `WELDER NAME & ID` = `<name> (<NRIC/FIN>)`
- `WELDER ID NO`
- `WELDING PROCESS`
- `WELDING MACHINE SERIAL NO`
- `VISION ONE DO`
- `DATE OF COC`

Body text and signature blocks identical to Pressure/Final.

---

## 9. COC — Spray Painting

Source module: COC. Heading + customer info, then:

- `PART NAME`
- `PART NUMBER`
- `PO NO`
- `QUANTITY`
- `PAINTING SAN NUMBER`
- `PAINTER NAME`
- `PAINTER ID NO`
- `PAINTING METHOD`
- `PAINTING SPECIFICATION`
- `PAINT THICKNESS SPECIFICATION`
- `MEASURED TOTAL PAINT THICKNESS`
- `PAINT BATCH NUMBER`
- `INSPECTION EQUIPMENT`
- `DATE OF COC`
- `VISION ONE DO`

Inspection block: *"Individual coat and completed coating are inspected for appearance. Coatings shall be free from pinholes, blisters, craters, sogging, flakking, peeling and dry spray."*

Signature blocks identical to Pressure/Final.

---

## 10. Purchase Requisition

Source module: PR. Form code `V-PUR-002 Rev D`. Heading: `PURCHASE REQUISITION`.

Shows: PR No, Date, Requisitor, Work Order, items table (Item / Material / Shape / Size / Delivery Date / Qty / UOM), Require checkboxes (Mill Certificate / Cert of Conformance), Remark, AS9100 supplier-shall block.
