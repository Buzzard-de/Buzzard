import { getAdminToken } from "@/lib/admin/client";
import type { ReturnRecoveryListResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_BUZZARD_API_URL || "http://localhost:3001";

function authHeaders(idempotencyKey?: string): HeadersInit {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return headers;
}

export async function fetchReturnRecoveryList(filter = ""): Promise<ReturnRecoveryListResponse> {
  const url = filter
    ? `${API_BASE}/api/admin/returns?filter=${encodeURIComponent(filter)}`
    : `${API_BASE}/api/admin/returns`;
  const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`returns.listFailed:${res.status}`);
  return res.json();
}

export async function fetchReturnRecoveryCase(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/returns/${id}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`returns.getFailed:${res.status}`);
  return res.json();
}
