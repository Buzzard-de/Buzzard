import { withAdminCredentials } from "@/lib/admin/authTransport";
import type { ReturnRecoveryListResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_BUZZARD_API_URL || "http://localhost:3001";

export async function fetchReturnRecoveryList(filter = ""): Promise<ReturnRecoveryListResponse> {
  const url = filter
    ? `${API_BASE}/api/admin/returns?filter=${encodeURIComponent(filter)}`
    : `${API_BASE}/api/admin/returns`;
  const res = await fetch(url, withAdminCredentials({ cache: "no-store" }));
  if (!res.ok) throw new Error(`returns.listFailed:${res.status}`);
  return res.json();
}

export async function fetchReturnRecoveryCase(id: string) {
  const res = await fetch(
    `${API_BASE}/api/admin/returns/${id}`,
    withAdminCredentials({ cache: "no-store" })
  );
  if (!res.ok) throw new Error(`returns.getFailed:${res.status}`);
  return res.json();
}
