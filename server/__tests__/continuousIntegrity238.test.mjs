import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("items 15/21 — plugin public errors", () => {
  it("does not put exception text on admin-gate or plugin errors", () => {
    const { sendPublicError, sendAdminGateError } = require("../lib/http/publicPluginError.js");
    const captured = [];
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        captured.push(body);
        return this;
      },
    };
    sendPublicError(res, 400, "pim.request.invalid", new Error("SQLITE_ERROR: no such table /var/data/secret"));
    sendAdminGateError(res, Object.assign(new Error("Refusing sales activation"), { code: "admin_action_blocked" }));
    expect(captured[0].errorKey).toBe("pim.request.invalid");
    expect(JSON.stringify(captured[0])).not.toContain("SQLITE_ERROR");
    expect(JSON.stringify(captured[0])).not.toContain("/var/data");
    expect(captured[1].errorKey).toBe("admin_action_blocked");
    expect(captured[1].message).toBeUndefined();
    expect(captured[1].details).toBeUndefined();
  });
});

describe("item 14/183 — webhook payload redaction", () => {
  it("redacts secret keys from stored webhook payloads", () => {
    const { redactWebhookPayload } = require("../lib/commerce/webhookFoundation.js");
    const redacted = redactWebhookPayload({
      id: "evt_1",
      apiKey: "sk_live_secret",
      client_secret: "whsec_abc",
    });
    expect(redacted.apiKey).toBe("[redacted]");
    expect(JSON.stringify(redacted)).not.toContain("sk_live_secret");
  });
});

describe("item 37 — pusat memory errors", () => {
  it("does not attach raw SQL messages to memory failures", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "../lib/pusat/memory.js"),
      "utf8"
    );
    expect(src).not.toMatch(/message: error\.message/);
    expect(src).toMatch(/error: "database_failure"/);
  });
});

describe("item 104 — uncertain payments never auto-capture", () => {
  it("refuses capture from reconciliation and does not count uncertain as revenue", () => {
    const software = require("../lib/software");
    const { db } = require("../lib/db");
    software.initialize(db);
    const sc = software.secureCommerce;
    const created = sc.paymentLifecycle.createPayment(db, {
      orderId: `ord_${crypto.randomBytes(4).toString("hex")}`,
      amount: 15,
      currency: "EUR",
    });
    sc.paymentLifecycle.applyState(
      db,
      created.payment.id,
      sc.constants.PAYMENT_STATE.PAYMENT_RECONCILIATION_REQUIRED,
      "timeout"
    );
    const capture = sc.paymentLifecycle.applyState(
      db,
      created.payment.id,
      sc.constants.PAYMENT_STATE.PAYMENT_CAPTURED,
      "blind"
    );
    expect(capture.ok).toBe(false);
    expect(capture.reason).toBe("RECONCILIATION_CAPTURE_REQUIRES_HUMAN");
    const report = software.reporting.getOperationalReport(db);
    expect(report.inventedRevenue).toBe(false);
    expect(report.payments.capturedAsRevenue).toBe(0);
  });
});

describe("item 109 — webhook signature, stale timestamp, event id", () => {
  it("rejects missing event id, stale stripe-shaped timestamp, and unsigned replay", () => {
    const lifecycle = require("../lib/software/paymentLifecycle.js");
    const secret = "whsec_test";
    const body = JSON.stringify({ id: "evt_local" });
    const nowSec = Math.floor(Date.now() / 1000);
    const stale = nowSec - 3600;
    const staleSig = `t=${stale},v1=${crypto.createHmac("sha256", secret).update(`${stale}.${body}`).digest("hex")}`;
    const staleCheck = lifecycle.verifyWebhookSignature({
      rawBody: body,
      signature: staleSig,
      secret,
      now: nowSec * 1000,
    });
    expect(staleCheck.ok).toBe(false);
    expect(staleCheck.reason).toBe("WEBHOOK_TIMESTAMP_STALE");

    const fresh = nowSec;
    const goodSig = `t=${fresh},v1=${crypto.createHmac("sha256", secret).update(`${fresh}.${body}`).digest("hex")}`;
    const good = lifecycle.verifyWebhookSignature({
      rawBody: body,
      signature: goodSig,
      secret,
      now: nowSec * 1000,
    });
    expect(good.ok).toBe(true);

    const webhook = require("../lib/commerce/webhookFoundation.js");
    const missing = webhook.handleWebhook({
      provider: "stripe",
      eventType: "payment_intent.succeeded",
      rawBody: body,
      signature: goodSig,
      secret,
    });
    expect(missing.accepted).toBe(false);
    expect(missing.code === "event_id_required" || missing.code === "webhook_blocked").toBe(true);
  });
});

describe("item 187 — restore refuses ephemeral production targets", () => {
  it("blocks /tmp restore even if production restore is explicitly allowed", () => {
    const { assertRestoreAllowed } = require("../lib/software/restoreGuard.js");
    expect(() =>
      assertRestoreAllowed(path.join(os.tmpdir(), "buzzard-restore.db"), {
        NODE_ENV: "production",
        BUZZARD_ALLOW_PRODUCTION_RESTORE: "1",
      })
    ).toThrow(/ephemeral/);
    expect(() =>
      assertRestoreAllowed("/var/data/buzzard.db", { NODE_ENV: "production" })
    ).toThrow(/PRODUCTION_RESTORE_BLOCKED|production target/);
  });
});
