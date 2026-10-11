/**
 * Safe customer workflow using existing engines. No commercial side effects.
 */

const productCore = require("../pim/productCore");
const guardian = require("../pusat/guardian");

function runSafeCustomerWorkflow(software, db, input = {}) {
  const sku = input.sku || `SW-WF-${Date.now()}`;
  const customerId = input.customerId || "cust_workflow";

  const dryRun = productCore.createProduct(
    { sku, title: input.title || "Workflow dry", status: "DRAFT" },
    { dryRun: true, source: "TEST" }
  );

  let activeRejected = false;
  try {
    productCore.createProduct({ sku: `${sku}-ACT`, title: "Nope", status: "ACTIVE" }, { dryRun: true });
  } catch {
    activeRejected = true;
  }

  const price = software.pricing.quote({
    supplierCost: input.supplierCost ?? 10,
    shippingCost: input.shippingCost ?? 2,
    extraCosts: 0.5,
    returnReserve: 0.4,
    marketplaceCommissionRate: 0.12,
    taxRate: 0.19,
  });

  const stock = software.inventory.evaluateReliability({
    sku,
    quantity: input.stock ?? 8,
    source: input.stockSource || "supplier_feed",
    lastSupplierUpdate: input.lastSupplierUpdate || new Date().toISOString(),
  });

  const draft = software.orders.createDraft({
    sku,
    customerId,
    supplierCost: input.supplierCost ?? 10,
    shippingCost: input.shippingCost ?? 2,
    returnReserve: 0.4,
    marketplaceCommissionRate: 0.12,
    taxRate: 0.19,
    stock: input.stock ?? 8,
    stockSource: input.stockSource || "supplier_feed",
    lastSupplierUpdate: input.lastSupplierUpdate || new Date().toISOString(),
    originCountry: "DE",
    destinationCountry: "FR",
    category: "automotive",
  });

  const denied = guardian.evaluate({
    agentId: "order_ai",
    employee: { id: "order_ai", status: "ACTIVE", permissions: ["ai.execute"] },
    action: "supplier.order.submit",
    payload: { sku, customerId },
    permissionsRequired: ["supplier.order.submit"],
  });

  const payment = software.payments.interpretProviderResult({ timeout: true });
  const message = software.communications.draft(db, {
    customerId,
    channel: "email",
    message: `Workflow inquiry for ${sku}`,
  });
  const sent = software.communications.sendPrepared(db, message.draft?.id);
  const listing = software.marketplace.draftListing({ channel: "amazon", sku, price: price.salePrice });
  const carrier = software.carriers.lookup({ carrier: "dhl", trackingNumber: null });

  return {
    steps: {
      productDryRun: { pass: dryRun.dryRun === true && dryRun.written === false },
      productValidation: { pass: activeRejected },
      canonicalPrice: { pass: price.ok === true && price.marketUndercut.implemented === false },
      inventory: { pass: stock.purchaseOwnStock === false },
      orderDraft: { pass: draft.draft === true && draft.commercial === false && draft.sent === false },
      approvalRequired: { pass: denied.allowed === false },
      guardian: { pass: denied.allowed === false },
      commercialBlocked: { pass: draft.salesLocked === true },
      paymentUncertain: { pass: payment.outcome === "UNCERTAIN" && payment.retryable === false },
      communicationsBlocked: { pass: sent.sent === false },
      marketplaceUnpublished: { pass: listing.published === false },
      carrierIdle: { pass: carrier.shipmentCreated === false && carrier.gpsInvented === false },
    },
    commercialOrders: 0,
    paymentExecuted: false,
    refundExecuted: false,
    supplierOrderSent: false,
    productActivated: false,
    listingPublished: false,
    customerMessageSent: false,
    carrierAction: false,
    salesEnabled: draft.salesEnabled,
  };
}

module.exports = { runSafeCustomerWorkflow };
