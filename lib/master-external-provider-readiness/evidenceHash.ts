import { createHash } from "crypto";
import type { ExternalProviderEvidenceInput } from "./types";

export function hashExternalProviderEvidenceMetadata(input: ExternalProviderEvidenceInput): string {
  const safe = {
    category: input.category,
    providerId: input.providerId,
    environment: input.environment,
    source: input.source,
    capability: input.capability,
    timestamp: input.timestamp,
    endpoint: input.endpoint,
    responseStatus: input.responseStatus,
    secretRef: input.secretRef.startsWith("env:") ? input.secretRef : "env:***",
    evidenceReference: input.evidenceReference,
    operator: input.operator,
    expiresAt: input.expiresAt,
  };
  return createHash("sha256").update(JSON.stringify(safe)).digest("hex");
}
