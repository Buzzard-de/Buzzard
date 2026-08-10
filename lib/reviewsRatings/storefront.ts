import { apiBaseUrl, isReviewsRatingsEnabled } from "@/lib/api/config";

export interface ProductReviewStats {
  product_sku: string;
  review_count: number;
  average_rating: number;
}

export interface ProductReviewRow {
  id: number;
  product_sku: string;
  customer_name: string;
  rating: number;
  title: string;
  body: string;
  verified: number;
  helpful_count: number;
  created_at: string;
}

export interface ProductReviewsPayload {
  stats: ProductReviewStats;
  reviews: ProductReviewRow[];
}

function base(): string {
  return apiBaseUrl();
}

export async function fetchProductReviews(sku: string): Promise<ProductReviewsPayload | null> {
  if (!isReviewsRatingsEnabled() || !sku) return null;
  try {
    const res = await fetch(`${base()}/api/reviews-ratings/products/${encodeURIComponent(sku)}/reviews`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ProductReviewsPayload;
  } catch {
    return null;
  }
}

export async function submitProductReview(input: {
  productSku: string;
  rating: number;
  title: string;
  body: string;
  customerName: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isReviewsRatingsEnabled()) {
    return { ok: false, error: "reviews.apiUnavailable" };
  }
  try {
    const res = await fetch(`${base()}/api/reviews-ratings/reviews`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        productSku: input.productSku,
        rating: input.rating,
        title: input.title,
        body: input.body,
        customerName: input.customerName,
        language: "de",
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error || "reviews.submitFailed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "reviews.apiUnavailable" };
  }
}
