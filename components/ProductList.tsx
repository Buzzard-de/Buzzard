"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import ProductSvg from "./ProductSvg";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useShop } from "@/lib/shop";
import { filterProducts, formatPrice, products } from "@/lib/products";
import { findCategoryBySlug } from "@/lib/categories";
import { normalizeVin, sanitizeSearchQuery } from "@/lib/security";

export default function ProductList() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "alle";
  const query = sanitizeSearchQuery(searchParams.get("q"));
  const kategorieSlug = searchParams.get("kategorie");
  const kategorie = kategorieSlug ? findCategoryBySlug(kategorieSlug) : null;
  const rawVin = searchParams.get("vin");
  const vin = rawVin ? normalizeVin(rawVin) : null;
  const { vehicle } = useShop();
  const { add } = useCart();
  const { toggle, has } = useWishlist();
  const [addedId, setAddedId] = useState<string | null>(null);

  const filtered = filterProducts(products, filter, query);

  function handleAdd(id: string, name: string, price: number) {
    add({ id, name, price });
    setAddedId(id);
    setTimeout(() => setAddedId(null), 1800);
  }

  return (
    <div className="products-main">
      {kategorie && (
        <div className="vehicle-filter-banner">
          <span>
            Kategorie: <strong>{kategorie.id}. {kategorie.label}</strong>
          </span>
        </div>
      )}
      {(vehicle || vin) && (
        <div className="vehicle-filter-banner">
          {vehicle && (
            <span>
              Teile für: <strong>{vehicle.brand} {vehicle.model} ({vehicle.year})</strong>
            </span>
          )}
          {vin && (
            <span>
              VIN: <strong>{vin}</strong>
            </span>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="products-empty">
          <p>Keine Produkte gefunden.</p>
        </div>
      ) : (
        <div className="products-grid">
          {filtered.map((product) => (
            <article key={product.id} className="product-card">
              <Link href={`/products/${product.id}/`} className="product-card-img">
                <ProductSvg imageKey={product.imageKey} />
              </Link>
              <div className="product-card-body">
                <span className="product-card-category">{product.categoryLabel}</span>
                <Link href={`/products/${product.id}/`} className="product-card-name">
                  {product.name}
                </Link>
                <span className="product-card-price">{formatPrice(product.price)}</span>
                <div className="product-card-actions">
                  <button
                    type="button"
                    className="product-card-btn"
                    style={
                      addedId === product.id
                        ? { background: "rgba(34,197,94,0.15)", borderColor: "#22c55e", color: "#22c55e" }
                        : undefined
                    }
                    onClick={() => handleAdd(product.id, product.name, product.price)}
                  >
                    {addedId === product.id ? "✓ Hinzugefügt" : "In den Warenkorb"}
                  </button>
                  <button
                    type="button"
                    className={`product-wishlist-btn${has(product.id) ? " active" : ""}`}
                    onClick={() => toggle(product.id)}
                    aria-label="Wunschliste"
                  >
                    {has(product.id) ? "♥" : "♡"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
