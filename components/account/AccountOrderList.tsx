"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAccountOrders } from "@/lib/account/client";
import type { CustomerOrder } from "@/lib/account/types";
import { useLocale } from "@/lib/i18n/context";
import { showPrices } from "@/lib/shop/mode";
import PriceLabel from "@/components/shop/PriceLabel";

export default function AccountOrderList() {
  const { t } = useLocale();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  useEffect(() => {
    fetchAccountOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <div className="account-page">
      <h1>{t("account.ordersTitle")}</h1>
      {orders.length === 0 ? (
        <p>{t("account.noOrders")}</p>
      ) : (
        <div className="account-table-wrap">
          <table className="account-table">
            <thead>
              <tr>
                <th>{t("account.orderNumber")}</th>
                <th>{t("account.statusLabel")}</th>
                {showPrices() ? <th>{t("cart.total")}</th> : null}
                <th>{t("account.date")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderNumber}>
                  <td>{order.orderNumber}</td>
                  <td>{t(`account.status.${order.status}`)}</td>
                  {showPrices() ? (
                    <td>
                      <PriceLabel amount={order.total} />
                    </td>
                  ) : null}
                  <td>{new Date(order.createdAt).toLocaleDateString("de-DE")}</td>
                  <td>
                    <Link href={`/konto/bestellung/?order=${encodeURIComponent(order.orderNumber)}`}>{t("account.view")}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
