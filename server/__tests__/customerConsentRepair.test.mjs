import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const store = require("../lib/customerStore.js");
const crm = require("../lib/crmLoyalty.js");
const consent = require("../lib/commerce/marketingConsentGate.js");
const ledger = require("../lib/commerce/marketingConsentLedger.js");
const { getDatabaseHealth } = require("../lib/db.js");

const customersFile = path.join(__dirname, "..", "data", "customers.json");
const realRead = fs.readFileSync.bind(fs);
const realWrite = fs.writeFileSync.bind(fs);
const synthetic = [
  {
    id: "cust-m25-grant",
    preferences: { language: "de", emailOptIn: true, smsOptIn: true, pushOptIn: true },
  },
  {
    id: "cust-m25-out",
    preferences: { language: "de", emailOptIn: true, smsOptIn: true, pushOptIn: true },
  },
  {
    id: "cust-m25-lang",
    preferences: { language: "de", emailOptIn: true, smsOptIn: true, pushOptIn: true },
  },
];

function digest() {
  return createHash("sha256").update(realRead(customersFile)).digest("hex");
}

function installStoreMock() {
  const writes = [];
  fs.readFileSync = (file, encoding) => {
    if (String(file).endsWith("customers.json")) return writes.at(-1) || JSON.stringify(synthetic);
    return realRead(file, encoding);
  };
  fs.writeFileSync = (file, data, encoding) => {
    if (String(file).endsWith("customers.json")) {
      writes.push(String(data));
      return;
    }
    return realWrite(file, data, encoding);
  };
  return writes;
}

function restoreStoreMock() {
  fs.readFileSync = realRead;
  fs.writeFileSync = realWrite;
}

describe("FIN-M25 customer consent writes stay closed", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-consent-repair-"));
  const ledgerPath = path.join(directory, "consent.sqlite");
  let handle;

  beforeEach(() => {
    handle = ledger.openConsentLedger(ledgerPath, { isolatedFixture: true });
    consent.bindConsentLedger(handle);
  });

  afterEach(() => {
    consent.unbindConsentLedger();
    consent.clearConsentMemory();
    handle.close();
  });

  it("calls the gate before a preference or CRM write and refuses a fake grant", () => {
    const before = digest();
    const writes = installStoreMock();
    try {
      const granted = store.updatePreferences("cust-m25-grant", {
        idempotencyKey: "m25-store-grant",
        granted: true,
        ok: true,
        authorized: true,
        status: 200,
        emailOptIn: true,
        source: "account-settings",
        scope: "marketing-email",
        consentedAt: "2020-01-01T00:00:00.000Z",
      });
      expect(granted.stored).toBe(false);
      expect(granted.granted).toBe(false);
      expect(granted.withdrawn).toBe(false);
      expect(granted.preferences.emailOptIn).toBeUndefined();
      expect(granted.preferences.emailPermission).not.toBe("GRANTED");
      expect(granted.preferences.smsOptIn).toBeUndefined();
      expect(writes).toEqual([]);
      const email = consent.readMarketingConsent("cust-m25-grant");
      expect(email.granted).toBe(false);
      expect(email.emailPermission).not.toBe("GRANTED");
      expect(handle.readAll().some((row) => row.consent_status === "GRANTED")).toBe(false);

      const profile = crm.upsertCrmProfile("42", {
        idempotencyKey: "m25-crm-grant",
        marketingEmail: true,
        marketingSms: true,
        granted: true,
        ok: true,
        authorized: true,
        status: 200,
        source: "account-settings",
        scope: "marketing-email",
        consentedAt: "2020-01-01T00:00:00.000Z",
      });
      expect(profile.stored).toBe(false);
      expect(profile.persisted).toBe(false);
      expect(profile.granted).toBe(false);
      expect(profile.code).toBe("CONSENT_UNVERIFIED");
      expect(profile.marketingPermission).toBe("BLOCKED");
      expect(getDatabaseHealth().initialized).toBe(false);
      expect(getDatabaseHealth().opened).toBe(false);
    } finally {
      restoreStoreMock();
    }
    expect(digest()).toBe(before);
  });

  it("keeps an opt-out and leaves the other channels untouched", () => {
    const before = digest();
    const writes = installStoreMock();
    try {
      const emailOut = store.updatePreferences("cust-m25-out", {
        idempotencyKey: "m25-store-email-out",
        emailOptIn: false,
      });
      expect(emailOut.stored).toBe(true);
      expect(emailOut.persisted).toBe(true);
      expect(emailOut.withdrawn).toBe(true);
      expect(emailOut.granted).toBe(false);
      expect(emailOut.preferences.emailPermission).toBe("WITHDRAWN");
      expect(emailOut.preferences.smsPermission).toBe("UNKNOWN");
      expect(emailOut.preferences.pushPermission).toBe("UNKNOWN");
      expect(emailOut.preferences.emailOptIn).toBeUndefined();
      expect(writes).toHaveLength(1);
      const saved = JSON.parse(writes[0]).find((row) => row.id === "cust-m25-out").preferences;
      expect(saved.language).toBe("de");
      expect(saved.emailOptIn).toBeUndefined();
      expect(saved.smsOptIn).toBeUndefined();
      expect(saved.pushOptIn).toBeUndefined();
      expect(saved.marketing).toBeUndefined();
      const afterEmail = consent.readMarketingConsent("cust-m25-out");
      expect(afterEmail.emailPermission).toBe("WITHDRAWN");
      expect(afterEmail.smsPermission).toBe("UNKNOWN");
      expect(afterEmail.pushPermission).toBe("UNKNOWN");

      const smsOut = crm.upsertCrmProfile("43", {
        idempotencyKey: "m25-crm-sms-out",
        marketingSms: false,
      });
      expect(smsOut.stored).toBe(true);
      expect(smsOut.persisted).toBe(true);
      expect(smsOut.code).toBe("WITHDRAWN");
      expect(smsOut.withdrawn).toBe(true);
      expect(smsOut.granted).toBe(false);
      expect(smsOut.smsPermission).toBe("WITHDRAWN");
      expect(smsOut.emailPermission).toBe("UNKNOWN");
      expect(smsOut.pushPermission).toBe("UNKNOWN");
      expect(getDatabaseHealth().initialized).toBe(false);

      const timedOut = store.updatePreferences("cust-m25-out", {
        idempotencyKey: "m25-store-timeout",
        emailOptIn: false,
        timeout: true,
      });
      expect(timedOut.stored).toBe(false);
      expect(timedOut.granted).toBe(false);
      expect(writes).toHaveLength(1);
    } finally {
      restoreStoreMock();
    }
    expect(digest()).toBe(before);
  });

  it("saves a language change without creating a marketing permission", () => {
    const before = digest();
    const writes = installStoreMock();
    try {
      const saved = store.updatePreferences("cust-m25-lang", {
        idempotencyKey: "m25-language",
        language: "tr",
        granted: true,
        ok: true,
        status: 200,
      });
      expect(saved.stored).toBe(true);
      expect(saved.persisted).toBe(false);
      expect(saved.granted).toBe(false);
      expect(saved.withdrawn).toBe(false);
      expect(saved.preferences.language).toBe("tr");
      expect(saved.preferences.emailOptIn).toBeUndefined();
      expect(saved.preferences.smsOptIn).toBeUndefined();
      expect(saved.preferences.pushOptIn).toBeUndefined();
      expect(saved.preferences.marketing).toBeUndefined();
      expect(writes).toHaveLength(1);
      const channels = consent.readMarketingConsent("cust-m25-lang");
      expect(channels.granted).toBe(false);
      expect(channels.emailPermission).toBe("UNKNOWN");
      expect(channels.smsPermission).toBe("UNKNOWN");
      expect(channels.pushPermission).toBe("UNKNOWN");

      const sms = store.updatePreferences("cust-m25-lang", {
        idempotencyKey: "m25-sms-out",
        smsOptIn: false,
      });
      expect(sms.stored).toBe(true);
      expect(sms.preferences.language).toBe("tr");
      expect(sms.preferences.smsPermission).toBe("WITHDRAWN");
      expect(sms.preferences.emailPermission).toBe("UNKNOWN");
      expect(sms.preferences.emailOptIn).toBeUndefined();
      const push = store.updatePreferences("cust-m25-lang", {
        idempotencyKey: "m25-push-out",
        pushOptIn: false,
      });
      expect(push.preferences.pushPermission).toBe("WITHDRAWN");
      expect(push.preferences.emailPermission).toBe("UNKNOWN");
      expect(push.preferences.smsPermission).toBe("WITHDRAWN");
      expect(push.preferences.emailOptIn).toBeUndefined();
      const after = consent.readMarketingConsent("cust-m25-lang");
      expect(after.emailPermission).toBe("UNKNOWN");
      expect(after.smsPermission).toBe("WITHDRAWN");
      expect(after.pushPermission).toBe("WITHDRAWN");

      const pushOut = crm.upsertCrmProfile("44", {
        idempotencyKey: "m25-crm-push-out",
        marketingPush: false,
      });
      expect(pushOut.ok).toBe(false);
      expect(pushOut.stored).toBe(true);
      expect(pushOut.persisted).toBe(true);
      expect(pushOut.granted).toBe(false);
      expect(handle.readAll().filter((row) => row.customer_id === "44").map((row) => row.channel)).toEqual(["push"]);
      expect(pushOut.pushPermission).toBe("WITHDRAWN");
      expect(pushOut.emailPermission).toBe("UNKNOWN");
      expect(pushOut.smsPermission).toBe("UNKNOWN");
      expect(pushOut.emailPermission).not.toBe(0);
      expect(pushOut.smsPermission).not.toBe(true);
      expect(getDatabaseHealth().initialized).toBe(false);
      expect(getDatabaseHealth().opened).toBe(false);
    } finally {
      restoreStoreMock();
    }
    expect(digest()).toBe(before);
  });
});
