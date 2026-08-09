"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  calculateOrderQuote,
  cartLinesToInput,
} from "@/lib/checkout";
import { calculateShippingCostForLines, freeShippingRemaining } from "@/lib/checkout/shipping";
import { validateCoupon } from "@/lib/checkout/coupons";
import {
  cartCount,
  cartSubtotal,
  createCartLineId,
  type CartLineItem,
} from "@/lib/cart/types";
import {
  COUPON_STORAGE_KEY,
  dispatchCartUpdated,
  readLocalCart,
  writeLocalCart,
} from "@/lib/cart/storage";
import { resolveLinePricing } from "@/lib/checkout/totals";
import { trackMarketingEvent } from "@/lib/marketing/events";
import { useMarket } from "@/lib/market/context";
import { markCartRecovered, trackAbandonedCart } from "@/lib/crmLoyalty/client";
import { shouldUseCrmLoyaltyApi } from "@/lib/crmLoyalty/runtime";
import { getAccountToken } from "@/lib/account/client";
import {
  clearServerCart,
  scheduleServerCartSync,
  shouldSyncCartWithApi,
  syncAccountCart,
} from "@/lib/store/cartSync";

function readCart(): CartLineItem[] {
  return readLocalCart();
}

function writeCart(items: CartLineItem[]): void {
  writeLocalCart(items);
}

export interface AddToCartInput {
  productId: string;
  variantIds?: string[];
  qty?: number;
}

function readCoupon(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(COUPON_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeCoupon(code: string): void {
  localStorage.setItem(COUPON_STORAGE_KEY, code);
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
    scheduleServerCartSync(next);
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

  useEffect(() => {
    if (!ready || !shouldSyncCartWithApi()) return;
    syncAccountCart()
      .then((merged) => setItems(merged))
      .catch(() => {});
  }, [ready]);

  const totals = useMemo(() => {
    const subtotal = cartSubtotal(items);
    const coupon = validateCoupon(couponCode, subtotal);
    const discount = coupon.valid ? coupon.discount : 0;
    const discounted = Math.max(0, subtotal - discount);
    const lineInputs = items.map((item) => ({
      productId: item.productId,
      variantIds: item.variantIds,
      qty: item.qty,
    }));
    const shipping = calculateShippingCostForLines(discounted, "standard", countryCode, lineInputs);
    const quote = calculateOrderQuote(
      cartLinesToInput(lineInputs),
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

  useEffect(() => {
    if (!ready || !shouldUseCrmLoyaltyApi() || !getAccountToken()) return;
    if (items.length === 0) return;

    const timer = window.setTimeout(() => {
      trackAbandonedCart({
        subtotal: cartSubtotal(items),
        currency: "EUR",
        itemCount: cartCount(items),
      }).catch(() => {});
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [ready, items]);

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
      dispatchCartUpdated();
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
      dispatchCartUpdated();
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
      dispatchCartUpdated();
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
      dispatchCartUpdated();
      return true;
    },
    []
  );

  const clearCoupon = useCallback(() => {
    writeCoupon("");
    setCouponCode("");
    setCouponErrorKey(null);
    dispatchCartUpdated();
  }, []);

  const clear = useCallback(() => {
    persist([]);
    clearCoupon();
    clearServerCart().catch(() => {});
    if (shouldUseCrmLoyaltyApi() && getAccountToken()) {
      markCartRecovered().catch(() => {});
    }
    dispatchCartUpdated();
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
