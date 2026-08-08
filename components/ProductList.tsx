"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import ProductSvg from "./ProductSvg";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useShop } from "@/lib/shop";
import { useLocale } from "@/lib/i18n/context";
import {
  filterProducts,
  getAllProducts,
  getCategoryLabelForProduct,
  paginateProducts,
  sortProducts,
} from "@/lib/products";
import { localizePublicProduct } from "@/lib/products/i18n";
import { findCategoryBySlugPath, getCategoryLabel } from "@/lib/categories";
import { normalizeVin, sanitizeSearchQuery } from "@/lib/security";
import { isCheckoutEnabled, showPrices } from "@/lib/shop/mode";
import PriceLabel from "@/components/shop/PriceLabel";

const PAGE_SIZE = 12;

interface ProductListProps {
  categorySlug?: string;
}

export default function ProductList({ categorySlug }: ProductListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const filter = searchParams.get("filter") || "alle";
  const sort = searchParams.get("sort") || "default";
  const query = sanitizeSearchQuery(searchParams.get("q"));
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const kategorieSlug = categorySlug || searchParams.get("kategorie");
  const kategorie = kategorieSlug ? findCategoryBySlugPath(kategorieSlug) : null;
  const rawVin = searchParams.get("vin");
  const vin = rawVin ? normalizeVin(rawVin) : null;
  const { vehicle } = useShop();
  const { add } = useCart();
  const { toggle, has } = useWishlist();
  const [addedId, setAddedId] = useState<string | null>(null);

  const result = useMemo(() => {
    const filtered = filterProducts(getAllProducts(), filter, query, kategorie);
    const sorted = sortProducts(filtered, sort);
    return paginateProducts(sorted, page, PAGE_SIZE);
  }, [filter, sort, query, kategorie, page]);

  function pageHref(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    const q = params.toString();
    return q ? `?${q}` : "?";
  }

  function handleAdd(id: string) {
    add({ productId: id });
    setAddedId(id);
    setTimeout(() => setAddedId(null), 1800);
  }

  return (
    <div className="products-main">
      {kategorie && (
        <div className="vehicle-filter-banner">
          <span>
            Kategorie: <strong>{getCategoryLabel(kategorie, locale)}</strong>
          </span>
        </div>
      )}
      {(vehicle || vin) && (
        <div className="vehicle-filter-banner">
          {vehicle && (
            <span>
              Teile für: <strong>{vehicle.brand} {vehicle.model} ({vehicle.year})</strong>
            </span>
          )}
          {vin && (
            <span>
              VIN: <strong>{vin}</strong>
            </span>
          )}
        </div>
      )}

      <div className="products-toolbar">
        <p className="products-result-count">
          {result.total} Produkt{result.total === 1 ? "" : "e"} gefunden
        </p>
        <label className="products-sort">
          Sortieren
          <select
            value={sort}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              if (e.target.value === "default") params.delete("sort");
              else params.set("sort", e.target.value);
              const qs = params.toString();
              router.push(qs ? `${pathname}?${qs}` : pathname);
            }}
          >
            <option value="default">Standard</option>
            <option value="name-asc">Name A–Z</option>
            {showPrices() ? (
              <>
                <option value="price-asc">Preis aufsteigend</option>
                <option value="price-desc">Preis absteigend</option>
              </>
            ) : null}
            <option value="bestseller">Bestseller</option>
          </select>
        </label>
      </div>

      {result.items.length === 0 ? (
        <div className="products-empty">
          <p>{t("product.empty")}</p>
        </div>
      ) : (
        <>
          <div className="products-grid">
            {result.items.map((product) => {
              const localized = localizePublicProduct(product, locale);
              return (
              <article key={product.id} className="product-card">
                <Link href={localized.url} className="product-card-img">
                  <ProductSvg imageKey={localized.imageKey ?? "oel"} />
                </Link>
                <div className="product-card-body">
                  <span className="product-card-category">
                    {getCategoryLabelForProduct(localized, locale)}
                  </span>
                  <Link href={localized.url} className="product-card-name">
                    {localized.name}
                  </Link>
                  <span className="product-card-sku">SKU: {localized.sku}</span>
                  <PriceLabel amount={localized.price} className="product-card-price" />
                  <div className="product-card-actions">
                    {isCheckoutEnabled() ? (
                      <button
                        type="button"
                        className="product-card-btn"
                        style={
                          addedId === product.id
                            ? { background: "rgba(34,197,94,0.15)", borderColor: "#22c55e", color: "#22c55e" }
                            : undefined
                        }
                        onClick={() => handleAdd(product.id)}
                      >
                        {addedId === product.id ? `✓ ${t("product.added")}` : t("product.addToCart")}
                      </button>
                    ) : (
                      <Link href={localized.url} className="product-card-btn">
                        {t("product.viewProduct")}
                      </Link>
                    )}
                    <button
                      type="button"
                      className={`product-wishlist-btn${has(product.id) ? " active" : ""}`}
                      onClick={() => toggle(product.id)}
                      aria-label="Wunschliste"
                    >
                      {has(product.id) ? "♥" : "♡"}
                    </button>
                  </div>
                </div>
              </article>
            );})}
          </div>

          {result.totalPages > 1 && (
            <nav className="products-pagination" aria-label="Seiten">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="products-page-btn">
                  ← Zurück
                </Link>
              )}
              <span>
                Seite {result.page} von {result.totalPages}
              </span>
              {page < result.totalPages && (
                <Link href={pageHref(page + 1)} className="products-page-btn">
                  Weiter →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
