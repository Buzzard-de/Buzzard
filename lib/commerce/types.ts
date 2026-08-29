export type CommerceOrderType = "DRY_RUN" | "TEST_ORDER" | "READINESS_TEST" | "COMMERCIAL";

export interface CommerceCartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  priceSnapshot: number;
  currency: string;
  sku?: string;
  title?: string;
  stock?: number;
  purchasable?: boolean;
  lineTotal?: number;
  metadata?: Record<string, unknown>;
}

export interface CommerceCart {
  id: string;
  customerId?: string | null;
  sessionId?: string | null;
  country: string;
  currency: string;
  status: string;
  couponCode?: string | null;
}

export interface CommerceCartResponse {
  success: boolean;
  cart: CommerceCart;
  items: CommerceCartItem[];
  subtotal: number;
  itemCount: number;
  discount?: number;
  couponCode?: string | null;
  errorKey?: string;
  message?: string;
}

export interface CommerceAddress {
  firstName?: string;
  lastName?: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface CommerceCheckoutTotals {
  subtotal: number;
  discount?: number;
  shipping: number;
  tax: number;
  taxRate?: number;
  total: number;
  currency: string;
}

export interface CommerceCheckoutValidateResponse {
  success: boolean;
  checkoutId: string;
  state: string;
  totals: CommerceCheckoutTotals;
  shipping?: { methodId: string; methodName: string; price: number; estimatedDelivery?: string };
  tax?: { rate: number; tax: number; country: string };
  dryRun?: boolean;
  salesEnabled?: boolean;
  errorKey?: string;
}

export interface CommerceOrder {
  id: string;
  checkoutId?: string;
  orderType: CommerceOrderType;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  items: Array<{
    productId: string;
    sku?: string;
    title?: string;
    quantity: number;
    priceSnapshot: number;
  }>;
  metadata?: { dryRun?: boolean; realMoneyMovement?: boolean };
}

export interface CommerceCompleteResponse {
  success: boolean;
  checkoutId: string;
  state: string;
  order?: CommerceOrder;
  payment?: { mockOnly?: boolean; realMoneyMovement?: boolean; provider?: string };
  idempotencyReplay?: boolean;
  errorKey?: string;
  blocked?: boolean;
}

export interface CommerceStatus {
  success: boolean;
  flags: {
    salesEnabled: boolean;
    checkoutEnabled: boolean;
    checkoutDryRunOnly: boolean;
    paymentEnabled: boolean;
    mockPaymentOnly: boolean;
  };
  safety: { salesEnabled: boolean; catalogMode: boolean };
}

export interface CommerceShippingMethod {
  id: string;
  name: string;
  basePrice: number;
  baseDays: number;
}
