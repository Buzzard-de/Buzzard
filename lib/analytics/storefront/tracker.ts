import type { AnalyticsEventInput } from "../types";
import { ANALYTICS_EVENTS_PATH, ANALYTICS_PURCHASE_PATH, MAX_PAYLOAD_BYTES } from "./constants";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function resolveEventsUrl(): string | null {
  const base = apiBase();
  if (!base) return null;
  return `${base}${ANALYTICS_EVENTS_PATH}`;
}

function resolvePurchaseUrl(): string | null {
  const base = apiBase();
  if (!base) return null;
  return `${base}${ANALYTICS_PURCHASE_PATH}`;
}

export interface TrackStorefrontEventOptions {
  signalPurchase?: boolean;
}

function safeStringify(input: unknown): string {
  try {
    return JSON.stringify(input);
  } catch {
    return "{}";
  }
}

export async function trackStorefrontEvent(
  input: AnalyticsEventInput,
  options?: TrackStorefrontEventOptions
): Promise<{ ok: boolean; skipped?: boolean }> {
  if (typeof window === "undefined") return { ok: true, skipped: true };

  const body = safeStringify({ ...input, signalPurchase: options?.signalPurchase });
  if (body.length > MAX_PAYLOAD_BYTES) return { ok: false };

  const url = resolveEventsUrl();
  if (!url) return { ok: true, skipped: true };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
      keepalive: true,
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export function trackStorefrontEventSafe(
  input: AnalyticsEventInput,
  options?: TrackStorefrontEventOptions
): void {
  void trackStorefrontEvent(input, options).catch(() => undefined);
}

export async function signalAuthoritativePurchase(orderId: string, correlationId?: string): Promise<void> {
  if (typeof window === "undefined" || !orderId) return;
  const url = resolvePurchaseUrl();
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ orderId, correlationId: correlationId ?? orderId }),
      keepalive: true,
    });
  } catch {
    /* analytics must not break checkout */
  }
}
