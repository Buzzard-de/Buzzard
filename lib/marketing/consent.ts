import {
  createTrackingWithdrawal,
  decideMetaPixel,
  verifyTrackingWithdrawal,
  type TrackingWithdrawal,
} from "@/lib/marketing/trackingConsent";

export type { TrackingWithdrawal };
export type TrackingStatus = "UNKNOWN" | "WITHDRAWN" | "CLOSED" | "BLOCKED";

export type ConsentCategory = "necessary" | "analytics" | "marketing_tracking";

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: false;
  legacyMarketing: boolean;
  marketing_tracking: TrackingStatus;
  trackingWithdrawal: TrackingWithdrawal | null;
  updatedAt: string;
}

const STORAGE_KEY = "buzzard_consent_v1";

export function defaultConsent(): ConsentState {
  return {
    necessary: true,
    analytics: false,
    marketing: false,
    legacyMarketing: false,
    marketing_tracking: "BLOCKED",
    trackingWithdrawal: null,
    updatedAt: new Date().toISOString(),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = asRecord(JSON.parse(raw));
    if (!parsed) return null;
    const withdrawal = asRecord(parsed.trackingWithdrawal);
    const proofOk = verifyTrackingWithdrawal(withdrawal);
    const storedTracking = String(parsed.marketing_tracking || parsed.marketingTracking || "");
    let marketingTracking: TrackingStatus = "BLOCKED";
    if (proofOk) marketingTracking = "WITHDRAWN";
    else if (storedTracking === "CLOSED" || storedTracking === "UNKNOWN" || storedTracking === "BLOCKED") marketingTracking = storedTracking;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: false,
      legacyMarketing: Boolean(parsed.marketing),
      marketing_tracking: marketingTracking,
      trackingWithdrawal: proofOk ? (withdrawal as TrackingWithdrawal) : null,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveConsent(state: {
  analytics?: boolean;
  marketing?: boolean;
  marketingTracking?: TrackingStatus;
  trackingWithdrawal?: TrackingWithdrawal | null;
}): ConsentState {
  const requestedWithdrawal = state.marketingTracking === "WITHDRAWN" || verifyTrackingWithdrawal(state.trackingWithdrawal);
  const withdrawal = requestedWithdrawal
    ? (verifyTrackingWithdrawal(state.trackingWithdrawal) ? state.trackingWithdrawal || null : createTrackingWithdrawal())
    : null;
  const marketingTracking: TrackingStatus = withdrawal
    ? "WITHDRAWN"
    : state.marketingTracking === "CLOSED" || state.marketingTracking === "UNKNOWN"
      ? state.marketingTracking
      : "BLOCKED";
  const next: ConsentState = {
    necessary: true,
    analytics: Boolean(state.analytics),
    marketing: false,
    legacyMarketing: Boolean(state.marketing),
    marketing_tracking: marketingTracking,
    trackingWithdrawal: withdrawal,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    const stored = {
      necessary: true,
      analytics: next.analytics,
      marketing: false,
      marketing_tracking: next.marketing_tracking,
      trackingWithdrawal: next.trackingWithdrawal,
      updatedAt: next.updatedAt,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    window.dispatchEvent(new CustomEvent("buzzard:consent", { detail: next }));
  }
  return next;
}

export function hasAnalyticsConsent(state: ConsentState | null): boolean {
  return Boolean(state?.analytics);
}

export function hasMarketingConsent(state: ConsentState | null): boolean {
  return decideMetaPixel({
    browser: state,
    ledger: null,
    serviceAvailable: false,
  }).metaPixel;
}
