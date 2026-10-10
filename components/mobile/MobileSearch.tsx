"use client";

import { FormEvent, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { trackMarketingEvent } from "@/lib/marketing/events";

function alignSearchWithAutomotive() {
  const wrap = document.querySelector(".home-phone-controls .buzzard-mobile-search");
  const bar = document.querySelector(".home-phone-controls .buzzard-mobile-search-form");
  const rail = document.querySelector(".mobile-home-category-rail");
  const automotive = document.querySelector(".mobile-home-category-rail [data-category-id='cat-05']");
  if (!(wrap instanceof HTMLElement)) return;
  if (
    !(rail instanceof HTMLElement) ||
    !(automotive instanceof HTMLElement) ||
    window.getComputedStyle(rail).display === "none"
  ) {
    wrap.style.marginTop = "0px";
    return;
  }
  const target = bar instanceof HTMLElement ? bar : wrap;
  const currentMargin = Number.parseFloat(wrap.style.marginTop || "0") || 0;
  const delta = automotive.getBoundingClientRect().top - target.getBoundingClientRect().top;
  if (Math.abs(delta) < 1) return;
  wrap.style.marginTop = `${Math.max(0, Math.round(currentMargin + delta))}px`;
}

export default function MobileSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const inCategory = pathname.startsWith("/kategorie");

  useLayoutEffect(() => {
    const run = () => alignSearchWithAutomotive();
    run();
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(run));
    void document.fonts?.ready.then(run);
    const rail = document.querySelector(".mobile-home-category-rail");
    const automotive = document.querySelector(".mobile-home-category-rail [data-category-id='cat-05']");
    const observer = new ResizeObserver(run);
    if (rail) observer.observe(rail);
    if (automotive) observer.observe(automotive);
    window.addEventListener("resize", run);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", run);
    };
  }, []);

  function handleSearch(e?: FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q) {
      trackMarketingEvent("search", { search_term: q });
      router.push(`/products/?q=${encodeURIComponent(q)}`);
      return;
    }
    router.push("/products/");
  }

  return (
    <div className="buzzard-mobile-search">
      <form className="buzzard-mobile-search-form" onSubmit={handleSearch} role="search">
        <input
          className="buzzard-mobile-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          id="buzzard-mobile-search-input"
          placeholder={inCategory ? t("mobile.categorySearchPlaceholder") : t("mobile.searchPlaceholder")}
          aria-label={t("header.search")}
        />
        <button type="submit" className="buzzard-mobile-search-btn" aria-label={t("header.search")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </form>
    </div>
  );
}
