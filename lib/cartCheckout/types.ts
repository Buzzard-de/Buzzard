export interface CartCheckoutOverview {
  activeCarts: number;
  openCheckouts: number;
  readyForPayment: number;
  coupons: number;
  shippingRates: number;
  cartItems: number;
}

export interface CartCheckoutCartRow {
  id: number;
  token: string;
  customer_id: number | null;
  email: string | null;
  country: string;
  currency: string;
  coupon: string | null;
  status: string;
  expires_at: string;
  item_count: number;
  subtotal: number;
}

export interface CartCheckoutSessionRow {
  id: number;
  token: string;
  cart_id: number | null;
  email: string | null;
  country: string | null;
  currency: string | null;
  shipping_id: number | null;
  payment_method: string | null;
  subtotal: number | null;
  discount: number | null;
  shipping: number | null;
  tax: number | null;
  total: number | null;
  status: string;
  created_at: string;
}

export interface CartCheckoutCoupon {
  id: number;
  code: string;
  type: string;
  value: number;
  min_order: number;
  active: number;
}

export interface CartCheckoutShippingRate {
  id: number;
  country: string;
  code: string;
  name: string;
  price: number;
  min_days: number | null;
  max_days: number | null;
  active: number;
}

export interface CartCheckoutStatus {
  version: string;
  enabled: boolean;
  totals: {
    activeCarts: number;
    openCheckouts: number;
    readyForPayment: number;
    coupons: number;
    shippingRates: number;
    cartItems: number;
  };
  overview: CartCheckoutOverview;
}
