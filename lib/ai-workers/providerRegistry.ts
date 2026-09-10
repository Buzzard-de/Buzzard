import type { AiProviderDefinition, ProviderExecuteInput, ProviderExecuteResult, ProviderSelectionInput, WorkerId } from "./types";
import { MOCK_PROVIDER_ID } from "./constants";
import type { AiProvider } from "./provider";
import { getWorkerContract } from "./mockWorkers";

const providers = new Map<string, AiProvider>();

function createMockProvider(): AiProvider {
  const definition: AiProviderDefinition = {
    id: MOCK_PROVIDER_ID,
    version: "1.0.0-foundation",
    capabilities: ["mock_inference", "structured_output"],
    health: "HEALTHY",
    enabled: true,
    supportedWorkers: [
      "PRODUCT_AI",
      "SUPPLIER_AI",
      "PRICING_AI",
      "INVENTORY_AI",
      "ORDER_AI",
      "MARKETPLACE_AI",
      "CUSTOMS_AI",
      "CUSTOMER_SERVICE_AI",
      "RETURNS_AI",
      "FINANCE_AI",
    ],
    maxLatencyMs: 30_000,
  };

  return {
    definition,
    validate() {
      return { ok: true, errors: [] };
    },
    execute(input: ProviderExecuteInput): ProviderExecuteResult {
      if (input.metadata?.simulateTimeout) {
        return { ok: false, errorCode: "PROVIDER_TIMEOUT", errorMessage: "Simulated provider timeout" };
      }

      const worker = getWorkerContract(input.workerId);
      if (!worker) {
        return { ok: false, errorCode: "WORKER_NOT_FOUND", errorMessage: "Worker contract not found" };
      }

      const task = {
        taskId: `mock_${Date.now()}`,
        taskType: input.taskType,
        workerId: input.workerId,
        status: "RUNNING" as const,
        priority: "NORMAL" as const,
        source: "SYSTEM" as const,
        entityType: "NONE" as const,
        entityId: "",
        context: input.context,
        dependencies: [],
        requiredApprovals: [],
        authorityLevel: worker.getCapabilities().authorityLevel,
        createdAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
        retryable: true,
        escalationState: "NONE" as const,
        correlationId: `corr_mock_${Date.now()}`,
      };

      const output = worker.execute(input.context, task);
      const responseHash = `hash_${JSON.stringify(output.recommendation)}_${output.confidence}`;

      return { ok: true, output, responseHash };
    },
  };
}

export function registerProvider(provider: AiProvider): void {
  providers.set(provider.definition.id, provider);
}

export function registerDefaultProviders(): void {
  registerProvider(createMockProvider());
}

export function getProvider(providerId: string): AiProvider | undefined {
  return providers.get(providerId);
}

export function listProviders(): AiProviderDefinition[] {
  return [...providers.values()].map((p) => p.definition);
}

export function enableProvider(providerId: string): boolean {
  const provider = providers.get(providerId);
  if (!provider) return false;
  provider.definition.enabled = true;
  if (provider.definition.health === "DISABLED") {
    provider.definition.health = "HEALTHY";
  }
  return true;
}

export function disableProvider(providerId: string): boolean {
  const provider = providers.get(providerId);
  if (!provider) return false;
  provider.definition.enabled = false;
  provider.definition.health = "DISABLED";
  return true;
}

export function setProviderHealth(providerId: string, health: AiProviderDefinition["health"]): boolean {
  const provider = providers.get(providerId);
  if (!provider) return false;
  provider.definition.health = health;
  return true;
}

export function selectProvider(input: ProviderSelectionInput): { ok: boolean; providerId?: string; errorCode?: string } {
  const candidates = [...providers.values()].filter((p) => {
    if (!p.definition.enabled) return false;
    if (p.definition.health === "UNHEALTHY" || p.definition.health === "DISABLED") return false;
    if (!p.definition.supportedWorkers.includes(input.workerId)) return false;
    if (input.latencyRequirementMs && p.definition.maxLatencyMs > input.latencyRequirementMs) return false;
    return true;
  });

  if (candidates.length === 0) {
    return { ok: false, errorCode: "NO_PROVIDER_AVAILABLE" };
  }

  candidates.sort((a, b) => {
    const healthRank = { HEALTHY: 3, DEGRADED: 2, UNHEALTHY: 1, DISABLED: 0 };
    return healthRank[b.definition.health] - healthRank[a.definition.health];
  });

  return { ok: true, providerId: candidates[0].definition.id };
}

export function clearProviderRegistry(): void {
  providers.clear();
}
