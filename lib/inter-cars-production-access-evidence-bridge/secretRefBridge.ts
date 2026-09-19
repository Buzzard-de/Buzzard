import { resolveInterCarsSecretRef } from "@/lib/production-access/secretRefs";
import { resolveCredentialDisplayStatus } from "@/lib/supplier-inter-cars-production-access/credentialStatus";
import { getInterCarsSupplierId } from "@/lib/supplier-inter-cars-production-access/config";
import { hasLiveEvidenceForCapability, listInterCarsCredentialEvidence } from "./evidenceStore";
import type { InterCarsCredentialBridgeState } from "./types";

export function resolveInterCarsCredentialBridgeState(): InterCarsCredentialBridgeState {
  const secret = resolveInterCarsSecretRef();
  const cred = resolveCredentialDisplayStatus({ supplierId: getInterCarsSupplierId() });

  if (cred.status === "EXPIRED") return "EXPIRED";
  if (cred.status === "INVALID" || cred.status === "BLOCKED") return "INVALID";

  const hasCredentialEvidence = listInterCarsCredentialEvidence(false).some((e) => e.capability === "health");

  if (cred.status === "VALID" && hasCredentialEvidence) {
    return "VALIDATED";
  }

  if (cred.status === "VALID" || cred.status === "CONFIGURED") {
    return "VALUE_PRESENT_UNVERIFIED";
  }

  if (process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF?.trim() && cred.status === "NOT_CONFIGURED") {
    return "REFERENCE_PRESENT";
  }

  if (secret.secretRefConfigured && cred.status === "NOT_CONFIGURED") {
    return "REFERENCE_PRESENT";
  }

  return "NOT_CONFIGURED";
}
