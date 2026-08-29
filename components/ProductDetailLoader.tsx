"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import ProductDetailView from "@/components/ProductDetailView";
import JsonLd from "@/components/seo/JsonLd";
import { fetchProductJsonLd } from "@/lib/catalogSeo/client";
import { isLiveCatalogEnabled, loadLiveCatalogProductBySlug } from "@/lib/catalogSeo/runtime";
import { isPimStorefrontEnabled, loadPimStorefrontProductBySlug } from "@/lib/storefront/runtime";
import { useLocale } from "@/lib/i18n/context";
import { useMarket } from "@/lib/market/context";
import { isLiveLocalizationEnabled, loadLocalizedProductBySlug } from "@/lib/localizationFeeds/runtime";
import type { PublicProduct } from "@/lib/products/types";

interface ProductDetailLoaderProps {
  slug: string;
  staticProduct?: PublicProduct;
}

export default function ProductDetailLoader({ slug, staticProduct }: ProductDetailLoaderProps) {
  const { locale } = useLocale();
  const { countryCode } = useMarket();
  const [product, setProduct] = useState<PublicProduct | null>(staticProduct ?? null);
  const [apiJsonLd, setApiJsonLd] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(
    !staticProduct && (isPimStorefrontEnabled() || isLiveLocalizationEnabled() || isLiveCatalogEnabled())
  );
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (staticProduct) {
      setProduct(staticProduct);
      setLoading(false);
      return;
    }

    const canLoad = isPimStorefrontEnabled() || isLiveLocalizationEnabled() || isLiveCatalogEnabled();
    if (!canLoad) {
      setMissing(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProduct() {
      let live: PublicProduct | null = null;

      if (isLiveLocalizationEnabled()) {
        live = await loadLocalizedProductBySlug(slug, locale, countryCode);
      }
      if (!live && isPimStorefrontEnabled()) {
        live = await loadPimStorefrontProductBySlug(slug);
      }
      if (!live && isLiveCatalogEnabled()) {
        live = await loadLiveCatalogProductBySlug(slug);
      }

      if (cancelled) return;
      if (!live) {
        setMissing(true);
        return;
      }

      setProduct(live);

      if (live.attributes?.source === "catalog-api" || live.id.startsWith("catalog-")) {
        const numericId = Number(String(live.id).replace(/^catalog-/, ""));
        if (Number.isFinite(numericId)) {
          try {
            setApiJsonLd(await fetchProductJsonLd(numericId));
          } catch {
            setApiJsonLd(null);
          }
        }
      }
    }

    loadProduct()
      .catch(() => {
        if (!cancelled) setMissing(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, staticProduct, locale, countryCode]);

  if (loading) {
    return (
      <section className="shop-page">
        <p>Produkt wird geladen…</p>
      </section>
    );
  }

  if (missing || !product) {
    notFound();
  }

  return (
    <>
      {apiJsonLd && <JsonLd data={apiJsonLd} />}
      <section className="shop-page">
        <ProductDetailView product={product} />
      </section>
    </>
  );
}
