"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  fetchProductReviews,
  submitProductReview,
  type ProductReviewRow,
  type ProductReviewStats,
} from "@/lib/reviewsRatings/storefront";
import { isReviewsRatingsEnabled } from "@/lib/api/config";

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="product-review-stars" aria-label={`${value.toFixed(1)} von 5 Sternen`}>
      {"★★★★★".split("").map((star, index) => (
        <span key={index} className={index < rounded ? "star-filled" : "star-empty"}>
          {star}
        </span>
      ))}
    </span>
  );
}

export default function ProductReviews({ sku }: { sku: string }) {
  const [stats, setStats] = useState<ProductReviewStats | null>(null);
  const [reviews, setReviews] = useState<ProductReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchProductReviews(sku);
    if (data) {
      setStats(data.stats);
      setReviews(data.reviews);
    } else {
      setStats(null);
      setReviews([]);
    }
    setLoading(false);
  }, [sku]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    const result = await submitProductReview({
      productSku: sku,
      rating,
      title: title.trim(),
      body: body.trim(),
      customerName: name.trim(),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError("Bewertung konnte nicht gesendet werden.");
      return;
    }
    setMessage("Vielen Dank — Ihre Bewertung wird nach Prüfung veröffentlicht.");
    setTitle("");
    setBody("");
    await reload();
  }

  if (loading) {
    return (
      <section className="product-detail-section product-reviews">
        <h2>Bewertungen</h2>
        <p className="product-reviews-empty">Lade Bewertungen…</p>
      </section>
    );
  }

  const reviewCount = stats?.review_count || 0;
  const average = stats?.average_rating || 0;

  return (
    <section className="product-detail-section product-reviews">
      <h2>Bewertungen</h2>

      {reviewCount > 0 ? (
        <div className="product-reviews-summary">
          <Stars value={average} />
          <p>
            {average.toFixed(1)} / 5 · {reviewCount} Bewertung{reviewCount === 1 ? "" : "en"}
          </p>
        </div>
      ) : (
        <p className="product-reviews-empty">Noch keine veröffentlichten Bewertungen.</p>
      )}

      <ul className="product-reviews-list">
        {reviews.map((review) => (
          <li key={review.id} className="product-review-item">
            <div className="product-review-head">
              <strong>{review.customer_name || "Kunde"}</strong>
              <Stars value={review.rating} />
            </div>
            {review.title ? <h3>{review.title}</h3> : null}
            <p>{review.body}</p>
            {review.verified ? <small className="product-review-verified">Verifizierter Kauf</small> : null}
          </li>
        ))}
      </ul>

      {isReviewsRatingsEnabled() ? (
        <form className="product-review-form" onSubmit={handleSubmit}>
          <h3>Bewertung schreiben</h3>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </label>
          <label>
            Sterne
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} Sterne
                </option>
              ))}
            </select>
          </label>
          <label>
            Titel
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </label>
          <label>
            Bewertung
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={2000} rows={4} />
          </label>
          {error && <p className="shop-modal-error">{error}</p>}
          {message && <p className="admin-login-hint">{message}</p>}
          <button type="submit" className="shop-btn-secondary" disabled={submitting}>
            {submitting ? "Sende…" : "Bewertung absenden"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
