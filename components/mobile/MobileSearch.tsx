"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { trackMarketingEvent } from "@/lib/marketing/events";

export default function MobileSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const inCategory = pathname.startsWith("/kategorie");

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
