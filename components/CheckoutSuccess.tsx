"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { clearConfirmedOrder, fetchOrder, loadConfirmedOrder } from "@/lib/orders";
import type { PublicOrder } from "@/lib/orders/types";
import { fetchCommerceOrder } from "@/lib/commerce/client";
import type { CommerceOrder } from "@/lib/commerce/types";
import { formatPrice } from "@/lib/products";
import { useLocale } from "@/lib/i18n/context";
import { isCheckoutEnabled, isCommerceDryRun } from "@/lib/shop/mode";
import CatalogOnlyNotice from "@/components/shop/CatalogOnlyNotice";
import CommerceDryRunBanner from "@/components/shop/CommerceDryRunBanner";

export default function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [commerceOrder, setCommerceOrder] = useState<CommerceOrder | null>(null);
  const source = searchParams.get("source");

  useEffect(() => {
    let active = true;

    async function load() {
      const orderId = searchParams.get("order");
      if (source === "commerce" && orderId) {
        try {
          const remote = await fetchCommerceOrder(orderId);
          if (remote.order && active) {
            setCommerceOrder(remote.order);
            return;
          }
        } catch {
          /* fallback below */
        }
      }

      const cached = loadConfirmedOrder();
      if (cached && active) {
        setOrder(cached);
      }

      if (orderId) {
        const remote = await fetchOrder(orderId);
        if (remote && active) {
          setOrder(remote);
          clearConfirmedOrder();
          return;
        }
      }

      if (cached && active) {
        clearConfirmedOrder();
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [searchParams, source]);

  if (!isCheckoutEnabled() && !order && !commerceOrder) {
    return (
      <div className="checkout-success">
        <CatalogOnlyNotice />
        <div className="checkout-success-actions">
          <Link href="/products/" className="shop-btn-primary">
            {t("checkout.successContinue")}
          </Link>
          <Link href="/" className="shop-btn-secondary">
            {t("checkout.successHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-success">
      <CommerceDryRunBanner />
      <div className="checkout-success-icon">✓</div>
      <h1>{t("checkout.successTitle")}</h1>
      {commerceOrder ? (
        <>
          <p>
            {isCommerceDryRun()
              ? t("commerce.testOrderThanks") ||
                "Ihre Test-/Readiness-Bestellung wurde gespeichert. Es wurde kein echter Verkauf ausgelöst."
              : t("checkout.successGeneric")}
          </p>
          <div className="checkout-success-summary">
            <div className="cart-summary-row">
              <span>{t("cart.total")}</span>
              <span>{formatPrice(commerceOrder.total)}</span>
            </div>
            <div className="cart-summary-row">
              <span>{t("checkout.statusLabel")}</span>
              <span>{commerceOrder.orderType} — {commerceOrder.status}</span>
            </div>
            <div className="cart-summary-row">
              <span>ID</span>
              <span><code>{commerceOrder.id}</code></span>
            </div>
          </div>
        </>
      ) : order ? (
        <>
          <p>
            {t("checkout.successThanks")} {order.customer.firstName} {order.customer.lastName}.{" "}
            {t("checkout.successOrder")} <strong>{order.orderNumber}</strong>.
          </p>
          <div className="checkout-success-summary">
            <div className="cart-summary-row">
              <span>{t("cart.total")}</span>
              <span>{formatPrice(order.total)}</span>
            </div>
            <div className="cart-summary-row">
              <span>{t("checkout.statusLabel")}</span>
              <span>{t(`checkout.status.${order.status}`)}</span>
            </div>
          </div>
          <p className="checkout-success-email">
            {t("checkout.successEmail").replace("{email}", order.customer.email)}
          </p>
          <p className="checkout-success-support">{t("checkout.successSupport")}</p>
        </>
      ) : (
        <p>{t("checkout.successGeneric")}</p>
      )}
      <div className="checkout-success-actions">
        <Link href="/products/" className="shop-btn-primary">
          {t("checkout.successContinue")}
        </Link>
        <Link href="/" className="shop-btn-secondary">
          {t("checkout.successHome")}
        </Link>
      </div>
    </div>
  );
}
