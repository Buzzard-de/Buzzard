import type { ProviderHealthStatus, WorkerId } from "./types";
import { getProvider, listProviders } from "./providerRegistry";
import { getWorkerContract, listWorkerContracts } from "./mockWorkers";

export function getWorkerHealth(workerId: WorkerId): ProviderHealthStatus {
  const worker = getWorkerContract(workerId);
  return worker?.getHealth() ?? "UNHEALTHY";
}

export function getProviderHealth(providerId: string): ProviderHealthStatus {
  const provider = getProvider(providerId);
  return provider?.definition.health ?? "UNHEALTHY";
}

export function isWorkerHealthy(workerId: WorkerId): boolean {
  const health = getWorkerHealth(workerId);
  return health === "HEALTHY" || health === "DEGRADED";
}

export function isProviderAvailable(providerId: string): boolean {
  const provider = getProvider(providerId);
  if (!provider) return false;
  return provider.definition.enabled && provider.definition.health !== "UNHEALTHY" && provider.definition.health !== "DISABLED";
}

export function getSystemHealthSummary(): {
  workers: Record<WorkerId, ProviderHealthStatus>;
  providers: Record<string, ProviderHealthStatus>;
} {
  const workers = {} as Record<WorkerId, ProviderHealthStatus>;
  for (const w of listWorkerContracts()) {
    workers[w.workerId] = w.getHealth();
  }

  const providers: Record<string, ProviderHealthStatus> = {};
  for (const p of listProviders()) {
    providers[p.id] = p.health;
  }

  return { workers, providers };
}
