"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS, type NavNode } from "./nav-config";

const APP_NAME = "Vision One ERP";

function collect(nodes: NavNode[], out: { href: string; label: string }[]) {
  for (const n of nodes) {
    if (n.href) out.push({ href: n.href, label: n.label });
    if (n.children) collect(n.children, out);
  }
}

const NAV_ENTRIES: { href: string; label: string }[] = [];
for (const section of NAV_SECTIONS) collect(section.items, NAV_ENTRIES);

function titleFor(pathname: string): string {
  if (pathname === "/dashboard") return `Dashboard | ${APP_NAME}`;
  let best: { href: string; label: string } | null = null;
  for (const e of NAV_ENTRIES) {
    const matches = pathname === e.href || pathname.startsWith(`${e.href}/`);
    if (matches && (!best || e.href.length > best.href.length)) best = e;
  }
  return best ? `${best.label} | ${APP_NAME}` : APP_NAME;
}

/** Sets the browser tab title from the navigation label of the current page. */
export default function PageTitle() {
  const pathname = usePathname();
  useEffect(() => {
    document.title = titleFor(pathname);
  }, [pathname]);
  return null;
}
