"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
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
import { useAccount } from "@/lib/account/context";
import {
  clearServerCart,
  scheduleServerCartSync,
  shouldSyncCartWithApi,
  syncAccountCart,
} from "@/lib/store/cartSync";
import {
  commerceAddItem,
  commerceClearCart,
  commerceRemoveItem,
  commerceUpdateQty,
  hydrateCommerceCart,
  isCommerceCartMode,
} from "@/lib/commerce/cartBridge";
import { getStoredCommerceCartId } from "@/lib/commerce/runtime";

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
  syncing: boolean;
  commerceMode: boolean;
  commerceCartId: string | null;
  lastErrorKey: string | null;
  add: (input: AddToCartInput) => boolean | Promise<boolean>;
  remove: (lineId: string) => void | Promise<void>;
  updateQty: (lineId: string, qty: number) => void | Promise<void>;
  applyCoupon: (code: string) => boolean;
  clearCoupon: () => void;
  clear: () => void | Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { countryCode } = useMarket();
  const { user: accountUser } = useAccount();
  const commerceMode = isCommerceCartMode();
  const customerId = accountUser?.id;

  const [items, setItems] = useState<CartLineItem[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponErrorKey, setCouponErrorKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastErrorKey, setLastErrorKey] = useState<string | null>(null);
  const [serverSubtotal, setServerSubtotal] = useState<number | null>(null);
  const addingRef = useRef(false);

  const persistLocal = useCallback((next: CartLineItem[]) => {
    writeCart(next);
    setItems(next);
    if (!commerceMode) scheduleServerCartSync(next);
  }, [commerceMode]);

  const refreshCommerce = useCallback(async () => {
    if (!commerceMode) return;
    setSyncing(true);
    setLastErrorKey(null);
    try {
      const data = await hydrateCommerceCart(customerId);
      setItems(data.items);
      setServerSubtotal(data.subtotal);
    } catch {
      setLastErrorKey("commerce.syncFailed");
    } finally {
      setSyncing(false);
    }
  }, [commerceMode, customerId]);

  useLayoutEffect(() => {
    if (commerceMode) {
      setCouponCode(readCoupon());
      setReady(true);
      return;
    }
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
  }, [commerceMode]);

  useEffect(() => {
    if (!ready || !commerceMode) return;
    refreshCommerce();
  }, [ready, commerceMode, customerId, refreshCommerce]);

  useEffect(() => {
    if (!ready || commerceMode || !shouldSyncCartWithApi()) return;
    syncAccountCart()
      .then((merged) => setItems(merged))
      .catch(() => {});
  }, [ready, commerceMode]);

  const totals = useMemo(() => {
    const subtotal = commerceMode && serverSubtotal !== null ? serverSubtotal : cartSubtotal(items);
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
  }, [items, couponCode, countryCode, commerceMode, serverSubtotal]);

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
    async (input: AddToCartInput) => {
      if (addingRef.current) return false;
      const variantIds = input.variantIds ?? [];
      const qty = Math.max(1, Math.min(99, input.qty ?? 1));

      if (commerceMode) {
        addingRef.current = true;
        setSyncing(true);
        setLastErrorKey(null);
        const result = await commerceAddItem({ ...input, qty }, customerId);
        addingRef.current = false;
        setSyncing(false);
        if (!result.ok) {
          setLastErrorKey(result.errorKey || "commerce.addFailed");
          return false;
        }
        setItems(result.items);
        setServerSubtotal(result.subtotal);
        dispatchCartUpdated();
        trackMarketingEvent("add_to_cart", { product_id: input.productId, quantity: qty });
        return true;
      }

      const priced = resolveLinePricing(input.productId, variantIds, qty);
      if (!priced) return false;

      addingRef.current = true;
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

      persistLocal(next);
      dispatchCartUpdated();
      trackMarketingEvent("add_to_cart", {
        product_id: input.productId,
        quantity: nextItem.qty,
        value: nextItem.unitPrice * nextItem.qty,
      });
      addingRef.current = false;
      return true;
    },
    [commerceMode, customerId, persistLocal]
  );

  const remove = useCallback(
    async (lineId: string) => {
      if (commerceMode) {
        setSyncing(true);
        const result = await commerceRemoveItem(lineId, customerId);
        setItems(result.items);
        setServerSubtotal(result.subtotal);
        setSyncing(false);
        dispatchCartUpdated();
        return;
      }

      const current = readCart();
      const target = current.find((i) => i.lineId === lineId);
      persistLocal(current.filter((i) => i.lineId !== lineId));
      dispatchCartUpdated();
      if (target) {
        trackMarketingEvent("remove_from_cart", {
          product_id: target.productId,
          quantity: target.qty,
        });
      }
    },
    [commerceMode, customerId, persistLocal]
  );

  const updateQty = useCallback(
    async (lineId: string, qty: number) => {
      if (!Number.isFinite(qty) || qty < 1) {
        await remove(lineId);
        return;
      }
      const safeQty = Math.min(99, Math.max(1, Math.floor(qty)));

      if (commerceMode) {
        setSyncing(true);
        const result = await commerceUpdateQty(lineId, safeQty, customerId);
        if (!result.ok) {
          setLastErrorKey(result.errorKey || "commerce.updateFailed");
          setSyncing(false);
          return;
        }
        setItems(result.items);
        setServerSubtotal(result.subtotal);
        setSyncing(false);
        dispatchCartUpdated();
        return;
      }

      const current = readCart();
      const target = current.find((i) => i.lineId === lineId);
      if (!target) return;
      const priced = resolveLinePricing(target.productId, target.variantIds, safeQty);
      if (!priced) return;
      persistLocal(
        current.map((i) =>
          i.lineId === lineId ? { ...i, qty: safeQty, unitPrice: priced.unitPrice } : i
        )
      );
      dispatchCartUpdated();
    },
    [commerceMode, customerId, persistLocal, remove]
  );

  const applyCoupon = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    const result = validateCoupon(normalized, cartSubtotal(commerceMode ? items : readCart()));
    if (!result.valid) {
      setCouponErrorKey(result.errorKey ?? "checkout.couponInvalid");
      return false;
    }
    writeCoupon(result.normalizedCode || normalized);
    setCouponCode(result.normalizedCode || normalized);
    setCouponErrorKey(null);
    dispatchCartUpdated();
    return true;
  }, [commerceMode, items]);

  const clearCoupon = useCallback(() => {
    writeCoupon("");
    setCouponCode("");
    setCouponErrorKey(null);
    dispatchCartUpdated();
  }, []);

  const clear = useCallback(async () => {
    if (commerceMode) {
      await commerceClearCart(customerId);
      setItems([]);
      setServerSubtotal(0);
    } else {
      persistLocal([]);
      clearServerCart().catch(() => {});
    }
    clearCoupon();
    if (shouldUseCrmLoyaltyApi() && getAccountToken()) {
      markCartRecovered().catch(() => {});
    }
    dispatchCartUpdated();
  }, [commerceMode, customerId, persistLocal, clearCoupon]);

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
      syncing,
      commerceMode,
      commerceCartId: getStoredCommerceCartId(),
      lastErrorKey,
      add,
      remove,
      updateQty,
      applyCoupon,
      clearCoupon,
      clear,
      refresh: refreshCommerce,
    }),
    [
      items,
      totals,
      couponCode,
      couponErrorKey,
      ready,
      syncing,
      commerceMode,
      lastErrorKey,
      add,
      remove,
      updateQty,
      applyCoupon,
      clearCoupon,
      clear,
      refreshCommerce,
    ]
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
