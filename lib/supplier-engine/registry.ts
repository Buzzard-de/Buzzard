import type { IntegrationType, SupplierConfig, SupplierStatus } from "./types";
import testFeeds from "@/data/global/test_supplier_feeds.json";
import suppliersMaster from "@/data/buzzard_suppliers.json";
import { TEST_SUPPLIER_ID } from "./fixtures";
import { getSupplierPersistence } from "./persistence";
import { registerCredentialRef } from "./credentials";
import { registerLiveSupplierIfConfigured } from "./liveSupplier/registry";

const supplierById = new Map<string, SupplierConfig>();
const persistedOverlay = new Map<string, Partial<SupplierConfig>>();

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
  const country = String(feed.country || "DE");
  return {
    supplierId: TEST_SUPPLIER_ID,
    name: String(feed.name || "Test Supplier A"),
    country,
    supplierCountry: String(feed.supplierCountry || country),
    warehouseCountries: (feed.warehouseCountries as string[]) || [country],
    fulfillmentCountries: (feed.fulfillmentCountries as string[]) || [country],
    shippingOrigins: (feed.shippingOrigins as string[]) || [country],
    internationalShippingSupported: feed.internationalShippingSupported !== false,
    dropshippingSupported: (feed.capabilities as SupplierConfig["capabilities"])?.dropshipping === true,
    blindShippingSupported: (feed.capabilities as SupplierConfig["capabilities"])?.blindShipping === true,
    whiteLabelSupported: (feed.capabilities as SupplierConfig["capabilities"])?.whiteLabel === true,
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

function mergePersistedOverlay(config: SupplierConfig): SupplierConfig {
  const overlay = persistedOverlay.get(config.supplierId);
  if (!overlay) return config;
  return {
    ...config,
    ...overlay,
    capabilities: { ...config.capabilities, ...overlay.capabilities },
    supportedMarkets: overlay.supportedMarkets ?? config.supportedMarkets,
    status: overlay.status ?? config.status,
    updatedAt: overlay.updatedAt ?? config.updatedAt,
  };
}

function persistRegistryEntry(config: SupplierConfig): void {
  const persistence = getSupplierPersistence();
  if (!persistence) return;
  persistence.saveRegistryRow({
    supplierId: config.supplierId,
    name: config.name,
    displayName: config.displayName || config.name,
    country: config.country,
    connectorType: config.integrationTypes[0] || "manual",
    supportedMarkets: config.supportedMarkets,
    capabilities: config.capabilities,
    active: config.status !== "DISABLED" && config.status !== "PAUSED",
    status: config.status,
    secretsRef: config.secretsRef,
    createdAt: config.createdAt,
  });
  if (config.secretsRef) registerCredentialRef(config.supplierId, config.secretsRef);
}

export function hydrateRegistryFromPersistence(): void {
  const persistence = getSupplierPersistence();
  if (!persistence) return;
  for (const row of persistence.listRegistryRows()) {
    persistedOverlay.set(String(row.supplierId), {
      supplierId: String(row.supplierId),
      name: String(row.name),
      displayName: row.displayName ? String(row.displayName) : String(row.name),
      country: row.country ? String(row.country) : "DE",
      status: (row.status as SupplierStatus) || (row.active === false ? "DISABLED" : "CONNECTED"),
      supportedMarkets: (row.supportedMarkets as string[]) || [],
      capabilities: (row.capabilities as SupplierConfig["capabilities"]) || {},
      secretsRef: row.secretsRef ? String(row.secretsRef) : undefined,
      updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
    });
  }
}

function ensureRegistry(): void {
  if (supplierById.size > 0) return;

  for (const raw of suppliersMaster.suppliers) {
    const config = mergePersistedOverlay(mapMasterToConfig(raw as unknown as Record<string, unknown>));
    supplierById.set(config.supplierId, config);
    persistRegistryEntry(config);
  }

  const testSupplier = mergePersistedOverlay(buildTestSupplierA());
  supplierById.set(TEST_SUPPLIER_ID, testSupplier);
  persistRegistryEntry(testSupplier);

  registerLiveSupplierIfConfigured((config) => {
    const merged = mergePersistedOverlay(config);
    supplierById.set(config.supplierId, merged);
    persistRegistryEntry(merged);
  });
}

export function listSuppliers(): SupplierConfig[] {
  ensureRegistry();
  return [...supplierById.values()].map((s) => mergePersistedOverlay(s));
}

export function getSupplier(supplierId: string): SupplierConfig | undefined {
  ensureRegistry();
  const config = supplierById.get(supplierId);
  return config ? mergePersistedOverlay(config) : undefined;
}

export function isSupplierSelectable(supplierId: string): boolean {
  const supplier = getSupplier(supplierId);
  if (!supplier) return false;
  return supplier.status !== "DISABLED" && supplier.status !== "PAUSED";
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
  persistedOverlay.set(supplierId, {
    status,
    updatedAt: updated.updatedAt,
  });
  persistRegistryEntry(updated);
  return updated;
}

export function enableSupplier(supplierId: string): SupplierConfig | undefined {
  return updateSupplierStatus(supplierId, "ACTIVE");
}

export function disableSupplier(supplierId: string): SupplierConfig | undefined {
  return updateSupplierStatus(supplierId, "DISABLED");
}

export function getRegistryCount(): number {
  ensureRegistry();
  return supplierById.size;
}

/** Test-only registry reset for deterministic live supplier registration. */
export function resetSupplierRegistryForTests(): void {
  supplierById.clear();
  persistedOverlay.clear();
}
