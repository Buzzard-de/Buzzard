"use client";

import Link from "next/link";
import ProductSvg from "./ProductSvg";
import PriceLabel from "@/components/shop/PriceLabel";
import { isCheckoutEnabled } from "@/lib/shop/mode";
import type { PublicProduct } from "@/lib/products/types";

interface ProductCardProps {
  product: PublicProduct;
  localeName: string;
  categoryLabel: string;
  addedId: string | null;
  inWishlist: boolean;
  onAdd?: (id: string) => void;
  onToggleWishlist: (id: string) => void;
  addLabel: string;
  addedLabel: string;
  viewLabel: string;
}

export default function ProductCard({
  product,
  localeName,
  categoryLabel,
  addedId,
  inWishlist,
  onAdd,
  onToggleWishlist,
  addLabel,
  addedLabel,
  viewLabel,
}: ProductCardProps) {
  const imageKey = product.imageKey ?? (product.images[0] ? undefined : "oel");

  return (
    <article className="product-card">
      <Link href={product.url} className="product-card-img">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={localeName} loading="lazy" decoding="async" />
        ) : (
          <ProductSvg imageKey={imageKey ?? "oel"} />
        )}
      </Link>
      <div className="product-card-body">
        <span className="product-card-category">{categoryLabel}</span>
        <Link href={product.url} className="product-card-name">
          {localeName}
        </Link>
        <span className="product-card-sku">SKU: {product.sku}</span>
        <PriceLabel amount={product.price} className="product-card-price" />
        <div className="product-card-actions">
          {isCheckoutEnabled() && onAdd ? (
            <button
              type="button"
              className="product-card-btn"
              style={
                addedId === product.id
                  ? { background: "rgba(34,197,94,0.15)", borderColor: "#22c55e", color: "#22c55e" }
                  : undefined
              }
              onClick={() => onAdd(product.id)}
            >
              {addedId === product.id ? `✓ ${addedLabel}` : addLabel}
            </button>
          ) : (
            <Link href={product.url} className="product-card-btn">
              {viewLabel}
            </Link>
          )}
          <button
            type="button"
            className={`product-wishlist-btn${inWishlist ? " active" : ""}`}
            onClick={() => onToggleWishlist(product.id)}
            aria-label="Wunschliste"
          >
            {inWishlist ? "♥" : "♡"}
          </button>
        </div>
      </div>
    </article>
  );
}
