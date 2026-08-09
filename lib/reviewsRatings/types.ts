export interface ReviewsOverview {
  total: number;
  pending: number;
  published: number;
  rejected: number;
  verified: number;
  reports: number;
  average: number;
}

export interface ReviewRow {
  id: number;
  product_sku: string;
  customer_id: number | null;
  customer_name: string;
  order_number: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  verified_purchase: number;
  risk_flag: string;
  helpful_count: number;
  report_count: number;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewsRatingsStatus {
  version: string;
  enabled: boolean;
  totals: {
    reviews: number;
    pending: number;
    published: number;
    rejected: number;
    verified: number;
    reports: number;
    averageRating: number;
    media: number;
    replies: number;
  };
  overview: ReviewsOverview;
}
