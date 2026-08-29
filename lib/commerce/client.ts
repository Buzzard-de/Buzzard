import { getAccountToken } from "@/lib/account/client";
import type {
  CommerceCartResponse,
  CommerceCompleteResponse,
  CommerceCheckoutValidateResponse,
  CommerceOrder,
  CommerceOrderType,
  CommerceShippingMethod,
  CommerceStatus,
} from "@/lib/commerce/types";
import {
  generateIdempotencyKey,
  getCommerceSessionId,
  getStoredCommerceCartId,
  setStoredCommerceCartId,
} from "@/lib/commerce/runtime";
import type { CommerceAddress } from "@/lib/commerce/types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? getAccountToken() : null;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export class CommerceClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = "CommerceClientError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { idempotencyKey?: string }
): Promise<T> {
  const base = apiBase();
  if (!base) throw new CommerceClientError("commerce.apiUnavailable", "commerce.apiUnavailable", 503);

  const headers: HeadersInit = {
    ...authHeaders(),
    ...(init?.headers || {}),
  };
  if (init?.idempotencyKey) {
    (headers as Record<string, string>)["Idempotency-Key"] = init.idempotencyKey;
  }

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...init, headers });
  } catch {
    throw new CommerceClientError("commerce.networkError", "commerce.networkError", 0);
  }

  const data = (await res.json().catch(() => ({}))) as T & {
    success?: boolean;
    errorKey?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new CommerceClientError(
      data.message || data.errorKey || "commerce.requestFailed",
      data.errorKey || "commerce.requestFailed",
      res.status
    );
  }

  return data;
}

export async function fetchCommerceStatus(): Promise<CommerceStatus> {
  return request<CommerceStatus>("/api/commerce/status");
}

export async function createCart(options: {
  customerId?: string;
  country?: string;
  currency?: string;
} = {}): Promise<CommerceCartResponse> {
  const data = await request<CommerceCartResponse>("/api/commerce/cart", {
    method: "POST",
    body: JSON.stringify({
      customerId: options.customerId,
      sessionId: getCommerceSessionId(),
      country: options.country || "DE",
      currency: options.currency || "EUR",
    }),
  });
  if (data.cart?.id) setStoredCommerceCartId(data.cart.id);
  return data;
}

export async function getCart(cartId?: string, customerId?: string): Promise<CommerceCartResponse> {
  const id = cartId || getStoredCommerceCartId();
  if (!id) {
    return createCart({ customerId });
  }
  try {
    const qs = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
    return await request<CommerceCartResponse>(`/api/commerce/cart/${encodeURIComponent(id)}${qs}`);
  } catch (err) {
    if (err instanceof CommerceClientError && (err.status === 404 || err.code === "cart_not_found")) {
      setStoredCommerceCartId(null);
      return createCart({ customerId });
    }
    throw err;
  }
}

export async function addToCart(
  input: {
    productId: string;
    variantId?: string;
    quantity: number;
    clientPrice?: number;
    metadata?: Record<string, unknown>;
    customerId?: string;
  },
  cartId?: string
): Promise<CommerceCartResponse> {
  const id = cartId || getStoredCommerceCartId() || (await createCart({ customerId: input.customerId })).cart.id;
  return request<CommerceCartResponse>(`/api/commerce/cart/${encodeURIComponent(id)}/items`, {
    method: "POST",
    body: JSON.stringify({
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity,
      clientPrice: input.clientPrice,
      metadata: input.metadata,
      customerId: input.customerId,
    }),
  });
}

export async function updateCartItem(
  cartId: string,
  itemId: string,
  quantity: number,
  customerId?: string
): Promise<CommerceCartResponse> {
  return request<CommerceCartResponse>(
    `/api/commerce/cart/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ quantity, customerId }),
    }
  );
}

export async function removeCartItem(
  cartId: string,
  itemId: string,
  customerId?: string
): Promise<CommerceCartResponse> {
  return request<CommerceCartResponse>(
    `/api/commerce/cart/${encodeURIComponent(cartId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      body: JSON.stringify({ customerId }),
    }
  );
}

export async function clearCart(cartId: string, customerId?: string): Promise<CommerceCartResponse> {
  const data = await request<CommerceCartResponse>(`/api/commerce/cart/${encodeURIComponent(cartId)}/clear`, {
    method: "POST",
    body: JSON.stringify({ customerId }),
  });
  return data;
}

export async function validateCart(cartId: string, customerId?: string): Promise<{
  success: boolean;
  ok: boolean;
  issues?: unknown[];
  dryRun?: boolean;
  discount?: number;
  couponCode?: string | null;
}> {
  return request(`/api/commerce/cart/${encodeURIComponent(cartId)}/validate`, {
    method: "POST",
    body: JSON.stringify({ customerId }),
  });
}

export async function validateCommerceCoupon(input: {
  cartId?: string;
  couponCode: string;
  subtotal?: number;
  customerId?: string;
  clientDiscount?: number;
}): Promise<{
  success: boolean;
  ok: boolean;
  discount?: number;
  couponCode?: string;
  errorKey?: string;
}> {
  return request("/api/commerce/coupons/validate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function applyCartCoupon(
  cartId: string,
  couponCode: string,
  customerId?: string
): Promise<CommerceCartResponse> {
  return request<CommerceCartResponse>(`/api/commerce/cart/${encodeURIComponent(cartId)}/coupon`, {
    method: "POST",
    body: JSON.stringify({ couponCode, customerId }),
  });
}

export async function removeCartCoupon(cartId: string, customerId?: string): Promise<CommerceCartResponse> {
  return request<CommerceCartResponse>(`/api/commerce/cart/${encodeURIComponent(cartId)}/coupon`, {
    method: "DELETE",
    body: JSON.stringify({ customerId }),
  });
}

export async function listShippingMethods(): Promise<{ methods: CommerceShippingMethod[] }> {
  return request("/api/commerce/shipping/methods");
}

export async function startCheckout(input: {
  cartId: string;
  customerId?: string;
  orderType?: CommerceOrderType;
}): Promise<{ success: boolean; checkout: { id: string; orderType?: string } }> {
  return request("/api/commerce/checkout/start", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function validateCheckout(
  checkoutId: string,
  body: {
    billingAddress: CommerceAddress;
    shippingAddress: CommerceAddress;
    shippingMethod?: string;
    customerId?: string;
  }
): Promise<CommerceCheckoutValidateResponse> {
  return request<CommerceCheckoutValidateResponse>(
    `/api/commerce/checkout/${encodeURIComponent(checkoutId)}/validate`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function getCheckout(
  checkoutId: string,
  customerId?: string
): Promise<{ success: boolean; checkout: Record<string, unknown> }> {
  const qs = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
  return request(`/api/commerce/checkout/${encodeURIComponent(checkoutId)}${qs}`);
}

export async function submitCheckout(
  checkoutId: string,
  options: {
    customerId?: string;
    idempotencyKey?: string;
    orderType?: CommerceOrderType;
  } = {}
): Promise<CommerceCompleteResponse> {
  const key = options.idempotencyKey || generateIdempotencyKey("submit");
  return request<CommerceCompleteResponse>(
    `/api/commerce/checkout/${encodeURIComponent(checkoutId)}/complete`,
    {
      method: "POST",
      body: JSON.stringify({ customerId: options.customerId, orderType: options.orderType }),
      idempotencyKey: key,
    }
  );
}

export async function createReadinessTestOrder(input: {
  cartId: string;
  billingAddress: CommerceAddress;
  shippingAddress: CommerceAddress;
  shippingMethod?: string;
  customerId?: string;
  idempotencyKey?: string;
}): Promise<CommerceCompleteResponse> {
  const { checkout } = await startCheckout({
    cartId: input.cartId,
    customerId: input.customerId,
    orderType: "READINESS_TEST",
  });
  await validateCheckout(checkout.id, {
    billingAddress: input.billingAddress,
    shippingAddress: input.shippingAddress,
    shippingMethod: input.shippingMethod || "standard",
    customerId: input.customerId,
  });
  return submitCheckout(checkout.id, {
    customerId: input.customerId,
    idempotencyKey: input.idempotencyKey,
    orderType: "READINESS_TEST",
  });
}

export async function fetchCommerceOrder(
  orderId: string,
  customerId?: string
): Promise<{ success: boolean; order: CommerceOrder }> {
  const qs = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
  return request(`/api/commerce/orders/${encodeURIComponent(orderId)}${qs}`);
}
