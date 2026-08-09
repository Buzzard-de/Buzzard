"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  createAdminCoupon,
  fetchAdminCoupons,
  fetchAdminCustomerCheckoutStatus,
  fetchAdminReviews,
  updateReviewStatus,
} from "@/lib/customerCheckout/client";
import type { CustomerCheckoutStatus, CustomerCoupon, CustomerReview } from "@/lib/customerCheckout/types";

export default function AdminCustomerCheckoutPanel() {
  const [status, setStatus] = useState<CustomerCheckoutStatus | null>(null);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState("percent");
  const [couponValue, setCouponValue] = useState("10");
  const [couponMinOrder, setCouponMinOrder] = useState("30");

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, reviewRows, couponRows] = await Promise.all([
      fetchAdminCustomerCheckoutStatus(),
      fetchAdminReviews(),
      fetchAdminCoupons(),
    ]);
    setStatus(statusRow);
    setReviews(reviewRows);
    setCoupons(couponRows);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "customerCheckout.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  async function handleReviewStatus(reviewId: number, next: "approved" | "rejected") {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await updateReviewStatus(reviewId, next);
      setMessage(`Review #${reviewId} ${next === "approved" ? "freigegeben" : "abgelehnt"}`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "customerCheckout.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCoupon(e: FormEvent) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await createAdminCoupon({
        code: couponCode.trim(),
        type: couponType,
        value: Number(couponValue),
        minOrder: Number(couponMinOrder),
      });
      setMessage(`Coupon ${couponCode.toUpperCase()} angelegt`);
      setCouponCode("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "customerCheckout.requestFailed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Lade Customer Checkout…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Customer Checkout v1.0</h1>
        <p>Coupons, Reviews, Versandmethoden und Checkout-Drafts</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}

      {status && (
        <section className="admin-card">
          <h2>Status</h2>
          <ul className="admin-stats">
            <li>Coupons: {status.totals.coupons}</li>
            <li>Versandmethoden: {status.totals.shippingMethods}</li>
            <li>Reviews: {status.totals.reviews}</li>
            <li>Pending Reviews: {status.totals.pendingReviews}</li>
            <li>Wishlists: {status.totals.wishlists}</li>
            <li>Checkout Drafts: {status.totals.checkoutDrafts}</li>
          </ul>
        </section>
      )}

      <section className="admin-card">
        <h2>Neuer Coupon</h2>
        <form className="admin-form" onSubmit={handleCreateCoupon}>
          <label>
            Code
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} required />
          </label>
          <label>
            Typ
            <select value={couponType} onChange={(e) => setCouponType(e.target.value)}>
              <option value="percent">Prozent</option>
              <option value="fixed">Fixbetrag</option>
            </select>
          </label>
          <label>
            Wert
            <input value={couponValue} onChange={(e) => setCouponValue(e.target.value)} required />
          </label>
          <label>
            Mindestbestellwert
            <input value={couponMinOrder} onChange={(e) => setCouponMinOrder(e.target.value)} required />
          </label>
          <button type="submit" className="shop-btn-primary" disabled={busy}>
            Coupon anlegen
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Coupons</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Typ</th>
              <th>Wert</th>
              <th>Min.</th>
              <th>Aktiv</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.code}>
                <td>{coupon.code}</td>
                <td>{coupon.type}</td>
                <td>{coupon.value}</td>
                <td>{coupon.min_order}</td>
                <td>{coupon.active ? "Ja" : "Nein"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-card">
        <h2>Reviews</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Produkt</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id}>
                <td>{review.id}</td>
                <td>{review.product_id}</td>
                <td>{review.rating}★</td>
                <td>{review.status}</td>
                <td>
                  {review.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className="shop-btn-secondary"
                        disabled={busy}
                        onClick={() => handleReviewStatus(review.id, "approved")}
                      >
                        Freigeben
                      </button>{" "}
                      <button
                        type="button"
                        className="shop-btn-secondary"
                        disabled={busy}
                        onClick={() => handleReviewStatus(review.id, "rejected")}
                      >
                        Ablehnen
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
