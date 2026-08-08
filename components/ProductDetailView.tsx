"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import ProductGallery from "./ProductGallery";
import ProductStructuredData from "./ProductStructuredData";
import ProductSvg from "./ProductSvg";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import {
  formatPrice,
  formatVatInfo,
  stockStatusLabel,
  getCategoryLabelForProduct,
  getFrequentlyBoughtTogether,
  getRelatedProducts,
  getShippingCost,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/products";
import type { PublicProduct, ProductVariant } from "@/lib/products/types";

interface ProductDetailViewProps {
  product: PublicProduct;
}

function groupVariants(variants: ProductVariant[]) {
  const groups = new Map<string, ProductVariant[]>();
  for (const variant of variants) {
    const list = groups.get(variant.type) ?? [];
    list.push(variant);
    groups.set(variant.type, list);
  }
  return groups;
}

export default function ProductDetailView({ product }: ProductDetailViewProps) {
  const router = useRouter();
  const { add } = useCart();
  const { toggle, has } = useWishlist();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const inWishlist = has(product.id);
  const categoryLabel = getCategoryLabelForProduct(product);
  const related = getRelatedProducts(product);
  const boughtTogether = getFrequentlyBoughtTogether(product);
  const variantGroups = useMemo(() => groupVariants(product.variants), [product.variants]);

  const selectedVariantList = product.variants.filter((v) => selectedVariants[v.type] === v.id);
  const activePrice =
    selectedVariantList.find((v) => v.price)?.price?.amount ?? product.price;
  const activeSku = selectedVariantList.find((v) => v.sku)?.sku ?? product.sku;
  const activeStock =
    selectedVariantList.find((v) => typeof v.stock === "number")?.stock ?? product.stock;
  const canBuy = activeStock > 0 && product.stockStatus !== "out_of_stock";

  function selectVariant(type: string, variantId: string) {
    setSelectedVariants((prev) => ({ ...prev, [type]: variantId }));
  }

  function handleAdd() {
    const variantIds = Object.values(selectedVariants);
    const ok = add({ productId: product.id, variantIds, qty });
    if (!ok) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    const variantIds = Object.values(selectedVariants);
    add({ productId: product.id, variantIds, qty });
    router.push("/checkout/");
  }

  return (
    <>
      <ProductStructuredData product={product} categoryLabel={categoryLabel} />

      <div className="product-detail">
        <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Startseite</Link>
          <span>/</span>
          <Link href="/products/">Produkte</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="product-detail-layout">
          <ProductGallery images={product.images} imageKey={product.imageKey} name={product.name} />

          <div className="product-detail-info">
            <span className="product-detail-brand">{product.brand}</span>
            <span className="product-card-category">{categoryLabel}</span>
            <h1>{product.name}</h1>
            <p className="product-detail-sku">
              SKU: <strong>{activeSku}</strong>
              {product.eanGtin && (
                <>
                  {" "}
                  · EAN: <strong>{product.eanGtin}</strong>
                </>
              )}
            </p>

            <div className="product-detail-pricing">
              <p className="product-detail-price">{formatPrice(activePrice)}</p>
              {product.compareAtPrice && product.compareAtPrice > activePrice && (
                <p className="product-detail-compare">{formatPrice(product.compareAtPrice)}</p>
              )}
              <p className="product-detail-vat">{formatVatInfo(activePrice, product.vatRate)}</p>
            </div>

            <p className={`product-stock status-${product.stockStatus}${activeStock < 10 ? " low" : ""}`}>
              {stockStatusLabel(product.stockStatus)} · {activeStock} Stück
            </p>

            {product.shortDescription && (
              <p className="product-detail-lead">{product.shortDescription}</p>
            )}

            {variantGroups.size > 0 && (
              <div className="product-variant-groups">
                {[...variantGroups.entries()].map(([type, variants]) => (
                  <fieldset key={type} className="product-variant-group">
                    <legend>{variants[0]?.label ?? type}</legend>
                    <div className="product-variant-options">
                      {variants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          className={`product-variant-btn${
                            selectedVariants[type] === variant.id ? " active" : ""
                          }`}
                          onClick={() => selectVariant(type, variant.id)}
                        >
                          {variant.value}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}

            <div className="product-detail-actions">
              <div className="qty-control qty-control-lg">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Menge reduzieren">
                  −
                </button>
                <span aria-live="polite">{qty}</span>
                <button type="button" onClick={() => setQty(qty + 1)} aria-label="Menge erhöhen">
                  +
                </button>
              </div>
              <button type="button" className="shop-btn-primary" onClick={handleAdd} disabled={!canBuy}>
                {added ? "✓ Im Warenkorb" : "In den Warenkorb"}
              </button>
              {product.buyNowEnabled && (
                <button type="button" className="shop-btn-secondary" onClick={handleBuyNow} disabled={!canBuy}>
                  Jetzt kaufen
                </button>
              )}
              <button
                type="button"
                className={`shop-btn-secondary wishlist-btn${inWishlist ? " active" : ""}`}
                onClick={() => toggle(product.id)}
              >
                {inWishlist ? "♥ Auf Wunschliste" : "♡ Wunschliste"}
              </button>
            </div>

            <div className="product-trust-box">
              <p>Kostenloser Versand ab {formatPrice(FREE_SHIPPING_THRESHOLD)}</p>
              <p>Versandkosten: {formatPrice(getShippingCost(activePrice * qty))}</p>
              <p>14 Tage Rückgaberecht · Sichere Zahlung</p>
            </div>
          </div>
        </div>

        <section className="product-detail-section">
          <h2>Beschreibung</h2>
          <p>{product.description}</p>
        </section>

        {Object.keys(product.attributes).length > 0 && (
          <section className="product-detail-section">
            <h2>Technische Daten</h2>
            <dl className="product-spec-table">
              {Object.entries(product.attributes).map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replace(/_/g, " ")}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {product.documents.length > 0 && (
          <section className="product-detail-section">
            <h2>Dokumente</h2>
            <ul className="product-doc-list">
              {product.documents.map((doc) => (
                <li key={doc.url}>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    {doc.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section className="product-detail-section">
            <h2>Ähnliche Produkte</h2>
            <div className="products-grid products-grid-compact">
              {related.map((item) => (
                <article key={item.id} className="product-card">
                  <Link href={item.url} className="product-card-img">
                    <ProductSvg imageKey={item.imageKey ?? "oel"} />
                  </Link>
                  <div className="product-card-body">
                    <Link href={item.url} className="product-card-name">
                      {item.name}
                    </Link>
                    <span className="product-card-price">{formatPrice(item.price)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {boughtTogether.length > 0 && (
          <section className="product-detail-section">
            <h2>Häufig zusammen gekauft</h2>
            <div className="products-grid products-grid-compact">
              {boughtTogether.map((item) => (
                <article key={item.id} className="product-card">
                  <Link href={item.url} className="product-card-img">
                    <ProductSvg imageKey={item.imageKey ?? "oel"} />
                  </Link>
                  <div className="product-card-body">
                    <Link href={item.url} className="product-card-name">
                      {item.name}
                    </Link>
                    <span className="product-card-price">{formatPrice(item.price)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="product-detail-section product-reviews">
          <h2>Bewertungen</h2>
          <p className="product-reviews-empty">Noch keine Bewertungen. Seien Sie der Erste!</p>
        </section>
      </div>
    </>
  );
}
