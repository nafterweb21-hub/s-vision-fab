"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { canAccess, type PermissionsMap } from "@/lib/access";
import { NAV_SECTIONS, type NavItem, type NavNode, type NavSection } from "./nav-config";

/** Matches on a segment boundary, so `/x/report` never matches the `/x/rep` item. */
function coversPath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function collectHrefs(nodes: NavNode[]): string[] {
  return nodes.flatMap((n) => [...(n.href ? [n.href] : []), ...collectHrefs(n.children ?? [])]);
}

const NAV_HREFS: string[] = collectHrefs(NAV_SECTIONS.flatMap((s) => s.items));

/**
 * A nav item is active when it covers the current path and nothing more
 * specific does.
 *
 * An item stays active for child pages that have no nav entry of their own, so
 * `/dashboard/sales/sales-order/123` keeps Sales Order lit. But when a child
 * *does* have its own entry — Raw Materials under Inventory — only the deepest
 * match highlights, otherwise both parent and child light up at once.
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (!coversPath(pathname, href)) return false;

  return !NAV_HREFS.some(
    (other) => other.length > href.length && coversPath(pathname, other),
  );
}

/** True when this node, or anything beneath it, owns the current page. */
export function nodeContainsPath(node: NavNode, pathname: string): boolean {
  if (node.href && coversPath(pathname, node.href)) return true;
  return (node.children ?? []).some((child) => nodeContainsPath(child, pathname));
}

/**
 * Drops what the role cannot view, depth first.
 *
 * A branch survives if any descendant survives, even when its own page is out of
 * reach — in that case it loses its `href` and renders as a plain grouping
 * label, so we never show a link that `proxy.ts` would refuse.
 */
function filterNode(
  node: NavNode,
  permissions: PermissionsMap | null | undefined,
  role: string | null | undefined,
): NavNode | null {
  const children = (node.children ?? [])
    .map((child) => filterNode(child, permissions, role))
    .filter((child): child is NavNode => child !== null);

  const selfVisible = node.href ? canAccess(node.href, permissions, role) : false;
  if (!selfVisible && children.length === 0) return null;

  return {
    ...node,
    href: selfVisible ? node.href : undefined,
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * Drop every item the role cannot view, then every section left empty. Both
 * navigation surfaces call this, so a link can never appear without the
 * permission that `proxy.ts` will demand when it is followed.
 */
export function visibleSections(
  permissions: PermissionsMap | null | undefined,
  role: string | null | undefined,
): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .map((item) => filterNode(item, permissions, role))
      .filter((item): item is NavNode => item !== null),
  })).filter((section) => section.items.length > 0);
}

export function NavLink({
  item,
  active,
  onNavigate,
  className,
  monoIcons,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  className: string;
  /** Ignore the item's colour class and inherit the text colour. */
  monoIcons?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      <Icon
        size={16}
        className={`shrink-0 ${monoIcons ? "" : item.iconClass}`}
        fill={!monoIcons && item.filled ? "currentColor" : undefined}
      />
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

/** Styling for branch rows; the sidebar passes a dark variant. */
export interface TreeTheme {
  group: string;
  toggle: string;
  children: string;
  /** Render every icon in the inherited text colour. */
  monoIcons?: boolean;
}

const LIGHT_THEME: TreeTheme = {
  group:
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-slate-50 hover:text-indigo-700",
  toggle: "rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100",
  children: "ml-4 mt-1 space-y-1 border-l border-slate-200 pl-2",
};

interface TreeProps {
  nodes: NavNode[];
  pathname: string;
  /** Styling for a leaf link, supplied by whichever surface is rendering. */
  linkClass: (href: string) => string;
  onNavigate?: () => void;
  depth?: number;
  theme?: TreeTheme;
}

function Branch({
  node,
  pathname,
  linkClass,
  onNavigate,
  depth = 0,
  theme = LIGHT_THEME,
}: Omit<TreeProps, "nodes"> & { node: NavNode }) {
  const contains = nodeContainsPath(node, pathname);
  const [open, setOpen] = useState(contains);
  const Icon = node.icon;
  const iconClass = theme.monoIcons ? "shrink-0" : node.iconClass;
  const fill = !theme.monoIcons && node.filled ? "currentColor" : undefined;

  // Navigating into a branch from elsewhere should reveal where you landed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (contains) setOpen(true);
  }, [contains]);

  const chevron = (
    <ChevronDown
      size={14}
      className={`shrink-0 transform transition-transform ${open ? "rotate-180" : ""}`}
    />
  );

  return (
    <div>
      {node.href ? (
        // A branch that is also a page: the label navigates, the chevron expands.
        <div className="flex items-center gap-1">
          <Link
            href={node.href}
            onClick={onNavigate}
            aria-current={isActivePath(pathname, node.href) ? "page" : undefined}
            className={`${linkClass(node.href)} flex-1`}
          >
            <Icon size={16} className={iconClass} fill={fill} />
            <span className="flex-1 truncate">{node.label}</span>
          </Link>
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${node.label}`}
            className={theme.toggle}
          >
            {chevron}
          </button>
        </div>
      ) : (
        // A pure grouping label, e.g. Item Master.
        <button onClick={() => setOpen(!open)} aria-expanded={open} className={theme.group}>
          <Icon size={16} className={iconClass} fill={fill} />
          <span className="flex-1 text-left">{node.label}</span>
          {chevron}
        </button>
      )}

      {open && node.children && (
        <div className={theme.children}>
          <NavTree
            nodes={node.children}
            pathname={pathname}
            linkClass={linkClass}
            onNavigate={onNavigate}
            depth={depth + 1}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}

/** Renders a navigation subtree. Shared by the sidebar and the header drawer. */
export function NavTree({ nodes, pathname, linkClass, onNavigate, depth = 0, theme }: TreeProps) {
  return (
    <>
      {nodes.map((node) =>
        node.children ? (
          <Branch
            key={node.label}
            node={node}
            pathname={pathname}
            linkClass={linkClass}
            onNavigate={onNavigate}
            depth={depth}
            theme={theme}
          />
        ) : (
          <NavLink
            key={node.href}
            item={node as NavItem}
            active={isActivePath(pathname, node.href!)}
            onNavigate={onNavigate}
            className={linkClass(node.href!)}
            monoIcons={theme?.monoIcons}
          />
        ),
      )}
    </>
  );
}

export type { NavItem, NavNode, NavSection };
