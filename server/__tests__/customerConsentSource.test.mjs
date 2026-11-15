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
const auth = require("../lib/customerAuth.js");
const plugin = require("../plugins/customerAccountPlugin.js");
const { getDatabaseHealth } = require("../lib/db.js");

const realRead = fs.readFileSync.bind(fs);
const realWrite = fs.writeFileSync.bind(fs);
const files = new Map();

function installFiles() {
  fs.readFileSync = (file, encoding) => {
    const name = String(file);
    if (files.has(name)) return files.get(name);
    if (name.endsWith("customers.json") || name.endsWith("customer-sessions.json")) return "[]";
    return realRead(file, encoding);
  };
  fs.writeFileSync = (file, data, encoding) => {
    const name = String(file);
    if (name.endsWith("customers.json") || name.endsWith("customer-sessions.json")) {
      files.set(name, String(data));
      return;
    }
    return realWrite(file, data, encoding);
  };
}

function restoreFiles() {
  fs.readFileSync = realRead;
  fs.writeFileSync = realWrite;
  files.clear();
}

function consentSlice(body) {
  return {
    granted: body.granted,
    consentVerified: body.consentVerified,
    marketingPermission: body.marketingPermission,
    emailPermission: body.emailPermission,
    smsPermission: body.smsPermission,
    pushPermission: body.pushPermission,
    whatsappPermission: body.whatsappPermission,
    preferences: body.preferences,
  };
}

function fakeApp() {
  const routes = new Map();
  return {
    routes,
    get(route, handler) { routes.set(`GET ${route}`, handler); },
    post(route, handler) { routes.set(`POST ${route}`, handler); },
    put(route, handler) { routes.set(`PUT ${route}`, handler); },
    delete(route, handler) { routes.set(`DELETE ${route}`, handler); },
  };
}

function invoke(handler, req) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ statusCode: this.statusCode, body }); },
    };
    handler(req, res);
  });
}

describe("FIN-M25 customer consent single source", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-consent-source-"));
  const ledgerPath = path.join(directory, "consent.sqlite");
  let handle;

  beforeEach(() => {
    installFiles();
    handle = ledger.openConsentLedger(ledgerPath, { isolatedFixture: true });
    consent.bindConsentLedger(handle);
  });

  afterEach(() => {
    consent.unbindConsentLedger();
    consent.clearConsentMemory();
    handle.close();
    restoreFiles();
  });

  it("ignores a CRM integer grant when the ledger says withdrawn", () => {
    handle.record({
      customerId: "42",
      channel: "email",
      consentStatus: "WITHDRAWN",
      idempotencyKey: "source-email-withdrawn",
      source: "customer-opt-out",
    });
    const view = crm.presentCrmProfile({
      user_id: 42,
      marketing_email: 1,
      marketing_sms: 1,
      marketing_whatsapp: 1,
      language: "de",
      phone: "+490000",
    }, "42");
    expect(view.granted).toBe(false);
    expect(view.emailPermission).toBe("WITHDRAWN");
    expect(view.smsPermission).toBe("UNKNOWN");
    expect(view.whatsappPermission).toBe("UNKNOWN");
    expect(view.profile.marketing_email).toBeUndefined();
    expect(view.profile.marketing_sms).toBeUndefined();
    expect(view.profile.marketing_whatsapp).toBeUndefined();
    expect(view.profile.language).toBe("de");
    expect(consent.marketingBoxChecked(view.emailPermission, view.granted, view.consentVerified)).toBe(false);
  });

  it("keeps JSON marketing true from looking granted when the ledger is withdrawn or unknown", () => {
    const withdrawn = store.accountConsentView({
      id: "cust-json-withdrawn",
      preferences: { language: "de", marketing: true, emailOptIn: true },
    });
    handle.record({
      customerId: "cust-json-withdrawn",
      channel: "email",
      consentStatus: "WITHDRAWN",
      idempotencyKey: "source-json-withdrawn",
      source: "customer-opt-out",
    });
    const after = store.accountConsentView({
      id: "cust-json-withdrawn",
      preferences: { language: "de", marketing: true, emailOptIn: true },
    });
    const unknown = store.accountConsentView({
      id: "cust-json-unknown",
      preferences: { language: "de", marketing: true, emailOptIn: true },
    });
    expect(withdrawn.granted).toBe(false);
    expect(after.granted).toBe(false);
    expect(after.emailPermission).toBe("WITHDRAWN");
    expect(after.preferences.marketing).toBeUndefined();
    expect(after.preferences.emailOptIn).toBeUndefined();
    expect(unknown.granted).toBe(false);
    expect(unknown.emailPermission).toBe("UNKNOWN");
    expect(unknown.preferences.marketing).toBeUndefined();
    expect(consent.marketingBoxChecked("WITHDRAWN", false, false)).toBe(false);
    expect(consent.marketingBoxChecked("UNKNOWN", false, false)).toBe(false);
  });

  it("shows WhatsApp as unknown when the old integer is 1", () => {
    const view = crm.presentCrmProfile({ user_id: 7, marketing_whatsapp: 1, marketing_email: 1 }, "7");
    expect(view.whatsappPermission).toBe("UNKNOWN");
    expect(view.profile.whatsappPermission).toBe("UNKNOWN");
    expect(view.granted).toBe(false);
    expect(view.profile.marketing_whatsapp).toBeUndefined();
    expect(getDatabaseHealth().opened).toBe(false);
  });

  it("returns the same ledger projection from both account endpoints", async () => {
    handle.record({
      customerId: "cust-source-api",
      channel: "sms",
      consentStatus: "WITHDRAWN",
      idempotencyKey: "source-api-sms",
      source: "customer-opt-out",
    });
    files.set(path.join(__dirname, "..", "data", "customers.json"), JSON.stringify([
      {
        id: "cust-source-api",
        email: "source@example.test",
        firstName: "Source",
        lastName: "Test",
        preferences: { language: "de", marketing: true, emailOptIn: true },
        addresses: [],
        wishlist: [],
      },
    ]));
    const session = auth.createSession({ id: "cust-source-api", firstName: "Source", lastName: "Test" });
    const app = fakeApp();
    plugin.register(app);
    const req = { headers: { authorization: `Bearer ${session.token}` }, url: "/api/account/me" };
    const me = await invoke(app.routes.get("GET /api/account/me"), req);
    const preferences = await invoke(app.routes.get("GET /api/account/preferences"), { ...req, url: "/api/account/preferences" });
    expect(me.statusCode).toBe(200);
    expect(preferences.statusCode).toBe(200);
    expect(consentSlice(me.body)).toEqual(consentSlice(preferences.body));
    expect(me.body.granted).toBe(false);
    expect(me.body.smsPermission).toBe("WITHDRAWN");
    expect(me.body.emailPermission).toBe("UNKNOWN");
    expect(me.body.whatsappPermission).toBe("UNKNOWN");
    expect(me.body.preferences.marketing).toBeUndefined();
    expect(preferences.body.preferences.emailOptIn).toBeUndefined();
  });

  it("persists an opt-out, refuses an opt-in, and refuses a fake grant", () => {
    const optedOut = crm.upsertCrmProfile("8800000000091", {
      marketingEmail: false,
      language: "tr",
      phone: "+491111",
      idempotencyKey: "source-opt-out",
    });
    expect(optedOut.persisted).toBe(true);
    expect(optedOut.stored).toBe(true);
    expect(optedOut.granted).toBe(false);
    expect(optedOut.emailPermission).toBe("WITHDRAWN");
    expect(optedOut.contactStored).toBe(false);
    expect(optedOut.contactCode).toBe("DATABASE_NOT_INITIALIZED");
    expect(optedOut.whatsappPermission).toBe("UNKNOWN");

    const optedIn = crm.upsertCrmProfile("8800000000091", {
      marketingEmail: true,
      granted: true,
      ok: true,
      status: 200,
      idempotencyKey: "source-opt-in",
    });
    expect(optedIn.persisted).toBe(false);
    expect(optedIn.stored).toBe(false);
    expect(optedIn.granted).toBe(false);
    expect(optedIn.emailPermission).toBe("WITHDRAWN");
    expect(handle.readAll().some((row) => row.consent_status === "GRANTED")).toBe(false);

    const missing = consent.bindProductionConsentLedger();
    expect(missing.persisted).toBe(false);
    expect(missing.granted).toBe(false);
    const unavailable = store.accountConsentView({ id: "missing-customer", preferences: { marketing: true } });
    expect(unavailable.granted).toBe(false);
    expect(unavailable.emailPermission).toBe("CLOSED");
    expect(unavailable.whatsappPermission).toBe("BLOCKED");
    expect(unavailable.marketingPermission).toBe("CLOSED");
    expect(getDatabaseHealth().initialized).toBe(false);
    expect(getDatabaseHealth().opened).toBe(false);
  });

  it("does not store a registration marketing flag as consent", () => {
    const registered = store.register({
      email: "register-source@example.test",
      password: "long-password",
      firstName: "Reg",
      lastName: "User",
      marketing: true,
      language: "de",
    });
    expect(registered.success).toBe(true);
    expect(registered.customer.preferences.marketing).toBeUndefined();
    expect(registered.customer.preferences.language).toBe("de");
    expect(registered.customer.preferences.transactional).toBe(true);
    const saved = JSON.parse(files.get(path.join(__dirname, "..", "data", "customers.json")));
    expect(saved[0].preferences.marketing).toBeUndefined();
    expect(consent.readMarketingConsent(registered.customer.id).granted).toBe(false);
    expect(consent.readMarketingConsent(registered.customer.id).emailPermission).toBe("UNKNOWN");
  });
});
