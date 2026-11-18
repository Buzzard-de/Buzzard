"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminAuth } from "@/lib/admin/context";
import { ADMIN_NAV_GROUPS, adminHref } from "@/lib/admin/nav.config.mjs";
import { filterNavGroupsForRole } from "@/lib/admin/navPermissions.mjs";
import { ADMIN_REFUSAL_EVENT, type AdminRefusal } from "@/lib/admin/refusals";
import AdminApiStatusBanner from "./AdminApiStatusBanner";

type NavItem = { slug: string; label: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/") {
    return pathname === "/admin/" || pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(href);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAdminAuth();
  const visibleNavGroups = filterNavGroupsForRole(ADMIN_NAV_GROUPS, user?.role || "");
  const [refused, setRefused] = useState<AdminRefusal | null>(null);

  // A change the API refused for this role is announced here, whichever page asked for it.
  useEffect(() => {
    function onRefusal(event: Event) {
      const detail = (event as CustomEvent<AdminRefusal>).detail;
      if (detail?.status === 403) setRefused(detail);
    }
    window.addEventListener(ADMIN_REFUSAL_EVENT, onRefusal);
    return () => window.removeEventListener(ADMIN_REFUSAL_EVENT, onRefusal);
  }, []);

  useEffect(() => {
    setRefused(null);
  }, [pathname]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.push("/admin/login/");
    }
  }

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>BUZZARD</strong>
          <span>Admin</span>
        </div>
        <nav className="admin-nav">
          {visibleNavGroups.map((group: NavGroup) => (
            <div key={group.id} className="admin-nav-group">
              <p className="admin-nav-group-label">{group.label}</p>
              {group.items.map((item: NavItem) => {
                const href = adminHref(item.slug);
                return (
                  <Link
                    key={item.slug || "dashboard"}
                    href={href}
                    className={isNavActive(pathname, href) ? "active" : ""}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="admin-user">
          <p>{user?.name}</p>
          <small>{user?.role}</small>
          <button type="button" className="shop-btn-secondary" onClick={handleLogout}>
            Abmelden
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <AdminApiStatusBanner />
        {refused && (
          <div className="admin-refusal" role="alert" data-testid="admin-action-refused">
            <p>
              <strong>Aktion nicht erlaubt.</strong> Ihre Rolle ({user?.role || "unbekannt"}) darf diese Änderung nicht
              ausführen; es wurde nichts geändert.
            </p>
            <p className="admin-meta">
              <code>
                {refused.method} {refused.path}
              </code>
            </p>
            <button type="button" className="shop-btn-secondary" onClick={() => setRefused(null)}>
              Schließen
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
