"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import ProductGallery from "./ProductGallery";
import ProductStructuredData from "./ProductStructuredData";
import ProductSvg from "./ProductSvg";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useLocale } from "@/lib/i18n/context";
import {
  formatVatInfo,
  stockStatusLabel,
  getCategoryLabelForProduct,
  getFrequentlyBoughtTogether,
  getRelatedProducts,
  getShippingCost,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/products";
import { localizePublicProduct } from "@/lib/products/i18n";
import { trackMarketingEvent } from "@/lib/marketing/events";
import type { PublicProduct, ProductVariant } from "@/lib/products/types";
import { isCheckoutEnabled, showPrices } from "@/lib/shop/mode";
import PriceLabel from "@/components/shop/PriceLabel";
import ProductReviews from "@/components/ProductReviews";
import TecDocFitmentNote from "@/components/TecDocFitmentNote";

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
  const { locale, t, formatPrice } = useLocale();
  const localizedProduct = useMemo(() => localizePublicProduct(product, locale), [product, locale]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const inWishlist = has(localizedProduct.id);
  const categoryLabel = getCategoryLabelForProduct(localizedProduct, locale);
  const related = getRelatedProducts(localizedProduct).map((item) => localizePublicProduct(item, locale));
  const boughtTogether = getFrequentlyBoughtTogether(localizedProduct).map((item) => localizePublicProduct(item, locale));
  const variantGroups = useMemo(() => groupVariants(localizedProduct.variants), [localizedProduct.variants]);

  const selectedVariantList = localizedProduct.variants.filter((v) => selectedVariants[v.type] === v.id);
  const activePrice =
    selectedVariantList.find((v) => v.price)?.price?.amount ?? localizedProduct.price;
  const activeSku = selectedVariantList.find((v) => v.sku)?.sku ?? localizedProduct.sku;
  const activeStock =
    selectedVariantList.find((v) => typeof v.stock === "number")?.stock ?? localizedProduct.stock;
  const canBuy = activeStock > 0 && localizedProduct.stockStatus !== "out_of_stock";

  useEffect(() => {
    trackMarketingEvent("view_item", {
      product_id: localizedProduct.id,
      item_name: localizedProduct.name,
      value: activePrice,
    });
  }, [localizedProduct.id, localizedProduct.name, activePrice]);

  function selectVariant(type: string, variantId: string) {
    setSelectedVariants((prev) => ({ ...prev, [type]: variantId }));
  }

  function handleAdd() {
    const variantIds = Object.values(selectedVariants);
    void (async () => {
      const ok = await add({ productId: localizedProduct.id, variantIds, qty });
      if (!ok) return;
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    })();
  }

  function handleBuyNow() {
    const variantIds = Object.values(selectedVariants);
    void (async () => {
      const ok = await add({ productId: localizedProduct.id, variantIds, qty });
      if (ok) router.push("/checkout/");
    })();
  }

  return (
    <>
      <ProductStructuredData product={localizedProduct} categoryLabel={categoryLabel} />

      <div className="product-detail">
        <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Startseite</Link>
          <span>/</span>
          <Link href="/products/">{t("product.products")}</Link>
          <span>/</span>
          <span>{localizedProduct.name}</span>
        </nav>

        <div className="product-detail-layout">
          <ProductGallery images={localizedProduct.images} imageKey={localizedProduct.imageKey} name={localizedProduct.name} />

          <div className="product-detail-info">
            <span className="product-detail-brand">{localizedProduct.brand}</span>
            <span className="product-card-category">{categoryLabel}</span>
            <h1>{localizedProduct.name}</h1>
            <p className="product-detail-sku">
              SKU: <strong>{activeSku}</strong>
              {localizedProduct.eanGtin && (
                <>
                  {" "}
                  · EAN: <strong>{localizedProduct.eanGtin}</strong>
                </>
              )}
            </p>

            {showPrices() ? (
              <div className="product-detail-pricing">
                <PriceLabel amount={activePrice} className="product-detail-price" />
                {localizedProduct.compareAtPrice &&
                  localizedProduct.compareAtPrice > activePrice && (
                    <p className="product-detail-compare">{formatPrice(localizedProduct.compareAtPrice)}</p>
                  )}
                <p className="product-detail-vat">{formatVatInfo(activePrice, localizedProduct.vatRate, locale)}</p>
              </div>
            ) : null}

            <p className={`product-stock status-${localizedProduct.stockStatus}${activeStock < 10 ? " low" : ""}`}>
              {stockStatusLabel(localizedProduct.stockStatus, locale)} · {activeStock}
            </p>

            <TecDocFitmentNote sku={activeSku} />

            {localizedProduct.shortDescription && (
              <p className="product-detail-lead">{localizedProduct.shortDescription}</p>
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
                {added ? `✓ ${t("product.addedToCart")}` : t("product.addToCart")}
              </button>
              {isCheckoutEnabled() && localizedProduct.buyNowEnabled && (
                <button type="button" className="shop-btn-secondary" onClick={handleBuyNow} disabled={!canBuy}>
                  Jetzt kaufen
                </button>
              )}
              {!isCheckoutEnabled() && (
                <Link href="/hilfe/#kontakt" className="shop-btn-secondary">
                  {t("catalog.inquiryCta")}
                </Link>
              )}
              <button
                type="button"
                className={`shop-btn-secondary wishlist-btn${inWishlist ? " active" : ""}`}
                onClick={() => toggle(localizedProduct.id)}
              >
                {inWishlist ? "♥ Auf Wunschliste" : "♡ Wunschliste"}
              </button>
            </div>

            <div className="product-trust-box">
              {showPrices() ? (
                <>
                  <p>{t("product.freeShippingFrom").replace("{amount}", formatPrice(FREE_SHIPPING_THRESHOLD))}</p>
                  <p>Versandkosten: {formatPrice(getShippingCost(activePrice * qty))}</p>
                </>
              ) : null}
              <p>{isCheckoutEnabled() ? "14 Tage Rückgaberecht · Sichere Zahlung" : t("catalog.inquiryHint")}</p>
            </div>
          </div>
        </div>

        <section className="product-detail-section">
          <h2>Beschreibung</h2>
          <p>{localizedProduct.description}</p>
        </section>

        {Object.keys(localizedProduct.attributes).length > 0 && (
          <section className="product-detail-section">
            <h2>Technische Daten</h2>
            <dl className="product-spec-table">
              {Object.entries(localizedProduct.attributes).map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replace(/_/g, " ")}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {localizedProduct.documents.length > 0 && (
          <section className="product-detail-section">
            <h2>Dokumente</h2>
            <ul className="product-doc-list">
              {localizedProduct.documents.map((doc) => (
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
            <h2>{t("product.similar")}</h2>
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
                    <PriceLabel amount={item.price} className="product-card-price" />
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
                    <PriceLabel amount={item.price} className="product-card-price" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <ProductReviews sku={activeSku} />
      </div>
    </>
  );
}
