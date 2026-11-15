import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const engine = require("../lib/notificationEngine.js");
const consent = require("../lib/commerce/marketingConsentGate.js");
const orders = require("../lib/commerce/transactionalOrderVerify.js");

const commerceDb = path.join(__dirname, "..", "data", "buzzard.db");
const workspaceDb = "/workspace/server/data/buzzard.db";

function statOf(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { size: stat.size, mtimeMs: stat.mtimeMs };
}

function placedOrder() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-order-verify-"));
  const fixture = orders.openIsolatedOrderFixture(path.join(directory, "orders.sqlite"));
  fixture.insertOrder({
    orderNumber: "BZ-REAL",
    customerId: "cust-real",
    status: "placed",
    purpose: "order_status",
  });
  return fixture;
}

describe("transactional order verification", () => {
  const commerceBefore = statOf(commerceDb);
  const workspaceBefore = statOf(workspaceDb);

  afterEach(() => {
    orders.unbindOrderRepository();
    consent.unbindConsentLedger();
    consent.clearConsentMemory();
    engine.releaseNotificationQueue();
  });

  it("authorizes a recorded order for the matching customer and event", () => {
    const fixture = placedOrder();
    const result = engine.canSend({
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      purpose: "order_status",
      channel: "email",
      email: "buyer@example.test",
      orderVerified: false,
    }, "new_order");
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("transactional_authorized");
    expect(result.sent).toBe(false);
    expect(result.live).toBe(false);
    expect(result.productionReady).toBe(false);
    expect(result.salesOpen).toBe(false);
    expect(result.egress).toBe("DENY");
    fixture.close();
  });

  it("denies a missing order, the wrong customer, and the wrong status", () => {
    const fixture = placedOrder();
    const missing = engine.canSend({
      customerId: "cust-real",
      orderNumber: "BZ-MISSING",
      channel: "email",
      email: "buyer@example.test",
      orderVerified: true,
    }, "new_order");
    expect(missing.ok).toBe(false);
    expect(missing.reason).toBe("order_not_found");

    const wrongCustomer = engine.canSend({
      customerId: "cust-other",
      orderNumber: "BZ-REAL",
      orderCustomerId: "cust-other",
      channel: "email",
      email: "buyer@example.test",
      verified: true,
    }, "new_order");
    expect(wrongCustomer.ok).toBe(false);
    expect(wrongCustomer.reason).toBe("customer_order_mismatch");

    const wrongStatus = engine.canSend({
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      channel: "email",
      email: "buyer@example.test",
      shipmentVerified: true,
    }, "order_shipped");
    expect(wrongStatus.ok).toBe(false);
    expect(wrongStatus.reason).toBe("order_status_mismatch");
    fixture.close();
  });

  it("denies a caller verified flag when the repository is missing or closed", () => {
    const claimed = engine.canSend({
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      orderVerified: true,
      verified: true,
      purpose: "order_status",
      channel: "email",
      email: "buyer@example.test",
    }, "new_order");
    expect(claimed.ok).toBe(false);
    expect(claimed.reason).toBe("repository_unavailable");

    orders.bindOrderRepository({
      readOrder() {
        throw new Error("store down");
      },
    });
    const down = engine.canSend({
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      channel: "email",
      email: "buyer@example.test",
    }, "payment_confirmed");
    expect(down.ok).toBe(false);
    expect(down.reason).toBe("repository_unavailable");
  });

  it("keeps a recorded order from becoming a marketing send", () => {
    const fixture = placedOrder();
    const marketed = engine.canSend({
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      purpose: "marketing",
      marketingConsent: true,
      channel: "email",
      email: "buyer@example.test",
    }, "new_order");
    expect(marketed.ok).toBe(false);
    expect(marketed.reason).toBe("transactional_not_marketing");
    fixture.close();
  });

  it("keeps marketing channels, unknown events, and an empty recipient closed", () => {
    consent.bindConsentLedger({
      readAll() {
        return [];
      },
      readCustomer() {
        return { email: "GRANTED", sms: "UNKNOWN", push: "UNKNOWN", marketing_tracking: "GRANTED" };
      },
    });
    const sms = engine.canSend({
      customerId: "cust-channel",
      channel: "sms",
      phone: "+490000",
      email: "buyer@example.test",
    }, "review_request");
    expect(sms.ok).toBe(false);
    expect(sms.reason).toBe("marketing_consent_required");
    expect(sms.smsPermission).toBe("UNKNOWN");

    consent.bindConsentLedger({
      readAll() {
        return [];
      },
      readCustomer() {
        return { email: "UNKNOWN", sms: "GRANTED", push: "UNKNOWN", marketing_tracking: "GRANTED" };
      },
    });
    const push = engine.canSend({
      customerId: "cust-channel",
      channel: "push",
      pushToken: "device-1",
      marketing_tracking: "GRANTED",
    }, "review_request");
    expect(push.ok).toBe(false);
    expect(push.reason).toBe("marketing_consent_required");
    expect(push.smsPermission).toBe("GRANTED");
    expect(push.pushPermission).toBe("UNKNOWN");
    expect(push.trackingPermission).not.toBe("GRANTED");

    const unknown = engine.canSend({
      email: "buyer@example.test",
      phone: "+490000",
      pushToken: "device-1",
      marketing_tracking: "GRANTED",
    }, "unknown_promo");
    expect(unknown.ok).toBe(false);
    expect(unknown.reason).toBe("unknown_event_type");

    const withdrawn = consent.decideMarketingConsent({
      idempotencyKey: "order-verify-withdraw",
      customerId: "cust-withdrawn",
      channel: "email",
      action: "withdraw",
      source: "account-settings",
      scope: "marketing-email",
      consentedAt: "2020-01-01T00:00:00.000Z",
    });
    expect(withdrawn.granted).toBe(false);
    const withdrawnSend = engine.canSend({
      customerId: "cust-withdrawn",
      channel: "email",
      email: "buyer@example.test",
    }, "review_request");
    expect(withdrawnSend.ok).toBe(false);
    expect(withdrawnSend.emailPermission).toBe("WITHDRAWN");

    const missingRecipient = engine.canSend({
      customerId: "cust-real",
      orderNumber: "BZ-REAL",
      channel: "email",
    }, "new_order");
    expect(missingRecipient.ok).toBe(false);
    expect(missingRecipient.reason).toBe("no_recipient");

    const queue = engine.isolateNotificationQueue();
    const stored = engine.queueNotification({
      type: "unknown_promo",
      email: "buyer@example.test",
      channel: "email",
    });
    expect(stored.queued).toBe(false);
    expect(stored.stored).toBe(false);
    expect(queue).toEqual([]);
    expect(statOf(commerceDb)).toEqual(commerceBefore);
    expect(statOf(workspaceDb)).toEqual(workspaceBefore);
  });

  it("refuses the protected commerce database as an order fixture", () => {
    expect(() => orders.openIsolatedOrderFixture(commerceDb)).toThrow(/DATA_PATH_REFUSED/);
    expect(() => orders.openIsolatedOrderFixture(workspaceDb)).toThrow(/DATA_PATH_REFUSED/);
    expect(statOf(commerceDb)).toEqual(commerceBefore);
    expect(statOf(workspaceDb)).toEqual(workspaceBefore);
  });
});
