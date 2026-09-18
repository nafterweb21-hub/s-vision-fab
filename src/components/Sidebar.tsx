"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { type PermissionsMap } from "@/lib/access";
import { NavTree, isActivePath, visibleSections } from "./NavLink";
import { ChevronDown, LayoutDashboard, LogOut, Menu, X, Search } from "lucide-react";

interface SidebarProps {
  userEmail?: string | null;
  userRole?: string | null;
  userPermissions?: PermissionsMap | null;
}

export default function Sidebar({ userEmail, userRole, userPermissions }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const sections = visibleSections(userPermissions, userRole);

  const filteredSections = sections.map(section => {
    if (!searchQuery.trim()) return section;
    const lowerQuery = searchQuery.trim().toLowerCase();
    
    const searchNode = (node: any): any => {
      const matchesSelf = node.label.toLowerCase().includes(lowerQuery);
      const children = (node.children ?? [])
        .map((child: any) => searchNode(child))
        .filter(Boolean);
      if (!matchesSelf && children.length === 0) return null;
      return { ...node, children: children.length > 0 ? children : undefined };
    };

    const items = section.items.map(searchNode).filter(Boolean);
    if (items.length === 0 && !section.title.toLowerCase().includes(lowerQuery)) return null;
    return { ...section, items: items.length > 0 ? items : section.items };
  }).filter(Boolean) as typeof sections;

  const close = () => setIsOpen(false);

  const linkClass = (href: string) => {
    const active = isActivePath(pathname, href);
    return `flex items-center gap-3 px-3 py-2 md:py-2.5 text-[11px] md:text-sm font-medium rounded-lg transition-all duration-200 ${
      active
        ? "bg-indigo-600 text-white shadow-md shadow-slate-500/20 translate-x-1"
        : "text-indigo-600 hover:bg-slate-50 hover:text-indigo-700"
    }`;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-3 z-50 rounded-xl border border-slate-200 bg-white p-2 md:p-2.5 text-slate-600 shadow-sm transition-all duration-300 hover:bg-slate-50 ${
          isOpen ? "right-4 md:right-auto md:left-[19rem]" : "left-4 md:left-6"
        }`}
        aria-label="Toggle Navigation"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-1/2 sm:w-64 md:w-72 transform flex-col overflow-hidden border-r border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-indigo-600/5 to-purple-600/5 px-6">
          <img src="/logo.jpg" alt="Vision One Logo" className="h-8 w-auto object-contain drop-shadow-md" />
          <div>
            <h1 className="text-sm font-bold tracking-wide text-slate-900">FITPRISE EMS</h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
              Vision One ERP
            </p>
          </div>
        </div>

        <div className="scrollbar-thin scrollbar-thumb-slate-200 flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {/* Search Bar */}
          <div className="relative mb-4 px-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 md:py-2 pl-9 md:pl-10 pr-3 text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Link href="/dashboard" onClick={close} className={linkClass("/dashboard")}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>

          {filteredSections.map((section) =>
            section.collapsible ? (
              <div key={section.title} className="pt-4">
                <button
                  onClick={() => setIsReportsOpen(!isReportsOpen)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-50"
                >
                  <span>{section.title}</span>
                  <ChevronDown
                    size={14}
                    className={`transform transition-transform ${isReportsOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`mt-1 space-y-2 overflow-hidden transition-all duration-300 ${
                    isReportsOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <NavTree
                    nodes={section.items}
                    pathname={pathname}
                    linkClass={linkClass}
                    onNavigate={close}
                  />
                </div>
              </div>
            ) : (
              <div key={section.title} className="pt-4">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {section.title}
                </p>
                <NavTree
                  nodes={section.items}
                  pathname={pathname}
                  linkClass={linkClass}
                  onNavigate={close}
                />
              </div>
            ),
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50/50 p-4">
          {userEmail && (
            <div className="mb-3 px-1">
              <p className="truncate text-xs font-semibold text-slate-900">{userEmail}</p>
              {userRole && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {userRole}
                </p>
              )}
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-slate-200 active:scale-95 transition-transform"
          >
            <LogOut size={14} />
            Sign out
          </button>
          <p className="mt-3 text-center text-[10px] font-medium text-slate-500">FITPRISE EMS v1.1</p>
        </div>
      </aside>
    </>
  );
}
