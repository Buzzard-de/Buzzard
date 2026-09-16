import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { getLatestValidationForScope } from "@/lib/supplier-production-validation/persistence";
import { getActivationSafetyCounters } from "./safety";
import { listActivationAudit } from "./audit";
import { listActivationRecords, getActivationRecord, listFirstOrderGates } from "./persistence";
import type { ActivationDashboard } from "./types";

export function getSupplierOrderActivationDashboard(): ActivationDashboard {
  const records = listActivationRecords();
  const firstOrders = listFirstOrderGates();
  const armed = records.filter((r) => r.networkState === "ARMED").length;
  const active = records.filter((r) => r.networkState === "ENABLED" || r.status === "ACTIVE").length;
  const sent = firstOrders.filter((f) => f.status === "SENT" || f.status === "CONFIRMED").length;

  const validation = getLatestValidationForScope({
    supplierId: records[0]?.supplierId || "SUP-INTER-CARS-001",
    environment: "PRODUCTION",
    market: records[0]?.market || "DE",
    channel: records[0]?.channel || "DIRECT",
  });

  return {
    activationCount: records.length,
    blocked: records.filter((r) => r.status === "BLOCKED").length,
    approved: records.filter((r) => r.status === "APPROVED").length,
    armed,
    active,
    firstOrdersPrepared: firstOrders.filter((f) => f.status === "PREPARED").length,
    firstOrdersSent: sent,
    realSupplierOrderNetwork: isSupplierOrderNetworkEnabled() ? "ENABLED" : "DISABLED",
    interCarsCreateOrder: validation?.createOrderCapability === "VALIDATED" ? "VALIDATED" : "UNVERIFIED",
    productionActivation: active > 0 ? "ACTIVE" : armed > 0 ? "ARMED" : "NOT ACTIVE",
    firstRealOrder: sent > 0 ? "SENT" : "NOT SENT",
    networkState: active > 0 ? "ENABLED" : armed > 0 ? "ARMED" : "DISABLED",
    safety: getActivationSafetyCounters(),
  };
}

export function listSupplierOrderActivationRows(filter?: {
  supplierId?: string;
  status?: string;
}) {
  return listActivationRecords().filter((row) => {
    if (filter?.supplierId && row.supplierId !== filter.supplierId) return false;
    if (filter?.status && row.status !== filter.status) return false;
    return true;
  });
}

export function getSupplierOrderActivationDetail(activationId: string) {
  const activation = getActivationRecord(activationId);
  if (!activation) return null;
  return {
    activation,
    audit: listActivationAudit({ activationId }).slice(-50),
    firstOrders: listFirstOrderGates().filter((f) => f.activationId === activationId),
    safety: getActivationSafetyCounters(),
    networkSeparate: {
      activationStatus: activation.status,
      networkState: activation.networkState,
      realOrderSent: activation.realOrderSent,
      envNetworkEnabled: isSupplierOrderNetworkEnabled(),
    },
  };
}
