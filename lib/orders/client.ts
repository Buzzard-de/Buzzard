import type {
  CreateOrderRequest,
  CreateOrderResponse,
  PublicOrder,
  QuoteRequest,
  QuoteResponse,
} from "./types";
import { isSqliteStoreEnabled } from "@/lib/store/config";
import { mapStoreOrderToPublic, storeCreateOrder, storeGetOrderByNumber } from "@/lib/store";

const SESSION_ORDER_KEY = "buzzard_confirmed_order";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

export async function fetchOrderQuote(request: QuoteRequest): Promise<QuoteResponse> {
  const base = apiBase();
  if (!base) {
    return { success: false, errorKey: "checkout.apiUnavailable" };
  }

  try {
    const res = await fetch(`${base}/api/checkout/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(request),
    });
    return (await res.json()) as QuoteResponse;
  } catch {
    return { success: false, errorKey: "checkout.apiUnavailable" };
  }
}

export async function submitOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
  const base = apiBase();
  if (!base) {
    return { success: false, errorKey: "checkout.apiUnavailable" };
  }

  const accountToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_account_token") : null;

  if (isSqliteStoreEnabled() && accountToken) {
    try {
      const result = await storeCreateOrder({
        countryCode: request.shippingAddress?.country || "DE",
        currency: "EUR",
        shippingAddress: request.shippingAddress as unknown as Record<string, unknown>,
      });
      return {
        success: true,
        order: mapStoreOrderToPublic(
          {
            id: result.orderId,
            order_number: result.orderNumber,
            country_code: request.shippingAddress?.country || "DE",
            currency: "EUR",
            subtotal: result.subtotal,
            shipping: result.shipping,
            tax: result.tax,
            total: result.total,
            status: result.status,
            created_at: new Date().toISOString(),
          },
          request.customer.email
        ),
      };
    } catch (err) {
      return {
        success: false,
        errorKey: err instanceof Error ? err.message : "checkout.apiUnavailable",
      };
    }
  }

  try {
    const res = await fetch(`${base}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(accountToken ? { Authorization: `Bearer ${accountToken}` } : {}),
      },
      body: JSON.stringify(request),
    });
    return (await res.json()) as CreateOrderResponse;
  } catch {
    return { success: false, errorKey: "checkout.apiUnavailable" };
  }
}

export async function fetchOrder(orderNumber: string): Promise<PublicOrder | null> {
  const base = apiBase();
  if (!base) return null;

  const accountToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_account_token") : null;

  if (isSqliteStoreEnabled() && accountToken) {
    try {
      const order = await storeGetOrderByNumber(orderNumber);
      const meEmail =
        typeof window !== "undefined"
          ? JSON.parse(sessionStorage.getItem("buzzard_account_user") || "{}")?.email || ""
          : "";
      return mapStoreOrderToPublic(order, meEmail);
    } catch {
      return null;
    }
  }

  try {
    const res = await fetch(`${base}/api/orders/${encodeURIComponent(orderNumber)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { order?: PublicOrder };
    return data.order ?? null;
  } catch {
    return null;
  }
}

export function saveConfirmedOrder(order: PublicOrder): void {
  try {
    sessionStorage.setItem(SESSION_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

export function loadConfirmedOrder(): PublicOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_ORDER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PublicOrder;
  } catch {
    return null;
  }
}

export function clearConfirmedOrder(): void {
  try {
    sessionStorage.removeItem(SESSION_ORDER_KEY);
  } catch {
    /* ignore */
  }
}

export { SESSION_ORDER_KEY };
