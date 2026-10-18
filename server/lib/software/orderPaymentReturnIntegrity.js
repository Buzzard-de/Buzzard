/**
 * Order, payment, and return integrity — local software only.
 * Sales stay off. Live Stripe/PayPal HTTP stays blocked.
 * Client-paid and unsigned webhooks cannot mark money moved.
 * Customer refund is not supplier credit.
 */

const { isSalesEnabled } = require("../salesMode");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const { assertCanCreateOrder, assertCustomerResourceAccess } = require("../commerce/commerceGuards");
const stripeAdapter = require("../commerce/providers/stripeAdapter");
const paypalAdapter = require("../commerce/providers/paypalAdapter");
const { clientCannotMarkPaid } = require("../commerce/providers/dualPaymentEngine");
const orders = require("./orders");
const returns = require("./returns");
const payments = require("./payments");
const officialPaymentIngress = require("./officialPaymentIngress");
const firstOrderGate = require("./firstOrderGate");
const { ORDER_TYPE } = require("../../core/commerceConstants");

function inspect() {
  const flags = getEffectiveFlags();
  const stripe = stripeAdapter.operationalStatus();
  const paypal = paypalAdapter.operationalStatus();
  const ingress = officialPaymentIngress.describeIngress();
  return {
    ok: true,
    live: false,
    liveVerified: false,
    salesEnabled: isSalesEnabled() === true,
    livePaymentsEnabled: flags.livePaymentsEnabled === true,
    commercialCreated: false,
    realMoneyMovement: false,
    stripeLiveVerified: stripe.liveVerified === true,
    paypalLiveVerified: paypal.liveVerified === true,
    unsignedCanMarkPaid: ingress.unsignedCanMarkPaid === true,
    refundDistinctFromSupplierCredit: ingress.refundDistinctFromSupplierCredit === true,
  };
}

function createCommercialOrder(input = {}) {
  const sales = assertCanCreateOrder({ orderType: ORDER_TYPE.COMMERCIAL });
  if (sales) {
    return {
      ok: false,
      commercial: false,
      commercialCreated: false,
      charged: false,
      live: false,
      reason: "SALES_DISABLED",
      errorKey: sales.errorKey || sales.code,
    };
  }
  const placed = firstOrderGate.place(input);
  return { ...placed, commercialCreated: false, charged: false };
}

function createDraft(input = {}) {
  return orders.createDraft(input);
}

async function liveCharge(provider = "stripe", input = {}) {
  const session =
    provider === "paypal"
      ? await paypalAdapter.createOrder(input, {})
      : await stripeAdapter.createCheckoutSession(input, {});
  return {
    ...session,
    live: false,
    paid: false,
    realMoneyMovement: false,
  };
}

function confirmPayment() {
  return {
    ok: false,
    applied: false,
    live: false,
    paid: false,
    reason: "PROVIDER_CONFIRMATION_REQUIRED",
    officialPath: officialPaymentIngress.OFFICIAL_PATH,
  };
}

function executeRefund() {
  return {
    ok: false,
    applied: false,
    live: false,
    financialEffect: false,
    refundExecuted: false,
    reason: "PROVIDER_REFUND_REQUIRED",
    officialPath: officialPaymentIngress.OFFICIAL_PATH,
  };
}

function retryUncertain(input = {}) {
  return {
    ...payments.draftCharge({ ...input, retry: true, timeout: true, previousOutcome: "UNCERTAIN" }),
    paid: false,
    live: false,
  };
}

function unsignedWebhook() {
  const validated = payments.validateWebhook({ headers: {}, secretConfigured: true });
  return {
    ...validated,
    paid: false,
    markedPaid: false,
    shipmentAuthorized: false,
  };
}

function acceptClientPaid(status = "paid") {
  const proof = clientCannotMarkPaid(status);
  return {
    accepted: proof.accepted === true,
    paid: false,
    live: false,
    reason: proof.reason || "CLIENT_STATUS_NOT_AUTHORITATIVE",
  };
}

function guestResource(input = {}) {
  const denied = assertCustomerResourceAccess({
    resourceType: input.resourceType || "order",
    resourceCustomerId: input.resourceCustomerId || null,
    requestCustomerId: input.requestCustomerId || null,
    allowGuestCapability: false,
    guestProofValid: false,
  });
  return {
    blocked: Boolean(denied),
    status: denied?.status || 200,
    code: denied?.code || null,
    live: false,
  };
}

function mintLoyaltyFromGuest() {
  return {
    ok: false,
    minted: false,
    valueCreated: false,
    liveCampaign: false,
    reason: "GUEST_LOYALTY_MINT_BLOCKED",
  };
}

function financeWriteAuthz() {
  return {
    publicMarkPaid: false,
    writePermission: "orders.write",
    live: false,
  };
}

function openReturn(db, input = {}) {
  return returns.openCase(db, input);
}

module.exports = {
  inspect,
  createCommercialOrder,
  createDraft,
  liveCharge,
  confirmPayment,
  executeRefund,
  retryUncertain,
  unsignedWebhook,
  acceptClientPaid,
  guestResource,
  mintLoyaltyFromGuest,
  financeWriteAuthz,
  openReturn,
};
