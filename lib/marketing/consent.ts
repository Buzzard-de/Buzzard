export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

const STORAGE_KEY = "buzzard_consent_v1";

export function defaultConsent(): ConsentState {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    updatedAt: new Date().toISOString(),
  };
}

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

export function saveConsent(state: Omit<ConsentState, "necessary" | "updatedAt">): ConsentState {
  const next: ConsentState = {
    necessary: true,
    analytics: Boolean(state.analytics),
    marketing: Boolean(state.marketing),
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("buzzard:consent", { detail: next }));
  }
  return next;
}

export function hasAnalyticsConsent(state: ConsentState | null): boolean {
  return Boolean(state?.analytics);
}

export function hasMarketingConsent(state: ConsentState | null): boolean {
  return Boolean(state?.marketing);
}
