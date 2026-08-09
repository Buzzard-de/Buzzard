"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/context";

const NAV = [
  { href: "/admin/", label: "Dashboard" },
  { href: "/admin/analytics/", label: "Analytics" },
  { href: "/admin/analytics-dashboard/", label: "Executive KPIs" },
  { href: "/admin/marketing-center/", label: "Marketing Center" },
  { href: "/admin/marketplace-hub/", label: "Marketplace Hub" },
  { href: "/admin/seo/", label: "SEO" },
  { href: "/admin/products/", label: "Produkte" },
  { href: "/admin/catalog/", label: "Katalog & SEO" },
  { href: "/admin/pim-catalog/", label: "PIM v1.9" },
  { href: "/admin/identity-security/", label: "Security v2.0" },
  { href: "/admin/payments-finance/", label: "Finance v2.1" },
  { href: "/admin/order-management/", label: "OMS v2.2" },
  { href: "/admin/localization/", label: "Localization" },
  { href: "/admin/customer-checkout/", label: "Checkout" },
  { href: "/admin/customer-support/", label: "Support" },
  { href: "/admin/crm-loyalty/", label: "CRM & Loyalty" },
  { href: "/admin/suppliers/", label: "Lieferanten" },
  { href: "/admin/supplier-hub/", label: "Supplier Hub" },
  { href: "/admin/integrations/", label: "Integrations" },
  { href: "/admin/sync/", label: "Sync & Import" },
  { href: "/admin/orders/", label: "Bestellungen" },
  { href: "/admin/logistics/", label: "Logistik" },
  { href: "/admin/logistics-fulfillment/", label: "Logistics v1.7" },
  { href: "/admin/wms-inventory/", label: "WMS v1.8" },
  { href: "/admin/automation/", label: "Automation" },
];

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
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href || pathname.startsWith(item.href.slice(0, -1)) && item.href !== "/admin/" ? "active" : ""}
            >
              {item.label}
            </Link>
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
      <main className="admin-main">{children}</main>
    </div>
  );
}
