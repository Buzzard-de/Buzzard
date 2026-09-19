import { createHash } from "crypto";
import type { InterCarsCredentialEvidenceInput } from "./types";

export function hashInterCarsEvidenceMetadata(input: InterCarsCredentialEvidenceInput): string {
  const safe = {
    providerId: input.providerId,
    environment: input.environment,
    source: input.source,
    credentialType: input.credentialType,
    secretRef: input.secretRef.startsWith("env:") ? input.secretRef : "env:***",
    validationMethod: input.validationMethod,
    timestamp: input.timestamp,
    endpoint: input.endpoint,
    responseStatus: input.responseStatus,
    capability: input.capability,
    evidenceReference: input.evidenceReference,
    operator: input.operator,
    expiresAt: input.expiresAt,
  };
  return createHash("sha256").update(JSON.stringify(safe)).digest("hex");
}
