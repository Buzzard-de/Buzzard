/**
 * Part 9 — Bridge CartProvider to Commerce Core API
 */
import type { CartLineItem } from "@/lib/cart/types";
import { mapCommerceItemToCartLine, pickPrimaryVariantId } from "@/lib/commerce/map";
import * as commerceClient from "@/lib/commerce/client";
import {
  getStoredCommerceCartId,
  setStoredCommerceCartId,
  shouldUseCommerceCore,
} from "@/lib/commerce/runtime";

export function isCommerceCartMode(): boolean {
  return shouldUseCommerceCore();
}

export async function hydrateCommerceCart(customerId?: string): Promise<{
  items: CartLineItem[];
  cartId: string | null;
  subtotal: number;
  shipping: number;
  discount: number;
  vatAmount: number;
  total: number;
  couponCode: string | null;
}> {
  const res = await commerceClient.getCart(undefined, customerId);
  const items = (res.items || []).map(mapCommerceItemToCartLine);
  const subtotal = res.subtotal ?? 0;
  const discount = res.discount ?? 0;
  return {
    items,
    cartId: res.cart?.id || null,
    subtotal,
    shipping: 0,
    discount,
    vatAmount: 0,
    total: Math.max(0, subtotal - discount),
    couponCode: res.cart?.couponCode || res.couponCode || null,
  };
}

export async function commerceAddItem(
  input: { productId: string; variantIds?: string[]; qty?: number },
  customerId?: string
): Promise<{ ok: boolean; items: CartLineItem[]; cartId: string | null; subtotal: number; errorKey?: string }> {
  try {
    const cartId = getStoredCommerceCartId();
    const res = await commerceClient.addToCart(
      {
        productId: input.productId,
        variantId: pickPrimaryVariantId(input.variantIds),
        quantity: input.qty ?? 1,
        customerId,
      },
      cartId || undefined
    );
    if (res.cart?.id) setStoredCommerceCartId(res.cart.id);
    return {
      ok: true,
      items: (res.items || []).map(mapCommerceItemToCartLine),
      cartId: res.cart?.id || null,
      subtotal: res.subtotal ?? 0,
    };
  } catch (err) {
    const code = err instanceof commerceClient.CommerceClientError ? err.code : "commerce.addFailed";
    return { ok: false, items: [], cartId: getStoredCommerceCartId(), subtotal: 0, errorKey: code };
  }
}

export async function commerceUpdateQty(
  lineId: string,
  qty: number,
  customerId?: string
): Promise<{ ok: boolean; items: CartLineItem[]; subtotal: number; errorKey?: string }> {
  const cartId = getStoredCommerceCartId();
  if (!cartId) return { ok: false, items: [], subtotal: 0, errorKey: "cart_not_found" };
  try {
    const res = await commerceClient.updateCartItem(cartId, lineId, qty, customerId);
    return {
      ok: true,
      items: (res.items || []).map(mapCommerceItemToCartLine),
      subtotal: res.subtotal ?? 0,
    };
  } catch (err) {
    const code = err instanceof commerceClient.CommerceClientError ? err.code : "commerce.updateFailed";
    return { ok: false, items: [], subtotal: 0, errorKey: code };
  }
}

export async function commerceRemoveItem(
  lineId: string,
  customerId?: string
): Promise<{ ok: boolean; items: CartLineItem[]; subtotal: number }> {
  const cartId = getStoredCommerceCartId();
  if (!cartId) return { ok: true, items: [], subtotal: 0 };
  try {
    const res = await commerceClient.removeCartItem(cartId, lineId, customerId);
    return {
      ok: true,
      items: (res.items || []).map(mapCommerceItemToCartLine),
      subtotal: res.subtotal ?? 0,
    };
  } catch {
    return { ok: false, items: [], subtotal: 0 };
  }
}

export async function commerceClearCart(customerId?: string): Promise<void> {
  const cartId = getStoredCommerceCartId();
  if (!cartId) {
    setStoredCommerceCartId(null);
    return;
  }
  try {
    await commerceClient.clearCart(cartId, customerId);
  } catch {
    setStoredCommerceCartId(null);
  }
}

export async function commerceValidateCart(customerId?: string): Promise<{ ok: boolean; issues?: unknown[] }> {
  const cartId = getStoredCommerceCartId();
  if (!cartId) return { ok: false };
  try {
    const res = await commerceClient.validateCart(cartId, customerId);
    return { ok: res.ok, issues: res.issues };
  } catch {
    return { ok: false };
  }
}

export function resetCommerceCartLocal(): void {
  setStoredCommerceCartId(null);
}

export async function commerceApplyCoupon(
  code: string,
  customerId?: string
): Promise<{ ok: boolean; discount: number; couponCode: string | null; errorKey?: string }> {
  const cartId = getStoredCommerceCartId();
  if (!cartId) return { ok: false, discount: 0, couponCode: null, errorKey: "cart_not_found" };
  try {
    const res = await commerceClient.applyCartCoupon(cartId, code, customerId);
    return {
      ok: true,
      discount: res.discount ?? 0,
      couponCode: res.cart?.couponCode || res.couponCode || code.toUpperCase(),
    };
  } catch (err) {
    const errorKey = err instanceof commerceClient.CommerceClientError ? err.code : "checkout.couponInvalid";
    return { ok: false, discount: 0, couponCode: null, errorKey };
  }
}

export async function commerceClearCoupon(
  customerId?: string
): Promise<void> {
  const cartId = getStoredCommerceCartId();
  if (!cartId) return;
  try {
    await commerceClient.removeCartCoupon(cartId, customerId);
  } catch {
    /* ignore */
  }
}
