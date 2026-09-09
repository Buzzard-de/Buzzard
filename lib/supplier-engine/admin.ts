import type { SupplierEngineAdminRow } from "./types";
import { listSuppliers } from "./registry";
import { getSupplierLogs } from "./observability";
import { createConnector } from "./connectors/factory";
import { listConfiguredCapabilities } from "./capabilities";
import { listRegistryProducts } from "@/lib/product-engine";

export async function getSupplierEngineAdminOverview(): Promise<SupplierEngineAdminRow[]> {
  const rows: SupplierEngineAdminRow[] = [];

  for (const supplier of listSuppliers()) {
    const connector = createConnector(supplier, supplier.integrationTypes[0] ?? "manual");
    const health = await connector.healthCheck();
    const logs = getSupplierLogs(supplier.supplierId);
    const lastLog = logs[logs.length - 1];
    const productCount = listRegistryProducts().filter((p) =>
      p.supplierOffers.some((o) => o.supplierId === supplier.supplierId)
    ).length;
    const errorCount = logs.filter((l) => l.status === "FAILURE").length;

    rows.push({
      supplierId: supplier.supplierId,
      name: supplier.name,
      country: supplier.country,
      integrationTypes: supplier.integrationTypes.join(", "),
      status: supplier.status,
      capabilities: listConfiguredCapabilities(supplier.capabilities).join(", "),
      lastSync: lastLog?.timestamp ?? "—",
      health: health.status,
      products: productCount,
      errors: errorCount,
    });
  }

  return rows;
}
