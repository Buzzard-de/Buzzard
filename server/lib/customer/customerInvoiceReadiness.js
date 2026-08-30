/**
 * Part 19 — Invoice / document readiness (metadata architecture — no PDF generation).
 */
const { db } = require("../db");

function getInvoiceReadiness() {
  let invoiceCount = 0;
  let tableExists = false;
  try {
    db.prepare("SELECT 1 FROM finance_invoices LIMIT 1").get();
    tableExists = true;
    invoiceCount = db.prepare("SELECT COUNT(*) n FROM finance_invoices").get()?.n ?? 0;
  } catch {
    tableExists = false;
  }

  return {
    financeInvoicesTable: tableExists,
    invoiceCount,
    pdfGeneration: false,
    customerDownloadRoute: null,
    metadataOnly: true,
    autoInvoiceOnDryRun: false,
    realPaymentRequired: true,
    salesOffSafe: true,
  };
}

module.exports = {
  getInvoiceReadiness,
};
