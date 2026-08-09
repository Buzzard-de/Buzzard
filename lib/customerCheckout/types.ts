export interface CustomerCheckoutStatus {
  version: string;
  enabled: boolean;
  totals: {
    coupons: number;
    shippingMethods: number;
    reviews: number;
    pendingReviews: number;
    wishlists: number;
    notifications: number;
    checkoutDrafts: number;
  };
}

export interface CustomerShippingMethod {
  country_code: string;
  code: string;
  name: string;
  price: number;
  free_from: number;
}

export interface CustomerCheckoutQuote {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  vatAmount: number;
  total: number;
  currency: string;
  taxRate?: number;
}

export interface CustomerCouponValidation {
  valid: boolean;
  code: string;
  discount: number;
  type: "percent" | "fixed";
  value: number;
}

export interface CustomerReview {
  id: number;
  user_id?: number;
  product_id: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  created_at: string;
}

export interface CustomerCoupon {
  code: string;
  type: string;
  value: number;
  min_order: number;
  active: number;
  expires_at: string | null;
}

export interface CustomerCheckoutDraft {
  address_id?: number | null;
  country_code?: string;
  currency?: string;
  shipping_method?: string;
  coupon_code?: string;
  notes?: string;
}
