import crypto from "node:crypto";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

process.env.BUZZARD_SALES_ENABLED = "0";
process.env.BUZZARD_PAYMENT_ENABLED = "1";
process.env.BUZZARD_STRIPE_ENABLED = "1";
process.env.STRIPE_SECRET_KEY = "sk_test_not_used";

const require = createRequire(import.meta.url);
const { detectPriceTampering, computeOrderTotals } = require("../lib/commerce/commerceValidation");
const { calculateTax, getTaxRate } = require("../lib/commerce/taxProvider");
const { capturePayment, StripeProvider, PayPalProvider, getProviderHealth } = require("../lib/commerce/paymentService");
const { getEffectiveFlags } = require("../lib/commerce/commerceFeatureFlags");
const { createRefund } = require("../lib/paymentsFinance");
const { verify } = require("../lib/finance/paymentWebhook");
const { requestReturn, refundMoney, createReturnStore } = require("../lib/commerce/dryReturnRequest");
const { startReturn } = require("../lib/logistics/v5/returnsEngine");
const { notImplemented } = require("../lib/buzzardNative/engineContract");
const { evaluateCapabilityMatrix } = require("../lib/supplier/supplierCapabilityMatrix");
const { SUPPLIER_CAPABILITY } = require("../core/supplierIntegrationConstants");
const { decidePublish, snapshot } = require("../lib/marketplace/marketplaceConnectorRegistry");
const { inspectFeeds } = require("../lib/buzzardNative/core/specialists/stockEngine");
const { isSalesEnabled } = require("../lib/salesMode");

describe("items 89-115 commerce boundaries", () => {
  it("keeps the server price snapshot and the market currency", () => {
    const totals = computeOrderTotals({
      items: [{ priceSnapshot: 12.5, quantity: 2 }],
      currency: "EUR",
    });
    expect(totals.currency).toBe("EUR");
    expect(totals.subtotal).toBe(25);
    expect(detectPriceTampering(1, 12.5).code).toBe("price_tampering");
    expect(getTaxRate("DE")).toBe(19);
    expect(calculateTax({ country: "ZZ", subtotal: 10 }).code).toBe("tax_rate_unknown");
    expect(calculateTax({ country: "DE", subtotal: 10 }).currency).toBe("EUR");
  });

  it("refuses live capture, refund, and unsigned payment proof", async () => {
    expect(isSalesEnabled()).toBe(false);
    const flags = getEffectiveFlags();
    expect(flags.salesEnabled).toBe(false);
    expect(flags.paymentEnabled).toBe(false);
    expect(flags.stripeEnabled).toBe(false);
    const stripe = await new StripeProvider().authorize();
    const paypal = await new PayPalProvider().authorize();
    expect(stripe.realMoneyMovement).toBe(false);
    expect(paypal.realMoneyMovement).toBe(false);
    const capture = capturePayment({ actorId: "commerce-test" });
    expect(capture.code).toBe("PAYMENT_NOT_LIVE");
    expect(capture.status).toBe(403);
    expect(capture.realMoneyMovement).toBe(false);
    expect(createRefund("missing").code).toBe("REFUND_NOT_LIVE");
    expect(getProviderHealth().realMoneyMovement).toBe(false);
    const unsigned = verify({ payload: "{}", header: "", secret: "local-test-secret" });
    expect(unsigned.code).toBe("MISSING_SIGNATURE");
    expect(unsigned.live).toBe(false);
    const payload = `{"probe":${process.pid}}`;
    const header = crypto.createHmac("sha256", "local-test-secret").update(payload).digest("hex");
    const signed = verify({ payload, header, secret: "local-test-secret" });
    expect(signed.ok).toBe(true);
    expect(signed.moneyMoved).toBe(false);
    expect(verify({ payload, header, secret: "local-test-secret" }).code).toBe("REPLAY");
  });

  it("does not treat a return, a bad feed, or a listing as money or live stock", () => {
    const store = createReturnStore();
    const claim = requestReturn(store, { orderId: "DRY-89" });
    expect(claim.refundIssued).toBe(false);
    expect(claim.live).toBe(false);
    expect(refundMoney().code).toBe("REAL_REFUND_BLOCKED");
    const flow = startReturn({ shipmentId: "DRY-89" });
    expect(flow.customerRefundIssued).toBe(false);
    expect(flow.supplierRefundReceived).toBe(false);
    store.db.close();

    expect(notImplemented("supplier.order").code).toBe("NOT_IMPLEMENTED");
    const matrix = evaluateCapabilityMatrix({ format: "csv", capabilities: [], credentialsConfigured: false });
    expect(matrix.matrix[SUPPLIER_CAPABILITY.ORDERS].supported).toBe(false);
    expect(matrix.canGoLive).toBe(false);
    const stock = inspectFeeds({
      actorId: "stock_ai",
      feeds: [{ supplier: "csv", sku: "X", qty: "bad", updatedAt: Date.now() }],
    });
    expect(stock.sellable).toBe(false);
    expect(stock.liveSupplierApi).toBe(false);

    const publish = decidePublish(
      { id: "amazon", publishEnv: "AMAZON_PUBLISH_ALLOWED", oauthEnv: "AMAZON_SP_API_CLIENT_ID" },
      { sku: "REG-1", title: "Regalblech", price: 12.5, currency: "EUR" }
    );
    expect(publish.live).toBe(false);
    expect(snapshot().anyLive).toBe(false);
  });
});
