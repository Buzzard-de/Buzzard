"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { isLiveCatalogEnabled, loadLiveCatalogProducts, mergeCatalogProducts } from "@/lib/catalogSeo/runtime";
import {
  isLiveLocalizationEnabled,
  loadLocalizedCatalogProducts,
  mergeLocalizedProducts,
} from "@/lib/localizationFeeds/runtime";
import { fetchCompatibleSkusForVehicle } from "@/lib/supplierHub/client";
import { isVehicleApiEnabled } from "@/lib/api/config";
import { useMarket } from "@/lib/market/context";
import { normalizeVin, sanitizeSearchQuery } from "@/lib/security";
import { isCheckoutEnabled, showPrices } from "@/lib/shop/mode";
import PriceLabel from "@/components/shop/PriceLabel";
import type { PublicProduct } from "@/lib/products/types";

const PAGE_SIZE = 12;

interface ProductListProps {
  categorySlug?: string;
}

export default function ProductList({ categorySlug }: ProductListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const { countryCode, currency } = useMarket();
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
  const [catalogProducts, setCatalogProducts] = useState<PublicProduct[]>([]);
  const [compatibleSkus, setCompatibleSkus] = useState<string[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(
    isLiveLocalizationEnabled() || isLiveCatalogEnabled()
  );

  useEffect(() => {
    if (!isLiveLocalizationEnabled() && !isLiveCatalogEnabled()) {
      setCatalogProducts([]);
      setCatalogLoading(false);
      return;
    }

    let cancelled = false;
    setCatalogLoading(true);

    async function loadCatalog() {
      if (isLiveLocalizationEnabled()) {
        return loadLocalizedCatalogProducts({
          uiLocale: locale,
          countryCode,
          currency,
          q: query || undefined,
          category: kategorieSlug || undefined,
          vehicleId: vehicle?.vehicleId,
        });
      }
      return loadLiveCatalogProducts({
        q: query || undefined,
        category: kategorieSlug || undefined,
        vehicleId: vehicle?.vehicleId,
      });
    }

    loadCatalog()
      .then((items) => {
        if (!cancelled) setCatalogProducts(items);
      })
      .catch(() => {
        if (!cancelled) setCatalogProducts([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, kategorieSlug, vehicle?.vehicleId, locale, countryCode, currency]);

  useEffect(() => {
    if (!vehicle?.vehicleId || !isVehicleApiEnabled()) {
      setCompatibleSkus(null);
      return;
    }

    let cancelled = false;
    fetchCompatibleSkusForVehicle(vehicle.vehicleId)
      .then((skus) => {
        if (!cancelled) setCompatibleSkus(skus);
      })
      .catch(() => {
        if (!cancelled) setCompatibleSkus(null);
      });

    return () => {
      cancelled = true;
    };
  }, [vehicle?.vehicleId]);

  const allProducts = useMemo(() => {
    const staticItems = getAllProducts();
    if (isLiveLocalizationEnabled()) {
      return mergeLocalizedProducts(staticItems, catalogProducts);
    }
    if (isLiveCatalogEnabled()) {
      return mergeCatalogProducts(staticItems, catalogProducts);
    }
    return staticItems;
  }, [catalogProducts]);

  const result = useMemo(() => {
    let filtered = filterProducts(allProducts, filter, query, kategorie);

    if (vehicle?.vehicleId && compatibleSkus && compatibleSkus.length > 0) {
      const skuSet = new Set(compatibleSkus);
      filtered = filtered.filter((product) => skuSet.has(product.sku));
    }

    const sorted = sortProducts(filtered, sort);
    return paginateProducts(sorted, page, PAGE_SIZE);
  }, [allProducts, filter, sort, query, kategorie, page, vehicle?.vehicleId, compatibleSkus]);

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
              Teile für:{" "}
              <strong>
                {vehicle.brand} {vehicle.model} ({vehicle.year})
                {vehicle.engine ? ` · ${vehicle.engine}` : ""}
              </strong>
            </span>
          )}
          {vin && (
            <span>
              VIN: <strong>{vin}</strong>
            </span>
          )}
          {vehicle?.vehicleId && compatibleSkus && compatibleSkus.length > 0 && (
            <span>TecDoc-Filter: {compatibleSkus.length} passende SKU(s)</span>
          )}
        </div>
      )}

      {(isLiveLocalizationEnabled() || isLiveCatalogEnabled()) && !catalogLoading && catalogProducts.length > 0 && (
        <p className="admin-note">
          {catalogProducts.length} Live-Produkt(e) aus der Buzzard API
          {isLiveLocalizationEnabled() ? ` (${countryCode}, ${currency})` : ""} eingebunden.
        </p>
      )}

      <div className="products-toolbar">
        <p className="products-result-count">
          {catalogLoading ? "Produkte werden geladen…" : `${result.total} Produkt${result.total === 1 ? "" : "e"} gefunden`}
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

      {!catalogLoading && result.items.length === 0 ? (
        <div className="products-empty">
          <p>{t("product.empty")}</p>
        </div>
      ) : (
        <>
          <div className="products-grid">
            {result.items.map((product) => {
              const localized = localizePublicProduct(product, locale);
              const imageKey = localized.imageKey ?? (localized.images[0] ? undefined : "oel");
              return (
                <article key={product.id} className="product-card">
                  <Link href={localized.url} className="product-card-img">
                    {localized.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={localized.images[0]} alt={localized.name} loading="lazy" decoding="async" />
                    ) : (
                      <ProductSvg imageKey={imageKey ?? "oel"} />
                    )}
                  </Link>
                  <div className="product-card-body">
                    <span className="product-card-category">
                      {product.attributes?.category || getCategoryLabelForProduct(localized, locale)}
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
              );
            })}
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
