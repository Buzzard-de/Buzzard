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
    ip: req ? require("../security").getClientIp(req) : undefined,
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
    logCommerceBlock("supplier_order_blocked", { type: "supplier_order", reason: check.code }, req);
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

function bearerToken(req) {
  const header = req?.headers?.authorization || req?.headers?.Authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

/** A real admin session or a signed account token. A body field is not a credential. */
function verifiedCommerceIdentity(req) {
  const token = bearerToken(req);
  if (!token) return null;
  try {
    const session = require("../auth").getSession(token);
    if (session?.userId) return { id: String(session.userId) };
  } catch {
    /* the session store is not a reason to accept the request */
  }
  try {
    const claims = require("../dbAuth").verifyToken(token);
    if (claims?.sub != null) return { id: String(claims.sub) };
  } catch {
    return null;
  }
  return null;
}

/**
 * HTTP guest commerce is fail-closed without a session or token.
 * In-process engine calls have no request and stay on their own path.
 */
function assertCommerceCredential(req) {
  if (!req) return null;
  const identity = verifiedCommerceIdentity(req);
  if (!identity) {
    return { blocked: true, code: "auth_required", message: "Authentication required", status: 401 };
  }
  return { identity };
}

function authorizeCartWrite(cartRow, ctx = {}) {
  if (ctx.req) {
    const gate = assertCommerceCredential(ctx.req);
    if (!gate || gate.blocked) return gate;
    if (!cartRow) return { blocked: true, code: "cart_not_found", status: 404 };
    if (!cartRow.customer_id || String(cartRow.customer_id) !== gate.identity.id) {
      return {
        blocked: true,
        code: cartRow.customer_id ? "idor_denied" : "auth_required",
        message: cartRow.customer_id ? "Access denied" : "Authentication required",
        status: cartRow.customer_id ? 403 : 401,
      };
    }
    return null;
  }
  if (!cartRow) return { blocked: true, code: "cart_not_found", status: 404 };
  const access = assertCustomerResourceAccess({
    resourceCustomerId: cartRow.customer_id,
    requestCustomerId: ctx.customerId,
    resourceType: "cart",
    req: ctx.req,
  });
  if (access?.blocked && cartRow.customer_id) return access;
  return null;
}

function refuseIdentityLessRecord(row, ctx, resourceType) {
  if (!ctx?.req) return null;
  const gate = assertCommerceCredential(ctx.req);
  if (!gate || gate.blocked) return gate;
  if (!row?.customer_id || String(row.customer_id) !== gate.identity.id) {
    logCommerceBlock("commerce_permission_denied", { resourceType, reason: row?.customer_id ? "identity_mismatch" : "no_record_identity" }, ctx.req);
    return {
      blocked: true,
      code: row?.customer_id ? "idor_denied" : "auth_required",
      message: row?.customer_id ? "Access denied" : "Authentication required",
      status: row?.customer_id ? 403 : 401,
    };
  }
  return null;
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
  verifiedCommerceIdentity,
  assertCommerceCredential,
  authorizeCartWrite,
  refuseIdentityLessRecord,
};
