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

const ACCOUNT_FLAG = "buzzard_account_session";
const ACCOUNT_CSRF_KEY = "buzzard_account_csrf";

export function markAccountSession(csrfToken?: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACCOUNT_FLAG, "1");
  if (csrfToken) sessionStorage.setItem(ACCOUNT_CSRF_KEY, csrfToken);
}

export function clearAccountSessionFlag(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCOUNT_FLAG);
  sessionStorage.removeItem(ACCOUNT_CSRF_KEY);
  sessionStorage.removeItem("buzzard_account_token");
}

export function hasAccountSession(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ACCOUNT_FLAG) === "1";
}

export function getAccountCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCOUNT_CSRF_KEY);
}

export function accountAuthHeaders(): HeadersInit {
  const csrf = getAccountCsrfToken() || getAdminCsrfToken();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(csrf ? { "X-Buzzard-CSRF-Token": csrf } : {}),
  };
}

export function withAccountCredentials(init?: RequestInit): RequestInit {
  return {
    credentials: "include",
    ...init,
    headers: { ...accountAuthHeaders(), ...(init?.headers || {}) },
  };
}

export function adminOrAccountHeaders(): HeadersInit {
  if (hasAdminSession()) return adminAuthHeaders();
  if (hasAccountSession()) return accountAuthHeaders();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function withAdminOrAccountCredentials(init?: RequestInit): RequestInit {
  if (hasAdminSession()) return withAdminCredentials(init);
  if (hasAccountSession()) return withAccountCredentials(init);
  return {
    credentials: "include",
    ...init,
    headers: { ...adminOrAccountHeaders(), ...(init?.headers || {}) },
  };
}
