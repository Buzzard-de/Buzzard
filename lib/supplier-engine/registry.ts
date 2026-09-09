import type { IntegrationType, SupplierConfig, SupplierStatus } from "./types";
import testFeeds from "@/data/global/test_supplier_feeds.json";
import suppliersMaster from "@/data/buzzard_suppliers.json";
import { TEST_SUPPLIER_ID } from "./fixtures";

const supplierById = new Map<string, SupplierConfig>();

function mapMasterToConfig(raw: Record<string, unknown>): SupplierConfig {
  const now = new Date().toISOString();
  const feedType = String(raw.feed_type || "manual");
  const integrationTypes: IntegrationType[] =
    feedType === "json" ? ["api"] : feedType === "manual" ? ["manual"] : [feedType as IntegrationType];

  return {
    supplierId: String(raw.supplier_id),
    name: String(raw.supplier_name),
    country: "DE",
    region: "EU",
    status: raw.active === false ? "DISABLED" : raw.production_status === "TEST_ONLY" ? "TESTING" : "CONNECTED",
    integrationTypes,
    currency: String(raw.currency || "EUR"),
    supportedMarkets: ["DE"],
    supportedCategories: [],
    capabilities: {
      productFeed: true,
      stockFeed: true,
      priceFeed: true,
      dropshipping: raw.dropshipping === true,
      whiteLabel: raw.white_label === true,
      blindShipping: raw.blind_shipping === true,
      api: feedType === "json",
      csv: false,
      xml: false,
    },
    fieldMapping: {},
    createdAt: now,
    updatedAt: now,
  };
}

function buildTestSupplierA(): SupplierConfig {
  const feed = (testFeeds as Record<string, unknown>)[TEST_SUPPLIER_ID] as Record<string, unknown>;
  const now = new Date().toISOString();
  return {
    supplierId: TEST_SUPPLIER_ID,
    name: String(feed.name || "Test Supplier A"),
    country: String(feed.country || "DE"),
    region: String(feed.region || "EU"),
    status: "TESTING",
    integrationTypes: (feed.integrationTypes as IntegrationType[]) || ["api", "xml", "csv", "manual"],
    currency: String(feed.currency || "EUR"),
    supportedMarkets: (feed.supportedMarkets as string[]) || ["DE", "FR", "PL"],
    supportedCategories: [],
    capabilities: (feed.capabilities as SupplierConfig["capabilities"]) || {},
    fieldMapping: (feed.fieldMapping as SupplierConfig["fieldMapping"]) || {},
    rateLimit: feed.rateLimit as SupplierConfig["rateLimit"],
    createdAt: now,
    updatedAt: now,
  };
}

function ensureRegistry(): void {
  if (supplierById.size > 0) return;

  for (const raw of suppliersMaster.suppliers) {
    const config = mapMasterToConfig(raw as unknown as Record<string, unknown>);
    supplierById.set(config.supplierId, config);
  }

  supplierById.set(TEST_SUPPLIER_ID, buildTestSupplierA());
}

export function listSuppliers(): SupplierConfig[] {
  ensureRegistry();
  return [...supplierById.values()];
}

export function getSupplier(supplierId: string): SupplierConfig | undefined {
  ensureRegistry();
  return supplierById.get(supplierId);
}

export function getSupplierOrThrow(supplierId: string): SupplierConfig {
  const s = getSupplier(supplierId);
  if (!s) throw new Error(`UNKNOWN_SUPPLIER:${supplierId}`);
  return s;
}

export function updateSupplierStatus(supplierId: string, status: SupplierStatus): SupplierConfig | undefined {
  const s = getSupplier(supplierId);
  if (!s) return undefined;
  const updated = { ...s, status, updatedAt: new Date().toISOString() };
  supplierById.set(supplierId, updated);
  return updated;
}

export function getRegistryCount(): number {
  ensureRegistry();
  return supplierById.size;
}
