export interface AccountUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  phone: string;
  emailVerified: boolean;
}

export interface AccountAddress {
  id: string;
  label?: string;
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  street2?: string;
  zip: string;
  city: string;
  country: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export interface AccountPreferences {
  language?: string;
  marketing?: boolean;
  transactional?: boolean;
}

export interface CustomerOrder {
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  total: number;
  currency: string;
  createdAt: string;
  lines?: Array<{ name: string; qty: number; unitPrice: number; lineTotal: number }>;
  subtotal?: number;
  shipping?: number;
  vatAmount?: number;
  discount?: number;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  shippingAddress?: AccountAddress;
}

export type OrderStatus =
  | "pending"
  | "payment_pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
