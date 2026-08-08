"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useShop } from "@/lib/shop";
import { useHomeUI } from "@/lib/home-ui";
import { formatPrice } from "@/lib/products";
import { sanitizeSearchQuery } from "@/lib/security";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const homeUI = useHomeUI();
  const { count, total, ready } = useCart();
  const { count: wishlistCount, ready: wishlistReady } = useWishlist();
  const { openVinModal } = useShop();
  const [query, setQuery] = useState("");

  function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    const q = sanitizeSearchQuery(query);
    homeUI?.closeMobileSearch();
    if (q) router.push(`/products/?q=${encodeURIComponent(q)}`);
    else router.push("/products/");
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        {isHome && (
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label="Menü öffnen"
            onClick={homeUI?.toggleSidebar}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        )}

        <Link href="/" className="brand" aria-label="Buzzard Startseite">
          <Image src="/logo/logo.png" alt="Buzzard Logo" width={52} height={52} priority />
          <div className="brand-text">
            <span className="brand-name">BUZZARD</span>
            <span className="brand-tagline">QUALITÄT. LEISTUNG. VERTRAUEN.</span>
          </div>
        </Link>

        <form
          className={`search-wrap${homeUI?.mobileSearchOpen ? " mobile-open" : ""}`}
          onSubmit={handleSearch}
        >
          <div className="search-bar">
            <input
              type="search"
              placeholder="Suche nach Produkten, Marken, Kategorien..."
              aria-label="Suche"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={100}
            />
            <button type="submit" className="search-btn" aria-label="Suchen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </div>
        </form>

        <button
          type="button"
          className="mobile-search-toggle"
          aria-label="Suche öffnen"
          onClick={homeUI?.toggleMobileSearch}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>

        <button type="button" className="vin-header-btn" onClick={openVinModal}>
          VIN
        </button>

        <div className="header-actions">
          <Link href="/konto/" className="hdr-action hdr-action--account">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>
              Mein Konto
              <small>Anmelden</small>
            </span>
          </Link>
          <Link href="/wunschliste/" className="hdr-action hdr-action--wishlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            <span>
              Wunschliste
              <small>{wishlistReady && wishlistCount > 0 ? `${wishlistCount} Artikel` : "Meine Favoriten"}</small>
            </span>
          </Link>
          <Link href="/warenkorb/" className="hdr-action cart-action">
            <span className="cart-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6" />
              </svg>
              {ready && count > 0 && <span className="cart-badge">{count}</span>}
            </span>
            <span>
              Warenkorb
              <small className="cart-price" suppressHydrationWarning>
                {ready ? formatPrice(total) : "0,00 €"}
              </small>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
