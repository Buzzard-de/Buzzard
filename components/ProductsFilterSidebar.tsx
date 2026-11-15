"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { categoryHref, getCategoryLabel, getChildren } from "@/lib/categories";
import { isAllowedFilter } from "@/lib/security";
import { useLocale } from "@/lib/i18n/context";

export default function ProductsFilterSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useLocale();
  const options = [
    { id: "alle", label: t("category.filterAll"), href: "/products/" },
    ...getChildren("cat-05").map((cat) => ({
      id: cat.id,
      label: getCategoryLabel(cat, locale),
      href: categoryHref(cat),
    })),
  ];
  const activeFilter = isAllowedFilter(searchParams.get("filter") || "alle", options)
    ? searchParams.get("filter") || "alle"
    : "alle";

  function setFilter(filter: string) {
    if (!isAllowedFilter(filter, options)) return;
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "alle") params.delete("filter");
    else params.set("filter", filter);
    const q = params.toString();
    router.push(q ? `/products/?${q}` : "/products/");
  }

  return (
    <aside className="home-sidebar products-filter-sidebar" aria-label={t("category.filterAria")}>
      <h2 className="category-sidebar-title">{t("category.automotiveTitle")}</h2>
      <ul className="home-sidebar-list">
        {options.map((opt) => (
          <li key={opt.id}>
            <button
              type="button"
              className={`home-sidebar-item${activeFilter === opt.id ? " active" : ""}`}
              onClick={() => setFilter(opt.id)}
            >
              <span>{opt.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="category-sidebar-links">
        <Link href="/kategorie/automotive/">→ {t("category.allAutomotive")}</Link>
        <Link href="/">← {t("category.home")}</Link>
      </div>
    </aside>
  );
}
