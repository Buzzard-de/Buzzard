"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "@/lib/account/context";
import { useLocale } from "@/lib/i18n/context";

const NAV = [
  { href: "/konto/", labelKey: "account.nav.dashboard" },
  { href: "/konto/bestellungen/", labelKey: "account.nav.orders" },
  { href: "/konto/adressen/", labelKey: "account.nav.addresses" },
  { href: "/wunschliste/", labelKey: "account.nav.wishlist" },
  { href: "/konto/profil/", labelKey: "account.nav.profile" },
  { href: "/konto/einstellungen/", labelKey: "account.nav.settings" },
];

export default function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAccount();
  const { t } = useLocale();

  async function handleLogout() {
    await logout();
    router.push("/konto/login/");
  }

  return (
    <div className="account-app">
      <aside className="account-sidebar">
        <div className="account-welcome">
          <p>{t("account.welcome")}</p>
          <strong>{user?.firstName} {user?.lastName}</strong>
          <small>{user?.email}</small>
        </div>
        <nav className="account-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : ""}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <button type="button" className="shop-btn-secondary" onClick={handleLogout}>
          {t("account.logout")}
        </button>
      </aside>
      <div className="account-main">{children}</div>
    </div>
  );
}
