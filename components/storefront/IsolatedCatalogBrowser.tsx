"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { isRtlLanguage } from "@/lib/i18n/languages";
import { localizePath } from "@/lib/i18n/routing";
import type { IsolatedCard, IsolatedChrome } from "@/lib/storefront/isolatedSnapshot";
import { isolatedProductSeo } from "@/lib/storefront/productSeo";

type Props = {
  mode: "list" | "detail";
  selected: string;
  sales: string;
  locales: IsolatedChrome[];
  itemsByLocale: Record<string, IsolatedCard[]>;
  detailByLocale?: Record<string, IsolatedCard>;
  productId?: string;
  routeLocale?: string;
};

export default function IsolatedCatalogBrowser({
  mode,
  selected,
  sales,
  locales,
  itemsByLocale,
  detailByLocale,
  productId,
  routeLocale,
}: Props) {
  const { locale, t, setLocale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const appliedRoute = useRef(false);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    if (appliedRoute.current || !routeLocale || routeLocale === locale) return;
    appliedRoute.current = true;
    setLocale(routeLocale, true);
  }, [routeLocale, locale, setLocale]);
  useEffect(() => {
    if (!ready || !productId || (routeLocale && locale !== routeLocale && !appliedRoute.current)) return;
    const applyTitle = () => {
      const seo = isolatedProductSeo(productId, locale);
      if (document.title !== seo.title) document.title = seo.title;
      return seo;
    };
    const seo = applyTitle();
    const titleNode = document.head;
    const observer = new MutationObserver(() => applyTitle());
    observer.observe(titleNode, { subtree: true, childList: true, characterData: true });
    const target = seo.status === "PRESENT"
      ? localizePath(`/katalog/urun/${productId}/`, locale)
      : localizePath(`/katalog/urun/${productId}/`, "de");
    const here = pathname.endsWith("/") ? pathname : `${pathname}/`;
    if (here !== target) router.replace(target);
    return () => observer.disconnect();
  }, [ready, productId, locale, pathname, router, routeLocale]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const pendingRoute = Boolean(routeLocale && locale !== routeLocale && !appliedRoute.current);
  const activeLocale = pendingRoute && routeLocale ? routeLocale : locale;
  const activeDir = isRtlLanguage(activeLocale) ? "rtl" : "ltr";
  const chrome = locales.find((item) => item.locale === activeLocale) || locales.find((item) => item.locale === "de") || locales[0];
  const localeMissing = chrome?.locale !== activeLocale;
  const text = chrome?.strings || {};
  const visible = useMemo(() => {
    const source = itemsByLocale[activeLocale] || [];
    const needle = query.trim().toLocaleLowerCase(activeLocale);
    const matched = source.filter((item) => {
      const haystack = `${item.title || ""} ${item.sku}`.toLocaleLowerCase(activeLocale);
      return needle.length === 0 || haystack.includes(needle);
    });
    return [...matched].sort((a, b) => (a.title || a.sku).localeCompare(b.title || b.sku, activeLocale));
  }, [itemsByLocale, activeLocale, query]);
  const detail = detailByLocale?.[activeLocale];

  return (
    <section id="isolated-catalog" data-hydrated={ready ? "1" : "0"} data-locale={activeLocale} dir={activeDir} lang={activeLocale} style={{ background: "#0b0b0b", color: "#f5f0e6", minHeight: "70vh", fontFamily: "Georgia, serif", paddingBottom: 112 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: 16, borderBottom: "1px solid #c9a227", flexWrap: "wrap", alignItems: "center" }}>
        <Link href="/"><img src="/logo/logo.png" alt="Buzzard" width={140} height={42} /></Link>
        <nav aria-label={text.menu || "menu"} style={{ display: "flex", gap: 16 }}>
          <Link href="/katalog">{text.home || "home"}</Link>
          <Link href="/katalog">{text.categories || "categories"}</Link>
        </nav>
        <p style={{ flex: "1 1 220px", minWidth: 0, margin: 0 }}>{activeLocale} · {chrome?.provenance || "MACHINE_DRAFT"} · {chrome?.humanReviewed ? "REVIEWED" : "UNREVIEWED"}</p>
      </header>
      <p role="status" style={{ margin: 16, border: "1px solid #c9a227", padding: 12 }}>{text.sales || sales}</p>
      {localeMissing ? <p role="status">MISSING_TRANSLATION</p> : null}
      {mode === "list" ? (
        <section style={{ padding: 16 }}>
          <form role="search" onSubmit={(event) => event.preventDefault()} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input aria-label={text.search || "search"} value={query} onChange={(event) => setQuery(event.target.value)} style={{ minHeight: 44 }} />
            <label>
              {text.sort || "sort"}
              <select aria-label={text.sort || "sort"} value={sort} onChange={(event) => setSort(event.target.value)} style={{ minHeight: 44 }}>
                <option value="name">{t("search.sortName")}</option>
                <option value="price">{t("search.sortPriceAsc")}</option>
              </select>
            </label>
          </form>
          {sort === "price" ? <p>{text.price || "UNKNOWN"}</p> : null}
          <p>{(text.results || "{count}").replaceAll("{count}", String(visible.length))}</p>
          {visible.length === 0 ? <p role="status">{text.empty || "empty"}</p> : (
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, listStyle: "none", padding: 0 }}>
              {visible.map((item) => (
                <li key={item.id} style={{ border: "1px solid #c9a227", padding: 12 }}>
                  <div aria-hidden="true" style={{ height: 120, background: "#171717" }}>{item.photograph}</div>
                  <h2><Link href={`/katalog/urun/${item.id}`}>{item.title || text.placeholder}</Link></h2>
                  {item.translationStatus && item.translationStatus !== "PRESENT" ? <p>{item.translationStatus}</p> : null}
                  <p>{item.sku} · {item.brand} · {item.category?.code}</p>
                  <p>{text.price}: {item.price}</p>
                  <p>{text.shipping}: {item.shipping}</p>
                  <p>{text.stock}: {item.availability}</p>
                  <button type="button" disabled style={{ minHeight: 44 }}>{text.orderDisabled}</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : detail ? (
        <article style={{ padding: 16, maxWidth: 760 }}>
          <nav aria-label={text.breadcrumb || "breadcrumb"}>
            {(detail.breadcrumb || []).map((crumb) => <span key={crumb.code}>{crumb.code} {crumb.name} / </span>)}
          </nav>
          <p>{detail.translationStatus}</p>
          <h1>{detail.title || text.placeholder}</h1>
          <p>{detail.description || text.placeholder}</p>
          <dl>
            <div><dt>SKU</dt><dd>{detail.sku}</dd></div>
            <div><dt>{text.price}</dt><dd>{detail.price}</dd></div>
            <div><dt>{text.shipping}</dt><dd>{detail.shipping}</dd></div>
            <div><dt>{text.stock}</dt><dd>{detail.availability}</dd></div>
            <div><dt>{text.returns}</dt><dd>{detail.returns}</dd></div>
            <div><dt>QUOTE</dt><dd>{detail.quoteCode}</dd></div>
          </dl>
          <button type="button" disabled style={{ minHeight: 44 }}>{text.orderDisabled}</button>
        </article>
      ) : <p role="alert">{text.error}</p>}
      <footer style={{ padding: 16, color: "#c9a227" }}>{text.footer} · {selected}</footer>
    </section>
  );
}
