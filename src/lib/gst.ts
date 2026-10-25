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
 * Resolve a 2-digit GST state code from a GSTIN or free-text place/address.
 * Checks GSTIN first, then place/address string, then known cities/districts.
 */
export function resolveStateCode(
  gstin?: string | null,
  placeOrAddress?: string | null,
): string | null {
  // 1. Try GSTIN
  const fromGst = stateCodeFromGstin(gstin);
  if (fromGst) return fromGst;

  // 2. Try text / address
  const text = (placeOrAddress ?? "").trim();
  if (!text) return null;

  // Check leading 2-digits if it matches a state code (e.g., "33-Tamil Nadu" or "33")
  const leading = text.match(/^(\d{2})/);
  if (leading && GST_STATE_CODES[leading[1]]) return leading[1];

  const lower = text.toLowerCase();

  // Check all state names
  for (const [code, name] of Object.entries(GST_STATE_CODES)) {
    if (lower.includes(name.toLowerCase())) return code;
  }

  // Common Indian industrial clusters / cities to state code mapping
  const cityStateMap: Record<string, string> = {
    katpadi: "33", // Tamil Nadu (Vellore district)
    vellore: "33",
    chennai: "33",
    coimbatore: "33",
    madurai: "33",
    hosur: "33",
    salem: "33",
    tiruchirappalli: "33",
    trichy: "33",
    ranipet: "33",
    kanchipuram: "33",
    bengaluru: "29", // Karnataka
    bangalore: "29",
    mysuru: "29",
    mysore: "29",
    mumbai: "27", // Maharashtra
    pune: "27",
    thane: "27",
    nagpur: "27",
    hyderabad: "36", // Telangana
    delhi: "07", // Delhi
    gurugram: "06", // Haryana
    gurgaon: "06",
    faridabad: "06",
    noida: "09", // Uttar Pradesh
    ahmedabad: "24", // Gujarat
    vadodara: "24",
    surat: "24",
    kolkata: "19", // West Bengal
  };

  for (const [city, code] of Object.entries(cityStateMap)) {
    if (lower.includes(city)) return code;
  }

  return null;
}

/**
 * Resolve the seller's state code from company profile.
 * Falls back to "33" (Tamil Nadu, home state of Vision Fab / Vision One).
 */
export function resolveSellerStateCode(
  company?: { gstRegistrationNo?: string | null; address?: string | null } | null,
): string {
  if (!company) return "33";
  const resolved = resolveStateCode(company.gstRegistrationNo, company.address);
  return resolved || "33";
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
  const fromPos = resolveStateCode(null, placeOfSupply);
  if (fromPos) return fromPos;
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
 * Applies per-line GST rate (or header taxRatePercent fallback) to each line's
 * taxable amount, split by supply type (intra => CGST+SGST, inter => IGST).
 */
export function computeGstBreakup(params: {
  lines: GstLineInput[];
  taxRatePercent: number;
  sellerGstin?: string | null;
  sellerAddress?: string | null;
  sellerStateCode?: string | null;
  posStateCode: string | null | undefined;
  isSez?: boolean;
  sezTaxRate?: number;
}): GstBreakup {
  const { lines, taxRatePercent, isSez } = params;
  const sellerStateCode =
    params.sellerStateCode ??
    resolveSellerStateCode({ gstRegistrationNo: params.sellerGstin, address: params.sellerAddress });
  const posStateCode = params.posStateCode ?? null;

  // Intra-state when both state codes are known AND equal (and not SEZ).
  // Supplies to SEZ are always inter-state (IGST) per GST rules.
  const supplyType: "intra" | "inter" =
    isSez
      ? "inter"
      : (sellerStateCode && posStateCode && sellerStateCode === posStateCode
          ? "intra"
          : "inter");

  const baseRate = isSez ? (Number(params.sezTaxRate) || 0) : (Number(taxRatePercent) || 0);

  const breakupLines: GstLineBreakup[] = lines.map((l) => {
    const taxable = roundTo2(Number(l.amount) || 0);
    const rate = isSez
      ? baseRate
      : (l.taxRate !== undefined && !isNaN(l.taxRate) ? Number(l.taxRate) : baseRate);
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
      acc.taxable += roundTo2(Number(lines[i].amount) || 0);
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
