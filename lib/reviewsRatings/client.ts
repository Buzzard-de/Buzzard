import type { ReviewRow, ReviewsOverview, ReviewsRatingsStatus } from "./types";
import { withAdminCredentials } from "@/lib/admin/authTransport";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}


async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("reviewsRatings.apiUnavailable");
  const res = await fetch(`${base}${path}`, withAdminCredentials(init));
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "reviewsRatings.requestFailed");
  return data;
}

export function isReviewsRatingsApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchReviewsRatingsStatus(): Promise<ReviewsRatingsStatus> {
  const base = apiBase();
  if (!base) throw new Error("reviewsRatings.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("reviewsRatings.requestFailed");
  const data = (await res.json()) as { reviewsRatings?: ReviewsRatingsStatus };
  if (!data.reviewsRatings?.enabled) throw new Error("reviewsRatings.disabled");
  return data.reviewsRatings;
}

export async function fetchReviewsOverview(): Promise<ReviewsOverview> {
  return adminRequest<ReviewsOverview>("/api/admin/reviews-ratings/overview");
}

export async function fetchReviews(search = "", status = "", risk = ""): Promise<ReviewRow[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (risk) params.set("risk", risk);
  const query = params.toString();
  return adminRequest<ReviewRow[]>(`/api/admin/reviews-ratings/reviews${query ? `?${query}` : ""}`);
}
