const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "..");
const taxonomyFile = path.join(
  rootDir,
  "intelligence",
  "buzzard_ai_complete",
  "master_taxonomy",
  "data",
  "taxonomy.json"
);

let taxonomyCache = null;

function isEmbeddedIntelligenceEnabled() {
  if (process.env.BUZZARD_EMBEDDED_INTELLIGENCE === "0") return false;
  if (process.env.BUZZARD_EMBEDDED_INTELLIGENCE === "1") return true;
  return !String(process.env.BUZZARD_INTELLIGENCE_API_URL || "").trim();
}

function loadTaxonomy() {
  if (!taxonomyCache) {
    taxonomyCache = JSON.parse(fs.readFileSync(taxonomyFile, "utf8"));
  }
  return taxonomyCache;
}

function allNodes() {
  return loadTaxonomy().nodes;
}

function getNode(nodeId) {
  return allNodes().find((node) => node.id === nodeId) || null;
}

function children(parentId) {
  return allNodes().filter((node) => node.parent_id === parentId);
}

function byLevel(level) {
  return allNodes().filter((node) => node.level === level);
}

function search(term) {
  const query = String(term || "").toLowerCase();
  return allNodes().filter(
    (node) =>
      node.name.toLowerCase().includes(query) || node.slug.toLowerCase().includes(query)
  );
}

function nodePath(nodeId) {
  const result = [];
  let current = getNode(nodeId);
  while (current) {
    result.push(current);
    current = current.parent_id ? getNode(current.parent_id) : null;
  }
  return result.reverse();
}

function taxonomySnapshot() {
  const data = loadTaxonomy();
  const nodes = data.nodes;
  const levelCounts = {};
  for (const node of nodes) {
    levelCounts[node.level] = (levelCounts[node.level] || 0) + 1;
  }
  return {
    schema_version: data.schema_version,
    master_category_count: data.master_category_count,
    total_nodes: nodes.length,
    level_counts: levelCounts,
    hierarchy: data.hierarchy,
    mode: "embedded",
  };
}

function productionBridgeSummary() {
  return {
    name: "Buzzard Production Bridge",
    locale: "de",
    purpose: "Vollständige Software-Architektur in kontrollierte Produktionsreife überführen.",
    go_live_rule: "Jedes Gate muss bestehen.",
    important:
      "Credentials, API-Keys und rechtliche Freigaben müssen konfiguriert werden; die Bridge erfindet sie nicht.",
    ready_for_go_live: false,
    mode: "embedded",
    gates_passed: 0,
    gates_blocked: 14,
    gates: [
      { gate: "domain", label: "Domain", status: "BLOCKED", blocking: true },
      { gate: "TLS", label: "TLS/HTTPS", status: "BLOCKED", blocking: true },
      { gate: "payment", label: "Zahlung", status: "BLOCKED", blocking: true },
      { gate: "shipping", label: "Versand", status: "BLOCKED", blocking: true },
      { gate: "end-to-end order", label: "End-to-End-Bestellung", status: "BLOCKED", blocking: true },
    ],
    manifest_json: "/taxonomy/buzzard_production_bridge_manifest.json",
  };
}

function productionReadiness() {
  return {
    ready: false,
    mode: "embedded",
    checks: [
      {
        name: "catalog",
        status: "BLOCKED",
        blocking: true,
        detail: "Catalog mode — no live payment/shipping providers configured",
      },
      {
        name: "payment",
        status: "BLOCKED",
        blocking: true,
        detail: "Stripe/PayPal not configured",
      },
      {
        name: "shipping",
        status: "BLOCKED",
        blocking: true,
        detail: "Carrier APIs not configured",
      },
      {
        name: "intelligence",
        status: "EMBEDDED",
        blocking: false,
        detail: "Embedded taxonomy + readiness gate active on Node API",
      },
    ],
  };
}

function productionIntegrations() {
  return {
    payment: { status: "NOT_CONFIGURED", missing: ["STRIPE_SECRET_KEY"] },
    carrier: { status: "NOT_CONFIGURED", missing: ["DHL_API_KEY"] },
    ebay: { status: "NOT_CONFIGURED", missing: ["EBAY_CLIENT_ID"] },
    amazon: { status: "NOT_CONFIGURED", missing: ["AMAZON_CLIENT_ID"] },
    tecdoc: { status: "NOT_CONFIGURED", missing: ["TECDOC_API_KEY"] },
    llm: { status: "NOT_CONFIGURED", missing: ["LLM_API_URL"] },
    mode: "embedded",
  };
}

function shopBridgeReadiness() {
  return {
    catalog: "BLOCKED",
    payment: "BLOCKED",
    shipping: "BLOCKED",
    order_pipeline: "READY",
    intelligence_bridge: "READY",
    sales_enabled: false,
    missing: ["catalog", "payment", "shipping"],
    mode: "embedded",
  };
}

function health() {
  return {
    status: "ok",
    mode: "embedded",
    taxonomy_nodes: allNodes().length,
    master_categories: loadTaxonomy().master_category_count,
  };
}

module.exports = {
  isEmbeddedIntelligenceEnabled,
  taxonomySnapshot,
  allNodes,
  getNode,
  children,
  byLevel,
  search,
  nodePath,
  productionReadiness,
  productionBridgeSummary,
  productionIntegrations,
  shopBridgeReadiness,
  health,
};
