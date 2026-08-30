/**
 * Part 19 — Customer experience readiness gate names and audit actions.
 */
const CUSTOMER_EXPERIENCE_GATES = Object.freeze([
  "ORDER_LIFECYCLE",
  "ORDER_HISTORY",
  "RETURNS_REFUNDS",
  "NOTIFICATIONS",
  "INVOICES",
  "GDPR_PRIVACY",
  "CUSTOMER_SUPPORT",
  "CUSTOMER_AUDIT",
  "ADMIN_SEPARATION",
  "IDEMPOTENCY",
  "FAIL_CLOSED",
  "SAFETY",
]);

const CUSTOMER_AUDIT_ACTIONS = Object.freeze({
  CUSTOMER_LOGIN: "customer.login",
  CUSTOMER_REGISTER: "customer.register",
  CUSTOMER_ORDER_VIEW: "customer.order.view",
  CUSTOMER_RETURN_REQUEST: "customer.return.request",
  CUSTOMER_TICKET_CREATE: "customer.ticket.create",
  CUSTOMER_PRIVACY_EXPORT: "customer.privacy.export",
  CUSTOMER_PRIVACY_DELETE: "customer.privacy.delete",
  CUSTOMER_CHECKOUT_ATTEMPT: "customer.checkout.attempt",
});

module.exports = {
  CUSTOMER_EXPERIENCE_GATES,
  CUSTOMER_AUDIT_ACTIONS,
};
