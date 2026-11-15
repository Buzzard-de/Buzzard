import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyMarketingScriptPlan,
  createTrackingWithdrawal,
  decideMetaPixel,
  trackingProof,
  verifyTrackingGrant,
  type TrackingGrant,
} from "@/lib/marketing/trackingConsent";

const require = createRequire(import.meta.url);
const ledger = require("../../server/lib/commerce/marketingConsentLedger.js");
const consent = require("../../server/lib/commerce/marketingConsentGate.js");

function verifiedGrant(): TrackingGrant {
  const decision: TrackingGrant = {
    channel: "marketing_tracking",
    consentStatus: "GRANTED",
    customerId: "tracking-customer",
    decisionId: "tracking-decision-1",
    issuedAt: "2026-11-15T14:00:00.000Z",
    explicitGrant: true,
    consentVerified: true,
    granted: true,
    productionReady: false,
    marketingSendsOpen: false,
    proof: "",
  };
  decision.proof = trackingProof(decision);
  return decision;
}

function pixelDocument(present: boolean) {
  const nodes = new Map<string, { remove: () => void }>();
  const removed: string[] = [];
  const recorded: string[] = [];
  if (present) {
    nodes.set("buzzard-meta-pixel", {
      remove() {
        nodes.delete("buzzard-meta-pixel");
        removed.push("buzzard-meta-pixel");
      },
    });
  }
  return {
    removed,
    recorded,
    getElementById(id: string) {
      return nodes.get(id) || null;
    },
    defaultView: { fbq: () => true },
    recordPixel(id: string) {
      recorded.push(id);
    },
  };
}

describe("marketing tracking consent", () => {
  const handles: Array<{ close: () => void }> = [];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-tracking-consent-"));

  afterEach(() => {
    consent.unbindConsentLedger();
    consent.clearConsentMemory();
    while (handles.length) {
      const handle = handles.pop();
      try {
        handle?.close();
      } catch {
        /* closed by the assertion path */
      }
    }
  });

  it("A blocks a legacy marketing boolean while tracking is UNKNOWN", () => {
    const plan = decideMetaPixel({
      browser: { marketing: true },
      serviceAvailable: true,
      ledger: { emailPermission: "UNKNOWN", trackingPermission: "UNKNOWN" },
    });
    expect(plan.metaPixel).toBe(false);
    expect(plan.marketingScripts).toBe(false);
    expect(plan.trackingPermission).toBe("BLOCKED");
    expect(plan.productionReady).toBe(false);
    expect(applyMarketingScriptPlan(plan, pixelDocument(true)).loaded).toBe(false);
  });

  it("B blocks a legacy marketing boolean when tracking is WITHDRAWN", () => {
    const plan = decideMetaPixel({
      browser: { marketing: true },
      serviceAvailable: true,
      ledger: { trackingPermission: "WITHDRAWN" },
    });
    expect(plan.metaPixel).toBe(false);
    expect(plan.stopExisting).toBe(true);
    expect(plan.trackingPermission).toBe("WITHDRAWN");
  });

  it("C does not load Meta when email is GRANTED and tracking is UNKNOWN", () => {
    const plan = decideMetaPixel({
      browser: { marketing: true },
      serviceAvailable: true,
      ledger: { emailPermission: "GRANTED", granted: true, consentVerified: true, trackingPermission: "UNKNOWN" },
    });
    expect(plan.metaPixel).toBe(false);
    expect(plan.trackingPermission).toBe("BLOCKED");
  });

  it("D does not load Meta when SMS is GRANTED and tracking is UNKNOWN", () => {
    const plan = decideMetaPixel({
      serviceAvailable: true,
      ledger: { smsPermission: "GRANTED", trackingPermission: "UNKNOWN" },
    });
    expect(plan.metaPixel).toBe(false);
  });

  it("E does not load Meta when push is GRANTED and tracking is UNKNOWN", () => {
    const plan = decideMetaPixel({
      serviceAvailable: true,
      ledger: { pushPermission: "GRANTED", trackingPermission: "UNKNOWN" },
    });
    expect(plan.metaPixel).toBe(false);
  });

  it("F blocks a withdrawn tracking decision", () => {
    const plan = decideMetaPixel({
      serviceAvailable: true,
      ledger: { marketing_tracking: "WITHDRAWN", emailPermission: "GRANTED" },
    });
    expect(plan.metaPixel).toBe(false);
    expect(plan.trackingPermission).toBe("WITHDRAWN");
    expect(plan.stopExisting).toBe(true);
  });

  it("G blocks when the consent service is missing", () => {
    const plan = decideMetaPixel({
      browser: { marketing: true, marketing_tracking: "GRANTED" },
      ledger: null,
      serviceAvailable: false,
    });
    expect(plan.metaPixel).toBe(false);
    expect(plan.reason).toBe("CONSENT_STORE_UNAVAILABLE");
    expect(plan.trackingPermission).toBe("BLOCKED");
  });

  it("H blocks when consent verification fails", () => {
    const plan = decideMetaPixel({
      browser: { marketing: true },
      serviceAvailable: true,
      ledger: { trackingDecision: verifiedGrant() },
      verificationError: new Error("ledger unreadable"),
    });
    const thrown = decideMetaPixel({
      serviceAvailable: true,
      ledger: {},
      readLedger() {
        throw new Error("verification failed");
      },
    });
    expect(plan.metaPixel).toBe(false);
    expect(plan.reason).toBe("CONSENT_VERIFICATION_FAILED");
    expect(thrown.metaPixel).toBe(false);
    expect(thrown.reason).toBe("CONSENT_VERIFICATION_FAILED");
  });

  it("I allows Meta only for a verified marketing_tracking grant", () => {
    const grant = verifiedGrant();
    expect(verifyTrackingGrant(grant)).toBe(true);
    expect(verifyTrackingGrant({ ...grant, channel: "email" })).toBe(false);
    expect(verifyTrackingGrant({ ...grant, proof: "different" })).toBe(false);
    const plan = decideMetaPixel({
      browser: { marketing: false },
      serviceAvailable: true,
      ledger: {
        emailPermission: "UNKNOWN",
        smsPermission: "UNKNOWN",
        pushPermission: "UNKNOWN",
        trackingDecision: grant,
      },
    });
    expect(plan.metaPixel).toBe(true);
    expect(plan.marketingScripts).toBe(true);
    expect(plan.trackingPermission).toBe("GRANTED");
    expect(plan.productionReady).toBe(false);
    expect(plan.egress).toBe("DENY");
    const doc = pixelDocument(false);
    expect(applyMarketingScriptPlan(plan, doc)).toEqual({ loaded: true, removed: false });
    expect(doc.recorded).toEqual(["buzzard-meta-pixel"]);
    const bare = decideMetaPixel({
      serviceAvailable: true,
      ledger: { trackingPermission: "GRANTED", granted: true, consentVerified: true },
    });
    expect(bare.metaPixel).toBe(false);
  });

  it("J stops a new marketing script after withdrawal", () => {
    const withdrawal = createTrackingWithdrawal("2026-11-15T14:30:00.000Z");
    const plan = decideMetaPixel({
      browser: { marketing: true, trackingWithdrawal: withdrawal },
      serviceAvailable: true,
      ledger: { trackingDecision: verifiedGrant(), trackingPermission: "GRANTED" },
    });
    expect(plan.metaPixel).toBe(false);
    expect(plan.stopExisting).toBe(true);
    expect(plan.marketingScripts).toBe(false);
    const doc = pixelDocument(true);
    const applied = applyMarketingScriptPlan(plan, doc);
    expect(applied.loaded).toBe(false);
    expect(applied.removed).toBe(true);
    expect(doc.removed).toEqual(["buzzard-meta-pixel"]);
    expect(doc.defaultView.fbq()).toBe(false);
    expect(doc.recorded).toEqual([]);
  });

  it("persists a tracking withdrawal without granting email or the pixel", () => {
    const dbPath = path.join(root, "tracking-ledger.sqlite");
    const handle = ledger.openConsentLedger(dbPath, { isolatedFixture: true, busyTimeout: 2000 });
    handles.push(handle);
    const granted = handle.record({
      customerId: "tracking-customer",
      channel: "marketing_tracking",
      consentStatus: "GRANTED",
      idempotencyKey: "tracking-grant",
      source: "customer-opt-in",
    });
    expect(granted.granted).toBe(false);
    expect(granted.code).toBe("GRANT_REFUSED");
    const bound = consent.bindConsentLedger(handle);
    expect(bound.ok).toBe(true);
    const stored = consent.persistTrackingWithdrawal({
      customerId: "tracking-customer",
      idempotencyKey: "tracking-withdraw",
    });
    expect(stored.persisted).toBe(true);
    expect(stored.stored).toBe(true);
    expect(stored.granted).toBe(false);
    expect(stored.channel).toBe("marketing_tracking");
    expect(handle.readCustomer("tracking-customer").marketing_tracking).toBe("WITHDRAWN");
    expect(handle.readCustomer("tracking-customer").email).toBe("UNKNOWN");
    const view = consent.projectMarketingConsent("tracking-customer");
    expect(view.trackingPermission).toBe("WITHDRAWN");
    expect(view.emailPermission).toBe("UNKNOWN");
    expect(view.trackingGranted).toBe(false);
    expect(view.trackingVerified).toBe(false);
    expect(view.productionReady).toBe(false);
    const plan = decideMetaPixel({
      serviceAvailable: true,
      ledger: view,
    });
    expect(plan.metaPixel).toBe(false);
    const missing = consent.persistTrackingWithdrawal({
      customerId: "tracking-customer",
      idempotencyKey: "tracking-withdraw-closed",
    });
    consent.unbindConsentLedger();
    const unavailable = consent.persistTrackingWithdrawal({
      customerId: "tracking-customer",
      idempotencyKey: "tracking-withdraw-unavailable",
    });
    expect(missing.persisted).toBe(true);
    expect(unavailable.persisted).toBe(false);
    expect(unavailable.code).toBe("CONSENT_STORE_UNAVAILABLE");
    const closed = decideMetaPixel({ serviceAvailable: false, ledger: null, browser: { marketing: true } });
    expect(closed.metaPixel).toBe(false);
  });
});
