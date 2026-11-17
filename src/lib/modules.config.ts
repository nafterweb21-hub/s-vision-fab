/**
 * The single source of truth for RBAC.
 *
 * Every protected page and API route in the app must resolve to exactly one
 * module here. Anything that does not resolve is denied — see `canAccess` in
 * `./access.ts`. When you add a feature, add it here or it will 403.
 *
 * A module may own more than one path because several features are reachable
 * from two places (e.g. Joint Profile lives under both `/dashboard/profiles`
 * and `/dashboard/master-profile`).
 */

export type PermissionAction = 'v' | 'c' | 'e' | 'd' | 'a' | 'x';

export interface AppModuleDef {
  code: string;
  name: string;
  group: string;
  /** Page paths owned by this module. Matched exactly, or as `prefix + "/"`. Requires `view`. */
  pathPrefixes: string[];
  /** API paths owned by this module. Matched exactly, or as `prefix + "/"`. */
  apiPrefixes?: string[];
  /** Printable/exportable views of this module's data. Requires `export`. */
  exportPrefixes?: string[];
}

/**
 * Paths every authenticated user may reach, regardless of role. These are
 * navigational shells that render no privileged data of their own.
 */
export const PUBLIC_AUTHED_PATHS: string[] = [
  '/dashboard',
  '/dashboard/saved',
  '/dashboard/profiles',
];

/**
 * Path subtrees any authenticated user may reach. Uploaded files are not
 * module-scoped, but they must not be readable by anonymous visitors.
 */
export const PUBLIC_AUTHED_PATH_PREFIXES: string[] = ['/uploads'];

/**
 * API paths every authenticated user may call. These back shared UI chrome
 * (search, pickers, uploads) and expose no module data directly.
 */
export const PUBLIC_AUTHED_API_PATHS: string[] = [
  '/api/inventory/lookups',
  // The PDF handler picks its module from the document type in the path, so the
  // proxy cannot resolve it statically — the handler calls `requirePermission`.
  '/api/print',
  '/api/profiles/summary',
  '/api/upload',
  '/api/uploads',
  '/api/users',
];

export const APP_MODULES: AppModuleDef[] = [
  // ── Admin ────────────────────────────────────────────────────────────────
  {
    code: 'KPI_SCORECARD',
    name: 'KPI & KRA Scorecard',
    group: 'Admin',
    pathPrefixes: ['/dashboard/admin/kpi'],
  },
  {
    code: 'DOCUMENT_NUMBERING',
    name: 'Document Numbering',
    group: 'Admin',
    pathPrefixes: ['/dashboard/admin/document-numbering'],
  },
  {
    code: 'ROLES',
    name: 'Role Management',
    group: 'Admin',
    pathPrefixes: ['/dashboard/admin/roles'],
    apiPrefixes: ['/api/admin/roles', '/api/admin/modules'],
  },
  {
    code: 'USERS',
    name: 'User Management',
    group: 'Admin',
    pathPrefixes: ['/dashboard/admin/users'],
    apiPrefixes: ['/api/admin/users'],
  },

  // ── Sales ────────────────────────────────────────────────────────────────
  {
    code: 'SALES_ORDER',
    name: 'Sales Order',
    group: 'Sales',
    pathPrefixes: ['/dashboard/sales/sales-order'],
    apiPrefixes: ['/api/sales/sales-order'],
  },
  {
    code: 'QUOTATION',
    name: 'Costing & Quotation',
    group: 'Sales',
    pathPrefixes: ['/dashboard/sales/quotation'],
    apiPrefixes: ['/api/sales/quotation'],
    exportPrefixes: ['/print/quotation'],
  },
  {
    code: 'INVOICE',
    name: 'Invoice',
    group: 'Sales',
    pathPrefixes: ['/dashboard/sales/invoice'],
    exportPrefixes: ['/print/invoice', '/print/invoice-label'],
  },
  {
    code: 'RECEIPT',
    name: 'Receipt / Payment Record',
    group: 'Sales',
    pathPrefixes: ['/dashboard/sales/receipt'],
    exportPrefixes: ['/print/receipt'],
  },
  {
    code: 'DELIVERY_ORDER',
    name: 'Delivery Order',
    group: 'Sales',
    pathPrefixes: ['/dashboard/sales/delivery-order'],
    apiPrefixes: ['/api/sales/delivery-order'],
    exportPrefixes: ['/print/delivery-order', '/print/delivery-label'],
  },
  {
    code: 'SALES_REPORT',
    name: 'Sales Report',
    group: 'Sales',
    pathPrefixes: ['/dashboard/sales/sales-report'],
    apiPrefixes: ['/api/reports/sales-report'],
  },

  // ── Purchasing ───────────────────────────────────────────────────────────
  {
    code: 'PURCHASE_REQUISITION',
    name: 'Purchase Requisition',
    group: 'Purchasing',
    pathPrefixes: ['/dashboard/purchasing/purchase-requisition'],
    apiPrefixes: ['/api/purchasing/purchase-requisition'],
    exportPrefixes: ['/print/purchase-requisition'],
  },
  {
    code: 'PURCHASE_ORDER',
    name: 'Purchase Order',
    group: 'Purchasing',
    pathPrefixes: ['/dashboard/purchasing/purchase-order'],
    apiPrefixes: ['/api/purchasing/purchase-order'],
    exportPrefixes: ['/print/purchase-order'],
  },
  {
    code: 'PO_APPROVAL',
    name: 'Purchase Order Approval',
    group: 'Purchasing',
    pathPrefixes: ['/dashboard/purchasing/purchase-order-approval'],
    apiPrefixes: ['/api/purchasing/purchase-order-approval'],
  },
  {
    code: 'GOODS_RECEIVE',
    name: 'Goods Receive',
    group: 'Purchasing',
    pathPrefixes: ['/dashboard/purchasing/goods-receive'],
    apiPrefixes: ['/api/purchasing/goods-receive'],
  },
  {
    code: 'GOODS_RETURN',
    name: 'Goods Return',
    group: 'Purchasing',
    pathPrefixes: ['/dashboard/purchasing/goods-return'],
    apiPrefixes: ['/api/purchasing/goods-return'],
  },
  {
    code: 'PURCHASING_REPORT',
    name: 'Purchasing Report',
    group: 'Purchasing',
    pathPrefixes: ['/dashboard/purchasing/purchasing-report'],
    apiPrefixes: ['/api/reports/purchasing-report'],
  },

  // ── Subcon ───────────────────────────────────────────────────────────────
  {
    code: 'PO_SUBCON',
    name: 'Purchase Order Subcon',
    group: 'Subcon',
    pathPrefixes: ['/dashboard/purchasing/purchase-order-subcon'],
    exportPrefixes: ['/print/purchase-order-subcon'],
  },
  {
    code: 'PO_SUBCON_APPROVAL',
    name: 'PO Subcon Approval',
    group: 'Subcon',
    pathPrefixes: ['/dashboard/purchasing/purchase-order-subcon-approval'],
  },
  {
    code: 'SUBCON_REQUEST_FORM',
    name: 'Subcon Request Form',
    group: 'Subcon',
    pathPrefixes: ['/dashboard/purchasing/subcon-request-form'],
    apiPrefixes: ['/api/purchasing/subcon-request-form'],
    exportPrefixes: ['/print/subcon-request-form'],
  },
  {
    code: 'SUBCON_RETURN_TRACKING',
    name: 'Subcon Return Tracking',
    group: 'Subcon',
    pathPrefixes: ['/dashboard/purchasing/subcon-return-tracking'],
    apiPrefixes: ['/api/purchasing/subcon-return-tracking'],
  },
  {
    code: 'SUBCON_REJECT_TRACKING',
    name: 'Subcon Reject Tracking',
    group: 'Subcon',
    pathPrefixes: ['/dashboard/purchasing/subcon-reject-tracking'],
    apiPrefixes: ['/api/purchasing/subcon-reject-tracking'],
  },
  {
    code: 'SUBCON_PURCHASING_REPORT',
    name: 'Subcon Purchasing Report',
    group: 'Subcon',
    pathPrefixes: ['/dashboard/purchasing/subcon-purchasing-report'],
    apiPrefixes: ['/api/reports/subcon-purchasing-report'],
  },

  // ── Production ───────────────────────────────────────────────────────────
  {
    code: 'WORK_ORDER',
    name: 'Work Order',
    group: 'Production',
    pathPrefixes: ['/dashboard/production/work-order'],
    exportPrefixes: ['/print/work-order'],
  },
  {
    code: 'PROCESS_PARAMETER',
    name: 'Process Parameter',
    group: 'Production',
    pathPrefixes: ['/dashboard/production/process-parameter'],
    apiPrefixes: ['/api/seed-process-params'],
  },
  {
    code: 'PROCESS_PARAMETER_CONFIRMATION',
    name: 'Process Parameter Confirmation',
    group: 'Production',
    pathPrefixes: ['/dashboard/production/process-parameter-confirmation'],
  },
  {
    code: 'REWORK',
    name: 'Production Rework',
    group: 'Production',
    pathPrefixes: ['/dashboard/production/rework'],
  },
  {
    code: 'WORK_ORDER_COSTING_REPORT',
    name: 'Work Order Costing Report',
    group: 'Production',
    pathPrefixes: ['/dashboard/production/work-order-costing-report'],
    apiPrefixes: ['/api/reports/work-order-costing-report'],
  },
  {
    code: 'MONTHLY_SCHEDULE_REPORT',
    name: 'Monthly Schedule Report',
    group: 'Production',
    pathPrefixes: ['/dashboard/production/monthly-schedule-report'],
    apiPrefixes: ['/api/reports/monthly-schedule-report'],
  },

  // ── Shop Floor ───────────────────────────────────────────────────────────
  // Operator-facing screens. A role scoped to these alone (welder, QC operator)
  // sees nothing of the office ERP.
  {
    code: 'PRODUCTION_TERMINAL',
    name: 'Production Terminal',
    group: 'Shop Floor',
    pathPrefixes: ['/terminal'],
  },
  {
    code: 'QC_TERMINAL',
    name: 'QC Terminal',
    group: 'Shop Floor',
    pathPrefixes: ['/qc'],
  },

  // ── QC ───────────────────────────────────────────────────────────────────
  {
    code: 'QC_APPROVAL',
    name: 'QC Approval',
    group: 'QC',
    pathPrefixes: ['/dashboard/qc/approval'],
  },
  {
    code: 'CERTIFICATE_OF_CONFORMITY',
    name: 'Certificate of Conformity',
    group: 'QC',
    pathPrefixes: ['/dashboard/qc/coc'],
    apiPrefixes: ['/api/qc/coc'],
    exportPrefixes: ['/print/coc'],
  },
  {
    code: 'NCR',
    name: 'Non-Conformance Report (NCR)',
    group: 'QC',
    pathPrefixes: ['/dashboard/qc/ncr'],
    exportPrefixes: ['/print/ncr'],
  },
  {
    code: 'NCR_REPORT',
    name: 'Non-Conformance Report (Report)',
    group: 'QC',
    pathPrefixes: ['/dashboard/qc/ncr-report'],
    apiPrefixes: ['/api/reports/ncr-report'],
  },

  // ── Inventory ────────────────────────────────────────────────────────────
  {
    code: 'INVENTORY',
    name: 'Inventory',
    group: 'Inventory',
    pathPrefixes: ['/dashboard/inventory'],
    apiPrefixes: [
      '/api/inventory/by-work-order',
      '/api/inventory/movement',
      '/api/inventory/summary',
    ],
  },
  {
    code: 'INVENTORY_REPORT',
    name: 'Inventory Report',
    group: 'Inventory',
    pathPrefixes: ['/dashboard/inventory/report'],
    apiPrefixes: ['/api/inventory/report'],
  },
  {
    code: 'RAW_MATERIAL',
    name: 'Raw Materials',
    group: 'Inventory',
    pathPrefixes: ['/dashboard/inventory/raw-materials'],
    apiPrefixes: ['/api/inventory/raw-materials'],
  },
  {
    code: 'CONSUMABLE',
    name: 'Consumables',
    group: 'Inventory',
    pathPrefixes: ['/dashboard/inventory/consumables'],
    apiPrefixes: ['/api/inventory/consumables'],
  },
  {
    code: 'FIXED_ASSET',
    name: 'Fixed Assets',
    group: 'Inventory',
    pathPrefixes: ['/dashboard/inventory/fixed-assets'],
    apiPrefixes: ['/api/inventory/fixed-assets'],
  },
  {
    code: 'MATERIAL_CONSUMPTION',
    name: 'Material Consumption',
    group: 'Inventory',
    pathPrefixes: ['/dashboard/inventory/consumption'],
    apiPrefixes: ['/api/inventory/consumption'],
  },

  // ── Finance ──────────────────────────────────────────────────────────────
  {
    code: 'COST_MONITORING',
    name: 'Cost Monitoring',
    group: 'Finance',
    pathPrefixes: ['/dashboard/cost-monitoring'],
    apiPrefixes: ['/api/cost-monitoring'],
  },

  // ── Master Profiles ──────────────────────────────────────────────────────
  {
    code: 'COMPANY_PROFILE',
    name: 'Company Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/profiles/company'],
    apiPrefixes: ['/api/profiles/company'],
  },
  {
    code: 'BANK_PROFILE',
    name: 'Bank Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/profiles/bank'],
    apiPrefixes: ['/api/profiles/bank'],
  },
  {
    code: 'APPROVAL_LEVEL_PROFILE',
    name: 'Approval Level Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/profiles/approval-levels'],
    apiPrefixes: ['/api/profiles/approval-levels'],
  },
  {
    code: 'CUSTOMER_PROFILE',
    name: 'Customer Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/admin/master-profile/customer'],
  },
  {
    code: 'SUPPLIER_PROFILE',
    name: 'Supplier Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/admin/master-profile/supplier'],
  },
  {
    code: 'TAX_PROFILE',
    name: 'Tax Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/admin/master-profile/tax'],
  },
  {
    code: 'CURRENCY_PROFILE',
    name: 'Currency Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/profiles/currency'],
    apiPrefixes: ['/api/profiles/currency'],
  },
  {
    code: 'UOM_PROFILE',
    name: 'UOM Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/profiles/uom'],
    apiPrefixes: ['/api/profiles/uom'],
  },
  {
    code: 'PAYMENT_TERM_PROFILE',
    name: 'Payment Terms Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/profiles/payment-term'],
    apiPrefixes: ['/api/profiles/payment-term'],
  },
  {
    code: 'INCOTERM_PROFILE',
    name: 'Incoterm Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/profiles/incoterm'],
    apiPrefixes: ['/api/profiles/incoterm'],
  },
  {
    code: 'MACHINE_PROFILE',
    name: 'Machine Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/profiles/machine'],
    apiPrefixes: ['/api/profiles/machine'],
  },
  {
    code: 'ELCOMETER_PROFILE',
    name: 'Elcometer Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/profiles/elcometer'],
    apiPrefixes: ['/api/profiles/elcometer'],
  },
  {
    code: 'FINISHED_GOOD_PROFILE',
    name: 'Finished Good Profile',
    group: 'Master Profile',
    pathPrefixes: [
      '/dashboard/profiles/finished-good',
      '/dashboard/admin/master-profile/finished-good',
    ],
    apiPrefixes: ['/api/profiles/finished-good'],
  },
  {
    code: 'MATERIAL_CATEGORY_PROFILE',
    name: 'Material Category Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/profiles/material-categories'],
    apiPrefixes: ['/api/profiles/material-categories'],
  },
  {
    code: 'MATERIAL_TYPE_PROFILE',
    name: 'Material Type Profile',
    group: 'Master Profile',
    pathPrefixes: [
      '/dashboard/profiles/material-types',
      '/dashboard/master-profile/material-type',
    ],
    apiPrefixes: ['/api/profiles/material-types'],
  },
  {
    code: 'MATERIAL_PROFILE',
    name: 'Material Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/master-profile/material'],
  },
  {
    code: 'JOINT_PROFILE',
    name: 'Joint Profile',
    group: 'Master Profile',
    pathPrefixes: [
      '/dashboard/profiles/joint-profiles',
      '/dashboard/master-profile/joint',
    ],
    apiPrefixes: ['/api/profiles/joint-profiles'],
  },
  {
    code: 'WELDING_TYPE_PROFILE',
    name: 'Welding Type Profile',
    group: 'Master Profile',
    pathPrefixes: [
      '/dashboard/profiles/welding-types',
      '/dashboard/master-profile/welding-type',
    ],
    apiPrefixes: ['/api/profiles/welding-types'],
  },
  {
    code: 'PAINTING_METHOD_PROFILE',
    name: 'Painting Method Profile',
    group: 'Master Profile',
    pathPrefixes: [
      '/dashboard/profiles/painting-method',
      '/dashboard/master-profile/painting-method',
    ],
    apiPrefixes: ['/api/profiles/painting-method'],
  },
  {
    code: 'PROCESS_PROFILE',
    name: 'Process Profile',
    group: 'Master Profile',
    pathPrefixes: [
      '/dashboard/profiles/process-profiles',
      '/dashboard/master-profile/process-profile',
    ],
    apiPrefixes: ['/api/profiles/process-profiles'],
  },
  {
    code: 'MAIN_PROCESS_PROFILE',
    name: 'Main Process Profile',
    group: 'Master Profile',
    pathPrefixes: [
      '/dashboard/profiles/main-process',
      '/dashboard/profiles/main-processes',
      '/dashboard/master-profile/main-process',
    ],
    apiPrefixes: ['/api/profiles/main-process', '/api/profiles/main-processes'],
  },
  {
    code: 'EMPLOYEE_PROFILE',
    name: 'Employee Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/master-profile/employee'],
    apiPrefixes: ['/api/employees'],
  },
  {
    code: 'DESIGNATION_PROFILE',
    name: 'Designation Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/master-profile/designation'],
  },
  {
    code: 'DEPARTMENT_PROFILE',
    name: 'Department Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/master-profile/department'],
  },
  {
    code: 'FAILURE_MODE_PROFILE',
    name: 'Failure Mode Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/master-profile/failure-mode'],
  },
  {
    code: 'TERMS_CONDITION_PROFILE',
    name: 'Terms & Conditions Profile',
    group: 'Master Profile',
    pathPrefixes: ['/dashboard/master-profile/terms-condition'],
  },
];

/** Stable ordering for the role-permission grid. */
export const MODULE_GROUP_ORDER: string[] = [
  'Admin',
  'Shop Floor',
  'Sales',
  'Purchasing',
  'Subcon',
  'Production',
  'QC',
  'Inventory',
  'Finance',
  'Master Profile',
];

/**
 * Where to send a user after sign-in, most specific first. A welder holds only
 * PRODUCTION_TERMINAL and lands on the terminal; office staff fall through to
 * the dashboard. Order matters: the first module the user can view wins.
 */
export const LANDING_MODULES: { code: string; path: string }[] = [
  { code: 'PRODUCTION_TERMINAL', path: '/terminal' },
  { code: 'QC_TERMINAL', path: '/qc' },
];

/**
 * Old module code -> new code. `sync-modules` renames the row in place so its
 * existing role grants survive; without this the prune step would delete the
 * module and cascade away every permission attached to it.
 */
export const MODULE_RENAMES: Record<string, string> = {
  QC_DASHBOARD: 'QC_TERMINAL',
};
