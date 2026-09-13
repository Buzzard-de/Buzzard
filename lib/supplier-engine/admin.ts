import type { SupplierEngineAdminRow } from "./types";
import { listSuppliers } from "./registry";
import { getSupplierLogs } from "./observability";
import { createConnector } from "./connectors/factory";
import { listConfiguredCapabilities } from "./capabilities";
import { listRegistryProducts } from "@/lib/product-engine";
import { getSupplierRuntimeState } from "./state";
import { hasConfiguredCredentials } from "./credentials";

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

export async function getSupplierEngineAdminOverview(): Promise<SupplierEngineAdminRow[]> {
  const rows: SupplierEngineAdminRow[] = [];

  for (const supplier of listSuppliers()) {
    const connector = createConnector(supplier, supplier.integrationTypes[0] ?? "manual");
    const health = await connector.healthCheck();
    const logs = getSupplierLogs(supplier.supplierId);
    const lastLog = logs[logs.length - 1];
    const runtime = getSupplierRuntimeState(supplier.supplierId);
    const productCount = listRegistryProducts().filter((p) =>
      p.supplierOffers.some((o) => o.supplierId === supplier.supplierId)
    ).length;
    const errorCount = logs.filter((l) => l.status === "FAILURE").length;

    rows.push({
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
      health: health.status,
      reliabilityScore: runtime.reliabilityScore,
      products: productCount,
      errors: errorCount,
      credentialsConfigured: hasConfiguredCredentials(supplier.supplierId) || Boolean(supplier.secretsRef),
    });
  }

  return rows;
}
