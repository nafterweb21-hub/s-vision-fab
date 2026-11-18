"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { canAccess, type PermissionsMap } from "@/lib/access";
import {
  NavTree,
  isActivePath,
  nodeContainsPath,
  visibleSections,
  type NavNode,
  type NavSection,
  type TreeTheme,
} from "./NavLink";
import { NAV_MODULES, type NavModule } from "./nav-config";
import { ChevronDown, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";

interface SidebarProps {
  userEmail?: string | null;
  userRole?: string | null;
  userPermissions?: PermissionsMap | null;
}

const PANEL_KEY = "sidebar:panel-collapsed";

const DARK_TREE: TreeTheme = {
  group:
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-slate-300 transition-colors hover:bg-white/5 hover:text-white",
  toggle: "rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200",
  children: "ml-[18px] mt-0.5 space-y-0.5 border-l border-white/10 pl-2",
  monoIcons: true,
};

function linkClass(pathname: string) {
  return (href: string) => {
    const active = isActivePath(pathname, href);
    return `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
      active
        ? "bg-indigo-500/15 font-medium text-white ring-1 ring-inset ring-indigo-400/30 [&>svg]:text-indigo-300"
        : "text-slate-300 hover:bg-white/5 hover:text-white [&>svg]:text-slate-500 hover:[&>svg]:text-slate-300"
    }`;
  };
}

/** Keeps nodes whose label (or a descendant's) matches the query. */
function filterTree(nodes: NavNode[], q: string): NavNode[] {
  return nodes.flatMap((node) => {
    const children = filterTree(node.children ?? [], q);
    if (node.label.toLowerCase().includes(q)) return [node];
    if (children.length > 0) return [{ ...node, children }];
    return [];
  });
}

export default function Sidebar({ userEmail, userRole, userPermissions }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [closedSections, setClosedSections] = useState<Set<string>>(new Set());

  const sections = useMemo(() => visibleSections(userPermissions, userRole), [userPermissions, userRole]);
  const canSeeDashboard = canAccess("/dashboard", userPermissions, userRole);

  // Modules that still have something visible for this role.
  const modules = useMemo(() => {
    const byTitle = new Map(sections.map((s) => [s.title, s]));
    return NAV_MODULES.map((m) => ({
      module: m,
      sections: m.sections.map((t) => byTitle.get(t)).filter((s): s is NavSection => !!s),
    })).filter(({ module, sections }) => sections.length > 0 || (module.includeDashboard && canSeeDashboard));
  }, [sections, canSeeDashboard]);

  // The module that owns the current page.
  const routeModuleKey = useMemo(() => {
    if (pathname === "/dashboard") return "home";
    const hit = modules.find(({ sections }) =>
      sections.some((s) => s.items.some((n) => nodeContainsPath(n, pathname))),
    );
    return hit?.module.key ?? modules[0]?.module.key;
  }, [modules, pathname]);

  const [selectedKey, setSelectedKey] = useState(routeModuleKey);
  useEffect(() => {
    // Follow the route when the user navigates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedKey(routeModuleKey);
    setMobileOpen(false);
  }, [routeModuleKey, pathname]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPanelCollapsed(localStorage.getItem(PANEL_KEY) === "1");
    } catch {}
  }, []);

  const togglePanel = (collapsed: boolean) => {
    setPanelCollapsed(collapsed);
    try {
      localStorage.setItem(PANEL_KEY, collapsed ? "1" : "0");
    } catch {}
  };

  const selected = modules.find((m) => m.module.key === selectedKey) ?? modules[0];
  const q = query.trim().toLowerCase();

  // While searching, look across every module, not just the selected one.
  const panelSections: NavSection[] = q
    ? sections
        .map((s) => ({ ...s, items: filterTree(s.items, q) }))
        .filter((s) => s.items.length > 0)
    : selected?.sections ?? [];

  const showDashboardLink =
    canSeeDashboard && (q ? "dashboard".includes(q) : !!selected?.module.includeDashboard);

  const toggleSection = (title: string) =>
    setClosedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  const selectModule = (m: NavModule) => {
    setSelectedKey(m.key);
    setQuery("");
    if (panelCollapsed) togglePanel(false);
  };

  const cls = linkClass(pathname);
  const SelectedIcon = selected?.module.icon;
  const panelHidden = panelCollapsed && !mobileOpen;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-3 top-2.5 z-50 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm md:hidden"
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 transition-transform duration-200 md:relative md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Module rail */}
        <nav className="flex w-[68px] flex-col items-center bg-[#0b1120] py-3">
          <Link
            href="/dashboard"
            className="mb-4 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white"
            title="FITPRISE EMS"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Vision One" className="h-8 w-8 object-contain" />
          </Link>

          <div className="scrollbar-none flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-1.5">
            {modules.map(({ module }) => {
              const Icon = module.icon;
              const isSelected = module.key === selected?.module.key && !panelHidden;
              const ownsRoute = module.key === routeModuleKey;
              return (
                <button
                  key={module.key}
                  onClick={() => selectModule(module)}
                  title={module.label}
                  className={`relative flex w-full flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors ${
                    isSelected
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-900/40"
                      : ownsRoute
                        ? "text-white hover:bg-white/5"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {ownsRoute && !isSelected && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-indigo-400" />
                  )}
                  <Icon size={19} strokeWidth={1.75} />
                  <span className="leading-none">{module.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title={userEmail ? `Sign out ${userEmail}` : "Sign out"}
            className="mt-2 flex w-[56px] flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-rose-300"
          >
            <LogOut size={18} strokeWidth={1.75} />
            <span className="leading-none">Sign out</span>
          </button>
        </nav>

        {/* Section panel */}
        <div
          className={`flex flex-col overflow-hidden border-r border-white/5 bg-[#111827] transition-[width] duration-200 ${
            panelHidden ? "w-0" : "w-[232px]"
          }`}
        >
          <div className="flex h-14 shrink-0 items-center border-b border-white/5 px-4">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold tracking-wide text-white">FITPRISE EMS</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Vision One ERP
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <div className="flex min-w-0 items-center gap-2 text-white">
              {SelectedIcon && <SelectedIcon size={16} className="shrink-0 text-indigo-400" />}
              <span className="truncate text-sm font-semibold">{q ? "Search results" : selected?.module.label}</span>
            </div>
            <button
              onClick={() => togglePanel(true)}
              className="hidden rounded-md p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200 md:block"
              aria-label="Collapse menu panel"
              title="Collapse"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          <div className="px-3 pb-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search menu..."
                className="h-8 w-full rounded-md border border-white/10 bg-white/5 pl-8 pr-2 text-[13px] text-slate-200 placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
              />
            </div>
          </div>

          <div className="scrollbar-dark flex-1 overflow-y-auto px-3 pb-4">
            {showDashboardLink && (
              <div className="mt-1">
                <Link href="/dashboard" className={cls("/dashboard")}>
                  <LayoutDashboard size={16} className="shrink-0" />
                  <span className="flex-1 truncate">Dashboard</span>
                </Link>
              </div>
            )}

            {panelSections.map((section) => {
              const open = q !== "" || !closedSections.has(section.title);
              return (
                <div key={section.title} className="mt-3">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex w-full items-center justify-between rounded px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500 transition-colors hover:text-slate-300"
                  >
                    <span>{section.title}</span>
                    <ChevronDown size={13} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
                  </button>
                  {open && (
                    <div className="mt-0.5 space-y-0.5">
                      <NavTree nodes={section.items} pathname={pathname} linkClass={cls} theme={DARK_TREE} />
                    </div>
                  )}
                </div>
              );
            })}

            {q && panelSections.length === 0 && !showDashboardLink && (
              <p className="px-2.5 py-6 text-center text-xs text-slate-500">No menu matches “{query}”.</p>
            )}
          </div>

          {userEmail && (
            <div className="shrink-0 border-t border-white/5 px-4 py-2.5">
              <p className="truncate text-xs text-slate-300">{userEmail}</p>
              {userRole && (
                <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">{userRole}</p>
              )}
            </div>
          )}
        </div>

        {/* Re-open handle when the panel is collapsed */}
        {panelHidden && (
          <button
            onClick={() => togglePanel(false)}
            className="absolute -right-3 top-[18px] hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-indigo-600 md:flex"
            aria-label="Expand menu panel"
            title="Expand"
          >
            <PanelLeftOpen size={13} />
          </button>
        )}
      </aside>
    </>
  );
}
