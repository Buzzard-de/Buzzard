"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useCart } from "@/lib/cart";
import { lineSubtotal } from "@/lib/cart/types";
import CatalogInquiryPanel from "@/components/shop/CatalogInquiryPanel";
import CommerceDryRunBanner from "@/components/shop/CommerceDryRunBanner";
import PriceLabel from "@/components/shop/PriceLabel";
import ProductSvg from "./ProductSvg";
import { formatPrice } from "@/lib/products";
import { getFreeShippingThreshold } from "@/lib/checkout/shipping";
import { getProductUrl } from "@/lib/products";
import { isCartEnabled, isCheckoutEnabled, showPrices } from "@/lib/shop/mode";
import { useLocale } from "@/lib/i18n/context";
import { useMarket } from "@/lib/market/context";

export default function CartView() {
  const {
    items,
    subtotal,
    shipping,
    discount,
    vatAmount,
    total,
    freeShippingRemaining,
    couponCode,
    couponErrorKey,
    remove,
    updateQty,
    applyCoupon,
    clearCoupon,
    syncing,
    lastErrorKey,
  } = useCart();
  const { t } = useLocale();
  const { countryCode } = useMarket();
  const freeShippingThreshold = getFreeShippingThreshold(countryCode);
  const [couponInput, setCouponInput] = useState(couponCode);

  if (!isCartEnabled()) {
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="shop-empty">
        <h1>{t("cart.emptyTitle")}</h1>
        <p>{t("cart.emptyText")}</p>
        <Link href="/products/" className="shop-btn-primary">
          {t("cart.shopCta")}
        </Link>
      </div>
    );
  }

  function handleCoupon(e: FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) {
      clearCoupon();
      return;
    }
    applyCoupon(couponInput);
  }

  return (
    <div className="cart-page">
      <CommerceDryRunBanner />
      <h1 className="shop-page-title">{t("cart.title")}</h1>
      {syncing && <p className="cart-loading" aria-live="polite">{t("cart.loading") || "Warenkorb wird aktualisiert…"}</p>}
      {lastErrorKey && <p className="shop-modal-error" role="alert">{t(lastErrorKey) || lastErrorKey}</p>}

      {showPrices() && freeShippingRemaining > 0 && (
        <p className="cart-shipping-hint">
          {t("cart.freeShippingHint")
            .replace("{amount}", formatPrice(freeShippingRemaining))
            .replace("{threshold}", formatPrice(freeShippingThreshold))}
        </p>
      )}

      <div className="cart-layout">
        <ul className="cart-items">
          {items.map((item) => (
            <li key={item.lineId} className="cart-item">
              <Link href={getProductUrl(item.productId)} className="cart-item-img">
                <ProductSvg imageKey={item.imageKey || "default"} />
              </Link>
              <div className="cart-item-body">
                <Link href={getProductUrl(item.productId)} className="cart-item-name">
                  {item.name}
                </Link>
                {item.variantLabel && (
                  <span className="cart-item-variant">{item.variantLabel}</span>
                )}
                {item.sku && <span className="cart-item-sku">SKU: {item.sku}</span>}
                {showPrices() ? (
                  <span className="cart-item-price">
                    <PriceLabel amount={item.unitPrice} />
                  </span>
                ) : null}
                <div className="cart-item-actions">
                  <div className="qty-control">
                    <button
                      type="button"
                      onClick={() => updateQty(item.lineId, item.qty - 1)}
                      aria-label={t("cart.qtyDecrease")}
                    >
                      −
                    </button>
                    <span>{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.lineId, item.qty + 1)}
                      aria-label={t("cart.qtyIncrease")}
                    >
                      +
                    </button>
                  </div>
                  <button type="button" className="cart-remove" onClick={() => remove(item.lineId)}>
                    {t("cart.remove")}
                  </button>
                </div>
              </div>
              {showPrices() ? (
                <strong className="cart-item-total">{formatPrice(lineSubtotal(item))}</strong>
              ) : null}
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <h2>{t("cart.summary")}</h2>
          {showPrices() ? (
            <>
              <form className="cart-coupon" onSubmit={handleCoupon}>
                <label htmlFor="coupon">{t("cart.couponLabel")}</label>
                <div className="cart-coupon-row">
                  <input
                    id="coupon"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={t("cart.couponPlaceholder")}
                    maxLength={32}
                  />
                  <button type="submit" className="shop-btn-secondary">
                    {t("cart.couponApply")}
                  </button>
                </div>
                {couponCode && (
                  <button type="button" className="cart-coupon-clear" onClick={clearCoupon}>
                    {t("cart.couponRemove")}: {couponCode}
                  </button>
                )}
                {couponErrorKey && <p className="shop-modal-error">{t(couponErrorKey)}</p>}
              </form>
              <div className="cart-summary-row">
                <span>{t("cart.subtotal")}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="cart-summary-row cart-summary-discount">
                  <span>{t("cart.discount")}</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="cart-summary-row">
                <span>{t("cart.shipping")}</span>
                <span>{shipping === 0 ? t("cart.shippingFree") : formatPrice(shipping)}</span>
              </div>
              <div className="cart-summary-row">
                <span>{t("cart.vat")}</span>
                <span>{formatPrice(vatAmount)}</span>
              </div>
              <div className="cart-summary-row cart-summary-total">
                <span>{t("cart.total")}</span>
                <span>{formatPrice(total)}</span>
              </div>
            </>
          ) : null}
          {isCheckoutEnabled() ? (
            <Link href="/checkout/" className="shop-btn-primary cart-checkout-btn">
              {t("cart.checkout")}
            </Link>
          ) : (
            <CatalogInquiryPanel items={items} variant="cart" />
          )}
          <Link href="/products/" className="shop-btn-secondary">
            {t("cart.continue")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
