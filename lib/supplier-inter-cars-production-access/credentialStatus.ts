import { validateProductionCredentials } from "@/lib/supplier-production-validation/credentialValidation";
import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import type { CredentialDisplayStatus } from "./types";

export function resolveCredentialDisplayStatus(input: {
  supplierId: string;
  environment?: "PRODUCTION" | "SANDBOX";
}): {
  status: CredentialDisplayStatus;
  credentialType: string;
  blockers: string[];
} {
  const profile = resolvePredefinedLiveProfile();
  const environment =
    input.environment ||
    (profile?.environment?.toUpperCase() === "PRODUCTION" ? "PRODUCTION" : "SANDBOX");

  const result = validateProductionCredentials({
    supplierId: input.supplierId,
    environment,
  });

  const statusMap: Record<string, CredentialDisplayStatus> = {
    NOT_CONFIGURED: "NOT_CONFIGURED",
    CONFIGURED: "CONFIGURED",
    VALID: "VALID",
    INVALID: "INVALID",
    EXPIRED: "EXPIRED",
    REVOKED: "BLOCKED",
    MISMATCH: "BLOCKED",
    BLOCKED: "BLOCKED",
  };

  return {
    status: statusMap[result.status] || "INVALID",
    credentialType: result.credentialType,
    blockers: result.blockerCodes,
  };
}

/** Production-scoped credential check for #342 readiness (may require SUPPLIER_LIVE_FORCE_PRODUCTION). */
export function resolveProductionScopedCredentialStatus(supplierId: string): {
  status: CredentialDisplayStatus;
  blockers: string[];
} {
  const result = validateProductionCredentials({ supplierId, environment: "PRODUCTION" });
  const statusMap: Record<string, CredentialDisplayStatus> = {
    NOT_CONFIGURED: "NOT_CONFIGURED",
    CONFIGURED: "CONFIGURED",
    VALID: "VALID",
    INVALID: "INVALID",
    EXPIRED: "EXPIRED",
    REVOKED: "BLOCKED",
    MISMATCH: "BLOCKED",
    BLOCKED: "BLOCKED",
  };
  return { status: statusMap[result.status] || "INVALID", blockers: result.blockerCodes };
}
