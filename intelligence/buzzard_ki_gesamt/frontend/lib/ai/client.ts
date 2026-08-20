import type { AiChatResponse, AiRecommendation, AutomationEvent, AutomationStats } from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

export async function sendAiChatMessage(input: {
  message: string;
  sessionId?: string;
  locale?: string;
  customerEmail?: string;
  productContext?: { id?: string; name?: string };
}): Promise<AiChatResponse> {
  const base = apiBase();
  if (!base) throw new Error("ai.apiUnavailable");
  const res = await fetch(`${base}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as AiChatResponse;
  if (!res.ok) throw new Error(data.errorKey || "ai.chat.error");
  return data;
}

export async function fetchAiRecommendations(params: {
  productId?: string;
  q?: string;
  categoryId?: string;
  limit?: number;
}): Promise<AiRecommendation[]> {
  const base = apiBase();
  if (!base) return [];
  const qs = new URLSearchParams();
  if (params.productId) qs.set("productId", params.productId);
  if (params.q) qs.set("q", params.q);
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${base}/api/ai/recommendations?${qs.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { success: boolean; items: AiRecommendation[] };
  return data.items || [];
}

export async function trackAbandonedCart(input: {
  email: string;
  lines: Array<{ productId: string; qty: number; name?: string }>;
  locale?: string;
  marketingConsent?: boolean;
}): Promise<void> {
  const base = apiBase();
  if (!base) return;
  await fetch(`${base}/api/cart/abandoned`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => undefined);
}

export async function fetchAutomationEvents(token: string, limit = 50): Promise<{
  events: AutomationEvent[];
  stats: AutomationStats;
}> {
  const base = apiBase();
  if (!base) throw new Error("admin.apiUnavailable");
  const res = await fetch(`${base}/api/admin/automation/events?limit=${limit}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await res.json()) as {
    success: boolean;
    events: AutomationEvent[];
    stats: AutomationStats;
    errorKey?: string;
  };
  if (!res.ok) throw new Error(data.errorKey || "admin.requestFailed");
  return { events: data.events, stats: data.stats };
}
