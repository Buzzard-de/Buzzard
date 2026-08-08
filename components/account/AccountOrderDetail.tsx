"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { fetchAccountOrder } from "@/lib/account/client";
import type { CustomerOrder } from "@/lib/account/types";
import { useLocale } from "@/lib/i18n/context";
import { formatPrice } from "@/lib/products";

function OrderDetailInner() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";
  const { t } = useLocale();
  const [order, setOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    fetchAccountOrder(orderNumber).then(setOrder).catch(() => setOrder(null));
  }, [orderNumber]);

  if (!orderNumber) return <p>{t("account.orderMissing")}</p>;
  if (!order) return <p>{t("account.orderLoading")}</p>;

  return (
    <div className="account-page">
      <Link href="/konto/bestellungen/" className="checkout-back-link">← {t("account.backOrders")}</Link>
      <h1>{order.orderNumber}</h1>
      <p>{t(`account.status.${order.status}`)} · {new Date(order.createdAt).toLocaleString("de-DE")}</p>
      <div className="account-panel">
        <ul className="checkout-items">
          {(order.lines || []).map((line, idx) => (
            <li key={idx}>
              <span>{line.qty}× {line.name}</span>
              <span>{formatPrice(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="cart-summary-row"><span>{t("cart.subtotal")}</span><span>{formatPrice(order.subtotal || 0)}</span></div>
        <div className="cart-summary-row"><span>{t("cart.shipping")}</span><span>{formatPrice(order.shipping || 0)}</span></div>
        <div className="cart-summary-row"><span>{t("cart.vat")}</span><span>{formatPrice(order.vatAmount || 0)}</span></div>
        <div className="cart-summary-row cart-summary-total"><span>{t("cart.total")}</span><span>{formatPrice(order.total)}</span></div>
        {order.trackingNumber && (
          <p className="account-tracking">{t("account.tracking")}: {order.trackingCarrier} {order.trackingNumber}</p>
        )}
      </div>
    </div>
  );
}

export default function AccountOrderDetail() {
  return (
    <Suspense fallback={<div className="account-loading">…</div>}>
      <OrderDetailInner />
    </Suspense>
  );
}
