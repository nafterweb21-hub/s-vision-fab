"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { type PermissionsMap } from "@/lib/access";
import { NavTree, isActivePath, visibleSections } from "./NavLink";

interface GlobalHeaderProps {
  userEmail?: string | null;
  userRole?: string | null;
  userPermissions?: PermissionsMap | null;
  canSeeDashboard?: boolean;
}

/**
 * Header for pages outside the dashboard shell (the terminals). Its drawer
 * renders the same permission-gated navigation as `Sidebar`, so an operator who
 * also holds office modules can reach them without typing a URL.
 */
export default function GlobalHeader({
  userEmail,
  userRole,
  userPermissions,
  canSeeDashboard = false,
}: GlobalHeaderProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const sections = visibleSections(userPermissions, userRole);
  const close = () => setIsOpen(false);
  const isSignedIn = !!userEmail;

  const linkClass = (href: string) => {
    const active = isActivePath(pathname, href);
    return `flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 text-[11px] md:text-sm font-medium rounded-lg transition-all duration-200 ${
      active
        ? "bg-indigo-600 text-white shadow-md"
        : "text-indigo-600 hover:bg-slate-50 hover:text-indigo-700"
    }`;
  };

  return (
    <>
      <header className="no-print fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#1A2235] bg-[#0B0F19] px-4 shadow-md sm:px-6">
        <div className="flex items-center gap-4">
          {isSignedIn && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:bg-slate-50"
              aria-label="Toggle Navigation"
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}

          <div className="flex items-center gap-2 rounded-full border border-[#2A344A] bg-[#1A2235] px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
            <span className="text-[11px] font-semibold tracking-wider text-indigo-100">
              SYSTEM OVERVIEW
            </span>
          </div>
        </div>

        <div className="hidden items-center sm:flex">
          <div className="rounded-full border border-[#2A344A] bg-[#1A2235] px-4 py-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-300">
              ACTIVE COMPANY
            </span>
          </div>
        </div>
      </header>

      {isOpen && (
        <div
          onClick={close}
          className="no-print fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        />
      )}

      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-1/2 sm:w-64 md:w-72 transform flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-12 md:h-16 flex-none items-center justify-between border-b border-slate-200 px-4">
          <div>
            <h1 className="text-xs md:text-sm font-bold tracking-wide text-slate-900">FITPRISE EMS</h1>
            <p className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
              Vision One ERP
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close Navigation"
            className="rounded-lg p-1.5 md:p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {canSeeDashboard && (
            <Link href="/dashboard" onClick={close} className={linkClass("/dashboard")}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
          )}

          {sections.length === 0 && !canSeeDashboard && (
            <p className="px-3 py-4 text-sm text-slate-500">
              No modules are available to your role.
            </p>
          )}

          {sections.map((section) => (
            <div key={section.title} className="pt-2 md:pt-4">
              <p className="px-3 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
              <NavTree
                nodes={section.items}
                pathname={pathname}
                linkClass={linkClass}
                onNavigate={close}
              />
            </div>
          ))}
        </div>

        <div className="flex-none border-t border-slate-200 bg-slate-50/50 p-3 md:p-4">
          <div className="mb-2 md:mb-3 px-1">
            <p className="truncate text-[10px] md:text-xs font-semibold text-slate-900">{userEmail}</p>
            {userRole && (
              <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {userRole}
              </p>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:px-3 md:py-2 text-[10px] md:text-xs font-semibold text-indigo-700 hover:bg-slate-200 active:scale-95 transition-transform"
          >
            <LogOut size={14} className="w-3 h-3 md:w-4 md:h-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
