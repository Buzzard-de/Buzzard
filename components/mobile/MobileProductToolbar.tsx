"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { categoryHref, getCategoryLabel } from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";
import { getMobileFilterScope } from "@/lib/mobile/categoryFilters";
import { isAllowedFilter } from "@/lib/security";
import { showPrices } from "@/lib/shop/mode";
import { useLocale } from "@/lib/i18n/context";

interface MobileProductToolbarProps {
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  category?: BuzzardCategory | null;
}

export default function MobileProductToolbar({
  view,
  onViewChange,
  category = null,
}: MobileProductToolbarProps) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sheet, setSheet] = useState<"filter" | "sort" | null>(null);
  const sort = searchParams.get("sort") || "default";
  const scope = getMobileFilterScope(category);
  const options = [
    { id: "alle", label: t("category.filterAll"), href: scope.allHref },
    ...scope.categories.map((cat) => ({
      id: cat.id,
      label: getCategoryLabel(cat, locale),
      href: categoryHref(cat),
    })),
  ];
  const activeFilter = isAllowedFilter(searchParams.get("filter") || "alle", options)
    ? searchParams.get("filter") || "alle"
    : "alle";

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function setFilter(filter: string) {
    if (!isAllowedFilter(filter, options)) return;
    const option = options.find((item) => item.id === filter);
    if (option && filter !== "alle") {
      router.push(option.href);
      setSheet(null);
      return;
    }
    pushParams((params) => {
      params.delete("filter");
    });
    setSheet(null);
  }

  function setSort(next: string) {
    pushParams((params) => {
      if (next === "default") params.delete("sort");
      else params.set("sort", next);
    });
    setSheet(null);
  }

  const sortOptions = [
    { id: "default", label: t("mobile.sortDefault") },
    { id: "name-asc", label: t("search.sortName") },
    ...(showPrices()
      ? [
          { id: "price-asc", label: t("search.sortPriceAsc") },
          { id: "price-desc", label: t("search.sortPriceDesc") },
        ]
      : []),
    { id: "bestseller", label: t("mobile.sortBestseller") },
  ];

  return (
    <>
      <div className="buzzard-mobile-toolbar" role="toolbar" aria-label={t("mobile.filter")}>
        <button type="button" className="buzzard-mobile-toolbar-btn" onClick={() => setSheet("filter")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          {t("mobile.filter")}
        </button>
        <button type="button" className="buzzard-mobile-toolbar-btn" onClick={() => setSheet("sort")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16" aria-hidden="true">
            <path d="M8 6v12M8 6l-3 3M8 6l3 3M16 18V6M16 18l-3-3M16 18l3-3" />
          </svg>
          {t("mobile.sort")}
        </button>
        <span className="buzzard-mobile-toolbar-spacer" />
        <button
          type="button"
          className="buzzard-mobile-toolbar-view"
          aria-pressed={view === "grid"}
          aria-label={t("mobile.grid")}
          onClick={() => onViewChange("grid")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
        <button
          type="button"
          className="buzzard-mobile-toolbar-view"
          aria-pressed={view === "list"}
          aria-label={t("mobile.list")}
          onClick={() => onViewChange("list")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" aria-hidden="true">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </button>
      </div>

      {sheet ? (
        <>
          <button
            type="button"
            className="buzzard-mobile-sheet-backdrop"
            aria-label={t("megaMenu.close")}
            onClick={() => setSheet(null)}
          />
          <div className="buzzard-mobile-sheet" role="dialog" aria-modal="true">
            <h2>{sheet === "filter" ? t("mobile.filter") : t("mobile.sort")}</h2>
            {sheet === "filter"
              ? options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={activeFilter === opt.id ? "active" : ""}
                    onClick={() => setFilter(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))
              : sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={sort === opt.id ? "active" : ""}
                    onClick={() => setSort(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
          </div>
        </>
      ) : null}
    </>
  );
}
