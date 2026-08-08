"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "@/lib/account/context";
import { fetchAccountOrders } from "@/lib/account/client";
import type { CustomerOrder } from "@/lib/account/types";
import { useLocale } from "@/lib/i18n/context";
import { formatPrice } from "@/lib/products";

export default function AccountDashboard() {
  const { user, addressCount, wishlistCount } = useAccount();
  const { t } = useLocale();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  useEffect(() => {
    fetchAccountOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <div className="account-page">
      <h1>{t("account.dashboardTitle")}</h1>
      <p className="account-lead">{t("account.dashboardLead").replace("{name}", user?.firstName || "")}</p>
      <div className="account-stat-grid">
        <article className="account-stat"><strong>{orders.length}</strong><span>{t("account.nav.orders")}</span></article>
        <article className="account-stat"><strong>{addressCount}</strong><span>{t("account.nav.addresses")}</span></article>
        <article className="account-stat"><strong>{wishlistCount}</strong><span>{t("account.nav.wishlist")}</span></article>
      </div>
      <div className="account-shortcuts">
        <Link href="/konto/bestellungen/" className="shop-btn-secondary">{t("account.viewOrders")}</Link>
        <Link href="/konto/adressen/" className="shop-btn-secondary">{t("account.manageAddresses")}</Link>
        <Link href="/impressum/" className="shop-btn-secondary">{t("account.support")}</Link>
      </div>
      <section className="account-panel">
        <h2>{t("account.recentOrders")}</h2>
        {orders.length === 0 ? (
          <p>{t("account.noOrders")}</p>
        ) : (
          <ul className="account-order-list">
            {orders.slice(0, 5).map((order) => (
              <li key={order.orderNumber}>
                <div>
                  <strong>{order.orderNumber}</strong>
                  <span>{t(`account.status.${order.status}`)}</span>
                </div>
                <div>
                  <span>{formatPrice(order.total)}</span>
                  <Link href={`/konto/bestellung/?order=${encodeURIComponent(order.orderNumber)}`}>{t("account.view")}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
