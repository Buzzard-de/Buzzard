import { SESSION_STORAGE_KEY, VISITOR_STORAGE_KEY } from "./constants";

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateAnonymousVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing) return existing;
    const id = randomId("bv_");
    localStorage.setItem(VISITOR_STORAGE_KEY, id);
    return id;
  } catch {
    return randomId("bv_");
  }
}

export function clearAnonymousVisitorId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(VISITOR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const id = randomId("ses_");
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return randomId("ses_");
  }
}

export function rotateSessionId(): string {
  if (typeof window === "undefined") return "";
  const id = randomId("ses_");
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}
