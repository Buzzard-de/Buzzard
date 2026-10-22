"use client";

import Link from "next/link";
import ProductSvg from "@/components/ProductSvg";
import PriceLabel from "@/components/shop/PriceLabel";
import { showPrices } from "@/lib/shop/mode";
import { useLocale } from "@/lib/i18n/context";
import type { PublicProduct } from "@/lib/products/types";

interface MobileProductCardProps {
  product: PublicProduct;
  localeName: string;
  categoryLabel: string;
  addedId: string | null;
  inWishlist: boolean;
  onAdd?: (id: string) => void;
  onToggleWishlist: (id: string) => void;
}

export default function MobileProductCard({
  product,
  localeName,
  categoryLabel,
  addedId,
  inWishlist,
  onAdd,
  onToggleWishlist,
}: MobileProductCardProps) {
  const { t } = useLocale();
  const imageKey = product.imageKey ?? (product.images[0] && !product.images[0].includes("product-placeholder") ? undefined : "oel");
  const quality = product.shortDescription || product.attributes?.quality || categoryLabel;
  const rating = product.attributes?.rating;
  const reviews = product.attributes?.reviews;
  const filledStars = rating
    ? Math.min(5, Math.max(0, Math.round(Number(rating))))
    : 0;
  const stars = rating ? `${"★".repeat(filledStars)}${"☆".repeat(5 - filledStars)}` : "";

  return (
    <article className="buzzard-mobile-product-card">
      <Link href={product.url} className="buzzard-mobile-product-img">
        {product.images[0] && !product.images[0].includes("product-placeholder") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={localeName} loading="lazy" decoding="async" />
        ) : (
          <ProductSvg imageKey={imageKey ?? "oel"} />
        )}
      </Link>
      <div className="buzzard-mobile-product-body">
        {product.brand ? <span className="buzzard-mobile-product-brand">{product.brand}</span> : null}
        <Link href={product.url} className="buzzard-mobile-product-title">
          {localeName}
        </Link>
        {quality ? <div className="buzzard-mobile-product-meta">{quality}</div> : null}
        {stars ? (
          <div className="buzzard-mobile-product-rating" aria-label={String(rating)}>
            {stars}
            {reviews ? <span> ({reviews})</span> : null}
          </div>
        ) : null}
        {showPrices() ? <PriceLabel amount={product.price} className="buzzard-mobile-product-price" /> : null}
      </div>
      <div className="buzzard-mobile-product-actions">
        <button
          type="button"
          className={`buzzard-mobile-icon-btn${inWishlist ? " is-active" : ""}`}
          onClick={() => onToggleWishlist(product.id)}
          aria-label={t("header.wishlist")}
        >
          <svg viewBox="0 0 24 24" fill={inWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" width="20" height="20" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
        {onAdd ? (
          <button
            type="button"
            className="buzzard-mobile-icon-btn is-cart"
            onClick={() => onAdd(product.id)}
            aria-label={addedId === product.id ? t("product.added") : t("product.addToCart")}
          >
            {addedId === product.id ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="20" height="20" aria-hidden="true">
                <path d="M5 12l4 4 10-10" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20" aria-hidden="true">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6" />
              </svg>
            )}
          </button>
        ) : null}
      </div>
    </article>
  );
}
