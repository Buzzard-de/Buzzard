"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { clearConfirmedOrder, fetchOrder, loadConfirmedOrder } from "@/lib/orders";
import type { PublicOrder } from "@/lib/orders/types";
import { formatPrice } from "@/lib/products";
import { useLocale } from "@/lib/i18n/context";
import { isCheckoutEnabled } from "@/lib/shop/mode";
import CatalogOnlyNotice from "@/components/shop/CatalogOnlyNotice";

export default function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [order, setOrder] = useState<PublicOrder | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const cached = loadConfirmedOrder();
      if (cached && active) {
        setOrder(cached);
      }

      const orderNumber = searchParams.get("order");
      if (orderNumber) {
        const remote = await fetchOrder(orderNumber);
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
  }, [searchParams]);

  if (!isCheckoutEnabled() && !order) {
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
      <div className="checkout-success-icon">✓</div>
      <h1>{t("checkout.successTitle")}</h1>
      {order ? (
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
