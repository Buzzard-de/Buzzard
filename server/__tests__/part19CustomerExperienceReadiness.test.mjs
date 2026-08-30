import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

describe("Part 19 — order lifecycle", () => {
  it("1. exposes commerce order lifecycle model", () => {
    const lifecycle = require("../lib/customer/customerOrderLifecycle.js");
    const model = lifecycle.getLifecycleModel();
    expect(model.primaryStore).toBe("commerce_orders");
    expect(model.orderStatuses).toContain("CONFIRMED");
    expect(model.orderTypes).toContain("DRY_RUN");
  });

  it("2. commercial orders blocked while sales OFF", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const lifecycle = require("../lib/customer/customerOrderLifecycle.js");
    const readiness = lifecycle.getOrderLifecycleReadiness();
    expect(readiness.commercialWhileSalesOff).toBe(true);
  });
});

describe("Part 19 — order history bridge", () => {
  it("3. bridges commerce_orders and legacy JSON", () => {
    const bridge = require("../lib/customer/customerOrderBridge.js");
    const readiness = bridge.getOrderHistoryReadiness();
    expect(readiness.sources).toContain("commerce_orders");
    expect(readiness.bridgeEnabled).toBe(true);
    expect(readiness.realOrdersEnabled).toBe(false);
  });

  it("4. listCustomerOrders returns array", () => {
    const bridge = require("../lib/customer/customerOrderBridge.js");
    const orders = bridge.listCustomerOrders("cust_nonexistent", "none@example.com");
    expect(Array.isArray(orders)).toBe(true);
  });
});

describe("Part 19 — customer isolation", () => {
  it("5. customer cannot access another customer order", () => {
    const bridge = require("../lib/customer/customerOrderBridge.js");
    const order = bridge.getCustomerOrder("ORD-OTHER", "cust_a", "a@example.com");
    expect(order).toBeNull();
  });
});

describe("Part 19 — returns fail-closed", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
  });

  it("6. return request blocked while sales OFF", () => {
    const guard = require("../lib/customer/customerMutationGuard.js");
    const block = guard.assertReturnRequestAllowed({ req: {} });
    expect(block.blocked).toBe(true);
    expect(block.failClosed).toBe(true);
  });

  it("7. real refund blocked while sales OFF", () => {
    const guard = require("../lib/customer/customerMutationGuard.js");
    const block = guard.assertRealRefundAllowed({ req: {} });
    expect(block.blocked).toBe(true);
  });
});

describe("Part 19 — notifications", () => {
  it("8. notification readiness without SMTP", () => {
    const notif = require("../lib/customer/customerNotificationReadiness.js");
    const readiness = notif.getNotificationReadiness();
    expect(readiness.notificationEngine).toBe(true);
    expect(readiness.realEmailSendWhileSalesOff).toBe(false);
  });
});

describe("Part 19 — invoice and privacy", () => {
  it("9. invoice readiness is metadata-only", () => {
    const invoice = require("../lib/customer/customerInvoiceReadiness.js");
    const readiness = invoice.getInvoiceReadiness();
    expect(readiness.pdfGeneration).toBe(false);
    expect(readiness.metadataOnly).toBe(true);
  });

  it("10. privacy deletion requires human review", () => {
    const privacy = require("../lib/customer/customerPrivacyReadiness.js");
    const readiness = privacy.getPrivacyReadiness();
    expect(readiness.requiresHumanApproval).toBe(true);
    expect(readiness.autoErasurePipeline).toBe(false);
  });
});

describe("Part 19 — customer audit", () => {
  it("11. records customer audit without secrets", () => {
    const audit = require("../lib/customer/customerExperienceAudit.js");
    const operationsAudit = require("../lib/operations/operationsAudit.js");
    const corrId = `cx_${crypto.randomBytes(4).toString("hex")}`;
    audit.recordCustomerAction(
      { customerSession: { email: "cx@test.de", customerId: "cust_test" }, correlationId: corrId },
      {
        action: audit.CUSTOMER_AUDIT_ACTIONS.CUSTOMER_ORDER_VIEW,
        resource: "order",
        resourceId: "ord_test",
        metadata: { apiKey: "secret-should-redact" },
      }
    );
    const rows = operationsAudit.findByCorrelationId(corrId);
    expect(rows.length).toBe(1);
    expect(JSON.stringify(rows)).not.toContain("secret-should-redact");
  });
});

describe("Part 19 — idempotency", () => {
  it("12. checkout idempotency scope exists", () => {
    const idempotency = require("../lib/commerce/idempotency.js");
    expect(typeof idempotency.withIdempotency).toBe("function");
  });
});

describe("Part 19 — CX readiness center", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("13. diagnostic only — never auto-activates", () => {
    const cx = require("../lib/customer/customerExperienceReadiness.js");
    const report = cx.evaluateCustomerExperienceReadiness();
    expect(report.CUSTOMER_EXPERIENCE_READINESS.diagnosticOnly).toBe(true);
    expect(report.CUSTOMER_EXPERIENCE_READINESS.autoActivate).toBe(false);
    expect(report.CUSTOMER_EXPERIENCE_READINESS.gates.length).toBe(12);
  });

  it("14. safety gate PASS with sales OFF", () => {
    const cx = require("../lib/customer/customerExperienceReadiness.js");
    const report = cx.evaluateCustomerExperienceReadiness();
    const safety = report.CUSTOMER_EXPERIENCE_READINESS.gates.find((g) => g.gate === "SAFETY");
    expect(safety.status).toBe("PASS");
  });

  it("15. fail-closed gate PASS", () => {
    const cx = require("../lib/customer/customerExperienceReadiness.js");
    const report = cx.evaluateCustomerExperienceReadiness();
    const fc = report.CUSTOMER_EXPERIENCE_READINESS.gates.find((g) => g.gate === "FAIL_CLOSED");
    expect(fc.status).toBe("PASS");
  });
});

describe("Part 19 — safety regression", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.BUZZARD_STRIPE_ENABLED = "0";
    process.env.BUZZARD_PAYPAL_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  });

  it("16. go-live lock active", () => {
    const goLiveApproval = require("../lib/commerce/goLiveApproval.js");
    expect(goLiveApproval.PRODUCTION_SAFETY_LOCK).toBe(true);
  });

  it("17. stripe and paypal OFF", () => {
    const { getEffectiveFlags } = require("../lib/commerce/commerceFeatureFlags.js");
    const flags = getEffectiveFlags();
    expect(flags.stripeEnabled).toBe(false);
    expect(flags.paypalEnabled).toBe(false);
    expect(flags.mockPaymentOnly).toBe(true);
  });

  it("18. OMS create blocked while sales OFF", () => {
    const guard = require("../lib/customer/customerMutationGuard.js");
    const block = guard.assertCustomerMutationAllowed({ req: {}, action: "oms_order_create" });
    expect(block.blocked).toBe(true);
  });

  it("19. public catalog unchanged", () => {
    const catalogReadService = require("../lib/storefront/catalogReadService.js");
    const health = catalogReadService.getHealth();
    expect(health.salesEnabled).toBe(false);
  });

  it("20. auth bridge resolves null without token", () => {
    const authBridge = require("../lib/customer/customerAuthBridge.js");
    expect(authBridge.resolveCustomerSession({ headers: {} })).toBeNull();
  });
});
