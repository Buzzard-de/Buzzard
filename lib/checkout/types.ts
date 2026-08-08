import type { PaymentProviderId } from "@/lib/payments/types";

export type CheckoutStep =
  | "customer"
  | "shipping"
  | "billing"
  | "shipping_method"
  | "payment"
  | "review";

export interface CheckoutAddress {
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  street2?: string;
  zip: string;
  city: string;
  country: string;
  phone?: string;
}

export interface CheckoutCustomer {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  guest: boolean;
}

export interface CheckoutPayload {
  customer: CheckoutCustomer;
  shippingAddress: CheckoutAddress;
  billingAddress: CheckoutAddress;
  billingSameAsShipping: boolean;
  shippingMethodId: string;
  paymentProvider: PaymentProviderId;
  couponCode?: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export interface CheckoutCartLineInput {
  productId: string;
  variantIds: string[];
  qty: number;
}

export interface OrderLineQuote {
  productId: string;
  name: string;
  sku: string;
  variantIds: string[];
  variantLabel: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  vatRate: number;
  vatAmount: number;
  imageKey?: string;
}

export interface OrderQuote {
  currency: string;
  lines: OrderLineQuote[];
  subtotal: number;
  shipping: number;
  discount: number;
  vatAmount: number;
  total: number;
  freeShippingRemaining: number;
  shippingMethodId: string;
  couponCode?: string;
}

export interface ShippingMethodOption {
  id: string;
  labelKey: string;
  descriptionKey: string;
  baseCost: number;
  etaDays: string;
}
