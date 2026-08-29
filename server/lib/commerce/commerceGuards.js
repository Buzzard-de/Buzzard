/**
 * Part 8 — Commerce security guards (sales gate, IDOR, feature flags)
 */
const { isSalesEnabled, salesDisabledResponse } = require("../salesMode");
const { logSecurityEvent } = require("../securityLog");
const { assertFeatureAllowed } = require("./commerceFeatureFlags");
const { isCommercialOrderType, ORDER_TYPE } = require("../../core/commerceConstants");

function logCommerceBlock(type, detail, req) {
  return logSecurityEvent({
    type,
    success: false,
    ip: req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || req?.socket?.remoteAddress,
    path: req?.url,
    userId: req?.customer?.id || req?.adminUser?.userId || null,
    detail,
  });
}

function assertSalesEnabledForCommercialAction(context = {}) {
  if (isSalesEnabled()) return null;
  return {
    blocked: true,
    code: "sales_disabled",
    message: "Commercial commerce actions are blocked (catalog mode)",
    status: 403,
    orderType: context.orderType || ORDER_TYPE.COMMERCIAL,
  };
}

function assertCanCreateOrder({ orderType = ORDER_TYPE.DRY_RUN, req } = {}) {
  if (isCommercialOrderType(orderType)) {
    const salesBlock = assertSalesEnabledForCommercialAction({ orderType });
    if (salesBlock) {
      logCommerceBlock("order_creation_blocked", { orderType, reason: "sales_disabled" }, req);
      return salesBlock;
    }
  }
  return null;
}

function assertCanProcessPayment({ req } = {}) {
  const check = assertFeatureAllowed("payment");
  if (!check.allowed) {
    logCommerceBlock("payment_attempt_blocked", { reason: check.code }, req);
    return { blocked: true, code: check.code, message: check.message, status: 403 };
  }
  return null;
}

function assertCanSubmitSupplierOrder({ req } = {}) {
  const check = assertFeatureAllowed("supplier_order");
  if (!check.allowed) {
    logCommerceBlock("order_creation_blocked", { type: "supplier_order", reason: check.code }, req);
    return { blocked: true, code: check.code, message: "Supplier orders are disabled", status: 403 };
  }
  return null;
}

function assertCustomerResourceAccess({ resourceCustomerId, requestCustomerId, resourceType, req }) {
  if (!requestCustomerId) {
    logCommerceBlock("commerce_permission_denied", { resourceType, reason: "unauthenticated" }, req);
    return { blocked: true, code: "auth_required", message: "Authentication required", status: 401 };
  }
  if (resourceCustomerId && resourceCustomerId !== requestCustomerId) {
    logCommerceBlock("idor_attempt", { resourceType, resourceCustomerId }, req);
    return { blocked: true, code: "idor_denied", message: "Access denied", status: 403 };
  }
  return null;
}

function resolveOrderType(requestedType) {
  if (!isSalesEnabled()) {
    if (requestedType === ORDER_TYPE.COMMERCIAL) return { blocked: true, code: "sales_disabled" };
    return { orderType: requestedType || ORDER_TYPE.DRY_RUN };
  }
  return { orderType: requestedType || ORDER_TYPE.COMMERCIAL };
}

function getSalesSafetyStatus() {
  return {
    salesEnabled: isSalesEnabled(),
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    paypalConfigured: Boolean(process.env.PAYPAL_CLIENT_ID),
    supplierOrdersEnv: process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED === "1",
    effective: assertFeatureAllowed("sales"),
    catalogMode: !isSalesEnabled(),
    salesDisabledResponse: salesDisabledResponse(),
  };
}

module.exports = {
  logCommerceBlock,
  assertSalesEnabledForCommercialAction,
  assertCanCreateOrder,
  assertCanProcessPayment,
  assertCanSubmitSupplierOrder,
  assertCustomerResourceAccess,
  resolveOrderType,
  getSalesSafetyStatus,
};
