import { migrateLegacyCart, type CartLineItem } from "@/lib/cart/types";

export const CART_STORAGE_KEY = "buzzard_cart";
export const COUPON_STORAGE_KEY = "buzzard_coupon";

export function readLocalCart(): CartLineItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]") as unknown[];
    return migrateLegacyCart(Array.isArray(raw) ? raw : []);
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

export function writeLocalCart(items: CartLineItem[]): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function dispatchCartUpdated(): void {
  window.dispatchEvent(new Event("buzzard-cart-updated"));
}
