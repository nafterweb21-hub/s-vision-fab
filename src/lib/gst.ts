/**
 * Indian GST helpers for e-invoicing.
 *
 * The place of supply (POS) vs the supplier's state decides whether a supply is
 * intra-state (CGST + SGST, each half the total rate) or inter-state (IGST, the
 * full rate). Both states are identified by their 2-digit GST state code, which
 * is the first two characters of a GSTIN.
 */

/** GST state / union-territory codes (as per the GST portal). */
export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

/** GSTIN format: 2-digit state code + 10-char PAN + entity/checksum tail. */
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/;

export function isValidGstin(gstin: string | null | undefined): boolean {
  if (!gstin) return false;
  return GSTIN_RE.test(gstin.trim().toUpperCase());
}

/** First two characters of a GSTIN, if they are a known state code. */
export function stateCodeFromGstin(
  gstin: string | null | undefined,
): string | null {
  if (!gstin) return null;
  const code = gstin.trim().slice(0, 2);
  return GST_STATE_CODES[code] ? code : null;
}

export function stateNameForCode(code: string | null | undefined): string {
  if (!code) return "";
  return GST_STATE_CODES[code] ?? "";
}

/**
 * Resolve a 2-digit POS state code from a customer's free-text "place of supply"
 * field, falling back to the buyer's GSTIN state code. Accepts values like
 * "33", "33-Tamil Nadu", or "Tamil Nadu".
 */
export function resolvePosStateCode(
  placeOfSupply: string | null | undefined,
  buyerGstin: string | null | undefined,
): string | null {
  const pos = (placeOfSupply ?? "").trim();
  if (pos) {
    const leading = pos.match(/^(\d{2})/);
    if (leading && GST_STATE_CODES[leading[1]]) return leading[1];
    const lower = pos.toLowerCase();
    for (const [code, name] of Object.entries(GST_STATE_CODES)) {
      if (name.toLowerCase() === lower) return code;
    }
  }
  return stateCodeFromGstin(buyerGstin);
}

export function roundTo2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export type GstLineInput = {
  /** Taxable (pre-tax) amount for the line. */
  amount: number;
  /** Item level tax rate. */
  taxRate?: number;
};

export type GstLineBreakup = {
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
};

export type GstBreakup = {
  supplyType: "intra" | "inter";
  posStateCode: string | null;
  sellerStateCode: string | null;
  lines: GstLineBreakup[];
  totals: {
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    tax: number;
  };
};

/**
 * Compute the CGST/SGST/IGST breakup for an invoice.
 *
 * A single overall GST rate (`taxRatePercent`) is applied to each line's
 * taxable amount, then split by supply type. Per-line rounding keeps the
 * printed line tax and the totals internally consistent.
 */
export function computeGstBreakup(params: {
  lines: GstLineInput[];
  taxRatePercent: number;
  sellerGstin: string | null | undefined;
  posStateCode: string | null | undefined;
  isSez?: boolean;
  sezTaxRate?: number;
}): GstBreakup {
  const { lines, taxRatePercent, isSez } = params;
  const sellerStateCode = stateCodeFromGstin(params.sellerGstin);
  const posStateCode = params.posStateCode ?? null;

  // Intra-state only when both state codes are known AND equal. When the POS
  // cannot be determined we default to inter-state (IGST), which is the safer
  // assumption for the IRP schema.
  const supplyType: "intra" | "inter" =
    sellerStateCode && posStateCode && sellerStateCode === posStateCode
      ? "intra"
      : "inter";

  const baseRate = isSez ? (Number(params.sezTaxRate) || 0) : (Number(taxRatePercent) || 0);

  const breakupLines: GstLineBreakup[] = lines.map((l) => {
    const taxable = Number(l.amount) || 0;
    const rate = isSez ? baseRate : (l.taxRate !== undefined && !isNaN(l.taxRate) ? l.taxRate : baseRate);
    const lineTax = roundTo2((taxable * rate) / 100);
    if (supplyType === "intra") {
      const cgst = roundTo2(lineTax / 2);
      const sgst = roundTo2(lineTax - cgst);
      return { gstRate: rate, cgstAmount: cgst, sgstAmount: sgst, igstAmount: 0 };
    }
    return { gstRate: rate, cgstAmount: 0, sgstAmount: 0, igstAmount: lineTax };
  });

  const totals = breakupLines.reduce(
    (acc, l, i) => {
      acc.taxable += Number(lines[i].amount) || 0;
      acc.cgst += l.cgstAmount;
      acc.sgst += l.sgstAmount;
      acc.igst += l.igstAmount;
      return acc;
    },
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 },
  );
  totals.taxable = roundTo2(totals.taxable);
  totals.cgst = roundTo2(totals.cgst);
  totals.sgst = roundTo2(totals.sgst);
  totals.igst = roundTo2(totals.igst);
  totals.tax = roundTo2(totals.cgst + totals.sgst + totals.igst);

  return { supplyType, posStateCode, sellerStateCode, lines: breakupLines, totals };
}
