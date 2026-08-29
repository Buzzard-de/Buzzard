const CART_ID_KEY = "buzzard_commerce_cart_id";
const SESSION_KEY = "buzzard_commerce_session";

/** Commerce Core storefront bridge (Part 9) — dry-run checkout while SALES=0 */
export function shouldUseCommerceCore(): boolean {
  if (process.env.NEXT_PUBLIC_COMMERCE_CORE === "0") return false;
  if (process.env.NEXT_PUBLIC_COMMERCE_CORE === "1") return true;
  return Boolean(process.env.NEXT_PUBLIC_BUZZARD_API_URL);
}

export function getCommerceSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `sess_${Date.now()}`;
  }
}

export function getStoredCommerceCartId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CART_ID_KEY);
  } catch {
    return null;
  }
}

export function setStoredCommerceCartId(cartId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (cartId) localStorage.setItem(CART_ID_KEY, cartId);
    else localStorage.removeItem(CART_ID_KEY);
  } catch {
    /* ignore */
  }
}

export function generateIdempotencyKey(prefix = "checkout"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}
