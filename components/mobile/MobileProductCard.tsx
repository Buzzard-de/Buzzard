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
        {rating ? (
          <div className="buzzard-mobile-product-meta">
            ★ {rating}
            {reviews ? ` (${reviews})` : ""}
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
          {inWishlist ? "♥" : "♡"}
        </button>
        {onAdd ? (
          <button
            type="button"
            className="buzzard-mobile-icon-btn"
            onClick={() => onAdd(product.id)}
            aria-label={addedId === product.id ? t("product.added") : t("product.addToCart")}
          >
            {addedId === product.id ? "✓" : "🛒"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
