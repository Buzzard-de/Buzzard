import { createHash, randomUUID } from "crypto";
import type { ProviderAccessEvidence, ValidationEnvironment } from "./types";

const evidenceStore = new Map<string, ProviderAccessEvidence>();
const evidenceByProvider = new Map<string, string[]>();

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_PRODUCTION_ACCESS_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/production-access/persistentStore.js") as {
      createProductionAccessStore: () => EvidenceStore;
    };
    return mod.createProductionAccessStore();
  } catch {
    return null;
  }
}

interface EvidenceStore {
  saveEvidence(row: Record<string, unknown>): void;
  listEvidence(provider: string, limit?: number): Record<string, unknown>[];
}

export function hashRequestPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function recordProviderAccessEvidence(input: {
  provider: string;
  capability: string;
  endpoint: string;
  correlationId?: string;
  requestPayload: unknown;
  responseStatus: number;
  supplierReference?: string;
  environment: ValidationEnvironment;
  operator?: string;
}): ProviderAccessEvidence {
  if (input.environment === "MOCK" || input.environment === "SANDBOX") {
    throw new Error("PRODUCTION_ACCESS:FAKE_EVIDENCE_REJECTED");
  }

  const evidence: ProviderAccessEvidence = {
    evidenceId: randomUUID(),
    provider: input.provider,
    capability: input.capability,
    endpoint: input.endpoint,
    timestamp: new Date().toISOString(),
    correlationId: input.correlationId || randomUUID(),
    requestHash: hashRequestPayload(input.requestPayload),
    responseStatus: input.responseStatus,
    supplierReference: input.supplierReference,
    environment: input.environment,
    operator: input.operator,
  };

  evidenceStore.set(evidence.evidenceId, evidence);
  const list = evidenceByProvider.get(input.provider) || [];
  list.push(evidence.evidenceId);
  evidenceByProvider.set(input.provider, list);

  getPersistentStore()?.saveEvidence({
    evidence_id: evidence.evidenceId,
    provider: evidence.provider,
    capability: evidence.capability,
    endpoint: evidence.endpoint,
    timestamp: evidence.timestamp,
    correlation_id: evidence.correlationId,
    request_hash: evidence.requestHash,
    response_status: evidence.responseStatus,
    supplier_reference: evidence.supplierReference || null,
    environment: evidence.environment,
    operator: evidence.operator || null,
    record_json: JSON.stringify(evidence),
  });

  return evidence;
}

export function getProviderAccessEvidence(evidenceId: string): ProviderAccessEvidence | undefined {
  return evidenceStore.get(evidenceId);
}

export function listProviderAccessEvidence(provider: string): ProviderAccessEvidence[] {
  const ids = evidenceByProvider.get(provider) || [];
  return ids.map((id) => evidenceStore.get(id)).filter(Boolean) as ProviderAccessEvidence[];
}

export function hasProductionEvidence(provider: string, capability: string): boolean {
  return listProviderAccessEvidence(provider).some(
    (e) =>
      e.capability === capability &&
      e.environment === "PRODUCTION" &&
      e.responseStatus >= 200 &&
      e.responseStatus < 300,
  );
}

export function resetEvidenceStoreForTests(): void {
  evidenceStore.clear();
  evidenceByProvider.clear();
}
