/**
 * Browser marketing-tracking decision.
 * localStorage marketing=true is not consent.
 * Email, SMS, and push grants do not load the Meta pixel.
 * This module does not open a network connection.
 */
export const TRACKING_CHANNEL = "marketing_tracking" as const;
export const META_PIXEL_ID = "buzzard-meta-pixel";

export type TrackingWithdrawal = {
  channel: typeof TRACKING_CHANNEL;
  consentStatus: "WITHDRAWN";
  customerId: string;
  decisionId: string;
  issuedAt: string;
  productionReady: false;
  marketingSendsOpen: false;
  proof: string;
};

export type TrackingGrant = {
  channel: typeof TRACKING_CHANNEL;
  consentStatus: "GRANTED";
  customerId: string;
  decisionId: string;
  issuedAt: string;
  explicitGrant: true;
  consentVerified: true;
  granted: true;
  productionReady: false;
  marketingSendsOpen: false;
  proof: string;
};

export type TrackingDecision = {
  metaPixel: boolean;
  marketingScripts: boolean;
  stopExisting: boolean;
  trackingPermission: "BLOCKED" | "WITHDRAWN" | "CLOSED" | "GRANTED";
  reason: string;
  channel: typeof TRACKING_CHANNEL;
  productionReady: false;
  salesOpen: false;
  egress: "DENY";
};

type ProofParts = {
  channel?: string;
  consentStatus?: string;
  customerId?: string;
  decisionId?: string;
  issuedAt?: string;
};

function fnv(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function trackingProof(parts: ProofParts): string {
  return fnv(
    [
      "marketing_tracking_v1",
      parts.channel || TRACKING_CHANNEL,
      parts.consentStatus || "",
      parts.customerId || "",
      parts.decisionId || "",
      parts.issuedAt || "",
    ].join("|"),
  );
}

export function createTrackingWithdrawal(issuedAt = new Date().toISOString()): TrackingWithdrawal {
  const record: TrackingWithdrawal = {
    channel: TRACKING_CHANNEL,
    consentStatus: "WITHDRAWN",
    customerId: "",
    decisionId: "",
    issuedAt,
    productionReady: false,
    marketingSendsOpen: false,
  };
  record.proof = trackingProof(record);
  return record;
}

export function verifyTrackingWithdrawal(record: unknown): record is TrackingWithdrawal {
  if (!record || typeof record !== "object") return false;
  const candidate = record as Partial<TrackingWithdrawal>;
  if (candidate.channel !== TRACKING_CHANNEL || candidate.consentStatus !== "WITHDRAWN") return false;
  if (candidate.productionReady !== false || candidate.marketingSendsOpen !== false) return false;
  if (!candidate.issuedAt || !candidate.proof) return false;
  return candidate.proof === trackingProof(candidate);
}

export function verifyTrackingGrant(decision: unknown): decision is TrackingGrant {
  if (!decision || typeof decision !== "object") return false;
  const candidate = decision as Partial<TrackingGrant>;
  if (candidate.channel !== TRACKING_CHANNEL || candidate.consentStatus !== "GRANTED") return false;
  if (candidate.explicitGrant !== true || candidate.consentVerified !== true || candidate.granted !== true) return false;
  if (candidate.productionReady !== false || candidate.marketingSendsOpen !== false) return false;
  if (!candidate.customerId || !candidate.decisionId || !candidate.issuedAt || !candidate.proof) return false;
  return candidate.proof === trackingProof(candidate);
}

function blocked(reason: string, permission: TrackingDecision["trackingPermission"] | "UNKNOWN", stopExisting = false): TrackingDecision {
  const trackingPermission = permission === "UNKNOWN" ? "BLOCKED" : permission;
  return {
    metaPixel: false,
    marketingScripts: false,
    stopExisting: stopExisting || trackingPermission === "WITHDRAWN",
    trackingPermission,
    reason,
    channel: TRACKING_CHANNEL,
    productionReady: false,
    salesOpen: false,
    egress: "DENY",
  };
}

function browserWithdrawn(browser: unknown): boolean {
  if (!browser || typeof browser !== "object") return false;
  const record = browser as {
    trackingWithdrawal?: unknown;
    marketing_tracking?: string;
    marketingTracking?: string;
  };
  if (verifyTrackingWithdrawal(record.trackingWithdrawal)) return true;
  return record.marketing_tracking === "WITHDRAWN" || record.marketingTracking === "WITHDRAWN";
}

export function decideMetaPixel(input: {
  browser?: unknown;
  ledger?: unknown;
  serviceAvailable?: boolean;
  verificationError?: unknown;
  readLedger?: () => unknown;
} = {}): TrackingDecision {
  if (browserWithdrawn(input.browser)) return blocked("WITHDRAWN", "WITHDRAWN", true);
  if (input.serviceAvailable === false || !Object.prototype.hasOwnProperty.call(input, "ledger") || input.ledger == null) {
    return blocked("CONSENT_STORE_UNAVAILABLE", "BLOCKED", true);
  }
  if (input.verificationError) return blocked("CONSENT_VERIFICATION_FAILED", "BLOCKED", true);

  let ledger = input.ledger;
  if (typeof input.readLedger === "function") {
    try {
      ledger = input.readLedger();
    } catch {
      return blocked("CONSENT_VERIFICATION_FAILED", "BLOCKED", true);
    }
  }
  if (!ledger || typeof ledger !== "object") return blocked("CONSENT_STORE_UNAVAILABLE", "BLOCKED", true);

  const view = ledger as {
    trackingPermission?: string;
    marketing_tracking?: string;
    trackingWithdrawal?: unknown;
    trackingDecision?: unknown;
  };
  if (verifyTrackingWithdrawal(view.trackingWithdrawal) || view.trackingPermission === "WITHDRAWN" || view.marketing_tracking === "WITHDRAWN") {
    return blocked("WITHDRAWN", "WITHDRAWN", true);
  }
  if (verifyTrackingGrant(view.trackingDecision)) {
    return {
      metaPixel: true,
      marketingScripts: true,
      stopExisting: false,
      trackingPermission: "GRANTED",
      reason: "TRACKING_GRANTED_VERIFIED",
      channel: TRACKING_CHANNEL,
      productionReady: false,
      salesOpen: false,
      egress: "DENY",
    };
  }

  const tracking = String(view.trackingPermission || view.marketing_tracking || "UNKNOWN").toUpperCase();
  if (tracking === "CLOSED" || tracking === "BLOCKED" || tracking === "WITHDRAWN") {
    return blocked(tracking === "WITHDRAWN" ? "WITHDRAWN" : "TRACKING_NOT_GRANTED", tracking, tracking === "WITHDRAWN");
  }
  return blocked(tracking === "UNKNOWN" ? "TRACKING_UNKNOWN" : "TRACKING_NOT_GRANTED", "BLOCKED", false);
}

type PixelDocument = {
  getElementById?: (id: string) => { remove?: () => void } | null;
  defaultView?: { fbq?: () => boolean };
  recordPixel?: (id: string) => void;
};

export function applyMarketingScriptPlan(plan: TrackingDecision, doc: PixelDocument | null): { loaded: boolean; removed: boolean } {
  if (!doc || !plan) return { loaded: false, removed: false };
  const existing = typeof doc.getElementById === "function" ? doc.getElementById(META_PIXEL_ID) : null;
  if (!plan.metaPixel) {
    if (existing && typeof existing.remove === "function") existing.remove();
    if (doc.defaultView) doc.defaultView.fbq = function marketingTrackingBlocked() { return false; };
    return { loaded: false, removed: Boolean(existing) };
  }
  if (typeof doc.recordPixel === "function") doc.recordPixel(META_PIXEL_ID);
  return { loaded: true, removed: false };
}
