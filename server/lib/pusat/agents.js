/**
 * Specialist AI agents — recommendation-only unless explicitly authorized.
 * Bound to existing Buzzard engines. Never invent costs, stock, sales, or order status.
 */

const { db } = require("../db");
const { AI_EMPLOYEE_STATUS } = require("../../core/constants");
const pricing = require("../pricing");
const stockEngine = require("../operations/stockEngine");
const productValidation = require("../pim/productValidation");
const taxonomy = require("../taxonomyUnification");
const { isSalesEnabled } = require("../salesMode");
const guardian = require("./guardian");
const memory = require("./memory");
const {
  AGENT_CODES,
  MEMORY_KIND,
  MIN_NET_PROFIT_EUR,
  MARKET_UNDERCUT_EUR,
  MARKET_UNDERCUT_IMPLEMENTED,
} = require("./constants");

function schemaError(errors) {
  return { ok: false, error: "schema_invalid", errors };
}

function requireObject(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return schemaError(["payload must be an object"]);
  }
  return null;
}

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function remember(agentId, taskId, kind, subject, content, source) {
  try {
    memory.writeMemory({
      kind,
      subject,
      content,
      source,
      classification: kind,
      agentId,
      taskId,
    });
  } catch {
    /* memory failure must not crash agents */
  }
}

const SPECIALIST_EMPLOYEES = [
  {
    id: "stock_ai",
    name: "Stock Assistant",
    department: "Operations",
    description: "Inventory and supplier stock fail-closed analysis",
    responsibility: "Stock integrity",
    permissions: ["products.read", "ai.execute"],
    capabilities: ["stock_check", "staleness"],
    priority: 68,
    code: AGENT_CODES.STOCK,
    tools: ["stock.evaluate", "memory.write"],
  },
  {
    id: "seo_ai",
    name: "SEO Assistant",
    department: "Catalog",
    description: "Content gap analysis and review proposals",
    responsibility: "SEO proposals",
    permissions: ["products.read", "ai.execute"],
    capabilities: ["seo_gaps", "translation_gaps"],
    priority: 55,
    code: AGENT_CODES.SEO,
    tools: ["seo.analyze", "memory.write"],
  },
  {
    id: "customer_ai",
    name: "Customer Assistant",
    department: "Support",
    description: "Customer request classification and safe drafts",
    responsibility: "Customer service drafts",
    permissions: ["orders.read", "ai.execute"],
    capabilities: ["classify", "draft", "escalate"],
    priority: 62,
    code: AGENT_CODES.CUSTOMER,
    tools: ["orders.read", "draft.response", "memory.write"],
  },
  {
    id: "sales_ai",
    name: "Sales Analysis Assistant",
    department: "Analytics",
    description: "Verified sales figures only — no fabricated revenue",
    responsibility: "Sales analysis",
    permissions: ["orders.read", "ai.execute"],
    capabilities: ["sales_report"],
    priority: 50,
    code: AGENT_CODES.SALES,
    tools: ["orders.aggregate", "memory.write"],
  },
  {
    id: "dogu_bey",
    name: "Doğu Bey",
    department: "Intelligence",
    description: "Research organization with sources and evidence",
    responsibility: "Intelligence and research",
    permissions: ["ai.execute", "products.read"],
    capabilities: ["research", "evidence"],
    priority: 75,
    code: AGENT_CODES.DOGU_BEY,
    tools: ["research.record", "memory.write"],
  },
  {
    id: "aslan_bey",
    name: "Aslan Bey",
    department: "Coordination",
    description: "Triage and specialist routing — does not duplicate other agents",
    responsibility: "Assistant coordination",
    permissions: ["ai.read", "ai.execute", "products.read", "orders.read"],
    capabilities: ["triage", "routing"],
    priority: 85,
    code: AGENT_CODES.ASLAN_BEY,
    tools: ["triage.route"],
  },
  {
    id: "esat_bey",
    name: "Esat Bey",
    department: "Security",
    description: "Guardian policy validation on execution paths",
    responsibility: "AI security / Guardian",
    permissions: ["security.read", "security.alert", "ai.execute"],
    capabilities: ["guardian", "policy"],
    priority: 95,
    code: AGENT_CODES.ESAT_BEY,
    tools: ["guardian.evaluate"],
  },
];

function ensureSpecialistEmployees() {
  const controlCenter = require("../controlCenter");
  controlCenter.seedDefaults();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO core_ai_employees(
      id, name, department, description, responsibility, permissions_json, status, priority, capabilities_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const emp of SPECIALIST_EMPLOYEES) {
    insert.run(
      emp.id,
      emp.name,
      emp.department,
      emp.description,
      emp.responsibility,
      JSON.stringify(emp.permissions),
      AI_EMPLOYEE_STATUS.ACTIVE,
      emp.priority,
      JSON.stringify(emp.capabilities)
    );
  }
}

function runPriceAssistant(input, ctx = {}) {
  const invalid = requireObject(input);
  if (invalid) return invalid;

  const supplierCost = numberOrNull(input.supplierCost ?? input.purchasePrice ?? input.cost);
  const shipping = numberOrNull(input.shippingCost) ?? 0;
  const fee = numberOrNull(input.marketplaceFee) ?? 0;
  const vat = numberOrNull(input.vat) ?? 0;
  const salePrice = numberOrNull(input.salePrice);

  const missing = [];
  if (supplierCost == null) missing.push("supplierCost");
  if (missing.length) {
    return {
      ok: false,
      agent: AGENT_CODES.PRICE,
      error: "missing_required_cost",
      missing,
      invented: false,
      recommendations: ["Provide verified supplier cost from the pricing engine inputs. Do not invent costs."],
    };
  }

  const computed = pricing.calculateSalePrice({
    supplierPrice: supplierCost,
    markupPercent: input.markupPercent,
    minimumMarginPercent: input.minimumMarginPercent,
    currency: input.currency || "EUR",
  });
  const priceCheck = pricing.validatePrice(computed);
  const totalCost = supplierCost + shipping + fee + vat;
  const netProfit = salePrice != null ? salePrice - totalCost : computed.amount - totalCost;
  const lossMaking = netProfit < MIN_NET_PROFIT_EUR;
  const margin = pricing.marginPercent(salePrice ?? computed.amount, supplierCost);

  const result = {
    ok: priceCheck.ok,
    agent: AGENT_CODES.PRICE,
    invented: false,
    engine: "server/lib/pricing.js",
    evidence: {
      supplierCost,
      shipping,
      marketplaceFee: fee,
      vat,
      computedSale: computed,
      salePrice: salePrice,
      totalCost,
      netProfit,
      marginPercent: margin,
      minNetProfitEur: MIN_NET_PROFIT_EUR,
      meetsMinNetProfit: !lossMaking,
      marketUndercutRule: {
        amountEur: MARKET_UNDERCUT_EUR,
        implemented: MARKET_UNDERCUT_IMPLEMENTED,
        status: "NOT_IMPLEMENTED",
      },
    },
    recommendations: [
      lossMaking ? `Offer is below the €${MIN_NET_PROFIT_EUR.toFixed(2)} minimum net profit rule.` : "Net profit meets the €0.50 floor against provided costs.",
      "€0.10 market-undercut rule is not implemented in the authoritative pricing engine.",
    ],
    reviewRequired: lossMaking || !priceCheck.ok,
  };
  remember(AGENT_CODES.PRICE, ctx.taskId, MEMORY_KIND.DERIVED_ANALYSIS, `price:${input.sku || "unknown"}`, result.evidence, "price_assistant");
  return result;
}

function runStockAssistant(input, ctx = {}) {
  const invalid = requireObject(input);
  if (invalid) return invalid;

  const evaluated = stockEngine.evaluateStockRecord(
    {
      stock: input.stock ?? input.quantity,
      lastSupplierUpdate: input.lastSupplierUpdate,
      stockUpdatedAt: input.stockUpdatedAt,
      source: input.source || "unverified",
    },
    { lowThreshold: input.lowThreshold, safetyStock: input.safetyStock }
  );

  const staleAfterMs = Number(input.staleAfterMs) || 48 * 60 * 60 * 1000;
  const stamp = evaluated.lastSupplierUpdate || evaluated.stockUpdatedAt;
  const stale = stamp ? Date.now() - new Date(stamp).getTime() > staleAfterMs : true;
  const confirmed = evaluated.status !== stockEngine.STOCK_STATUS.UNKNOWN && evaluated.status !== stockEngine.STOCK_STATUS.BLOCKED && !stale;
  const failClosed = !confirmed;

  const result = {
    ok: true,
    agent: AGENT_CODES.STOCK,
    invented: false,
    engine: "server/lib/operations/stockEngine.js",
    evidence: { ...evaluated, stale, confirmed },
    failClosed,
    availabilityClaimAllowed: confirmed && evaluated.status === stockEngine.STOCK_STATUS.IN_STOCK,
    recommendations: failClosed
      ? ["Treat stock as unconfirmed. Do not advertise availability."]
      : [`Stock status ${evaluated.status} from provided record.`],
  };
  remember(AGENT_CODES.STOCK, ctx.taskId, MEMORY_KIND.UNVERIFIED_OBSERVATION, `stock:${input.sku || "unknown"}`, result.evidence, input.source || "unverified");
  return result;
}

function runSeoAssistant(input, ctx = {}) {
  const invalid = requireObject(input);
  if (invalid) return invalid;

  const gaps = [];
  if (!input.title || String(input.title).trim().length < 3) gaps.push("title");
  if (!input.description || String(input.description).trim().length < 20) gaps.push("description");
  if (!input.attributes || !Object.keys(input.attributes).length) gaps.push("attributes");
  const translations = input.translations || {};
  const missingTranslations = ["de", "en", "tr"].filter((loc) => !translations[loc]);
  if (missingTranslations.length) gaps.push(`translations:${missingTranslations.join(",")}`);

  const proposals = {
    title: input.title || null,
    description: input.description || null,
    note: "Proposals are for human review. Canonical identity is not changed. Specifications are not fabricated.",
  };

  const result = {
    ok: true,
    agent: AGENT_CODES.SEO,
    invented: false,
    gaps,
    missingTranslations,
    proposals,
    canonicalSku: input.sku || null,
    reviewRequired: gaps.length > 0,
  };
  remember(AGENT_CODES.SEO, ctx.taskId, MEMORY_KIND.DERIVED_ANALYSIS, `seo:${input.sku || "unknown"}`, { gaps }, "seo_assistant");
  return result;
}

function runCustomerAssistant(input, ctx = {}) {
  const invalid = requireObject(input);
  if (invalid) return invalid;
  if (!input.message || typeof input.message !== "string") {
    return schemaError(["message is required"]);
  }

  const text = input.message.toLowerCase();
  let requestType = input.requestType || "general";
  if (/refund|erstatt/.test(text)) requestType = "refund";
  else if (/complaint|beschwerde|reklamation/.test(text)) requestType = "complaint";
  else if (/ship|versand|lieferung|tracking/.test(text)) requestType = "shipment";
  else if (/cancel|storn/.test(text)) requestType = "cancellation";

  let order = null;
  let orderEvidence = "not_requested";
  if (input.orderNumber) {
    order = db.prepare("SELECT order_number, status, shipping_status, payment_status, total FROM orders WHERE order_number = ?").get(input.orderNumber);
    orderEvidence = order ? "verified_row" : "not_found";
  }

  const sensitive = ["refund", "complaint", "cancellation"].includes(requestType);
  const draft = order
    ? `We located order ${order.order_number}. Current recorded status: ${order.status}, payment: ${order.payment_status}, shipment: ${order.shipping_status}.`
    : input.orderNumber
      ? "We could not verify that order number in the system, so we will not claim a status."
      : "Please share the order number so we can look up the verified record.";

  return {
    ok: true,
    agent: AGENT_CODES.CUSTOMER,
    invented: false,
    requestType,
    order: order ? { orderNumber: order.order_number, status: order.status, paymentStatus: order.payment_status, shippingStatus: order.shipping_status } : null,
    orderEvidence,
    draft,
    escalate: sensitive,
    unauthorizedActions: ["refund.issue", "order.cancel"],
    recommendations: sensitive
      ? ["Escalate to a human. Do not issue refunds or cancellations from this agent."]
      : ["Draft only — send requires customer.message.send approval."],
    taskId: ctx.taskId,
  };
}

function runSalesAssistant(input = {}, ctx = {}) {
  const invalid = requireObject(input);
  if (invalid) return invalid;

  let orders;
  try {
    orders = db.prepare(
      `SELECT COUNT(*) n, COALESCE(SUM(total),0) revenue, COALESCE(SUM(CASE WHEN status LIKE '%cancel%' THEN 1 ELSE 0 END),0) cancelled
       FROM orders`
    ).get();
  } catch (error) {
    return { ok: false, agent: AGENT_CODES.SALES, error: "database_failure", message: error.message, invented: false };
  }

  const result = {
    ok: true,
    agent: AGENT_CODES.SALES,
    invented: false,
    figureType: "actual",
    evidence: {
      orderCount: orders.n,
      recordedRevenue: orders.revenue,
      cancelledCount: orders.cancelled,
      returns: { available: false, reason: "No dedicated returns aggregate in this query path" },
      margins: { available: false, reason: "Margin requires verified cost + sale pairs; not fabricated" },
    },
    notes: [
      "Figures are actual row aggregates from the orders table.",
      "Missing margin/return series are reported as unavailable, not estimated.",
    ],
  };
  remember(AGENT_CODES.SALES, ctx.taskId, MEMORY_KIND.VERIFIED_FACT, "sales:orders_aggregate", result.evidence, "orders_table");
  return result;
}

function runCategoryAssistant(input, ctx = {}) {
  const invalid = requireObject(input);
  if (invalid) return invalid;

  let resolved = null;
  if (input.legacyId) {
    resolved = taxonomy.resolveLegacy(input.legacyId, input.legacySystem || "shop");
  } else if (input.canonicalId) {
    const node = taxonomy.getCanonicalNode(input.canonicalId);
    resolved = node
      ? { canonical_id: node.id || input.canonicalId, resolved: true, strategy: "direct_canonical", canonical_node: node }
      : { canonical_id: input.canonicalId, resolved: false, strategy: "unknown_canonical" };
  }

  const ambiguous = !resolved || !resolved.resolved;
  return {
    ok: true,
    agent: AGENT_CODES.CATEGORY,
    invented: false,
    engine: "server/lib/taxonomyUnification.js",
    canonicalId: resolved?.canonical_id || null,
    resolved: Boolean(resolved?.resolved),
    ambiguous,
    strategy: resolved?.strategy || "unmapped",
    multilingual: Boolean(input.locale || input.translations),
    reviewRequired: ambiguous,
    recommendations: ambiguous
      ? ["Classification is ambiguous. Do not create a duplicate category. Send for human review."]
      : [`Preserve canonical category id ${resolved.canonical_id}.`],
    taskId: ctx.taskId,
  };
}

function runDoguBey(input, ctx = {}) {
  const invalid = requireObject(input);
  if (invalid) return invalid;
  if (!input.question) return schemaError(["question is required"]);

  const sources = Array.isArray(input.sources) ? input.sources.filter((s) => s && (s.url || s.note)) : [];
  const facts = Array.isArray(input.facts) ? input.facts : [];
  const hypotheses = Array.isArray(input.hypotheses) ? input.hypotheses : [];

  const findings = {
    question: input.question,
    facts: facts.map((f) => ({ text: f, kind: "fact" })),
    hypotheses: hypotheses.map((h) => ({ text: h, kind: "hypothesis" })),
    sources,
    unsupported: sources.length === 0 && facts.length === 0,
  };

  remember(AGENT_CODES.DOGU_BEY, ctx.taskId, MEMORY_KIND.HISTORICAL_RECORD, `research:${input.question.slice(0, 80)}`, findings, "dogu_bey");
  return {
    ok: true,
    agent: AGENT_CODES.DOGU_BEY,
    invented: false,
    findings,
    reviewRequired: findings.unsupported,
    recommendations: findings.unsupported
      ? ["No sources or facts provided. Do not treat hypotheses as verified."]
      : ["Facts and hypotheses are separated. Cite sources before acting."],
  };
}

function runEsatBey(input, ctx = {}) {
  const invalid = requireObject(input);
  if (invalid) return invalid;
  const result = guardian.evaluate({
    agentId: input.agentId || ctx.agentId,
    employee: input.employee || ctx.employee,
    action: input.action,
    tool: input.tool,
    payload: input.payload || {},
    permissionsRequired: input.permissionsRequired || [],
    priority: input.priority,
  });
  return {
    ok: result.ok,
    agent: AGENT_CODES.ESAT_BEY,
    invented: false,
    guardian: result,
  };
}

function runAslanBey(input) {
  const invalid = requireObject(input);
  if (invalid) return invalid;
  const text = String(input.request || input.message || "").toLowerCase();
  let suggested = AGENT_CODES.DOGU_BEY;
  if (/price|preis|cost|marge/.test(text)) suggested = AGENT_CODES.PRICE;
  else if (/stock|lager|bestand/.test(text)) suggested = AGENT_CODES.STOCK;
  else if (/seo|title|meta/.test(text)) suggested = AGENT_CODES.SEO;
  else if (/customer|kunde|refund|beschwerde/.test(text)) suggested = AGENT_CODES.CUSTOMER;
  else if (/sales|umsatz|revenue/.test(text)) suggested = AGENT_CODES.SALES;
  else if (/categor|kategor/.test(text)) suggested = AGENT_CODES.CATEGORY;
  else if (/security|permission|guardian/.test(text)) suggested = AGENT_CODES.ESAT_BEY;
  else if (/product|sku/.test(text)) suggested = AGENT_CODES.PRODUCT;

  return {
    ok: true,
    agent: AGENT_CODES.ASLAN_BEY,
    invented: false,
    role: "coordinator",
    suggestedAgent: suggested,
    executesSpecialistWork: false,
    recommendations: [`Route this request to ${suggested}. Aslan Bey does not execute specialist side effects.`],
  };
}

function runProductAssistant(input, ctx = {}) {
  const invalid = requireObject(input);
  if (invalid) return invalid;
  const validation = productValidation.validateProduct(input);
  return {
    ok: validation.overall !== "FAIL",
    agent: AGENT_CODES.PRODUCT,
    invented: false,
    engine: "server/lib/pim/productValidation.js",
    validation,
    salesEnabled: isSalesEnabled(),
    activationBlocked: !isSalesEnabled(),
    recommendations: [
      "Write only through the authorized product workflow.",
      "Do not activate for sale unless all validations pass and sales policy allows it.",
    ],
    taskId: ctx.taskId,
  };
}

function runOrderAssistant(input, ctx = {}) {
  const invalid = requireObject(input);
  if (invalid) return invalid;
  const salesEnabled = isSalesEnabled();
  const missing = [];
  if (!input.orderId && !input.orderNumber) missing.push("orderId");
  if (input.paymentStatus && input.paymentStatus !== "paid") missing.push("payment_not_paid");

  return {
    ok: true,
    agent: AGENT_CODES.ORDER,
    invented: false,
    salesEnabled,
    salesLocked: !salesEnabled,
    missing,
    purchaseOrderProposal: salesEnabled ? "blocked_until_authorized" : null,
    realSupplierOrder: false,
    recommendations: [
      salesEnabled
        ? "Sales lock is off in this environment — still require explicit PO authorization."
        : "Sales lock is active. Generate no real supplier purchase order.",
    ],
    taskId: ctx.taskId,
  };
}

const AGENT_BY_CODE = {
  [AGENT_CODES.PRICE]: { employeeId: "price_ai", schema: ["supplierCost?"], execute: runPriceAssistant, permissions: ["products.read", "prices.read", "ai.execute"] },
  [AGENT_CODES.STOCK]: { employeeId: "stock_ai", schema: ["stock?"], execute: runStockAssistant, permissions: ["products.read", "ai.execute"] },
  [AGENT_CODES.SEO]: { employeeId: "seo_ai", schema: ["title?", "description?"], execute: runSeoAssistant, permissions: ["products.read", "ai.execute"] },
  [AGENT_CODES.CUSTOMER]: { employeeId: "customer_ai", schema: ["message"], execute: runCustomerAssistant, permissions: ["orders.read", "ai.execute"] },
  [AGENT_CODES.SALES]: { employeeId: "sales_ai", schema: [], execute: runSalesAssistant, permissions: ["orders.read", "ai.execute"] },
  [AGENT_CODES.CATEGORY]: { employeeId: "category_ai", schema: ["legacyId?"], execute: runCategoryAssistant, permissions: ["categories.read", "ai.execute"] },
  [AGENT_CODES.PRODUCT]: { employeeId: "product_ai", schema: ["sku?"], execute: runProductAssistant, permissions: ["products.read", "ai.execute"] },
  [AGENT_CODES.ORDER]: { employeeId: "order_ai", schema: ["orderId?"], execute: runOrderAssistant, permissions: ["orders.read", "ai.execute"] },
  [AGENT_CODES.DOGU_BEY]: { employeeId: "dogu_bey", schema: ["question"], execute: runDoguBey, permissions: ["ai.execute"] },
  [AGENT_CODES.ESAT_BEY]: { employeeId: "esat_bey", schema: ["action?"], execute: runEsatBey, permissions: ["security.read", "ai.execute"] },
  [AGENT_CODES.ASLAN_BEY]: { employeeId: "aslan_bey", schema: ["request?"], execute: runAslanBey, permissions: ["ai.read", "ai.execute"] },
};

function classifyAgent(title, payload = {}) {
  if (payload.agentCode && AGENT_BY_CODE[payload.agentCode]) return payload.agentCode;
  if (payload.kind && AGENT_BY_CODE[payload.kind]) return payload.kind;
  const text = `${title || ""} ${payload.intent || ""}`.toLowerCase();
  if (/price|pricing|marge|cost/.test(text)) return AGENT_CODES.PRICE;
  if (/stock|inventory|lager/.test(text)) return AGENT_CODES.STOCK;
  if (/seo/.test(text)) return AGENT_CODES.SEO;
  if (/customer|support|refund/.test(text)) return AGENT_CODES.CUSTOMER;
  if (/sales|revenue|umsatz/.test(text)) return AGENT_CODES.SALES;
  if (/categor|taxonomy/.test(text)) return AGENT_CODES.CATEGORY;
  if (/customs|gtip|taric/.test(text)) return AGENT_CODES.DOGU_BEY;
  if (/guardian|security|esat/.test(text)) return AGENT_CODES.ESAT_BEY;
  if (/aslan|triage|route/.test(text)) return AGENT_CODES.ASLAN_BEY;
  if (/order/.test(text)) return AGENT_CODES.ORDER;
  if (/product/.test(text)) return AGENT_CODES.PRODUCT;
  return AGENT_CODES.ASLAN_BEY;
}

function getAgent(code) {
  return AGENT_BY_CODE[code] || null;
}

function listAgents() {
  ensureSpecialistEmployees();
  return Object.entries(AGENT_BY_CODE).map(([code, def]) => ({
    code,
    employeeId: def.employeeId,
    permissions: def.permissions,
    schema: def.schema,
  }));
}

function executeAgent(code, input, ctx) {
  const agent = getAgent(code);
  if (!agent) {
    return { ok: false, error: "agent_unavailable", agent: code };
  }
  return agent.execute(input || {}, ctx || {});
}

module.exports = {
  SPECIALIST_EMPLOYEES,
  AGENT_BY_CODE,
  ensureSpecialistEmployees,
  classifyAgent,
  getAgent,
  listAgents,
  executeAgent,
  runPriceAssistant,
  runStockAssistant,
  runSeoAssistant,
  runCustomerAssistant,
  runSalesAssistant,
  runCategoryAssistant,
  runDoguBey,
  runEsatBey,
  runAslanBey,
  runProductAssistant,
  runOrderAssistant,
};
