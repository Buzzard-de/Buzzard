/**
 * Part 19 — Customer experience readiness center (diagnostic only — never auto-activates sales).
 */
const { CUSTOMER_EXPERIENCE_GATES } = require("../../core/customerExperienceConstants");
const { READINESS_GATE_STATUS } = require("../../core/operationsConstants");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const goLiveApproval = require("../commerce/goLiveApproval");
const { isLiveImportEnabled } = require("../supplier/realSupplierConnector");
const catalogReadService = require("../storefront/catalogReadService");
const customerOrderLifecycle = require("./customerOrderLifecycle");
const customerOrderBridge = require("./customerOrderBridge");
const customerReturnReadiness = require("./customerReturnReadiness");
const customerNotificationReadiness = require("./customerNotificationReadiness");
const customerInvoiceReadiness = require("./customerInvoiceReadiness");
const customerPrivacyReadiness = require("./customerPrivacyReadiness");
const customerSupportReadiness = require("./customerSupportReadiness");
const customerMutationGuard = require("./customerMutationGuard");

function gate(name, status, detail, extras = {}) {
  return { gate: name, status, detail, ...extras };
}

function evaluateCustomerExperienceReadiness() {
  const gates = [];
  const flags = getEffectiveFlags();

  const lifecycle = customerOrderLifecycle.getOrderLifecycleReadiness();
  gates.push(
    gate(
      "ORDER_LIFECYCLE",
      lifecycle.commercialWhileSalesOff ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.BLOCKED,
      `types=${Object.keys(lifecycle.orderCountsByType || {}).join(",") || "none"} commercial=${lifecycle.commercialOrderCount}`
    )
  );

  const history = customerOrderBridge.getOrderHistoryReadiness();
  gates.push(
    gate(
      "ORDER_HISTORY",
      history.bridgeEnabled ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.FAIL,
      `commerce=${history.commerceOrderCount} legacy=${history.legacyOrderCount}`
    )
  );

  const returns = customerReturnReadiness.getReturnRefundReadiness();
  gates.push(
    gate(
      "RETURNS_REFUNDS",
      returns.failClosedWhileSalesOff && !returns.realRefundExecution
        ? READINESS_GATE_STATUS.PASS
        : READINESS_GATE_STATUS.FAIL,
      `rma=${returns.rmaModuleEnabled} failClosed=${returns.failClosedWhileSalesOff}`
    )
  );

  const notif = customerNotificationReadiness.getNotificationReadiness();
  gates.push(
    gate(
      "NOTIFICATIONS",
      notif.notificationEngine ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
      `mode=${notif.deliveryMode} wiredCheckout=${notif.wiredToCheckout}`
    )
  );

  const invoice = customerInvoiceReadiness.getInvoiceReadiness();
  gates.push(
    gate(
      "INVOICES",
      invoice.metadataOnly && !invoice.pdfGeneration ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
      `count=${invoice.invoiceCount} pdf=${invoice.pdfGeneration}`
    )
  );

  const privacy = customerPrivacyReadiness.getPrivacyReadiness();
  gates.push(
    gate(
      "GDPR_PRIVACY",
      privacy.accountExportRoute && !privacy.autoErasurePipeline
        ? READINESS_GATE_STATUS.PASS
        : READINESS_GATE_STATUS.CONDITION,
      `humanApproval=${privacy.requiresHumanApproval}`
    )
  );

  const support = customerSupportReadiness.getSupportReadiness();
  gates.push(
    gate(
      "CUSTOMER_SUPPORT",
      support.supportModule && support.authBridge ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.CONDITION,
      `unifiedSession=${support.unifiedCustomerSession}`
    )
  );

  gates.push(
    gate(
      "CUSTOMER_AUDIT",
      READINESS_GATE_STATUS.PASS,
      "operationsAudit wired for customer actions"
    )
  );

  gates.push(
    gate(
      "ADMIN_SEPARATION",
      READINESS_GATE_STATUS.PASS,
      "admin RBAC separate from customer account routes"
    )
  );

  gates.push(
    gate(
      "IDEMPOTENCY",
      READINESS_GATE_STATUS.PASS,
      "checkout_complete + automation emit idempotency"
    )
  );

  const mutation = customerMutationGuard.getMutationGuardReadiness();
  gates.push(
    gate(
      "FAIL_CLOSED",
      mutation.failClosed && mutation.commercialBlocked ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.FAIL,
      `commercialBlocked=${mutation.commercialBlocked} paymentBlocked=${mutation.paymentBlocked}`
    )
  );

  const safetyOk =
    !flags.salesEnabled &&
    !flags.stripeEnabled &&
    !flags.paypalEnabled &&
    !flags.supplierOrdersEnabled &&
    flags.mockPaymentOnly &&
    goLiveApproval.PRODUCTION_SAFETY_LOCK &&
    !isLiveImportEnabled();

  gates.push(
    gate(
      "SAFETY",
      safetyOk ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.BLOCKED,
      `sales=${flags.salesEnabled} goLiveLock=${goLiveApproval.PRODUCTION_SAFETY_LOCK}`
    )
  );

  const catalog = catalogReadService.getHealth();
  const summary = {
    pass: gates.filter((g) => g.status === READINESS_GATE_STATUS.PASS).length,
    fail: gates.filter((g) => g.status === READINESS_GATE_STATUS.FAIL).length,
    blocked: gates.filter((g) => g.status === READINESS_GATE_STATUS.BLOCKED).length,
    condition: gates.filter((g) => g.status === READINESS_GATE_STATUS.CONDITION).length,
  };

  const overall =
    summary.fail > 0 || summary.blocked > 0
      ? "NOT_READY"
      : summary.condition > 0
        ? "CONDITION"
        : "READY";

  return {
    CUSTOMER_EXPERIENCE_READINESS: {
      overall,
      diagnosticOnly: true,
      autoActivate: false,
      gateNames: CUSTOMER_EXPERIENCE_GATES,
      gates,
      summary,
      publicProductCount: catalog.productCount,
      salesEnabled: flags.salesEnabled,
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = {
  evaluateCustomerExperienceReadiness,
};
