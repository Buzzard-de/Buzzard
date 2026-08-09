"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchCartCheckoutCarts,
  fetchCartCheckoutCoupons,
  fetchCartCheckoutOverview,
  fetchCartCheckoutSessions,
  fetchCartCheckoutShippingRates,
  fetchCartCheckoutStatus,
} from "@/lib/cartCheckout/client";
import type {
  CartCheckoutCartRow,
  CartCheckoutCoupon,
  CartCheckoutOverview,
  CartCheckoutSessionRow,
  CartCheckoutShippingRate,
  CartCheckoutStatus,
} from "@/lib/cartCheckout/types";
import { formatPrice } from "@/lib/products";

const FLOW = ["Cart", "Coupon", "Shipping", "Address", "Payment", "OMS"];

export default function AdminCartCheckoutPanel() {
  const [status, setStatus] = useState<CartCheckoutStatus | null>(null);
  const [overview, setOverview] = useState<CartCheckoutOverview | null>(null);
  const [carts, setCarts] = useState<CartCheckoutCartRow[]>([]);
  const [sessions, setSessions] = useState<CartCheckoutSessionRow[]>([]);
  const [coupons, setCoupons] = useState<CartCheckoutCoupon[]>([]);
  const [shippingRates, setShippingRates] = useState<CartCheckoutShippingRate[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, cartRows, sessionRows, couponRows, shippingRows] = await Promise.all([
      fetchCartCheckoutStatus(),
      fetchCartCheckoutOverview(),
      fetchCartCheckoutCarts(),
      fetchCartCheckoutSessions(),
      fetchCartCheckoutCoupons(),
      fetchCartCheckoutShippingRates(),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setCarts(cartRows);
    setSessions(sessionRows);
    setCoupons(couponRows);
    setShippingRates(shippingRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "cartCheckout.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Cart & Checkout…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Cart & Checkout v2.3</h1>
        <p>Carts, coupons, EU shipping rates, VAT boundary and checkout sessions</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Active carts", overview.activeCarts],
            ["Open checkouts", overview.openCheckouts],
            ["Ready for payment", overview.readyForPayment],
            ["Coupons", overview.coupons],
            ["Shipping rates", overview.shippingRates],
            ["Cart items", overview.cartItems],
          ].map(([label, value]) => (
            <div key={label} className="admin-kpi">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>
      )}

      <section className="admin-card">
        <h2>Active carts</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Country</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {carts.map((cart) => (
                <tr key={cart.id}>
                  <td>
                    <code>{cart.token.slice(0, 8)}…</code>
                    <br />
                    <small>{cart.email || "—"}</small>
                  </td>
                  <td>{cart.country}</td>
                  <td>{cart.item_count}</td>
                  <td>{formatPrice(cart.subtotal)}</td>
                  <td>{cart.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Checkout sessions</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Email</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>
                    <code>{session.token.slice(0, 8)}…</code>
                  </td>
                  <td>{session.email || "—"}</td>
                  <td>
                    {formatPrice(session.total || 0)} {session.currency || "EUR"}
                  </td>
                  <td>{session.payment_method || "—"}</td>
                  <td>{session.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Coupons & shipping</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min order</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>{coupon.code}</td>
                  <td>{coupon.type}</td>
                  <td>{coupon.value}</td>
                  <td>{formatPrice(coupon.min_order)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-table-wrap" style={{ marginTop: "1rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Method</th>
                <th>Price</th>
                <th>Days</th>
              </tr>
            </thead>
            <tbody>
              {shippingRates.slice(0, 12).map((rate) => (
                <tr key={rate.id}>
                  <td>{rate.country}</td>
                  <td>{rate.name}</td>
                  <td>{formatPrice(rate.price)}</td>
                  <td>
                    {rate.min_days}–{rate.max_days}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Checkout flow</h2>
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
          <p>Module v{status.version} · handoff to v2.1 Payments + v2.2 OMS</p>
        </section>
      )}
    </div>
  );
}
