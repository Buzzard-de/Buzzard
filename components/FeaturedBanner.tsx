"use client";

import Link from "next/link";
import { useState } from "react";
import ProductSvg from "./ProductSvg";
import { popularProducts } from "@/lib/categories";
import { useCart } from "@/lib/cart";
import { getProductById, formatPrice } from "@/lib/products";

export default function FeaturedBanner() {
  const { add } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);

  function handleAdd(productId: string) {
    const product = getProductById(productId);
    if (!product) return;
    add(product);
    setAddedId(productId);
    setTimeout(() => setAddedId(null), 1800);
  }

  return (
    <aside className="home-promo" aria-label="Angebote und beliebte Produkte">
      <div className="promo-section">
        <h2 className="promo-title">TOP ANGEBOTE</h2>
        <div className="promo-deal-card">
          <div className="promo-deal-image">
            <svg viewBox="0 0 120 80" fill="none" width="100%" height="100%">
              <circle cx="60" cy="40" r="32" stroke="#c9a066" strokeWidth="4" />
              <circle cx="60" cy="40" r="18" stroke="#c9a066" strokeWidth="2" strokeDasharray="4 3" />
              <rect x="78" y="28" width="28" height="24" rx="4" fill="#c9a066" opacity="0.85" />
            </svg>
          </div>
          <div className="promo-deal-body">
            <span className="promo-deal-tag">BREMSSEN AKTION</span>
            <strong>BIS ZU -25%</strong>
            <Link href="/products/?filter=bremsen" className="promo-deal-btn">
              JETZT SPAREN
            </Link>
          </div>
        </div>
      </div>

      <div className="promo-section">
        <h2 className="promo-title">BELIEBTE PRODUKTE</h2>
        <ul className="popular-products">
          {popularProducts.map((product) => (
            <li key={product.id} className="popular-product">
              <Link href={`/products/${product.productId}/`} className="popular-product-img">
                <ProductSvg imageKey={product.imageKey} />
              </Link>
              <div className="popular-product-body">
                <Link href={`/products/${product.productId}/`} className="popular-product-name">
                  {product.name}
                </Link>
                <div className="popular-product-stars">
                  {"★".repeat(product.rating)}
                  <span>{product.rating}.0</span>
                </div>
                <div className="popular-product-prices">
                  <span className="popular-product-price">{formatPrice(product.price)}</span>
                  <span className="popular-product-old">{formatPrice(product.oldPrice)}</span>
                  <span className="popular-product-discount">-{product.discount}%</span>
                </div>
                <button
                  type="button"
                  className="popular-add-btn"
                  onClick={() => handleAdd(product.productId)}
                >
                  {addedId === product.productId ? "✓ Hinzugefügt" : "In den Warenkorb"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
