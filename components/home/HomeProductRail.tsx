"use client";

import Link from "next/link";
import { useState } from "react";
import ProductSvg from "@/components/ProductSvg";
import { useCart } from "@/lib/cart";
import { formatPrice, getAllProducts, getCategoryLabelForProduct } from "@/lib/products";
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
  const [addedId, setAddedId] = useState<string | null>(null);
  const items = selectProducts(variant, getAllProducts()).slice(0, limit);

  if (items.length === 0) return null;

  function handleAdd(product: PublicProduct) {
    add({ id: product.id, name: product.name, price: product.price });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  }

  return (
    <section className="home-section home-product-rail" aria-label={title}>
      <div className="home-section-head">
        <h2>{title}</h2>
        <Link href="/products/" className="home-section-link">
          Alle Produkte →
        </Link>
      </div>
      <div className="products-grid products-grid-compact">
        {items.map((product) => (
          <article key={product.id} className="product-card">
            <Link href={product.url} className="product-card-img">
              <ProductSvg imageKey={product.imageKey ?? "oel"} />
            </Link>
            <div className="product-card-body">
              <span className="product-card-category">{product.brand}</span>
              <Link href={product.url} className="product-card-name">
                {product.name}
              </Link>
              <span className="product-card-sku">{getCategoryLabelForProduct(product)}</span>
              <div className="product-card-prices">
                <span className="product-card-price">{formatPrice(product.price)}</span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="product-card-compare">{formatPrice(product.compareAtPrice)}</span>
                )}
              </div>
              <button
                type="button"
                className="product-card-btn"
                onClick={() => handleAdd(product)}
              >
                {addedId === product.id ? "✓ Hinzugefügt" : "In den Warenkorb"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
