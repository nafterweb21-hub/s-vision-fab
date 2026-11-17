"use client";

import { useState } from "react";
import { Printer } from "lucide-react";

export type LabelKind = "envelope" | "shipping";
export type LabelSize = "large" | "medium" | "small";

export type LabelData = {
  to: { name: string; address: string; gstin: string; contactPerson: string; phone: string };
  from: { name: string; address: string; gstin: string; contactPerson: string; phone: string; email: string };
  /** Document name as printed in "DOCUMENT DETAILS", e.g. "INVOICE", "CREDIT NOTE", "D.O.". */
  docLabel: string;
  docNo: string;
  docDate: string;
  poNo: string;
  logoUrl: string;
};

/** Paper size (mm, landscape) and base font size (pt) per label type and size. */
const SIZES: Record<LabelKind, Record<LabelSize, { w: number; h: number; font: number; hint: string }>> = {
  envelope: {
    large: { w: 279, h: 127, font: 12, hint: '11" × 5" envelope' },
    medium: { w: 241, h: 105, font: 11, hint: '9.5" × 4.1" (#10) envelope' },
    small: { w: 220, h: 110, font: 10, hint: "DL envelope (220 × 110 mm)" },
  },
  shipping: {
    large: { w: 210, h: 148, font: 10.5, hint: "A5 landscape label" },
    medium: { w: 152, h: 102, font: 8, hint: '6" × 4" label' },
    small: { w: 127, h: 89, font: 6.6, hint: '5" × 3.5" label' },
  },
};

const up = (s: string) => s.toUpperCase();

/** Inline-editable text: lets the user correct a line on screen before printing. */
function E({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={className} contentEditable suppressContentEditableWarning spellCheck={false}>
      {children}
    </span>
  );
}

/**
 * Envelope / shipping label shared by the invoice, credit note, debit note and
 * delivery order printouts. Type and size are picked on screen.
 */
export default function AddressLabel({
  data,
  initialType,
  initialSize,
}: {
  data: LabelData;
  initialType: LabelKind;
  initialSize: LabelSize;
}) {
  const [type, setType] = useState<LabelKind>(initialType);
  const [size, setSize] = useState<LabelSize>(initialSize);
  const s = SIZES[type][size];
  const { to, from } = data;

  return (
    <>
      <style>{`
        @page { size: ${s.w}mm ${s.h}mm; margin: 0; }
        html, body { margin: 0; padding: 0; }
        body { background: #e5e7eb; }

        .lbl-controls {
          position: sticky; top: 0; z-index: 10;
          display: flex; flex-wrap: wrap; align-items: center; gap: 16px;
          padding: 10px 16px; background: #fff; border-bottom: 1px solid #d1d5db;
          font-family: system-ui, sans-serif; font-size: 13px; color: #1f2937;
        }
        .lbl-controls .grp { display: flex; align-items: center; gap: 12px; }
        .lbl-controls label { display: flex; align-items: center; gap: 4px; cursor: pointer; }
        .lbl-controls .hint { color: #6b7280; font-size: 12px; }
        .lbl-controls button {
          margin-left: auto; display: flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer;
          background: #1e3a8a; color: #fff; font-weight: 600;
        }
        .lbl-stage { padding: 24px 16px; overflow-x: auto; }

        .sheet {
          width: ${s.w}mm; height: ${s.h}mm; margin: 0 auto; box-sizing: border-box;
          padding: 5mm; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.18);
          font-family: Arial, Helvetica, sans-serif; font-size: ${s.font}pt; color: #111;
          line-height: 1.25;
        }
        .frame {
          width: 100%; height: 100%; box-sizing: border-box;
          border: 1.5px solid #111; border-radius: 3mm; padding: 4mm 5mm;
          position: relative; overflow: hidden;
        }
        [contenteditable]:hover { outline: 1px dashed #93c5fd; }
        [contenteditable]:focus { outline: 1px dashed #3b82f6; }
        .addr { white-space: pre-line; }

        /* Envelope */
        .env .to { max-width: 62%; }
        .env .cap { font-weight: 700; }
        .env .name { font-weight: 700; display: block; margin: 0.6em 0 0.3em; font-size: 1.1em; }
        .env .logo { position: absolute; top: 4mm; right: 5mm; width: 34%; max-height: 35%; object-fit: contain; object-position: right top; }
        .env .from { position: absolute; left: 50%; right: 5mm; bottom: 4mm; font-size: 0.92em; }
        .env .from .cap { text-decoration: underline; }
        .env .from .name { text-decoration: underline; font-size: 1.08em; margin: 0.3em 0 0.2em; }

        /* Shipping */
        .shp .frame { display: flex; flex-direction: column; padding: 2.5mm 4mm; }
        .shp .sec { padding: 1.2mm 0; }
        .shp .sec + .sec { border-top: 1.2px solid #111; }
        .shp .cap { font-weight: 700; text-decoration: underline; font-size: 1.05em; }
        .shp .name { display: block; font-weight: 700; font-size: 1.45em; margin: 0.2em 0 0.25em; line-height: 1.15; }
        .shp .from-wrap { display: flex; align-items: center; gap: 4mm; }
        .shp .from-wrap > div { flex: 1; min-width: 0; }
        .shp .logo { width: 32%; max-height: 22mm; object-fit: contain; object-position: right center; }
        .shp .docs { display: grid; grid-template-columns: auto 1fr auto auto; column-gap: 4mm; row-gap: 0.4em; align-items: end; margin-top: 0.3em; }
        .shp .docs .k { font-weight: 700; }

        @media print {
          body { background: #fff; }
          .lbl-controls { display: none !important; }
          .lbl-stage { padding: 0; overflow: visible; }
          .sheet { margin: 0; box-shadow: none; }
          [contenteditable]:hover, [contenteditable]:focus { outline: none; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="lbl-controls">
        <div className="grp">
          {(["envelope", "shipping"] as const).map((k) => (
            <label key={k}>
              <input type="radio" name="kind" checked={type === k} onChange={() => setType(k)} />
              {k === "envelope" ? "Envelope" : "Shipping"}
            </label>
          ))}
        </div>
        <div className="grp">
          {(["large", "medium", "small"] as const).map((k) => (
            <label key={k}>
              <input type="radio" name="size" checked={size === k} onChange={() => setSize(k)} />
              {k[0].toUpperCase() + k.slice(1)}
            </label>
          ))}
          <span className="hint">{s.hint} — click any text to edit before printing</span>
        </div>
        <button onClick={() => window.print()}>
          <Printer size={15} /> Print
        </button>
      </div>

      <div className="lbl-stage">
        {type === "envelope" ? (
          <div className="sheet env" key={`env-${size}`}>
            <div className="frame">
              <div className="to">
                <div className="cap">TO:</div>
                <E className="name">{up(to.name)}</E>
                <E className="addr">{up(to.address)}</E>
              </div>
              <img className="logo" src={data.logoUrl} alt="Logo" />
              <div className="from">
                <div className="cap">FROM:</div>
                <E className="name">{up(from.name)}</E>
                <E className="addr">{up(from.address)}</E>
                {from.phone && <div><E>(M) {from.phone}</E></div>}
                {from.email && <div><E>{up(from.email)}</E></div>}
              </div>
            </div>
          </div>
        ) : (
          <div className="sheet shp" key={`shp-${size}`}>
            <div className="frame">
              <div className="sec">
                <div className="cap">TO</div>
                <E className="name">{up(to.name)}</E>
                <div><E className="addr">{up(to.address)}</E></div>
                {to.gstin && <div><E>GST NO :{up(to.gstin)}</E></div>}
                {to.contactPerson && <div><E>CONTACT PERSON :{up(to.contactPerson)}</E></div>}
                {to.phone && <div><E>PHONE :{to.phone}</E></div>}
              </div>

              <div className="sec from-wrap">
                <div>
                  <div className="cap">FROM</div>
                  <E className="name">{up(from.name)}</E>
                  <div><E className="addr">{up(from.address)}</E></div>
                  {from.gstin && <div><E>GST NO :{up(from.gstin)}</E></div>}
                  <div><E>CONTACT PERSON :{up(from.contactPerson)}</E></div>
                  {from.phone && <div><E>PHONE :{from.phone}</E></div>}
                </div>
                <img className="logo" src={data.logoUrl} alt="Logo" />
              </div>

              <div className="sec">
                <div className="cap">DOCUMENT DETAILS</div>
                <div className="docs">
                  <span className="k">{data.docLabel} NO.:</span>
                  <E>{data.docNo}</E>
                  <span />
                  <span />
                  <span className="k">P.O. NO.:</span>
                  <E>{data.poNo || "-"}</E>
                  <span className="k">{data.docLabel} DATE:</span>
                  <E>{data.docDate}</E>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
