"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  calculateOrderQuote,
  cartLinesToInput,
} from "@/lib/checkout";
import { calculateShippingCost, freeShippingRemaining } from "@/lib/checkout/shipping";
import { validateCoupon } from "@/lib/checkout/coupons";
import {
  cartCount,
  cartSubtotal,
  createCartLineId,
  migrateLegacyCart,
  type CartLineItem,
} from "@/lib/cart/types";
import { resolveLinePricing } from "@/lib/checkout/totals";
import { trackMarketingEvent } from "@/lib/marketing/events";
import { useMarket } from "@/lib/market/context";

const STORAGE_KEY = "buzzard_cart";
const COUPON_KEY = "buzzard_coupon";

export interface AddToCartInput {
  productId: string;
  variantIds?: string[];
  qty?: number;
}

function readCart(): CartLineItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as unknown[];
    const migrated = migrateLegacyCart(Array.isArray(raw) ? raw : []);
    return migrated;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function writeCart(items: CartLineItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function readCoupon(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(COUPON_KEY) || "";
  } catch {
    return "";
  }
}

function writeCoupon(code: string): void {
  localStorage.setItem(COUPON_KEY, code);
}

interface CartContextValue {
  items: CartLineItem[];
  count: number;
  subtotal: number;
  shipping: number;
  discount: number;
  vatAmount: number;
  total: number;
  freeShippingRemaining: number;
  couponCode: string;
  couponErrorKey: string | null;
  ready: boolean;
  add: (input: AddToCartInput) => boolean;
  remove: (lineId: string) => void;
  updateQty: (lineId: string, qty: number) => void;
  applyCoupon: (code: string) => boolean;
  clearCoupon: () => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { countryCode } = useMarket();
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponErrorKey, setCouponErrorKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [adding, setAdding] = useState(false);

  const persist = useCallback((next: CartLineItem[]) => {
    writeCart(next);
    setItems(next);
  }, []);

  useLayoutEffect(() => {
    setItems(readCart());
    setCouponCode(readCoupon());
    setReady(true);

    const sync = () => {
      setItems(readCart());
      setCouponCode(readCoupon());
    };
    window.addEventListener("storage", sync);
    window.addEventListener("buzzard-cart-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("buzzard-cart-updated", sync);
    };
  }, []);

  const totals = useMemo(() => {
    const subtotal = cartSubtotal(items);
    const coupon = validateCoupon(couponCode, subtotal);
    const discount = coupon.valid ? coupon.discount : 0;
    const discounted = Math.max(0, subtotal - discount);
    const shipping = calculateShippingCost(discounted, "standard", countryCode);
    const quote = calculateOrderQuote(
      cartLinesToInput(
        items.map((item) => ({
          productId: item.productId,
          variantIds: item.variantIds,
          qty: item.qty,
        }))
      ),
      "standard",
      coupon.valid ? coupon.normalizedCode : undefined,
      countryCode
    );
    return {
      subtotal,
      shipping,
      discount,
      vatAmount: quote?.vatAmount ?? 0,
      total: quote?.total ?? discounted + shipping,
      freeShippingRemaining: freeShippingRemaining(discounted, countryCode),
    };
  }, [items, couponCode, countryCode]);

  const add = useCallback(
    (input: AddToCartInput) => {
      if (adding) return false;
      const variantIds = input.variantIds ?? [];
      const qty = Math.max(1, input.qty ?? 1);
      const priced = resolveLinePricing(input.productId, variantIds, qty);
      if (!priced) return false;

      setAdding(true);
      const lineId = createCartLineId(input.productId, variantIds);
      const current = readCart();
      const existing = current.find((i) => i.lineId === lineId);
      const nextItem: CartLineItem = {
        lineId,
        productId: input.productId,
        name: priced.name,
        sku: priced.sku,
        unitPrice: priced.unitPrice,
        qty: existing ? existing.qty + qty : qty,
        variantIds,
        variantLabel: priced.variantLabel,
        imageKey: priced.imageKey,
        vatRate: priced.vatRate,
      };

      const next = existing
        ? current.map((i) => (i.lineId === lineId ? nextItem : i))
        : [...current, nextItem];

      persist(next);
      window.dispatchEvent(new Event("buzzard-cart-updated"));
      trackMarketingEvent("add_to_cart", {
        product_id: input.productId,
        quantity: nextItem.qty,
        value: nextItem.unitPrice * nextItem.qty,
      });
      setTimeout(() => setAdding(false), 300);
      return true;
    },
    [adding, persist]
  );

  const remove = useCallback(
    (lineId: string) => {
      const current = readCart();
      const target = current.find((i) => i.lineId === lineId);
      persist(current.filter((i) => i.lineId !== lineId));
      window.dispatchEvent(new Event("buzzard-cart-updated"));
      if (target) {
        trackMarketingEvent("remove_from_cart", {
          product_id: target.productId,
          quantity: target.qty,
        });
      }
    },
    [persist]
  );

  const updateQty = useCallback(
    (lineId: string, qty: number) => {
      if (qty < 1) {
        remove(lineId);
        return;
      }
      const current = readCart();
      const target = current.find((i) => i.lineId === lineId);
      if (!target) return;
      const priced = resolveLinePricing(target.productId, target.variantIds, qty);
      if (!priced) return;
      persist(
        current.map((i) =>
          i.lineId === lineId ? { ...i, qty, unitPrice: priced.unitPrice } : i
        )
      );
      window.dispatchEvent(new Event("buzzard-cart-updated"));
    },
    [persist, remove]
  );

  const applyCoupon = useCallback(
    (code: string) => {
      const normalized = code.trim().toUpperCase();
      const result = validateCoupon(normalized, cartSubtotal(readCart()));
      if (!result.valid) {
        setCouponErrorKey(result.errorKey ?? "checkout.couponInvalid");
        return false;
      }
      writeCoupon(result.normalizedCode || normalized);
      setCouponCode(result.normalizedCode || normalized);
      setCouponErrorKey(null);
      window.dispatchEvent(new Event("buzzard-cart-updated"));
      return true;
    },
    []
  );

  const clearCoupon = useCallback(() => {
    writeCoupon("");
    setCouponCode("");
    setCouponErrorKey(null);
    window.dispatchEvent(new Event("buzzard-cart-updated"));
  }, []);

  const clear = useCallback(() => {
    persist([]);
    clearCoupon();
    window.dispatchEvent(new Event("buzzard-cart-updated"));
  }, [persist, clearCoupon]);

  const value = useMemo(
    () => ({
      items,
      count: cartCount(items),
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      discount: totals.discount,
      vatAmount: totals.vatAmount,
      total: totals.total,
      freeShippingRemaining: totals.freeShippingRemaining,
      couponCode,
      couponErrorKey,
      ready,
      add,
      remove,
      updateQty,
      applyCoupon,
      clearCoupon,
      clear,
    }),
    [items, totals, couponCode, couponErrorKey, ready, add, remove, updateQty, applyCoupon, clearCoupon, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

/** Backward-compatible helpers */
export function getCartItems(): CartLineItem[] {
  return readCart();
}

export function getCartTotal(items: CartLineItem[] = readCart()): number {
  return cartSubtotal(items);
}

export function getCartCount(items: CartLineItem[] = readCart()): number {
  return cartCount(items);
}
