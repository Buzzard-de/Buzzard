import type { SupplierEngineAdminRow } from "./types";
import { listSuppliers, getSupplier, enableSupplier, disableSupplier } from "./registry";
import { getSupplierLogs } from "./observability";
import { createConnector } from "./connectors/factory";
import { listConfiguredCapabilities } from "./capabilities";
import { listRegistryProducts } from "@/lib/product-engine";
import { getSupplierRuntimeState } from "./state";
import { hasConfiguredCredentials } from "./credentials";
import { getSupplierHealth } from "./health";
import { getSyncCursorForAdmin } from "./syncCursor";
import { listSupplierEngineAudit, recordSupplierEngineAudit } from "./audit";
import { clearSyncCursor } from "./syncCursor";
import { bootstrapSupplierEnginePersistence } from "./bootstrap";
import { isSupplierNetworkEnabled, resolveConnectorEnvironment } from "./network";
import { runSupplierConnectionTest } from "./connectionTest";

function listOrderCapabilities(capabilities: import("./types").SupplierCapabilities): string[] {
  const flags: string[] = [];
  if (capabilities.createOrder || capabilities.orderAPI) flags.push("CREATE_ORDER");
  if (capabilities.cancelOrder) flags.push("CANCEL_ORDER");
  if (capabilities.orderStatus) flags.push("ORDER_STATUS");
  if (capabilities.tracking || capabilities.trackingAPI) flags.push("TRACKING");
  if (capabilities.returnAuthorization || capabilities.returnsAPI) flags.push("RETURN");
  if (capabilities.refund) flags.push("REFUND");
  if (capabilities.credit) flags.push("CREDIT");
  if (capabilities.replacement) flags.push("REPLACEMENT");
  return flags;
}

function buildAdminRow(supplier: ReturnType<typeof listSuppliers>[number], healthStatus: string): SupplierEngineAdminRow {
  const logs = getSupplierLogs(supplier.supplierId);
  const lastLog = logs[logs.length - 1];
  const runtime = getSupplierRuntimeState(supplier.supplierId);
  const health = getSupplierHealth(supplier.supplierId);
  const productCount = listRegistryProducts().filter((p) =>
    p.supplierOffers.some((o) => o.supplierId === supplier.supplierId)
  ).length;
  const errorCount = logs.filter((l) => l.status === "FAILURE").length;

  return {
    supplierId: supplier.supplierId,
    name: supplier.displayName || supplier.name,
    country: supplier.country,
    integrationTypes: supplier.integrationTypes.join(", "),
    status: supplier.status,
    capabilities: listConfiguredCapabilities(supplier.capabilities).join(", "),
    orderCapabilities: listOrderCapabilities(supplier.capabilities).join(", "),
    supportedMarkets: supplier.supportedMarkets,
    lastSync: runtime.lastSuccessfulSync ?? lastLog?.timestamp ?? "—",
    lastSuccessfulSync: runtime.lastSuccessfulSync,
    lastFailedSync: runtime.lastFailedSync,
    syncStatus: runtime.syncStatus,
    health: healthStatus as SupplierEngineAdminRow["health"],
    reliabilityScore: health.reliabilityScore ?? runtime.reliabilityScore,
    products: productCount,
    errors: errorCount,
    credentialsConfigured: hasConfiguredCredentials(supplier.supplierId) || Boolean(supplier.secretsRef),
  };
}

export interface SupplierEngineDashboard {
  totalSuppliers: number;
  activeSuppliers: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  disabled: number;
  syncing: number;
  lastSuccessfulSync?: string;
  lastFailedSync?: string;
  productsProcessed: number;
  offersUpdated: number;
  stockUpdated: number;
  priceUpdated: number;
}

export async function getSupplierEngineDashboard(): Promise<SupplierEngineDashboard> {
  bootstrapSupplierEnginePersistence();
  const rows = await getSupplierEngineAdminOverview();
  const runtimeStates = rows.map((r) => getSupplierRuntimeState(r.supplierId));

  return {
    totalSuppliers: rows.length,
    activeSuppliers: rows.filter((r) => r.status !== "DISABLED" && r.status !== "PAUSED").length,
    healthy: rows.filter((r) => r.health === "HEALTHY").length,
    degraded: rows.filter((r) => r.health === "DEGRADED").length,
    unhealthy: rows.filter((r) => r.health === "UNHEALTHY").length,
    disabled: rows.filter((r) => r.status === "DISABLED" || r.status === "PAUSED").length,
    syncing: rows.filter((r) => r.syncStatus === "SYNCING").length,
    lastSuccessfulSync: runtimeStates
      .map((s) => s.lastSuccessfulSync)
      .filter(Boolean)
      .sort()
      .reverse()[0],
    lastFailedSync: runtimeStates
      .map((s) => s.lastFailedSync)
      .filter(Boolean)
      .sort()
      .reverse()[0],
    productsProcessed: runtimeStates.reduce((sum, s) => sum + (s.productsProcessed || 0), 0),
    offersUpdated: runtimeStates.reduce((sum, s) => sum + (s.offersUpdated || 0), 0),
    stockUpdated: runtimeStates.reduce((sum, s) => sum + (s.stockUpdated || 0), 0),
    priceUpdated: runtimeStates.reduce((sum, s) => sum + (s.priceUpdated || 0), 0),
  };
}

export async function getSupplierEngineAdminOverview(): Promise<SupplierEngineAdminRow[]> {
  bootstrapSupplierEnginePersistence();
  const rows: SupplierEngineAdminRow[] = [];

  for (const supplier of listSuppliers()) {
    const connector = createConnector(supplier, supplier.integrationTypes[0] ?? "manual");
    const health = await connector.healthCheck();
    rows.push(buildAdminRow(supplier, health.status));
  }

  return rows;
}

export async function getSupplierEngineDetail(supplierId: string) {
  bootstrapSupplierEnginePersistence();
  const supplier = getSupplier(supplierId);
  if (!supplier) return null;

  const connector = createConnector(supplier, supplier.integrationTypes[0] ?? "manual");
  const connectionTest = await runSupplierConnectionTest(supplierId);
  const healthCheck = await connector.healthCheck();
  const runtime = getSupplierRuntimeState(supplierId);
  const health = getSupplierHealth(supplierId);
  const incrementalCursor = getSyncCursorForAdmin(supplierId, "incremental");
  const fullCursor = getSyncCursorForAdmin(supplierId, "full");
  const audit = listSupplierEngineAudit(supplierId, 20);

  return {
    general: {
      supplierId: supplier.supplierId,
      name: supplier.displayName || supplier.name,
      country: supplier.country,
      connector: supplier.integrationTypes.join(", "),
      environment: resolveConnectorEnvironment(),
      active: supplier.status !== "DISABLED" && supplier.status !== "PAUSED",
      status: supplier.status,
    },
    connection: {
      status: connectionTest.status,
      latencyMs: connectionTest.latencyMs,
      message: connectionTest.message,
      lastChecked: connectionTest.checkedAt,
      networkEnabled: isSupplierNetworkEnabled(),
    },
    markets: supplier.supportedMarkets,
    capabilities: {
      productFeed: supplier.capabilities.productFeed,
      stockFeed: supplier.capabilities.stockFeed,
      priceFeed: supplier.capabilities.priceFeed,
      orders: supplier.capabilities.orderAPI || supplier.capabilities.createOrder,
      tracking: supplier.capabilities.trackingAPI || supplier.capabilities.tracking,
      returns: supplier.capabilities.returnsAPI,
      dropshipping: supplier.capabilities.dropshipping,
      whiteLabel: supplier.capabilities.whiteLabel,
      blindShipping: supplier.capabilities.blindShipping,
    },
    sync: {
      fullCursor,
      incrementalCursor,
      lastSuccessfulSync: runtime.lastSuccessfulSync,
      lastFailedSync: runtime.lastFailedSync,
      syncStatus: runtime.syncStatus,
      productsProcessed: runtime.productsProcessed,
      offersUpdated: runtime.offersUpdated,
      stockUpdated: runtime.stockUpdated,
      priceUpdated: runtime.priceUpdated,
    },
    health: {
      status: health.healthStatus || healthCheck.status,
      reliability: health.reliabilityScore,
      successCount: health.successCount,
      failureCount: health.errorCount,
      responseTimeMs: health.responseTimeMs,
      consecutiveFailures: health.consecutiveFailures,
    },
    audit,
    credentialsConfigured: hasConfiguredCredentials(supplierId) || Boolean(supplier.secretsRef),
  };
}

export function setSupplierEnabled(supplierId: string, enabled: boolean, actor = "system") {
  bootstrapSupplierEnginePersistence();
  const updated = enabled ? enableSupplier(supplierId) : disableSupplier(supplierId);
  if (!updated) return null;
  recordSupplierEngineAudit({
    actor,
    supplierId,
    action: enabled ? "supplier.enabled" : "supplier.disabled",
  });
  return updated;
}

export function resetSupplierCursorSafe(
  supplierId: string,
  syncMode: "full" | "incremental" = "incremental",
  actor = "system"
) {
  bootstrapSupplierEnginePersistence();
  clearSyncCursor(supplierId, syncMode);
  recordSupplierEngineAudit({
    actor,
    supplierId,
    action: "supplier.cursor.reset",
    metadata: { syncMode },
  });
  return { ok: true, supplierId, syncMode };
}
