import { randomUUID } from "crypto";
import { hashInterCarsEvidenceMetadata } from "./evidenceHash";
import { validateInterCarsCredentialEvidenceInput } from "./evidenceValidation";
import type { InterCarsCredentialEvidence, InterCarsCredentialEvidenceInput } from "./types";

const store = new Map<string, InterCarsCredentialEvidence>();
const dedupe = new Set<string>();

function isExpired(e: InterCarsCredentialEvidence, now = Date.now()): boolean {
  if (!e.expiresAt) return false;
  const t = Date.parse(e.expiresAt);
  return Number.isFinite(t) && t < now;
}

export function registerInterCarsCredentialEvidence(input: InterCarsCredentialEvidenceInput): InterCarsCredentialEvidence {
  validateInterCarsCredentialEvidenceInput(input);
  const payloadHash = hashInterCarsEvidenceMetadata(input);
  const key = `${input.capability}:${payloadHash}:${input.evidenceReference}`;
  if (dedupe.has(key)) {
    throw new Error("INTER_CARS_EVIDENCE:DUPLICATE");
  }
  const evidence: InterCarsCredentialEvidence = { id: randomUUID(), ...input, payloadHash };
  store.set(evidence.id, evidence);
  dedupe.add(key);
  return evidence;
}

export function listInterCarsCredentialEvidence(includeExpired = false): InterCarsCredentialEvidence[] {
  const all = [...store.values()];
  const filtered = includeExpired ? all : all.filter((e) => !isExpired(e));
  return filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function hasLiveEvidenceForCapability(capability: InterCarsCredentialEvidence["capability"]): boolean {
  return listInterCarsCredentialEvidence(false).some(
    (e) => e.capability === capability && e.source === "INTER_CARS_LIVE",
  );
}

export function countExpiredInterCarsEvidence(): number {
  return [...store.values()].filter((e) => isExpired(e)).length;
}

export function resetInterCarsEvidenceStoreForTests(): void {
  store.clear();
  dedupe.clear();
}
