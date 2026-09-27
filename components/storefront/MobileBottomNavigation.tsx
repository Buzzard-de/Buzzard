"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { useHomeUI } from "@/lib/home-ui";
import { useLocale } from "@/lib/i18n/context";

export default function MobileBottomNavigation() {
  const pathname = usePathname();
  const homeUI = useHomeUI();
  const { count, ready } = useCart();
  const { t } = useLocale();

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="mobile-bottom-nav" aria-label={t("home.mobileNav")}>
      <Link href="/" className={`mobile-bottom-nav-item${pathname === "/" ? " active" : ""}`} aria-label={t("home.mobileHome")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z" />
        </svg>
        <span>{t("home.mobileHome")}</span>
      </Link>
      <button
        type="button"
        className="mobile-bottom-nav-item"
        aria-label={t("home.openCategories")}
        aria-expanded={homeUI?.sidebarOpen}
        onClick={homeUI?.openSidebar}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>{t("home.mobileCategories")}</span>
      </button>
      <button
        type="button"
        className="mobile-bottom-nav-item"
        aria-label={t("header.searchOpen")}
        aria-expanded={homeUI?.mobileSearchOpen}
        onClick={homeUI?.toggleMobileSearch}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span>{t("home.mobileSearch")}</span>
      </button>
      <Link
        href="/konto/"
        className={`mobile-bottom-nav-item${pathname.startsWith("/konto") ? " active" : ""}`}
        aria-label={t("home.mobileAccount")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>{t("home.mobileAccount")}</span>
      </Link>
      <Link
        href="/warenkorb/"
        className={`mobile-bottom-nav-item${pathname.startsWith("/warenkorb") ? " active" : ""}`}
        aria-label={t("home.mobileCart")}
      >
        <span className="mobile-bottom-nav-cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6" />
          </svg>
          {ready && count > 0 ? <span className="mobile-bottom-nav-badge">{count}</span> : null}
        </span>
        <span>{t("home.mobileCart")}</span>
      </Link>
    </nav>
  );
}
