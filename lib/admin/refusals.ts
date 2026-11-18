/**
 * Tells the open admin page when the API answered one of its requests with
 * "not signed in" (401) or, for a change, "not allowed" (403).
 *
 * The admin pages use many small API clients; most of them report a refused
 * change only as a generic failure, some not at all. Watching the answers in
 * one place lets the shell say what happened on every page.
 */

export const ADMIN_REFUSAL_EVENT = "buzzard:admin-refusal";

export interface AdminRefusal {
  status: 401 | 403;
  method: string;
  path: string;
}

const ADMIN_TOKEN_KEY = "buzzard_admin_token";

function pathOf(url: string): string {
  try {
    return new URL(url, window.location.href).pathname;
  } catch {
    return url;
  }
}

/** Called for every answer the browser gets from the API. Never throws. */
export function reportAdminRefusal(url: string, init: RequestInit | undefined, status: number): void {
  if (typeof window === "undefined" || (status !== 401 && status !== 403)) return;
  try {
    const token = window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return;
    // Only requests made with the administrator session: storefront requests of the same page are not admin actions.
    if (new Headers(init?.headers).get("Authorization") !== `Bearer ${token}`) return;
    const method = (init?.method || "GET").toUpperCase();
    // A refused read leaves its section empty; only a refused change is announced.
    if (status === 403 && (method === "GET" || method === "HEAD")) return;
    const detail: AdminRefusal = { status, method, path: pathOf(url) };
    window.dispatchEvent(new CustomEvent<AdminRefusal>(ADMIN_REFUSAL_EVENT, { detail }));
  } catch {
    // Reporting must never break the request it reports on.
  }
}
