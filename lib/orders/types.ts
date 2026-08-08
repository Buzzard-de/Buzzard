import type { PaymentProviderId } from "@/lib/payments/types";
import type { CheckoutAddress, CheckoutCustomer, OrderLineQuote } from "@/lib/checkout/types";

export type OrderStatus =
  | "pending"
  | "payment_pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface PublicOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  customer: CheckoutCustomer;
  shippingAddress: CheckoutAddress;
  billingAddress: CheckoutAddress;
  shippingMethodId: string;
  paymentProvider: PaymentProviderId;
  paymentStatus: "pending" | "paid" | "failed";
  lines: OrderLineQuote[];
  subtotal: number;
  shipping: number;
  discount: number;
  vatAmount: number;
  total: number;
  currency: string;
  couponCode?: string;
}

export interface CreateOrderRequest {
  customer: CheckoutCustomer;
  shippingAddress: CheckoutAddress;
  billingAddress: CheckoutAddress;
  billingSameAsShipping: boolean;
  shippingMethodId: string;
  paymentProvider: PaymentProviderId;
  couponCode?: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  lines: Array<{ productId: string; variantIds: string[]; qty: number }>;
}

export interface CreateOrderResponse {
  success: boolean;
  order?: PublicOrder;
  error?: string;
  errorKey?: string;
}

export interface QuoteRequest {
  lines: Array<{ productId: string; variantIds: string[]; qty: number }>;
  shippingMethodId: string;
  couponCode?: string;
}

export interface QuoteResponse {
  success: boolean;
  quote?: {
    subtotal: number;
    shipping: number;
    discount: number;
    vatAmount: number;
    total: number;
    freeShippingRemaining: number;
    currency: string;
  };
  errorKey?: string;
}

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "payment_pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export function orderStatusLabelKey(status: OrderStatus): string {
  return `checkout.status.${status}`;
}
