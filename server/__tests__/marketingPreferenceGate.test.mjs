import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const loyalty = require("../lib/marketingLoyalty.js");
const consent = require("../lib/commerce/marketingConsentGate.js");
const customerStore = require("../lib/customerStore.js");
const crm = require("../lib/crmLoyalty.js");
const ledger = require("../lib/commerce/marketingConsentLedger.js");
const { cookieConsentRecord } = require("../lib/privacy/legalDisclosure.js");
const notificationEngine = require("../lib/notificationEngine.js");
const { getDatabaseHealth } = require("../lib/db");

const secretEmail = "preference-secret@example.test";
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-preference-ledger-"));
let handle;

function ledgerSnapshot() {
  const rows = handle.readAll();
  return {
    decisions: handle.listDecisions().length,
    state: rows.length,
    granted: rows.filter((row) => row.consent_status === "GRANTED").length,
  };
}

beforeEach(() => {
  handle = ledger.openConsentLedger(path.join(directory, "consent.sqlite"), { isolatedFixture: true });
  consent.bindConsentLedger(handle);
});

afterEach(() => {
  consent.unbindConsentLedger();
  consent.clearConsentMemory();
  handle.close();
});

function silence(run) {
  const lines = [];
  const methods = ["log", "info", "warn", "error"];
  const previous = Object.fromEntries(methods.map((method) => [method, console[method]]));
  for (const method of methods) {
    console[method] = (...args) => lines.push(args.map(String).join(" "));
  }
  try {
    return { value: run(), lines };
  } finally {
    for (const method of methods) console[method] = previous[method];
  }
}

describe("marketing preference is not legal consent", () => {
  it("does not grant permission from consent flags or an unknown source", () => {
    const id = Date.now();
    const before = ledgerSnapshot();
    const { value: granted, lines } = silence(() => loyalty.updatePreferences(id, {
      consent: true,
      approved: true,
      verified: true,
      emailOptIn: true,
      smsOptIn: true,
      whatsappOptIn: true,
      consentSource: "web-form",
      consentScope: "email",
      consentAt: "2026-11-12T18:40:00+01:00",
      email: secretEmail,
      phone: "+491234567890",
    }));
    expect(granted.ok).toBe(false);
    expect(granted.code).toBe("CONSENT_UNVERIFIED");
    expect(granted.marketingPermission).toBe("BLOCKED");
    expect(granted.granted).toBe(false);
    expect(granted.consentVerified).toBe(false);
    expect(granted.consentSource).toBe("UNKNOWN");
    expect(granted.consentScope).toBe("UNKNOWN");
    expect(granted.consentAt).toBeNull();
    expect(granted.stored).toBe(false);
    expect(granted.notificationSent).toBe(false);
    expect(granted.emailSent).toBe(false);
    expect(granted.smsSent).toBe(false);
    expect(granted.whatsappSent).toBe(false);
    expect(granted.campaignCreated).toBe(false);
    expect(JSON.stringify(granted)).not.toContain(secretEmail);
    expect(lines.join("\n")).not.toContain(secretEmail);
    expect(loyalty.getPreferences(id).marketingPermission).toBe("UNKNOWN");
    expect(ledgerSnapshot()).toEqual(before);
    expect(getDatabaseHealth().opened).toBe(false);
  });

  it("records a withdrawal without a second row, a message, or a commercial record", async () => {
    const id = String(Date.now() + 11);
    const before = ledgerSnapshot();
    const first = loyalty.updatePreferences(id, { email: secretEmail, withdraw: true, consent: true, approved: true });
    expect(first.withdrawn).toBe(true);
    expect(first.persisted).toBe(true);
    expect(first.marketingPermission).toBe("WITHDRAWN");
    expect(first.granted).toBe(false);
    expect(first.notificationSent).toBe(false);
    expect(JSON.stringify(first)).not.toContain(secretEmail);
    const rows = handle.readAll().filter((row) => row.customer_id === id);
    expect(rows.map((row) => row.channel).sort()).toEqual(["email", "push", "sms"]);
    expect(rows.every((row) => row.consent_status === "WITHDRAWN")).toBe(true);

    const second = loyalty.updatePreferences(id, { emailOptIn: false, smsOptIn: false, phone: "+491111" });
    expect(second.duplicate).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(second.withdrawn).toBe(true);
    expect(handle.readAll().filter((row) => row.customer_id === id)).toHaveLength(3);

    const [left, right] = await Promise.all([
      Promise.resolve().then(() => loyalty.updatePreferences(id, { unsubscribe: true, email: secretEmail })),
      Promise.resolve().then(() => loyalty.updatePreferences(id, { marketing: false, email: secretEmail })),
    ]);
    expect(left.withdrawn).toBe(true);
    expect(right.withdrawn).toBe(true);
    expect([left.duplicate, right.duplicate].filter(Boolean).length).toBe(2);
    expect(handle.readCustomer(id).email).toBe("WITHDRAWN");
    expect(loyalty.getPreferences(id).marketingPermission).toBe("WITHDRAWN");
    expect(loyalty.getPreferences(id).granted).toBe(false);

    const laterGrant = loyalty.updatePreferences(id, { consent: true, verified: true, emailOptIn: true, email: secretEmail });
    expect(laterGrant.stored).toBe(false);
    expect(laterGrant.persisted).toBe(false);
    expect(laterGrant.marketingPermission).toBe("BLOCKED");
    expect(handle.readCustomer(id).email).toBe("WITHDRAWN");
    expect(handle.readAll().some((row) => row.consent_status === "GRANTED")).toBe(false);

    const after = ledgerSnapshot();
    expect(after.decisions).toBe(before.decisions + 3);
    expect(after.granted).toBe(0);
    expect(getDatabaseHealth().opened).toBe(false);
  });

  it("does not copy a marketing grant into the customer profile, a cookie record, or a message", () => {
    const profile = customerStore.applyPreferencePatch({ language: "de" }, {
      language: "tr",
      marketing: true,
      consent: true,
      emailOptIn: true,
      email: secretEmail,
    });
    expect(profile.preferences.language).toBe("tr");
    expect(profile.preferences.marketing).toBeUndefined();
    expect(profile.preferences.emailOptIn).toBeUndefined();
    expect(profile.granted).toBe(false);
    expect(profile.marketingPermission).toBe("BLOCKED");
    expect(profile.notificationSent).toBe(false);
    expect(JSON.stringify(profile)).not.toContain(secretEmail);

    const withdrawn = customerStore.applyPreferencePatch(
      { language: "tr", marketing: true, emailOptIn: true },
      { marketing: false, email: secretEmail }
    );
    expect(withdrawn.withdrawn).toBe(true);
    expect(withdrawn.granted).toBe(false);
    expect(withdrawn.preferences.marketing).toBeUndefined();
    expect(withdrawn.preferences.emailOptIn).toBeUndefined();
    expect(withdrawn.preferences.language).toBe("tr");
    expect(withdrawn.notificationSent).toBe(false);

    const cookie = cookieConsentRecord({ marketing: true, analytics: false, actorId: secretEmail });
    expect(cookie.marketing).toBe(false);
    expect(cookie.marketingPermission).toBe("BLOCKED");
    expect(cookie.lawfulBasis.marketing).toBe("not_granted");
    expect(cookie.consentVerified).toBe(false);
    expect(JSON.stringify(cookie)).not.toContain(secretEmail);

    const before = ledgerSnapshot();
    const message = notificationEngine.handleAutomationEvent({
      type: "abandoned_cart",
      payload: { email: secretEmail, marketingConsent: true, verified: true, approved: true },
    });
    expect(message.sent).toBe(false);
    expect(message.queued).toBe(false);
    expect(message.customerNotified).toBe(false);
    expect(message.reason).toBe("CART_OWNER_UNKNOWN");
    expect(JSON.stringify(message)).not.toContain(secretEmail);

    const crmId = "8800000000042";
    const crmGrant = crm.upsertCrmProfile(crmId, {
      marketingEmail: true,
      marketingSms: true,
      marketingWhatsapp: true,
      consent: true,
      ok: true,
      granted: true,
      status: 200,
      phone: "+491234",
      email: secretEmail,
    });
    expect(crmGrant.granted).toBe(false);
    expect(crmGrant.persisted).toBe(false);
    expect(crmGrant.marketingPermission).toBe("BLOCKED");
    expect(crmGrant.notificationSent).toBe(false);
    expect(JSON.stringify(crmGrant)).not.toContain(secretEmail);
    expect(handle.readAll().some((row) => row.consent_status === "GRANTED")).toBe(false);

    const crmWithdraw = crm.upsertCrmProfile(crmId, { marketingEmail: false, phone: "+491234" });
    expect(crmWithdraw.marketingPermission).toBe("WITHDRAWN");
    expect(crmWithdraw.persisted).toBe(true);
    expect(crmWithdraw.notificationSent).toBe(false);
    expect(handle.readCustomer(crmId)).toMatchObject({ email: "WITHDRAWN", sms: "UNKNOWN", push: "UNKNOWN" });

    const earned = crm.earnPoints(crmId, { points: 80, approved: true, email: secretEmail });
    expect(earned.ok).toBe(false);
    expect(earned.code).toBe("SALES_CLOSED");
    expect(earned.pointsApplied).toBe(false);
    const redeemed = crm.redeemReward(crmId, 1);
    expect(redeemed.couponIssued).toBe(false);
    expect(redeemed.balanceChanged).toBe(false);
    const tracked = crm.trackAbandonedCart(crmId, { subtotal: 40, email: secretEmail });
    expect(tracked.cartStored).toBe(false);
    expect(tracked.notified).toBe(false);
    const recovery = crm.queueRecoveryCampaigns("email");
    expect(recovery.queued).toBe(0);
    expect(recovery.customerNotified).toBe(false);
    expect(ledgerSnapshot().granted).toBe(before.granted);
    expect(getDatabaseHealth().opened).toBe(false);
    expect(getDatabaseHealth().initialized).toBe(false);
  });
});

describe("FIN-M25 marketing consent gates preference writes", () => {
  function closed(result) {
    expect(result.ok).toBe(false);
    expect(result.granted).toBe(false);
    expect(result.consentVerified).toBe(false);
    expect(result.stored).toBe(false);
    expect(result.messageSent).toBe(false);
    expect(result.notificationSent).toBe(false);
    expect(result.emailSent).toBe(false);
    expect(result.smsSent).toBe(false);
    expect(result.pushSent).toBe(false);
    expect(result.customerNotified).toBe(false);
    expect(result.campaignCreated).toBe(false);
    expect(result.orderCreated).toBe(false);
  }

  it("checks a grant attempt with FIN-M25 and does not enable a blocked permission", () => {
    const id = "8800000000001";
    const granted = loyalty.updatePreferences(id, {
      emailOptIn: true,
      consent: true,
      approved: true,
      verified: true,
      consentSource: "account-settings",
      consentScope: "marketing-email",
      consentAt: "2026-11-15T10:00:00.000Z",
      idempotencyKey: "finm25-grant",
    });
    closed(granted);
    expect(granted.code).toBe("CONSENT_UNVERIFIED");
    expect(granted.gateCode).toBe("CONSENT_UNVERIFIED");
    expect(granted.gateStatus).toBe("BLOCKED");
    expect(granted.marketingPermission).toBe("BLOCKED");
    expect(granted.emailPermission).toBe("BLOCKED");
    const seen = consent.readMarketingConsent(id);
    expect(seen.granted).toBe(false);
    expect(seen.consentVerified).toBe(false);
    expect(seen.messageSent).toBe(false);
    expect(seen.emailPermission).toBe("BLOCKED");
  });

  it("does not enable permission when the gate is blocked", () => {
    const id = "8800000000002";
    const blocked = loyalty.updatePreferences(id, {
      emailOptIn: true,
      prechecked: true,
      defaultChecked: true,
      idempotencyKey: "finm25-blocked",
    });
    closed(blocked);
    expect(blocked.code).toBe("DEFAULT_CONSENT_REJECTED");
    expect(blocked.gateStatus).toBe("BLOCKED");
    expect(blocked.marketingPermission).toBe("BLOCKED");
    expect(blocked.emailPermission).toBe("BLOCKED");
    expect(blocked.smsPermission).toBe("UNKNOWN");
    expect(blocked.pushPermission).toBe("UNKNOWN");
  });

  it("does not enable permission when the gate is unknown", () => {
    const id = "8800000000003";
    const unknown = loyalty.updatePreferences(id, {
      emailOptIn: true,
      idempotencyKey: "finm25-unknown",
    });
    closed(unknown);
    expect(unknown.code).toBe("CONSENT_UNKNOWN");
    expect(unknown.gateStatus).toBe("UNKNOWN");
    expect(unknown.marketingPermission).toBe("UNKNOWN");
    expect(unknown.emailPermission).toBe("UNKNOWN");
    expect(unknown.smsPermission).toBe("UNKNOWN");
    expect(unknown.pushPermission).toBe("UNKNOWN");
  });

  it("does not enable permission when the gate times out", () => {
    const id = "8800000000004";
    const timedOut = loyalty.updatePreferences(id, {
      emailOptIn: true,
      consentSource: "account-settings",
      consentScope: "marketing-email",
      consentAt: "2026-11-15T10:00:00.000Z",
      timeout: true,
      idempotencyKey: "finm25-timeout",
    });
    closed(timedOut);
    expect(timedOut.code).toBe("TIMEOUT");
    expect(timedOut.gateStatus).toBe("FAILED");
    expect(timedOut.marketingPermission).toBe("BLOCKED");
    expect(timedOut.emailPermission).toBe("CLOSED");
    expect(timedOut.smsPermission).toBe("UNKNOWN");
    expect(timedOut.pushPermission).toBe("UNKNOWN");
  });

  it("withdraws only the requested channel", () => {
    const emailId = "8800000000005";
    const beforeEmail = consent.readMarketingConsent(emailId);
    const email = loyalty.updatePreferences(emailId, { emailOptIn: false, idempotencyKey: "finm25-email-out" });
    expect(email.ok).toBe(false);
    expect(email.withdrawn).toBe(true);
    expect(email.granted).toBe(false);
    expect(email.consentVerified).toBe(false);
    expect(email.code).toBe("CONSENT_WITHDRAWN");
    expect(email.gateCode).toBe("CONSENT_WITHDRAWN");
    expect(email.marketingPermission).toBe("WITHDRAWN");
    expect(email.emailPermission).toBe("WITHDRAWN");
    expect(email.smsPermission).toBe(beforeEmail.smsPermission);
    expect(email.pushPermission).toBe(beforeEmail.pushPermission);
    expect(email.messageSent).toBe(false);
    expect(email.notificationSent).toBe(false);
    expect(email.emailSent).toBe(false);
    expect(email.smsSent).toBe(false);
    expect(email.pushSent).toBe(false);
    expect(email.campaignCreated).toBe(false);
    expect(email.orderCreated).toBe(false);

    const smsId = "8800000000006";
    const beforeSms = consent.readMarketingConsent(smsId);
    const sms = loyalty.updatePreferences(smsId, { smsOptIn: false, idempotencyKey: "finm25-sms-out" });
    expect(sms.withdrawn).toBe(true);
    expect(sms.granted).toBe(false);
    expect(sms.smsPermission).toBe("WITHDRAWN");
    expect(sms.emailPermission).toBe(beforeSms.emailPermission);
    expect(sms.pushPermission).toBe(beforeSms.pushPermission);
    expect(sms.messageSent).toBe(false);

    const pushId = "8800000000007";
    const beforePush = consent.readMarketingConsent(pushId);
    const push = loyalty.updatePreferences(pushId, { pushOptIn: false, idempotencyKey: "finm25-push-out" });
    expect(push.withdrawn).toBe(true);
    expect(push.granted).toBe(false);
    expect(push.pushPermission).toBe("WITHDRAWN");
    expect(push.emailPermission).toBe(beforePush.emailPermission);
    expect(push.smsPermission).toBe(beforePush.smsPermission);
    expect(push.messageSent).toBe(false);
    expect(push.customerNotified).toBe(false);
  });

  it("does not create a second marketing authority for the same grant", () => {
    const id = "8800000000008";
    const input = {
      emailOptIn: true,
      consentSource: "account-settings",
      consentScope: "marketing-email",
      consentAt: "2026-11-15T10:00:00.000Z",
      idempotencyKey: "finm25-duplicate",
    };
    const first = loyalty.updatePreferences(id, input);
    const second = loyalty.updatePreferences(id, input);
    closed(first);
    closed(second);
    expect(first.code).toBe("CONSENT_UNVERIFIED");
    expect(second.code).toBe("DUPLICATE_CONSENT");
    expect(second.duplicate).toBe(true);
    expect(second.granted).toBe(false);
    expect(second.emailPermission).toBe("BLOCKED");
    expect(second.smsPermission).toBe("UNKNOWN");
    expect(second.pushPermission).toBe("UNKNOWN");
    expect(consent.readMarketingConsent(id).messageSent).toBe(false);
  });
});
