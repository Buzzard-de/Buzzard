"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { formatPrice } from "@/lib/products";
import type { Product } from "@/types";
import ProductSvg from "./ProductSvg";

export default function ProductDetailView({ product }: { product: Product }) {
  const { add } = useCart();
  const { toggle, has } = useWishlist();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inWishlist = has(product.id);

  function handleAdd() {
    add(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="product-detail">
      <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Startseite</Link>
        <span>/</span>
        <Link href="/products/">Produkte</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>

      <div className="product-detail-layout">
        <div className="product-detail-img">
          <ProductSvg imageKey={product.imageKey} />
        </div>

        <div className="product-detail-info">
          <span className="product-card-category">{product.categoryLabel}</span>
          <h1>{product.name}</h1>
          <p className="product-detail-price">{formatPrice(product.price)}</p>
          {product.description && <p className="product-detail-desc">{product.description}</p>}
          {product.stock !== undefined && (
            <p className={`product-stock${product.stock < 10 ? " low" : ""}`}>
              {product.stock > 0 ? `${product.stock} auf Lager` : "Nicht verfügbar"}
            </p>
          )}

          <div className="product-detail-actions">
            <div className="qty-control qty-control-lg">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty(qty + 1)}>+</button>
            </div>
            <button
              type="button"
              className="shop-btn-primary"
              onClick={handleAdd}
              disabled={product.stock === 0}
            >
              {added ? "✓ Im Warenkorb" : "In den Warenkorb"}
            </button>
            <button
              type="button"
              className={`shop-btn-secondary wishlist-btn${inWishlist ? " active" : ""}`}
              onClick={() => toggle(product.id)}
            >
              {inWishlist ? "♥ Auf Wunschliste" : "♡ Wunschliste"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
