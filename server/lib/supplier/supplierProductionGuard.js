/**
 * Part 15 — Production supplier guard.
 * Blocks demo/test suppliers and hosts from production connector paths.
 * Do not weaken — SUP-DEMO-001 and demo-automotive.example are TEST ONLY.
 */

const TEST_ONLY_SUPPLIER_IDS = new Set([
  "SUP-DEMO-001",
  "SUP-DEMO",
  "DEMO-SUP",
  "SUP-DE-01",
  "SUP-DE-02",
  "SUP-NL-01",
  "mock",
  "mock-xml",
  "tecdoc",
]);

/** Hostnames that must never be used as production supplier endpoints. */
const TEST_ONLY_HOSTS = new Set(["demo-automotive.example", "supplier.example"]);

function normalizeSupplierId(id) {
  return String(id || "")
    .trim()
    .toUpperCase();
}

function extractHostname(url) {
  if (!url) return "";
  try {
    return new URL(String(url)).hostname.toLowerCase();
  } catch {
    const match = String(url).match(/^(?:https?:\/\/)?([^/?#]+)/i);
    return match ? match[1].toLowerCase() : "";
  }
}

function isTestOnlySupplierId(supplierId) {
  const id = normalizeSupplierId(supplierId);
  if (!id) return false;
  if (TEST_ONLY_SUPPLIER_IDS.has(id)) return true;
  if (id.includes("DEMO") || id.startsWith("MOCK")) return true;
  return false;
}

function isTestOnlyHost(url) {
  const host = extractHostname(url);
  if (!host) return false;
  if (TEST_ONLY_HOSTS.has(host)) return true;
  if (host.endsWith(".example") || host === "example.com") return true;
  return false;
}

function isTestOnlySupplier({ supplierId, apiUrl, feedUrl, baseUrl } = {}) {
  if (isTestOnlySupplierId(supplierId)) return true;
  const urls = [apiUrl, feedUrl, baseUrl].filter(Boolean);
  return urls.some((url) => isTestOnlyHost(url));
}

function assertProductionSupplier({ supplierId, apiUrl, feedUrl, baseUrl } = {}) {
  if (!supplierId) {
    const err = new Error("Unknown supplier: supplier code is required");
    err.code = "unknown_supplier";
    throw err;
  }

  if (isTestOnlySupplier({ supplierId, apiUrl, feedUrl, baseUrl })) {
    const err = new Error(
      `Supplier ${normalizeSupplierId(supplierId)} is TEST ONLY and cannot be used for production integration`
    );
    err.code = "test_only_supplier";
    throw err;
  }
}

module.exports = {
  TEST_ONLY_SUPPLIER_IDS,
  TEST_ONLY_HOSTS,
  isTestOnlySupplierId,
  isTestOnlyHost,
  isTestOnlySupplier,
  assertProductionSupplier,
};
