/**
 * Targets for the Super Admin KPI / KRA scorecard.
 *
 * Six Key Result Areas, each owning a handful of KPIs. A KPI's `target` is what
 * "good" looks like; `direction` says which side of it is good. Everything the
 * scorecard shows — attainment, RAG status, the KRA score — is derived from
 * these two fields, so retargeting the business is an edit here and nothing else.
 *
 * Volume targets (revenue, throughput) are stated *per month* and scaled to the
 * selected period, so the same number stays meaningful whether you are looking
 * at month-to-date or the trailing year. Ratio targets (%, days) are absolute.
 */

export type KpiUnit = '%' | 'INR' | 'days' | 'count';

/** `up` — higher than target is good. `down` — lower than target is good. */
export type KpiDirection = 'up' | 'down';

/** `monthly` targets are multiplied by the number of months in the period. */
export type KpiScaling = 'fixed' | 'monthly';

export interface KpiDef {
  code: string;
  name: string;
  unit: KpiUnit;
  target: number;
  direction: KpiDirection;
  scaling?: KpiScaling;
  /** What the number actually measures — shown on the card. */
  basis: string;
}

export interface KraDef {
  code: string;
  name: string;
  /** The function accountable for this result area. */
  owner: string;
  kpis: KpiDef[];
}

export const KRAS: KraDef[] = [
  {
    code: 'SALES',
    name: 'Sales & Revenue',
    owner: 'Sales',
    kpis: [
      {
        code: 'ORDER_INTAKE',
        name: 'Order Intake',
        unit: 'INR',
        target: 400_000,
        direction: 'up',
        scaling: 'monthly',
        basis: 'Value of sales orders raised in the period',
      },
      {
        code: 'QUOTE_WIN_RATE',
        name: 'Quotation Win Rate',
        unit: '%',
        target: 40,
        direction: 'up',
        basis: 'Quotations converted to a sales order',
      },
      {
        code: 'REVENUE_INVOICED',
        name: 'Revenue Invoiced',
        unit: 'INR',
        target: 350_000,
        direction: 'up',
        scaling: 'monthly',
        basis: 'Customer invoices issued in the period',
      },
    ],
  },
  {
    code: 'DELIVERY',
    name: 'Delivery & Fulfilment',
    owner: 'Operations',
    kpis: [
      {
        code: 'ON_TIME_DELIVERY',
        name: 'On-Time Delivery',
        unit: '%',
        target: 95,
        direction: 'up',
        basis: 'Delivered lines shipped on or before the work order due date',
      },
      {
        code: 'OVERDUE_WO',
        name: 'Overdue Work Orders',
        unit: 'count',
        target: 5,
        direction: 'down',
        basis: 'Open work orders past their delivery date, as of the period end',
      },
      {
        code: 'ORDER_LEAD_TIME',
        name: 'Order-to-Delivery Lead Time',
        unit: 'days',
        target: 30,
        direction: 'down',
        basis: 'Sales order date to first delivery order date',
      },
    ],
  },
  {
    code: 'PRODUCTION',
    name: 'Production',
    owner: 'Production',
    kpis: [
      {
        code: 'WO_COMPLETION',
        name: 'Work Order Completion',
        unit: '%',
        target: 90,
        direction: 'up',
        basis: 'Work orders due in the period that are completed',
      },
      {
        code: 'THROUGHPUT',
        name: 'Throughput',
        unit: 'count',
        target: 500,
        direction: 'up',
        scaling: 'monthly',
        basis: 'Approved quantity on work orders completed in the period',
      },
      {
        code: 'LABOUR_EFFICIENCY',
        name: 'Labour Efficiency',
        unit: '%',
        target: 85,
        direction: 'up',
        basis: 'Productive time as a share of booked time on the shop floor',
      },
    ],
  },
  {
    code: 'QUALITY',
    name: 'Quality',
    owner: 'QC',
    kpis: [
      {
        code: 'FIRST_PASS_YIELD',
        name: 'First Pass Yield',
        unit: '%',
        target: 95,
        direction: 'up',
        basis: 'Accepted quantity as a share of quantity presented to QC',
      },
      {
        code: 'NCR_RATE',
        name: 'NCR Rate',
        unit: '%',
        target: 5,
        direction: 'down',
        basis: 'NCRs raised per 100 work orders touched in the period',
      },
      {
        code: 'NCR_CLOSURE',
        name: 'NCR Closure Rate',
        unit: '%',
        target: 90,
        direction: 'up',
        basis: 'NCRs raised in the period that are now closed',
      },
      {
        code: 'SCRAP_RATE',
        name: 'Scrap Rate',
        unit: '%',
        target: 2,
        direction: 'down',
        basis: 'Scrapped quantity as a share of non-conforming quantity',
      },
    ],
  },
  {
    code: 'PROCUREMENT',
    name: 'Procurement',
    owner: 'Purchasing',
    kpis: [
      {
        code: 'SUPPLIER_OTD',
        name: 'Supplier On-Time Delivery',
        unit: '%',
        target: 90,
        direction: 'up',
        basis: 'Goods receipts landed on or before the PO delivery date',
      },
      {
        code: 'PO_APPROVAL_AGING',
        name: 'PO Approval Aging',
        unit: 'days',
        target: 2,
        direction: 'down',
        basis: 'Average age of purchase orders still awaiting approval',
      },
      {
        code: 'PO_FULFILMENT',
        name: 'PO Fulfilment',
        unit: '%',
        target: 85,
        direction: 'up',
        basis: 'Purchase orders raised in the period that are fully received',
      },
    ],
  },
  {
    code: 'FINANCE',
    name: 'Finance',
    owner: 'Finance',
    kpis: [
      {
        code: 'COLLECTION_RATE',
        name: 'Collection Rate',
        unit: '%',
        target: 90,
        direction: 'up',
        basis: 'Cash collected against invoices issued in the period',
      },
      {
        code: 'OVERDUE_AR',
        name: 'Overdue Receivables',
        unit: 'INR',
        target: 50_000,
        direction: 'down',
        basis: 'Balance due on invoices past their due date, as of the period end',
      },
      {
        code: 'DSO',
        name: 'Days Sales Outstanding',
        unit: 'days',
        target: 45,
        direction: 'down',
        basis: 'Invoice date to receipt date on payments taken in the period',
      },
    ],
  },
];

/** `CUSTOM` carries its own dates; the rest are computed from today. */
export type PeriodKey = 'MTD' | 'QTD' | 'YTD' | 'L12M' | 'CUSTOM';

/** The preset buttons. `CUSTOM` is deliberately absent — it is driven by the date pickers. */
export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'MTD', label: 'Month to date' },
  { key: 'QTD', label: 'Quarter to date' },
  { key: 'YTD', label: 'Year to date' },
  { key: 'L12M', label: 'Last 12 months' },
];

export const DEFAULT_PERIOD: PeriodKey = 'MTD';

export function isPeriodKey(value: unknown): value is PeriodKey {
  return value === 'CUSTOM' || PERIODS.some((p) => p.key === value);
}

/**
 * Parses a `YYYY-MM-DD` date input into local time. `new Date("2026-07-13")`
 * would parse as UTC midnight and slip a day backwards west of Greenwich, which
 * would silently drop a day's documents from the range.
 */
export function parseDateInput(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `YYYY-MM-DD` in local time, for round-tripping a Date back into a date input. */
export function toDateInput(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * A KPI is on track once it reaches target; short of that, attainment is the
 * fraction of the way there. For a `down` KPI the ratio inverts — half the
 * allowed NCR rate is 200% attainment, double it is 50%.
 *
 * A zero target on a `down` KPI means "none allowed", which has no meaningful
 * fraction: any occurrence is a miss.
 */
export function attainment(value: number, target: number, direction: KpiDirection): number {
  if (direction === 'up') {
    if (target <= 0) return 1;
    return value / target;
  }
  if (target <= 0) return value <= 0 ? 1 : 0;
  if (value <= 0) return 1;
  return target / value;
}

export type RagStatus = 'on-track' | 'at-risk' | 'off-track';

export function ragFor(attainmentRatio: number): RagStatus {
  if (attainmentRatio >= 1) return 'on-track';
  if (attainmentRatio >= 0.85) return 'at-risk';
  return 'off-track';
}
