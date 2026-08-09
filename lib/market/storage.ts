const STORAGE_KEY = "buzzard_market_country";
const MANUAL_KEY = "buzzard_market_country_manual";

export function readStoredCountryCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function persistCountryCode(code: string, manual = false): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, code);
  if (manual) localStorage.setItem(MANUAL_KEY, "1");
}

export function hasManualCountryOverride(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MANUAL_KEY) === "1";
}
