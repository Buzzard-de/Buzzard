"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin/client";
import {
  fetchReviews,
  fetchReviewsOverview,
  fetchReviewsRatingsStatus,
} from "@/lib/reviewsRatings/client";
import type { ReviewRow, ReviewsOverview, ReviewsRatingsStatus } from "@/lib/reviewsRatings/types";

const FEATURES = [
  "Stars",
  "Written reviews",
  "Verified purchase",
  "Photos",
  "Helpful votes",
  "Seller replies",
  "Reports",
  "Moderation",
  "Risk flags",
  "Rating aggregates",
  "AI moderation ready",
];

export default function AdminReviewsRatingsPanel() {
  const [status, setStatus] = useState<ReviewsRatingsStatus | null>(null);
  const [overview, setOverview] = useState<ReviewsOverview | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    const [statusRow, overviewRow, reviewRows] = await Promise.all([
      fetchReviewsRatingsStatus(),
      fetchReviewsOverview(),
      fetchReviews(search),
    ]);
    setStatus(statusRow);
    setOverview(overviewRow);
    setReviews(reviewRows);
  }, [search]);

  useEffect(() => {
    if (!getAdminToken()) {
      setError("Nicht angemeldet");
      setLoading(false);
      return;
    }
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : "reviewsRatings.requestFailed"))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) return <p>Lade Reviews & Ratings…</p>;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Reviews & Ratings v2.7</h1>
        <p>Product reviews, moderation, helpful votes, replies and rating aggregates</p>
      </header>

      {error && <p className="shop-modal-error">{error}</p>}

      {overview && (
        <section className="admin-kpi-grid">
          {[
            ["Total", overview.total],
            ["Pending", overview.pending],
            ["Published", overview.published],
            ["Rejected", overview.rejected],
            ["Verified", overview.verified],
            ["Reports", overview.reports],
            ["Average", `${overview.average.toFixed(2)} ★`],
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
            placeholder="SKU, customer or review text"
            aria-label="Search reviews"
          />
          <button type="button" className="btn-secondary" onClick={() => reload().catch(() => undefined)}>
            Search
          </button>
        </div>

        <h2>Review moderation</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Review</th>
                <th>Rating</th>
                <th>Purchase</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.product_sku}</strong>
                  </td>
                  <td>
                    {row.title || "No title"}
                    <br />
                    <small>{row.customer_name || "—"}</small>
                  </td>
                  <td>{"★".repeat(row.rating)}</td>
                  <td>{row.verified_purchase ? "Verified" : "Unverified"}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Review features</h2>
        <div className="admin-flow">
          {FEATURES.map((item) => (
            <span key={item} className="admin-tag">
              {item}
            </span>
          ))}
        </div>
      </section>

      {status && (
        <section className="admin-card admin-meta">
          <p>
            Module v{status.version} · handoff to v2.0 identity, v2.2 OMS verification, object storage for photos
          </p>
        </section>
      )}
    </div>
  );
}
