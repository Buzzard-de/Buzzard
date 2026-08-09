"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/context";
import { ADMIN_NAV_GROUPS, adminHref } from "@/lib/admin/nav.config.mjs";
import AdminApiStatusBanner from "./AdminApiStatusBanner";

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
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.id} className="admin-nav-group">
              <p className="admin-nav-group-label">{group.label}</p>
              {group.items.map((item) => {
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
