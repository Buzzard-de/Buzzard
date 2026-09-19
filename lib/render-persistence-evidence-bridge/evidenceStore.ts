import { randomUUID } from "crypto";
import { hashRenderPersistenceEvidenceMetadata } from "./evidenceHash";
import { validateRenderPersistenceEvidenceInput } from "./evidenceValidation";
import type { RenderPersistenceEvidence, RenderPersistenceEvidenceInput } from "./types";

const store = new Map<string, RenderPersistenceEvidence>();
const hashIndex = new Set<string>();

function isExpired(e: RenderPersistenceEvidence, now = Date.now()): boolean {
  if (!e.expiresAt) return false;
  const t = Date.parse(e.expiresAt);
  return Number.isFinite(t) && t < now;
}

export function registerRenderPersistenceEvidence(input: RenderPersistenceEvidenceInput): RenderPersistenceEvidence {
  validateRenderPersistenceEvidenceInput(input);
  const payloadHash = hashRenderPersistenceEvidenceMetadata(input);
  const dedupeKey = `${input.kind}:${payloadHash}:${input.evidenceReference}`;
  if (hashIndex.has(deduplicateKey(dedupeKey))) {
    throw new Error("RENDER_EVIDENCE:DUPLICATE");
  }

  const evidence: RenderPersistenceEvidence = {
    id: randomUUID(),
    ...input,
    payloadHash,
  };
  store.set(evidence.id, evidence);
  hashIndex.add(deduplicateKey(dedupeKey));
  return evidence;
}

function deduplicateKey(key: string): string {
  return key;
}

export function listRenderPersistenceEvidence(includeExpired = false): RenderPersistenceEvidence[] {
  const all = [...store.values()];
  if (includeExpired) return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return all.filter((e) => !isExpired(e)).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function countExpiredRenderPersistenceEvidence(): number {
  return [...store.values()].filter((e) => isExpired(e)).length;
}

export function resetRenderPersistenceEvidenceStoreForTests(): void {
  store.clear();
  hashIndex.clear();
}
