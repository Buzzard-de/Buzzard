"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { useHomeUI } from "@/lib/home-ui";
import { useLocale } from "@/lib/i18n/context";

export default function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const homeUI = useHomeUI();
  const { t } = useLocale();
  const { count, ready } = useCart();
  const isHome = pathname === "/";

  return (
    <header className="buzzard-mobile-header">
      {isHome ? (
        <button
          type="button"
          className="buzzard-mobile-header-btn"
          aria-label={t("header.menuOpen")}
          onClick={homeUI?.openMegaMenu}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          className="buzzard-mobile-header-btn"
          aria-label={t("mobile.back")}
          onClick={() => router.back()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22" aria-hidden="true">
            <path d="M15 18 9 12l6-6" />
          </svg>
        </button>
      )}

      <Link href="/" className="buzzard-mobile-logo" aria-label={t("header.homeAria")}>
        <Image src="/logo/logo.png" alt="Buzzard Logo" width={36} height={36} priority />
        <span className="buzzard-mobile-wordmark">BUZZARD</span>
      </Link>

      <div className="buzzard-mobile-header-actions">
        <Link href="/warenkorb/" className="buzzard-mobile-header-link" aria-label={t("header.cart")}>
          <span className="buzzard-mobile-cart-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6" />
            </svg>
            {ready && count > 0 ? <span className="buzzard-mobile-cart-badge">{count}</span> : null}
          </span>
        </Link>
      </div>
    </header>
  );
}
