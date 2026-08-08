"use client";

import Link from "next/link";
import { useState } from "react";
import ProductSvg from "@/components/ProductSvg";
import { useCart } from "@/lib/cart";
import { useLocale } from "@/lib/i18n/context";
import { getAllProducts, getCategoryLabelForProduct } from "@/lib/products";
import { localizePublicProduct } from "@/lib/products/i18n";
import { isCheckoutEnabled, showPrices } from "@/lib/shop/mode";
import PriceLabel from "@/components/shop/PriceLabel";
import type { PublicProduct } from "@/lib/products/types";

interface HomeProductRailProps {
  title: string;
  variant?: "featured" | "bestsellers" | "new" | "all";
  limit?: number;
}

function selectProducts(variant: HomeProductRailProps["variant"], items: PublicProduct[]) {
  const list = [...items];
  switch (variant) {
    case "featured":
      return list.sort((a, b) => b.price - a.price);
    case "bestsellers":
      return list.sort((a, b) => a.price - b.price);
    case "new":
      return list.filter((p) => p.id.startsWith("prod-"));
    default:
      return list;
  }
}

export default function HomeProductRail({ title, variant = "all", limit = 8 }: HomeProductRailProps) {
  const { add } = useCart();
  const { locale, t } = useLocale();
  const [addedId, setAddedId] = useState<string | null>(null);
  const items = selectProducts(variant, getAllProducts()).slice(0, limit);

  if (items.length === 0) return null;

  function handleAdd(product: PublicProduct) {
    add({ productId: product.id });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  }

  return (
    <section className="home-section home-product-rail" aria-label={title}>
      <div className="home-section-head">
        <h2>{title}</h2>
        <Link href="/products/" className="home-section-link">
          {t("product.allProducts")} →
        </Link>
      </div>
      <div className="products-grid products-grid-compact">
        {items.map((product) => {
          const localized = localizePublicProduct(product, locale);
          return (
          <article key={product.id} className="product-card">
            <Link href={localized.url} className="product-card-img">
              <ProductSvg imageKey={localized.imageKey ?? "oel"} />
            </Link>
            <div className="product-card-body">
              <span className="product-card-category">{localized.brand}</span>
              <Link href={localized.url} className="product-card-name">
                {localized.name}
              </Link>
              <span className="product-card-sku">{getCategoryLabelForProduct(localized, locale)}</span>
              <div className="product-card-prices">
                <PriceLabel amount={localized.price} className="product-card-price" />
                {showPrices() &&
                  localized.compareAtPrice &&
                  localized.compareAtPrice > localized.price && (
                    <span className="product-card-compare">
                      <PriceLabel amount={localized.compareAtPrice} />
                    </span>
                  )}
              </div>
              {isCheckoutEnabled() ? (
                <button
                  type="button"
                  className="product-card-btn"
                  onClick={() => handleAdd(product)}
                >
                  {addedId === product.id ? `✓ ${t("product.added")}` : t("product.addToCart")}
                </button>
              ) : (
                <Link href={localized.url} className="product-card-btn">
                  {t("product.viewProduct")}
                </Link>
              )}
            </div>
          </article>
        );})}
      </div>
    </section>
  );
}
