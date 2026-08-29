"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/context";
import { ADMIN_NAV_GROUPS, adminHref } from "@/lib/admin/nav.config.mjs";
import { filterNavGroupsForRole } from "@/lib/admin/navPermissions.mjs";
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

  async function handleLogout() {
    await logout();
    router.push("/admin/login/");
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
        {children}
      </main>
    </div>
  );
}
