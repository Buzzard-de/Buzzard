"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import ProductDetailView from "@/components/ProductDetailView";
import JsonLd from "@/components/seo/JsonLd";
import { fetchProductJsonLd } from "@/lib/catalogSeo/client";
import { isLiveCatalogEnabled, loadLiveCatalogProductBySlug } from "@/lib/catalogSeo/runtime";
import type { PublicProduct } from "@/lib/products/types";

interface ProductDetailLoaderProps {
  slug: string;
  staticProduct?: PublicProduct;
}

export default function ProductDetailLoader({ slug, staticProduct }: ProductDetailLoaderProps) {
  const [product, setProduct] = useState<PublicProduct | null>(staticProduct ?? null);
  const [apiJsonLd, setApiJsonLd] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(!staticProduct && isLiveCatalogEnabled());
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (staticProduct) {
      setProduct(staticProduct);
      setLoading(false);
      return;
    }

    if (!isLiveCatalogEnabled()) {
      setMissing(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    loadLiveCatalogProductBySlug(slug)
      .then(async (live) => {
        if (cancelled) return;
        if (!live) {
          setMissing(true);
          return;
        }
        setProduct(live);
        const numericId = Number(String(live.id).replace(/^catalog-/, ""));
        if (Number.isFinite(numericId)) {
          try {
            setApiJsonLd(await fetchProductJsonLd(numericId));
          } catch {
            setApiJsonLd(null);
          }
        }
      })
      .catch(() => setMissing(true))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, staticProduct]);

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
