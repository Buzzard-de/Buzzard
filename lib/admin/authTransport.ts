const SESSION_FLAG = "buzzard_admin_session";
const CSRF_KEY = "buzzard_admin_csrf";

export function markAdminSession(csrfToken?: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_FLAG, "1");
  if (csrfToken) sessionStorage.setItem(CSRF_KEY, csrfToken);
}

export function clearAdminSessionFlag(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_FLAG);
  sessionStorage.removeItem(CSRF_KEY);
  sessionStorage.removeItem("buzzard_admin_token");
}

export function hasAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_FLAG) === "1";
}

export function getAdminCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CSRF_KEY);
}

export function adminAuthHeaders(): HeadersInit {
  const csrf = getAdminCsrfToken();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(csrf ? { "X-Buzzard-CSRF-Token": csrf } : {}),
  };
}

export function withAdminCredentials(init?: RequestInit): RequestInit {
  return {
    credentials: "include",
    ...init,
    headers: { ...adminAuthHeaders(), ...(init?.headers || {}) },
  };
}

export function adminOrAccountHeaders(): HeadersInit {
  if (hasAdminSession()) return adminAuthHeaders();
  const account = typeof window !== "undefined" ? sessionStorage.getItem("buzzard_account_token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(account ? { Authorization: `Bearer ${account}` } : {}),
  };
}

export function withAdminOrAccountCredentials(init?: RequestInit): RequestInit {
  if (hasAdminSession()) return withAdminCredentials(init);
  return {
    ...init,
    headers: { ...adminOrAccountHeaders(), ...(init?.headers || {}) },
  };
}
