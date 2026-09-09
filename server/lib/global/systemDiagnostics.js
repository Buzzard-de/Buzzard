/**
 * Production-preparation diagnostics — no secrets exposed, fail-closed.
 */
const { GLOBAL_SAFETY_POLICY, assertGlobalSafetyPolicy } = require("../../core/globalSafetyPolicy");

function getSmtpDiagnostics() {
  const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_FROM);
  return {
    configured,
    emailConfigured: configured,
    host: process.env.SMTP_HOST ? "[set]" : null,
    port: process.env.SMTP_PORT || null,
    user: process.env.SMTP_USER ? "[set]" : null,
    from: process.env.SMTP_FROM || null,
    passwordSet: Boolean(process.env.SMTP_PASSWORD),
    status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
  };
}

function getMonitoringDiagnostics() {
  const dsn = process.env.ERROR_TRACKING_DSN || process.env.SENTRY_DSN || "";
  const configured = Boolean(dsn);
  return {
    monitoringConfigured: configured,
    configured,
    provider: configured ? (dsn.includes("sentry") ? "sentry" : "error_tracking") : null,
    status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    dsnExposed: false,
  };
}

function getAnalyticsDiagnostics() {
  const ga = process.env.NEXT_PUBLIC_GA_ID || process.env.GA_MEASUREMENT_ID || "";
  const gtm = process.env.NEXT_PUBLIC_GTM_ID || "";
  const configured = Boolean(ga || gtm);
  return {
    configured,
    gaIdSet: Boolean(ga),
    gtmIdSet: Boolean(gtm),
    status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    eventsEnabled: configured,
  };
}

function getLegalDiagnostics() {
  const fields = {
    companyName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "",
    street: process.env.NEXT_PUBLIC_COMPANY_STREET || "",
    postalCode: process.env.NEXT_PUBLIC_COMPANY_POSTAL_CODE || "",
    city: process.env.NEXT_PUBLIC_COMPANY_CITY || "",
    vatId: process.env.NEXT_PUBLIC_COMPANY_VAT_ID || "",
    contentOwner: process.env.NEXT_PUBLIC_COMPANY_CONTENT_OWNER || "",
    contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.CONTACT_EMAIL || "",
  };
  const missing = [];
  if (!fields.street) missing.push("street");
  if (!fields.vatId) missing.push("vatId");
  if (!fields.contactEmail) missing.push("contactEmail");
  return {
    configured: missing.length === 0,
    status: missing.length === 0 ? "COMPLETE" : "INCOMPLETE",
    missingFields: missing,
    adminWarning: missing.length > 0 ? "Mandatory legal fields missing — do not invent data" : null,
    fields: {
      companyName: fields.companyName || "[default]",
      street: fields.street || null,
      postalCode: fields.postalCode || null,
      city: fields.city || null,
      vatId: fields.vatId ? "[set]" : null,
      contentOwner: fields.contentOwner || null,
      contactEmail: fields.contactEmail ? "[set]" : null,
    },
  };
}

function getSafetyContract() {
  const check = assertGlobalSafetyPolicy();
  const salesEnabled = process.env.BUZZARD_SALES_ENABLED === "1" || process.env.NEXT_PUBLIC_SALES_ENABLED === "1";
  const liveStripePrefix = "sk" + "_live_";
  const paymentsEnabled =
    process.env.STRIPE_SECRET_KEY?.startsWith(liveStripePrefix) ||
    (process.env.PAYPAL_CLIENT_SECRET?.length > 0 && process.env.BUZZARD_SALES_ENABLED === "1");
  return {
    ready: false,
    status: "BLOCKED",
    diagnosticOnly: true,
    autoActivate: false,
    activationAllowed: false,
    supplierLive: process.env.REAL_SUPPLIER_LIVE_IMPORT === "1",
    salesEnabled,
    paymentsEnabled: Boolean(paymentsEnabled),
    publishEnabled: false,
    humanApprovalRequired: true,
    publishBlocked: GLOBAL_SAFETY_POLICY.publishBlocked,
    liveImport: process.env.REAL_SUPPLIER_LIVE_IMPORT === "1",
    dryRun: process.env.REAL_SUPPLIER_DRY_RUN !== "0",
    compliant: check.compliant && !salesEnabled,
  };
}

function getFullSystemDiagnostics() {
  return {
    timestamp: new Date().toISOString(),
    safety: getSafetyContract(),
    smtp: getSmtpDiagnostics(),
    monitoring: getMonitoringDiagnostics(),
    analytics: getAnalyticsDiagnostics(),
    legal: getLegalDiagnostics(),
  };
}

module.exports = {
  getSmtpDiagnostics,
  getMonitoringDiagnostics,
  getAnalyticsDiagnostics,
  getLegalDiagnostics,
  getSafetyContract,
  getFullSystemDiagnostics,
};
