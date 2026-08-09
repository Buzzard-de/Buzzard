import type { AccountUser, CustomerOrder } from "@/lib/account/types";
import type { AdminOrder, AdminProduct, AdminUser } from "@/lib/admin/types";
import type { PublicOrder } from "@/lib/orders/types";
import type { StoreOrder, StoreProduct, StoreUser } from "./types";

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = String(name || "").trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function mapStoreUser(user: StoreUser, country = "DE"): AccountUser {
  const { firstName, lastName } = splitName(user.name);
  return {
    id: String(user.id),
    email: user.email,
    firstName,
    lastName,
    country,
    phone: "",
    emailVerified: true,
  };
}

export function mapStoreAdminUser(user: StoreUser): AdminUser {
  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    role: "administrator",
  };
}

export function mapStoreOrder(order: StoreOrder): CustomerOrder {
  return {
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    total: order.total,
    currency: order.currency,
    createdAt: order.created_at,
    subtotal: order.subtotal,
    shipping: order.shipping,
    vatAmount: order.tax,
  };
}

export function mapStoreOrderToPublic(order: StoreOrder, email = ""): PublicOrder {
  return {
    id: String(order.id),
    orderNumber: order.order_number,
    status: order.status as PublicOrder["status"],
    createdAt: order.created_at,
    customer: {
      email,
      firstName: "",
      lastName: "",
      phone: "",
      guest: false,
    },
    shippingAddress: {
      firstName: "",
      lastName: "",
      street: "",
      zip: "",
      city: "",
      country: order.country_code,
    },
    billingAddress: {
      firstName: "",
      lastName: "",
      street: "",
      zip: "",
      city: "",
      country: order.country_code,
    },
    shippingMethodId: "standard",
    paymentProvider: "paypal",
    paymentStatus: order.payment_status === "paid" ? "paid" : "pending",
    lines: [],
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: 0,
    vatAmount: order.tax,
    total: order.total,
    currency: order.currency,
  };
}

export function mapStoreProduct(product: StoreProduct): AdminProduct {
  return {
    id: String(product.id),
    sku: product.sku,
    name: product.name,
    brand: "Buzzard",
    status: product.active ? "active" : "inactive",
    stock: product.stock,
    stock_status: product.stock > 0 ? "instock" : "outofstock",
    supplier_id: "sqlite",
    supplier_sku: product.sku,
    supplier_price: { amount: product.price_eur, currency: "EUR" },
    price: { amount: product.price_eur, currency: "EUR" },
    category_id: product.category || String(product.category_id || ""),
  };
}

export function mapStoreAdminOrder(order: StoreOrder): AdminOrder {
  return {
    orderNumber: order.order_number,
    status: order.status,
    total: order.total,
    currency: order.currency,
    createdAt: order.created_at,
    customer: {
      email: "",
      firstName: "",
      lastName: "",
    },
  };
}

export interface StoreAddress {
  id: number;
  name: string;
  line1: string;
  city: string;
  postal_code: string;
  country_code: string;
  phone?: string | null;
}

export function mapStoreAddress(address: StoreAddress): import("@/lib/account/types").AccountAddress {
  const { firstName, lastName } = splitName(address.name);
  return {
    id: String(address.id),
    firstName,
    lastName,
    street: address.line1,
    zip: address.postal_code,
    city: address.city,
    country: address.country_code,
  };
}
