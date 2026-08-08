const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GERMAN_ZIP_REGEX = /^\d{5}$/;
const SAFE_ID_REGEX = /^[a-z0-9-]+$/;
const SAFE_TEXT_REGEX = /^[\p{L}\p{N}\s.,\-/&()+'"]+$/u;

export const LIMITS = {
  name: 100,
  email: 254,
  street: 200,
  city: 100,
  zip: 10,
  message: 5000,
  searchQuery: 100,
  vin: 17,
} as const;

export function clampText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function sanitizeDisplayText(value: string, maxLength = 200): string {
  return clampText(value.replace(/[\u0000-\u001F\u007F]/g, ""), maxLength);
}

export function isValidEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.length <= LIMITS.email && EMAIL_REGEX.test(normalized);
}

export function isValidGermanZip(zip: string): boolean {
  return GERMAN_ZIP_REGEX.test(zip.trim());
}

export function isValidVin(vin: string): boolean {
  return VIN_REGEX.test(vin.trim().toUpperCase());
}

export function normalizeVin(vin: string): string | null {
  const cleaned = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
  return isValidVin(cleaned) ? cleaned : null;
}

export function isAllowedFilter(
  filter: string,
  allowed: readonly { id: string }[]
): boolean {
  return allowed.some((opt) => opt.id === filter);
}

export function sanitizeSearchQuery(query: string | null | undefined): string {
  if (!query) return "";
  return clampText(query.replace(/[^\p{L}\p{N}\s.\-_/]/gu, ""), LIMITS.searchQuery);
}

export function isSafeProductId(id: string): boolean {
  return SAFE_ID_REGEX.test(id) && id.length <= 64;
}

export function isSafeId(id: string, maxLength = 64): boolean {
  return SAFE_ID_REGEX.test(id) && id.length > 0 && id.length <= maxLength;
}

export function sanitizeCouponCode(code: string | null | undefined): string {
  if (!code) return "";
  return clampText(code.replace(/[^A-Z0-9_-]/gi, "").toUpperCase(), 32);
}

export function redactSecrets<T extends Record<string, unknown>>(input: T): T {
  const clone = { ...input };
  for (const key of Object.keys(clone)) {
    if (/password|secret|token|authorization|credential|api/i.test(key)) {
      clone[key as keyof T] = "[redacted]" as T[keyof T];
    }
  }
  return clone;
}

export function isSafeName(name: string): boolean {
  const trimmed = clampText(name, LIMITS.name);
  return trimmed.length >= 2 && SAFE_TEXT_REGEX.test(trimmed);
}

export function parseJsonSafely<T>(
  raw: string | null,
  validate: (value: unknown) => value is T
): T | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function canSubmitForm(
  storageKey: string,
  minIntervalMs = 60_000
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(storageKey) || "0");
    return Date.now() - last >= minIntervalMs;
  } catch {
    return true;
  }
}

export function markFormSubmitted(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey, String(Date.now()));
  } catch {
    /* ignore quota errors */
  }
}

export const SECURITY_HEADERS = {
  contentSecurityPolicy: [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self' https://formsubmit.co",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://formsubmit.co http://localhost:3001 http://localhost:3004 http://127.0.0.1:3001 http://127.0.0.1:3004",
    "upgrade-insecure-requests",
  ].join("; "),
  permissionsPolicy: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
} as const;
