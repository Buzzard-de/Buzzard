"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchOmsOrders,
  fetchOmsOverview,
  fetchOrderManagementStatus,
} from "@/lib/orderManagement/client";
import type { OmsOrderRow, OmsOverview, OrderManagementStatus } from "@/lib/orderManagement/types";
import { formatPrice } from "@/lib/products";

const FLOW = ["Order", "Payment", "Reserve", "Fulfillment", "Shipment", "Delivered"];

export default function AdminOrderManagementPanel() {
  const [status, setStatus] = useState<OrderManagementStatus | null>(null);
  const [overview, setOverview] = useState<OmsOverview | null>(null);
  const [orders, setOrders] = useState<OmsOrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, orderRows] = await Promise.all([
      fetchOrderManagementStatus(),
      fetchOmsOverview(),
      fetchOmsOrders(search),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setOrders(orderRows);
  }, [search]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "orderManagement.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Order Management…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Order Management v2.2</h1>
        <p>Unified OMS — lifecycle, split orders, fulfillment links and audit timeline</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Total orders", overview.totalOrders],
            ["Pending", overview.pending],
            ["Processing", overview.processing],
            ["Fulfilled", overview.fulfilled],
            ["Cancelled", overview.cancelled],
            ["Order value", formatPrice(overview.grossValue)],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="admin-card">
        <div className="admin-toolbar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order number or customer email"
            aria-label="Search orders"
          />
          <button type="button" className="btn-secondary" onClick={() => reload().catch(() => undefined)}>
            Search
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Channel</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Fulfillment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.order_number}</strong>
                    <br />
                    <small>{order.customer_email || "—"}</small>
                  </td>
                  <td>{order.channel}</td>
                  <td>
                    {formatPrice(order.grand_total)} {order.currency}
                  </td>
                  <td>{order.payment_status}</td>
                  <td>{order.fulfillment_status}</td>
                  <td>{order.order_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>OMS flow</h2>
        <div className="admin-flow">
          {FLOW.map((step, index) => (
            <span key={step}>
              {index > 0 && <span aria-hidden="true"> → </span>}
              <strong>{step}</strong>
            </span>
          ))}
        </div>
      </section>

      {status && (
        <section className="admin-card admin-meta">
          <p>
            Module v{status.version} · {status.totals.events} events · {status.totals.fulfillmentLinks}{" "}
            fulfillment links · {status.totals.splits} splits
          </p>
        </section>
      )}
    </div>
  );
}
