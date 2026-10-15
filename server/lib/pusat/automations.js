/**
 * Business automations — fail-closed, dry-run by default, no invented data.
 * Real supplier POs, payments, and customer messages stay disabled.
 */

const { isSalesEnabled } = require("../salesMode");
const productValidation = require("../pim/productValidation");
const pricing = require("../pricing");
const stockEngine = require("../operations/stockEngine");
const { listAdapters, getAdapter } = require("../supplier/adapterRegistry");
const customsAi = require("../customsAi");
const { MIN_NET_PROFIT_EUR, MARKET_UNDERCUT_IMPLEMENTED, MARKET_UNDERCUT_EUR, MEMORY_KIND } = require("./constants");
const agents = require("./agents");
const memory = require("./memory");
const { listExceptions } = require("./exceptions");
const approval = require("./approval");
const controlCenter = require("../controlCenter");
const { publicTaskError } = require("../security");

function productCreation(input = {}) {
  const dryRun = input.dryRun !== false;
  const validation = productValidation.validateProduct(input);
  const category = agents.runCategoryAssistant({
    legacyId: input.legacyCategoryId || input.category,
    canonicalId: input.canonicalCategoryId,
    locale: input.locale,
  });
  const duplicateHint = input.sku
    ? { checked: true, note: "Duplicate SKU detection is delegated to productIdentifiers inside validateProduct." }
    : { checked: false, note: "SKU required for duplicate detection." };

  const activate = Boolean(input.activate);
  const salesEnabled = isSalesEnabled();
  const mayActivate = false;
  const productCore = require("../pim/productCore");
  const { PRODUCT_STATUS } = require("../../core/productConstants");

  let coreResult = null;
  let coreError = null;
  try {
    coreResult = productCore.createProduct(
      {
        sku: input.sku,
        title: input.title || input.name,
        description: input.description,
        category: input.canonicalCategoryId || input.category,
        ean: input.ean,
        gtin: input.gtin,
        price: input.price,
        stock: input.stock,
        supplier: input.supplier || input.supplierId,
        status: PRODUCT_STATUS.DRAFT,
        visibility: "HIDDEN",
        metadata: { source: input.source || "pusat_dry_run", dryRun },
      },
      { source: "AI", actorId: "product_assistant", dryRun: true }
    );
  } catch (error) {
    coreError = publicTaskError(error, "product.core.dry_run_failed");
  }

  return {
    ok: validation.overall !== "FAIL" && !coreError,
    workflow: "product_creation",
    dryRun: true,
    written: false,
    productCore: coreResult,
    productCoreError: coreError,
    validation,
    category,
    duplicateHint,
    missingAttributes: (validation.results || []).filter((r) => r.status === "FAIL" || r.status === "WARNING"),
    multilingual: Boolean(input.translations),
    sourceValidated: Boolean(input.source),
    reviewRequired: validation.overall !== "PASS" || category.ambiguous,
    activation: {
      requested: activate,
      salesEnabled,
      allowed: mayActivate,
      blockedReason: "sales_lock_and_dry_run",
    },
    note: "Authorized path is productCore.createProduct. This workflow always uses dryRun and DRAFT. ACTIVE is rejected.",
  };
}

function supplierImport(input = {}) {
  const supplierId = input.supplierId || "mock";
  const adapters = listAdapters();
  let adapterInfo = adapters.find((a) => a.id === supplierId) || null;
  let live = false;
  let format = adapterInfo?.format || null;
  try {
    const adapter = getAdapter(supplierId);
    live = Boolean(adapter.live === true || adapter.ordersEnabled === true);
    format = adapter.format;
    adapterInfo = {
      id: adapter.id,
      name: adapter.name,
      format: adapter.format,
      capabilities: adapter.capabilities,
      mock: adapter.id === "mock" || /mock/i.test(adapter.name || ""),
    };
  } catch (error) {
    return { ok: false, workflow: "supplier_import", error: publicTaskError(error, "supplier.import.failed"), live: false };
  }

  return {
    ok: true,
    workflow: "supplier_import",
    dryRun: input.dryRun !== false,
    adapter: adapterInfo,
    live,
    mock: adapterInfo.mock !== false && !live,
    provenance: {
      supplierId,
      format,
      importedAt: new Date().toISOString(),
    },
    note: live
      ? "Adapter reports live capability — still requires existing safety gates and credentials."
      : "Mock or sample connector only. Do not treat this supplier as live.",
  };
}

function priceAutomation(input = {}) {
  const assistant = agents.runPriceAssistant(input);
  const costMissing = !assistant.ok && assistant.missing?.length;
  return {
    workflow: "price_automation",
    engine: "server/lib/pricing.js",
    failClosed: Boolean(costMissing),
    minNetProfitEur: MIN_NET_PROFIT_EUR,
    marketUndercut: { amountEur: MARKET_UNDERCUT_EUR, implemented: MARKET_UNDERCUT_IMPLEMENTED },
    ...assistant,
  };
}

function stockAutomation(input = {}) {
  const assistant = agents.runStockAssistant(input);
  return {
    workflow: "stock_automation",
    failClosed: assistant.failClosed,
    ...assistant,
  };
}

function orderAutomation(input = {}) {
  const salesEnabled = isSalesEnabled();
  const price = input.supplierCost != null ? priceAutomation(input) : { skipped: true };
  const stock = input.stock != null || input.quantity != null ? stockAutomation(input) : { skipped: true };
  const missing = [];
  if (!input.paymentStatus || input.paymentStatus !== "paid") missing.push("paymentStatus=paid");
  if (!input.shippingAddress) missing.push("shippingAddress");
  if (!input.customerId && !input.email) missing.push("customer");
  if (price.failClosed) missing.push("price");
  if (stock.failClosed) missing.push("stock");

  const ready = salesEnabled && missing.length === 0 && input.authorizedPurchaseOrder === true;
  const poDraft = {
    status: "DRAFT",
    submittedToSupplier: false,
    supplierId: input.supplierId || null,
    created: Boolean(ready),
  };
  return {
    ok: true,
    workflow: "order_automation",
    salesEnabled,
    salesLocked: !salesEnabled,
    ready,
    missing,
    price,
    stock,
    purchaseOrder: {
      draft: poDraft,
      submitted: false,
      distinctFromSend: true,
    },
    purchaseOrderProposal: ready ? { status: "proposal_only", submitted: false } : null,
    realSupplierOrder: false,
    stateTransitionsRecorded: true,
    states: ["validated", "blocked_by_sales_lock", "po_draft_only", "not_sent"],
    note: "PO draft and supplier send are separate. Send remains disabled.",
  };
}

function customerServiceAutomation(input = {}) {
  const assistant = agents.runCustomerAssistant(input);
  return {
    workflow: "customer_service",
    ...assistant,
    sent: false,
    refundIssued: false,
  };
}

function customsAutomation(input = {}) {
  let assessment;
  try {
    assessment = customsAi.assessCustoms(input.product || input);
  } catch (error) {
    assessment = {
      customs: { review_required: true, source: "module_unavailable" },
      review_required: true,
      disclaimer: "Customs classification could not be validated. Not legal or tax advice.",
      error: publicTaskError(error, "customs.module_unavailable"),
    };
  }
  return {
    ok: assessment.failClosed ? false : true,
    workflow: "customs_market",
    invented: false,
    legalClaim: false,
    failClosed: Boolean(assessment.failClosed || assessment.decision?.failClosed),
    reviewRequired: true,
    assessment,
    disclaimer: assessment.disclaimer || "Not legal or tax advice. Authoritative inputs required.",
  };
}

function reportingAutomation() {
  const tasks = controlCenter.listAiTasks({ limit: 200 });
  const failed = tasks.filter((t) => t.status === "FAILED");
  const pendingApprovals = approval.listApprovals("PENDING");
  const openExceptions = listExceptions({ status: "OPEN", limit: 50 });
  const escalated = listExceptions({ status: "ESCALATED", limit: 50 });
  const dead = listExceptions({ status: "DEAD_LETTER", limit: 50 });
  const mem = memory.memoryHealth();

  return {
    workflow: "reporting",
    figureType: "actual",
    generatedAt: new Date().toISOString(),
    tasks: {
      total: tasks.length,
      byStatus: tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {}),
      failed: failed.map((t) => ({ id: t.id, title: t.title, error: t.error })),
    },
    approvals: { pending: pendingApprovals.length },
    exceptions: {
      open: openExceptions.length,
      escalated: escalated.length,
      deadLetter: dead.length,
    },
    memory: mem,
    staleSupplierFeeds: {
      available: false,
      reason: "No persistent live feed watermark table; mock adapters have no stale production feed.",
    },
    missingPricingInputs: failed.filter((t) => String(t.error || "").includes("cost")).length,
    timeouts: failed.filter((t) => String(t.error || "").includes("timeout") || t.result?.failureKind === "TIMEOUT").length,
    retries: tasks.reduce((n, t) => n + (t.retryCount || 0), 0),
    guardianBlocked: failed.filter((t) => t.result?.failureKind === "GUARDIAN").length,
    worker: require("./worker").health(),
    provider: require("./integrations").providerStatus(),
    blockedIntegrations: [
      "llm_live",
      "remote_guardian",
      "remote_orchestrator",
      "live_supplier",
      "live_payment",
      "live_carrier",
      "live_marketplace",
      "customer_message_send",
    ],
    estimates: [],
  };
}

function runAutomation(kind, input, ctx) {
  switch (kind) {
    case "product":
    case "product_creation":
      return productCreation(input);
    case "supplier":
    case "supplier_import":
      return supplierImport(input);
    case "price":
      return priceAutomation(input);
    case "stock":
      return stockAutomation(input);
    case "order":
      return orderAutomation(input);
    case "customer":
    case "customer_service":
      return customerServiceAutomation(input);
    case "customs":
      return customsAutomation(input);
    case "payment":
    case "refund":
      return require("./integrations").paymentSafety({ ...input, kind: kind === "refund" ? "refund" : "payment" });
    case "shipping":
      return require("./integrations").shippingLookup(input);
    case "marketplace":
      return require("./integrations").marketplaceDraft(input);
    case "reporting":
      return reportingAutomation();
    default:
      return { ok: false, error: "unknown_automation", kind };
  }
}

function persistReport(report, taskId) {
  memory.writeMemory({
    kind: MEMORY_KIND.HISTORICAL_RECORD,
    subject: `automation:${report.workflow || "unknown"}`,
    content: { figureType: report.figureType || "actual", workflow: report.workflow },
    source: "pusat.automation",
    taskId,
  });
}

module.exports = {
  productCreation,
  supplierImport,
  priceAutomation,
  stockAutomation,
  orderAutomation,
  customerServiceAutomation,
  customsAutomation,
  reportingAutomation,
  runAutomation,
  persistReport,
};
