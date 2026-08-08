"use client";

import Link from "next/link";
import { useState } from "react";
import ProductSvg from "./ProductSvg";
import CategoryIcon from "./CategoryIcon";
import BrandsStrip from "./BrandsStrip";
import { popularProducts, trustBadges } from "@/lib/categories";
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
            <ProductSvg imageKey="tire" />
          </div>
          <div className="promo-deal-body">
            <span className="promo-deal-tag">WINTERREIFEN</span>
            <strong>BIS ZU -30%</strong>
            <Link href="/products/" className="promo-deal-btn">
              JETZT SPAREN
            </Link>
          </div>
        </div>

        <div className="promo-deal-card">
          <div className="promo-deal-image">
            <ProductSvg imageKey="batterie" />
          </div>
          <div className="promo-deal-body">
            <span className="promo-deal-tag">BATTERIEN</span>
            <strong>AB 69,99 €</strong>
            <Link href="/products/?filter=batterien" className="promo-deal-btn">
              ENTDECKEN
            </Link>
          </div>
        </div>
      </div>

      <div className="promo-trust-list">
        {trustBadges.map((badge) => (
          <div key={badge.label} className="promo-trust-item">
            <CategoryIcon name={badge.icon} size={20} />
            <span>{badge.label}</span>
          </div>
        ))}
      </div>

      <BrandsStrip variant="promo" />

      <div className="promo-section promo-section--products">
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
