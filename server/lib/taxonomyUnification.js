const fs = require("fs");
const path = require("path");

const dataDir = path.join(
  __dirname,
  "..",
  "..",
  "intelligence",
  "buzzard_ai_complete",
  "master_taxonomy",
  "data"
);
const canonicalFile = path.join(dataDir, "canonical_taxonomy.json");
const mappingFile = path.join(dataDir, "category_id_mapping.csv");

let canonicalCache = null;
let aliasCache = null;

function loadCanonical() {
  if (!canonicalCache) {
    canonicalCache = JSON.parse(fs.readFileSync(canonicalFile, "utf8"));
  }
  return canonicalCache;
}

function parseCsv(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.replace(/^\ufeff/, "").trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim()]));
  });
}

function loadAliases() {
  if (!aliasCache) {
    const rows = parseCsv(fs.readFileSync(mappingFile, "utf8"));
    aliasCache = new Map();
    for (const row of rows) {
      aliasCache.set(`${row.legacy_id}:${row.legacy_system}`, row);
    }
  }
  return aliasCache;
}

function normalizeShopLegacy(legacyId) {
  const match = String(legacyId).match(/^cat-(\d+)/);
  if (match) {
    return `shop-${String(Number(match[1])).padStart(2, "0")}`;
  }
  return legacyId;
}

function normalizeIntelligenceLegacy(legacyId) {
  if (String(legacyId).startsWith("intelligence.")) return legacyId;
  const match = String(legacyId).match(/^(\d+)(?:\.|$)/);
  if (match) {
    return `intelligence.${String(Number(match[1])).padStart(2, "0")}`;
  }
  return legacyId;
}

function allCanonicalNodes() {
  return loadCanonical().nodes;
}

function getCanonicalNode(nodeId) {
  return allCanonicalNodes().find((node) => node.id === nodeId) || null;
}

function canonicalRoots() {
  return allCanonicalNodes().filter((node) => node.level === 1);
}

function canonicalChildren(parentId) {
  return allCanonicalNodes().filter((node) => node.parent_id === parentId);
}

function canonicalPath(nodeId) {
  const result = [];
  let current = getCanonicalNode(nodeId);
  while (current) {
    result.push(current);
    current = current.parent_id ? getCanonicalNode(current.parent_id) : null;
  }
  return result.reverse();
}

function buildResolution(legacyId, system, canonicalId, strategy) {
  const node = getCanonicalNode(canonicalId);
  return {
    legacy_id: legacyId,
    legacy_system: system,
    canonical_id: canonicalId,
    resolved: true,
    strategy,
    canonical_node: node,
    path: node ? canonicalPath(canonicalId) : [],
  };
}

function resolveLegacy(legacyId, legacySystem = "shop") {
  const system = String(legacySystem).toLowerCase();
  const candidate = String(legacyId).trim();
  const aliases = loadAliases();

  const direct = aliases.get(`${candidate}:${system}`);
  if (direct) {
    return buildResolution(candidate, system, direct.canonical_id, "direct");
  }

  if (system === "shop") {
    const normalized = normalizeShopLegacy(candidate);
    const mapped = aliases.get(`${normalized}:${system}`);
    if (mapped) {
      return buildResolution(candidate, system, mapped.canonical_id, "shop_root_alias");
    }
  }

  if (system === "intelligence") {
    const normalized = normalizeIntelligenceLegacy(candidate);
    const mapped = aliases.get(`${normalized}:${system}`);
    if (mapped) {
      return buildResolution(candidate, system, mapped.canonical_id, "intelligence_root_alias");
    }
  }

  return {
    legacy_id: candidate,
    legacy_system: system,
    canonical_id: null,
    resolved: false,
    strategy: "unmapped",
  };
}

function listAliases(legacySystem) {
  const aliases = loadAliases();
  const items = [...aliases.values()];
  if (!legacySystem) return items;
  const system = String(legacySystem).toLowerCase();
  return items.filter((item) => item.legacy_system === system);
}

function unificationStatus() {
  const data = loadCanonical();
  const nodes = data.nodes;
  return {
    canonical_system: data.canonical_system || "BUZZARD_MASTER_TAXONOMY",
    schema_version: data.schema_version,
    canonical_roots: data.master_root_count,
    total_nodes: nodes.length,
    alias_count: loadAliases().size,
    legacy_systems: [...new Set(listAliases().map((item) => item.legacy_system))].sort(),
    status: "ready",
    mode: "embedded",
  };
}

module.exports = {
  loadCanonical,
  allCanonicalNodes,
  getCanonicalNode,
  canonicalRoots,
  canonicalChildren,
  canonicalPath,
  resolveLegacy,
  listAliases,
  unificationStatus,
};
