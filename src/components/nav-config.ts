import {
  AlertTriangle,
  Armchair,
  Banknote,
  BarChart,
  BarChart2,
  Book,
  Box,
  Briefcase,
  Brush,
  Building2,
  Calendar,
  CalendarClock,
  CheckSquare,
  Circle,
  CircleDot,
  Clipboard,
  Coins,
  CornerUpLeft,
  Cpu,
  Diamond,
  Droplet,
  Factory,
  File,
  Flame,
  Gauge,
  Globe,
  Handshake,
  Hash,
  Hexagon,
  Key,
  Landmark,
  Layers,
  Link2,
  List,
  ListTree,
  Package,
  PackageMinus,
  PackageOpen,
  Receipt,
  RefreshCw,
  Scale,
  ShoppingCart,
  SquareSplitHorizontal,
  Target,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * The navigation tree, shared by the dashboard `Sidebar` and the `GlobalHeader`
 * drawer that terminal pages use. Both render the same items through the same
 * `canAccess` gate, so navigation cannot drift from the permission model.
 *
 * `href` doubles as the permission key — it is what gets passed to `canAccess`.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind colour class for the icon. */
  iconClass: string;
  /** Some icons in this design are rendered filled. */
  filled?: boolean;
}

/**
 * A node in the navigation tree.
 *
 * A node with `children` is a branch. A branch may also carry an `href` — the
 * Inventory branch links to its own page *and* nests Item Master beneath it.
 * A branch without an `href` (Item Master) is a pure grouping label that only
 * expands. Every node must have one or the other.
 */
export interface NavNode extends Omit<NavItem, "href"> {
  href?: string;
  children?: NavNode[];
}

export interface NavSection {
  title: string;
  items: NavNode[];
  /** Rendered behind a disclosure toggle in the sidebar. */
  collapsible?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'SHOP FLOOR',
    items: [
      { href: '/terminal', label: 'Production Terminal', icon: Factory, iconClass: 'text-indigo-500' },
      { href: '/qc', label: 'QC Terminal', icon: CheckSquare, iconClass: 'text-emerald-500' },
    ],
  },
  {
    title: 'ADMINISTRATOR',
    items: [
      { href: '/dashboard/admin/kpi', label: 'KPI & KRA Scorecard', icon: Target, iconClass: 'text-indigo-500' },
      { href: '/dashboard/admin/users', label: 'Users', icon: Users, iconClass: 'text-blue-500' },
      { href: '/dashboard/admin/roles', label: 'Roles', icon: Key, iconClass: 'text-yellow-500' },
      { href: '/dashboard/admin/document-numbering', label: 'Document Numbering', icon: Hash, iconClass: 'text-slate-500' },
    ],
  },
  {
    title: 'OPERATION',
    items: [
      { href: '/dashboard/sales/sales-order', label: 'Sales Order', icon: Diamond, iconClass: 'text-slate-600' },
      { href: '/dashboard/production/work-order', label: 'Work Order', icon: CircleDot, iconClass: 'text-slate-600' },
      { href: '/dashboard/qc/approval', label: 'QC Approval', icon: Circle, iconClass: 'text-slate-600' },
      { href: '/dashboard/sales/delivery-order', label: 'Delivery Order', icon: Hexagon, iconClass: 'text-slate-600', filled: true },
      { href: '/dashboard/qc/coc', label: 'Certificate Of Conformity', icon: File, iconClass: 'text-slate-400', filled: true },
      { href: '/dashboard/production/process-parameter-confirmation', label: 'Process Parameter Confirmation', icon: SquareSplitHorizontal, iconClass: 'text-slate-600', filled: true },
      { href: '/dashboard/sales/quotation', label: 'Vision One Costing & Quotation', icon: Briefcase, iconClass: 'text-yellow-600', filled: true },
    ],
  },
  {
    title: 'PROCUREMENT',
    items: [
      { href: '/dashboard/purchasing/purchase-requisition', label: 'Purchase Requisition', icon: List, iconClass: 'text-slate-500' },
      { href: '/dashboard/purchasing/purchase-order', label: 'Purchase Order', icon: Book, iconClass: 'text-slate-600', filled: true },
      { href: '/dashboard/purchasing/purchase-order-approval', label: 'Purchase Order Approval', icon: CheckSquare, iconClass: 'text-green-500', filled: true },
      { href: '/dashboard/purchasing/goods-receive', label: 'Goods Receive', icon: PackageOpen, iconClass: 'text-amber-700', filled: true },
      { href: '/dashboard/purchasing/goods-return', label: 'Goods Return', icon: CornerUpLeft, iconClass: 'text-slate-600' },
      {
        href: '/dashboard/inventory',
        label: 'Inventory',
        icon: Box,
        iconClass: 'text-blue-600',
        children: [
          { href: '/dashboard/inventory/raw-materials', label: 'Raw Materials', icon: Layers, iconClass: 'text-amber-600' },
          { href: '/dashboard/inventory/consumables', label: 'Consumables', icon: Droplet, iconClass: 'text-cyan-600' },
          { href: '/dashboard/inventory/fixed-assets', label: 'Fixed Assets', icon: Armchair, iconClass: 'text-purple-600' },
          { href: '/dashboard/inventory/consumption', label: 'Material Consumption', icon: PackageMinus, iconClass: 'text-rose-600' },
        ],
      },
    ],
  },
  {
    title: 'SUBCON',
    items: [
      { href: '/dashboard/purchasing/purchase-order-subcon', label: 'Purchase Order Subcon', icon: Hexagon, iconClass: 'text-slate-400' },
      { href: '/dashboard/purchasing/purchase-order-subcon-approval', label: 'PO Subcon Approval', icon: CheckSquare, iconClass: 'text-green-500', filled: true },
      { href: '/dashboard/purchasing/subcon-request-form', label: 'Subcon Request Form', icon: Clipboard, iconClass: 'text-slate-500', filled: true },
      { href: '/dashboard/purchasing/subcon-return-tracking', label: 'Subcon Return Tracking', icon: RefreshCw, iconClass: 'text-slate-500' },
      { href: '/dashboard/purchasing/subcon-reject-tracking', label: 'Subcon Reject Tracking', icon: AlertTriangle, iconClass: 'text-slate-500' },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { href: '/dashboard/sales/invoice', label: 'Invoicing', icon: Receipt, iconClass: 'text-slate-400' },
      { href: '/dashboard/sales/debit-note', label: 'Debit Note', icon: Receipt, iconClass: 'text-slate-400' },
      { href: '/dashboard/sales/credit-note', label: 'Credit Note', icon: Receipt, iconClass: 'text-slate-400' },
      { href: '/dashboard/sales/receipt', label: 'Receipt / Payment Record', icon: Banknote, iconClass: 'text-emerald-500' },
      { href: '/dashboard/cost-monitoring', label: 'Cost Monitoring', icon: BarChart2, iconClass: 'text-blue-500', filled: true },
      { href: '/dashboard/qc/ncr', label: 'NCR', icon: AlertTriangle, iconClass: 'text-slate-500' },
    ],
  },
  {
    title: 'PROFILE',
    items: [
      { href: '/dashboard/profiles/company', label: 'Company Profile', icon: Building2, iconClass: 'text-slate-500', filled: true },
      { href: '/dashboard/profiles/bank', label: 'Bank Profile', icon: Landmark, iconClass: 'text-slate-500' },
      { href: '/dashboard/master-profile/employee', label: 'Employee Profile', icon: User, iconClass: 'text-slate-500', filled: true },
      { href: '/dashboard/master-profile/file-category', label: 'File Category Profile', icon: File, iconClass: 'text-blue-500' },
      { href: '/dashboard/master-profile/designation', label: 'Designation Profile', icon: Briefcase, iconClass: 'text-blue-500' },
      { href: '/dashboard/profiles/approval-levels', label: 'Approval Level Profile', icon: Key, iconClass: 'text-yellow-500', filled: true },
      { href: '/dashboard/admin/master-profile/customer', label: 'Customer Profile', icon: Handshake, iconClass: 'text-yellow-600', filled: true },
      { href: '/dashboard/admin/master-profile/supplier', label: 'Supplier Profile', icon: Factory, iconClass: 'text-amber-800', filled: true },
      { href: '/dashboard/profiles/currency', label: 'Currency Profile', icon: Coins, iconClass: 'text-slate-600' },
      { href: '/dashboard/admin/master-profile/tax', label: 'Tax Profile', icon: Receipt, iconClass: 'text-slate-400' },
      { href: '/dashboard/profiles/payment-term', label: 'Payment Terms', icon: Calendar, iconClass: 'text-red-800', filled: true },
      { href: '/dashboard/profiles/uom', label: 'UOM Profile', icon: Scale, iconClass: 'text-slate-500' },
      { href: '/dashboard/profiles/material-categories', label: 'Material Category Profile', icon: Box, iconClass: 'text-amber-800', filled: true },
      { href: '/dashboard/master-profile/material', label: 'Material Profile', icon: Box, iconClass: 'text-blue-500' },
      { href: '/dashboard/master-profile/process-profile', label: 'Process Profile', icon: RefreshCw, iconClass: 'text-cyan-500' },
      { href: '/dashboard/master-profile/main-process', label: 'Main Process Profile', icon: ListTree, iconClass: 'text-indigo-500' },
      { href: '/dashboard/master-profile/process-role-mapping', label: 'Process Role Mapping', icon: Users, iconClass: 'text-indigo-500' },
      { href: '/dashboard/profiles/incoterm', label: 'Incoterm Profile', icon: Globe, iconClass: 'text-blue-500' },
      { href: '/dashboard/master-profile/material-type', label: 'Material Type Profile', icon: Package, iconClass: 'text-cyan-600' },
      { href: '/dashboard/profiles/finished-good', label: 'Finished Good Profile', icon: Box, iconClass: 'text-emerald-600' },
      { href: '/dashboard/master-profile/welding-type', label: 'Welding Type Profile', icon: Flame, iconClass: 'text-orange-500' },
      { href: '/dashboard/master-profile/joint', label: 'Joint Profile', icon: Link2, iconClass: 'text-purple-500' },
      { href: '/dashboard/profiles/machine', label: 'Machine Profile', icon: Cpu, iconClass: 'text-slate-600' },
      { href: '/dashboard/profiles/elcometer', label: 'Elcometer Profile', icon: Gauge, iconClass: 'text-red-500' },
      { href: '/dashboard/master-profile/painting-method', label: 'Painting Method Profile', icon: Brush, iconClass: 'text-pink-500' },
      { href: '/dashboard/master-profile/failure-mode', label: 'Failure Mode Profile', icon: AlertTriangle, iconClass: 'text-rose-600' },
      { href: '/dashboard/master-profile/terms-condition', label: 'Terms & Conditions Profile', icon: Clipboard, iconClass: 'text-slate-600' },
    ],
  },
  {
    title: 'REPORT',
    collapsible: true,
    items: [
      { href: '/dashboard/sales/sales-report', label: 'Sales Report', icon: BarChart, iconClass: 'text-blue-500', filled: true },
      { href: '/dashboard/production/work-order-costing-report', label: 'Work Order Costing Report', icon: TrendingUp, iconClass: 'text-red-500' },
      { href: '/dashboard/production/monthly-schedule-report', label: 'Monthly Schedule Report', icon: CalendarClock, iconClass: 'text-amber-600' },
      { href: '/dashboard/qc/ncr-report', label: 'Non Conformance Report', icon: AlertTriangle, iconClass: 'text-slate-500' },
      { href: '/dashboard/purchasing/purchasing-report', label: 'Purchasing Report', icon: ShoppingCart, iconClass: 'text-slate-500' },
      { href: '/dashboard/purchasing/subcon-purchasing-report', label: 'Subcon Purchasing Report', icon: Factory, iconClass: 'text-red-800', filled: true },
      { href: '/dashboard/inventory/report', label: 'Inventory Report', icon: Box, iconClass: 'text-blue-600' },
    ],
  },
];
