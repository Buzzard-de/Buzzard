"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { useHomeUI } from "@/lib/home-ui";
import { useLocale } from "@/lib/i18n/context";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const homeUI = useHomeUI();
  const { count, ready } = useCart();
  const { t } = useLocale();

  return (
    <nav className="buzzard-mobile-only buzzard-mobile-bottom-nav" aria-label={t("mobile.navAria")}>
      <Link
        href="/"
        className={`buzzard-mobile-bottom-nav-item${pathname === "/" ? " active" : ""}`}
        aria-current={pathname === "/" ? "page" : undefined}
        aria-label={t("mobile.home")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z" />
        </svg>
        <span>{t("mobile.home")}</span>
      </Link>
      <Link
        href="/kategorie/automotive/"
        className={`buzzard-mobile-bottom-nav-item${pathname.startsWith("/kategorie") ? " active" : ""}`}
        aria-label={t("mobile.categories")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span>{t("mobile.categoriesShort")}</span>
      </Link>
      <button
        type="button"
        className="buzzard-mobile-bottom-nav-item"
        aria-label={t("mobile.search")}
        onClick={() => {
          if (pathname.startsWith("/products")) {
            homeUI?.toggleMobileSearch();
            return;
          }
          router.push("/products/");
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span>{t("mobile.search")}</span>
      </button>
      <Link
        href="/warenkorb/"
        className={`buzzard-mobile-bottom-nav-item${pathname.startsWith("/warenkorb") ? " active" : ""}`}
        aria-label={t("mobile.cart")}
      >
        <span className="buzzard-mobile-bottom-nav-cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6" />
          </svg>
          {ready && count > 0 ? <span className="buzzard-mobile-cart-badge">{count}</span> : null}
        </span>
        <span>{t("mobile.cart")}</span>
      </Link>
      <Link
        href="/konto/"
        className={`buzzard-mobile-bottom-nav-item${pathname.startsWith("/konto") ? " active" : ""}`}
        aria-label={t("mobile.account")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>{t("mobile.account")}</span>
      </Link>
    </nav>
  );
}
