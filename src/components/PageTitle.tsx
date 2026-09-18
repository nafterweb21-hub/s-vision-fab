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

/**
 * Sets the browser tab title from the navigation label of the current page.
 *
 * Next re-applies the static metadata title on hydration and after navigation, which
 * would overwrite a one-off assignment, so the title is re-asserted whenever it changes.
 */
export default function PageTitle() {
  const pathname = usePathname();
  useEffect(() => {
    const desired = titleFor(pathname);
    const apply = () => {
      if (document.title !== desired) document.title = desired;
    };
    apply();

    // Watch <head> rather than the <title> node: React may swap the element, not just its text.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
