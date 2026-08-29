/**
 * Part 12 — Central sales / supplier / go-live safety gate
 * Reuses commerceGuards — no duplicate flag logic.
 */
const {
  assertCanSubmitSupplierOrder,
  assertCanCreateOrder,
  assertCanProcessPayment,
  assertSalesEnabledForCommercialAction,
  logCommerceBlock,
} = require("./commerceGuards");
const goLiveApproval = require("./goLiveApproval");
const { ORDER_TYPE } = require("../../core/commerceConstants");

function assertGoLiveLock({ req, action = "commercial" } = {}) {
  if (!goLiveApproval.PRODUCTION_SAFETY_LOCK) return null;
  const activation = goLiveApproval.canActivateSales();
  if (!activation.allowed) {
    logCommerceBlock("go_live_blocked", { action, reason: activation.code }, req);
    return {
      blocked: true,
      code: activation.code || "production_safety_lock",
      message: activation.message || "Go-live lock active — commercial actions blocked",
      status: 403,
    };
  }
  return null;
}

function assertSupplierOrderAllowed({ req } = {}) {
  const supplierBlock = assertCanSubmitSupplierOrder({ req });
  if (supplierBlock) return supplierBlock;
  return assertGoLiveLock({ req, action: "supplier_order" });
}

function assertCommercialTransactionAllowed({ req, orderType = ORDER_TYPE.COMMERCIAL } = {}) {
  const salesBlock = assertSalesEnabledForCommercialAction({ orderType });
  if (salesBlock) {
    logCommerceBlock("commercial_order_blocked", { orderType, reason: salesBlock.code }, req);
    return salesBlock;
  }
  return assertGoLiveLock({ req, action: "commercial" });
}

function assertPaymentAllowed({ req } = {}) {
  const paymentBlock = assertCanProcessPayment({ req });
  if (paymentBlock) return paymentBlock;
  return assertGoLiveLock({ req, action: "payment" });
}

function assertOrderCreationAllowed({ req, orderType } = {}) {
  const orderBlock = assertCanCreateOrder({ req, orderType });
  if (orderBlock) return orderBlock;
  if (orderType === ORDER_TYPE.COMMERCIAL) {
    return assertGoLiveLock({ req, action: "commercial_order" });
  }
  return null;
}

function blockSupplierOrderResult(block) {
  return {
    ok: false,
    blocked: true,
    error: block.code || "supplier_order_blocked",
    errorKey: block.code || "supplier_order_blocked",
    message: block.message || "Supplier orders are disabled",
    status: block.status || 403,
  };
}

function blockHttpResult(block) {
  return {
    error: block.message || block.code,
    code: block.code,
    status: block.status || 403,
    blocked: true,
  };
}

module.exports = {
  assertGoLiveLock,
  assertSupplierOrderAllowed,
  assertCommercialTransactionAllowed,
  assertPaymentAllowed,
  assertOrderCreationAllowed,
  blockSupplierOrderResult,
  blockHttpResult,
};
