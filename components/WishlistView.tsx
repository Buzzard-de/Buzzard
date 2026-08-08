"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/wishlist";
import { getProductById, formatPrice } from "@/lib/products";
import { useCart } from "@/lib/cart";
import ProductSvg from "./ProductSvg";

export default function WishlistView() {
  const { ids, toggle } = useWishlist();
  const { add } = useCart();

  if (ids.length === 0) {
    return (
      <div className="shop-empty">
        <h1>Ihre Wunschliste ist leer</h1>
        <p>Speichern Sie Produkte mit dem Herz-Symbol.</p>
        <Link href="/products/" className="shop-btn-primary">Produkte entdecken</Link>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <h1 className="shop-page-title">Wunschliste</h1>
      <ul className="wishlist-items">
        {ids.map((id) => {
          const product = getProductById(id);
          if (!product) return null;
          return (
            <li key={id} className="wishlist-item">
              <Link href={product.url} className="wishlist-item-img">
                <ProductSvg imageKey={product.imageKey ?? "oel"} />
              </Link>
              <div className="wishlist-item-body">
                <Link href={product.url}>{product.name}</Link>
                <span>{formatPrice(product.price)}</span>
              </div>
              <div className="wishlist-item-actions">
                <button type="button" className="shop-btn-primary" onClick={() => add({ productId: product.id })}>
                  In den Warenkorb
                </button>
                <button type="button" className="cart-remove" onClick={() => toggle(id)}>
                  Entfernen
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
