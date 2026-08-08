"use client";

import Link from "next/link";
import { useState } from "react";
import ProductSvg from "./ProductSvg";
import CategoryIcon from "./CategoryIcon";
import BrandsStrip from "./BrandsStrip";
import {
  categoryHref,
  formatMenuLabel,
  getCategoryById,
  getCategoryLabel,
  getChildren,
  trustBadges,
  DEFAULT_LOCALE,
} from "@/lib/categories";
import { useCart } from "@/lib/cart";
import { getProductById, getProductsForCategory } from "@/lib/products";
import { isCheckoutEnabled } from "@/lib/shop/mode";
import PriceLabel from "@/components/shop/PriceLabel";
import type { BuzzardCategory } from "@/lib/categories/types";

interface FeaturedBannerProps {
  mainCategory?: BuzzardCategory;
  activeSubId: string;
}

export default function FeaturedBanner({ mainCategory, activeSubId }: FeaturedBannerProps) {
  const { add } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);
  const activeSub = activeSubId ? getCategoryById(activeSubId) : undefined;
  const level3 = activeSub ? getChildren(activeSub.id) : [];
  const promoSubs = mainCategory ? getChildren(mainCategory.id).slice(0, 2) : [];
  const categoryProducts = mainCategory ? getProductsForCategory(mainCategory, 3) : [];

  function handleAdd(productId: string) {
    const product = getProductById(productId);
    if (!product) return;
    add({ productId: productId });
    setAddedId(productId);
    setTimeout(() => setAddedId(null), 1800);
  }

  return (
    <aside className="home-promo" aria-label="Angebote und Empfehlungen">
      {mainCategory && (
        <div className="promo-section promo-section--context">
          <h2 className="promo-title">AUSGEWÄHLTE KATEGORIE</h2>
          <p className="promo-context">{formatMenuLabel(mainCategory, DEFAULT_LOCALE)}</p>
          {activeSub && (
            <Link href={categoryHref(activeSub)} className="promo-all-link">
              {getCategoryLabel(activeSub, DEFAULT_LOCALE)} entdecken →
            </Link>
          )}
          <Link href={categoryHref(mainCategory)} className="promo-all-link">
            Gesamte Kategorie ansehen →
          </Link>
        </div>
      )}

      {level3.length > 0 && (
        <div className="promo-section promo-section--subsub">
          <h2 className="promo-title">WEITERE UNTERKATEGORIEN</h2>
          <ul className="subsubcategory-list">
            {level3.slice(0, 6).map((child) => (
              <li key={child.id}>
                <Link href={categoryHref(child)} className="subsubcategory-link">
                  <span>{getCategoryLabel(child, DEFAULT_LOCALE)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {promoSubs.length > 0 && (
        <div className="promo-section">
          <h2 className="promo-title">TOP ANGEBOTE</h2>
          {promoSubs.map((sub, index) => (
            <div key={sub.id} className="promo-deal-card">
              <div className="promo-deal-image">
                <ProductSvg imageKey={index === 0 ? "tire" : "batterie"} />
              </div>
              <div className="promo-deal-body">
                <span className="promo-deal-tag">{getCategoryLabel(sub, DEFAULT_LOCALE).toUpperCase()}</span>
                <strong>JETZT ENTDECKEN</strong>
                <Link href={categoryHref(sub)} className="promo-deal-btn">
                  ANSEHEN
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="promo-trust-list">
        {trustBadges.map((badge) => (
          <div key={badge.label} className="promo-trust-item">
            <CategoryIcon name={badge.icon} size={20} />
            <span>{badge.label}</span>
          </div>
        ))}
      </div>

      <BrandsStrip variant="promo" />

      {categoryProducts.length > 0 && (
        <div className="promo-section promo-section--products">
          <h2 className="promo-title">BELIEBTE PRODUKTE</h2>
          <ul className="popular-products">
            {categoryProducts.map((product) => (
              <li key={product.id} className="popular-product">
                <Link href={product.url} className="popular-product-img">
                  <ProductSvg imageKey={product.imageKey ?? "oel"} />
                </Link>
                <div className="popular-product-body">
                  <Link href={product.url} className="popular-product-name">
                    {product.name}
                  </Link>
                  <div className="popular-product-stars">
                    {"★".repeat(5)}
                    <span>5.0</span>
                  </div>
                  <div className="popular-product-prices">
                    <PriceLabel amount={product.price} className="popular-product-price" />
                  </div>
                  {isCheckoutEnabled() ? (
                    <button
                      type="button"
                      className="popular-add-btn"
                      onClick={() => handleAdd(product.id)}
                    >
                      {addedId === product.id ? "✓ Hinzugefügt" : "In den Warenkorb"}
                    </button>
                  ) : (
                    <Link href={product.url} className="popular-add-btn">
                      Produkt ansehen
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
