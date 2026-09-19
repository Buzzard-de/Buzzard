import { randomUUID } from "crypto";
import { hashExternalProviderEvidenceMetadata } from "./evidenceHash";
import { validateExternalProviderEvidenceInput } from "./evidenceValidation";
import type { ExternalProviderEvidence, ExternalProviderEvidenceInput } from "./types";

const store = new Map<string, ExternalProviderEvidence>();
const dedupe = new Set<string>();

function expired(e: ExternalProviderEvidence, now = Date.now()): boolean {
  if (!e.expiresAt) return false;
  const t = Date.parse(e.expiresAt);
  return Number.isFinite(t) && t < now;
}

export function registerExternalProviderEvidence(input: ExternalProviderEvidenceInput): ExternalProviderEvidence {
  validateExternalProviderEvidenceInput(input);
  const payloadHash = hashExternalProviderEvidenceMetadata(input);
  const key = `${input.category}:${input.providerId}:${input.capability}:${payloadHash}`;
  if (dedupe.has(key)) throw new Error("EXTERNAL_PROVIDER_EVIDENCE:DUPLICATE");
  const row: ExternalProviderEvidence = { id: randomUUID(), ...input, payloadHash };
  store.set(row.id, row);
  dedupe.add(key);
  return row;
}

export function listExternalProviderEvidence(includeExpired = false): ExternalProviderEvidence[] {
  const all = [...store.values()];
  return (includeExpired ? all : all.filter((e) => !expired(e))).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function hasExternalLiveEvidence(category: string, providerId: string, capability: string): boolean {
  return listExternalProviderEvidence(false).some(
    (e) => e.category === category && e.providerId === providerId && e.capability === capability && e.source === "EXTERNAL_LIVE",
  );
}

export function resetExternalProviderEvidenceStoreForTests(): void {
  store.clear();
  dedupe.clear();
}
