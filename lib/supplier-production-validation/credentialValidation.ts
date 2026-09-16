import { resolveCredentials } from "@/lib/supplier-engine/credentials";
import { resolveSupplierAuth } from "@/lib/supplier-engine/auth";
import {
  describeLiveCredentialReadiness,
  hasLiveSupplierCredentials,
  resolveLiveSupplierProfile,
  resolvePredefinedLiveProfile,
} from "@/lib/supplier-engine/liveSupplier/config";
import { isMockCredentialValue } from "@/lib/supplier-order-readiness/config";
import { redactSecrets } from "@/lib/supplier-engine/security";
import type { CredentialStatus, ValidationCheckResult, ValidationEnvironment } from "./types";

export interface CredentialValidationResult {
  status: CredentialStatus;
  credentialType: string;
  secretsRef?: string;
  checks: ValidationCheckResult[];
  blockerCodes: string[];
}

export function validateProductionCredentials(input: {
  supplierId: string;
  environment: ValidationEnvironment;
}): CredentialValidationResult {
  const checks: ValidationCheckResult[] = [];
  const blockerCodes: string[] = [];
  const profile = resolveLiveSupplierProfile() || resolvePredefinedLiveProfile();
  const secretsRef = profile?.secretsRef || "env:SUPPLIER_LIVE_CREDENTIALS";
  const credentialType = profile?.authentication || profile?.authType || "unknown";

  if (!profile) {
    checks.push({ check: "CREDENTIAL_PROFILE", status: "BLOCKED", message: "Live supplier profile not configured" });
    blockerCodes.push("CREDENTIAL_PROFILE_MISSING");
    return { status: "NOT_CONFIGURED", credentialType, checks, blockerCodes };
  }

  if (profile.supplierId !== input.supplierId) {
    checks.push({ check: "CREDENTIAL_SUPPLIER", status: "BLOCKED", message: "Profile supplier mismatch" });
    blockerCodes.push("SUPPLIER_PROFILE_MISMATCH");
    return { status: "MISMATCH", credentialType, secretsRef, checks, blockerCodes };
  }

  const profileEnv = profile.environment?.toUpperCase();
  if (
    input.environment === "PRODUCTION" &&
    profileEnv === "SANDBOX" &&
    process.env.SUPPLIER_LIVE_FORCE_PRODUCTION !== "1"
  ) {
    checks.push({
      check: "ENVIRONMENT_SEPARATION",
      status: "BLOCKED",
      message: "SANDBOX credential cannot validate PRODUCTION scope",
    });
    blockerCodes.push("ENVIRONMENT_MISMATCH");
    return { status: "MISMATCH", credentialType, secretsRef, checks, blockerCodes };
  }

  if (
    input.environment === "SANDBOX" &&
    profileEnv === "PRODUCTION" &&
    process.env.SUPPLIER_LIVE_ALLOW_PROD_CRED_IN_SANDBOX !== "1"
  ) {
    checks.push({
      check: "ENVIRONMENT_SEPARATION",
      status: "BLOCKED",
      message: "PRODUCTION credential cannot validate SANDBOX scope",
    });
    blockerCodes.push("ENVIRONMENT_MISMATCH");
    return { status: "MISMATCH", credentialType, secretsRef, checks, blockerCodes };
  }

  const meta = describeLiveCredentialReadiness(profile);
  if (!meta.configured) {
    checks.push({ check: "CREDENTIAL_CONFIGURED", status: "BLOCKED", message: "Credential not configured" });
    blockerCodes.push("CREDENTIAL_NOT_CONFIGURED");
    return { status: "NOT_CONFIGURED", credentialType, secretsRef, checks, blockerCodes };
  }

  checks.push({
    check: "CREDENTIAL_CONFIGURED",
    status: "PASS",
    message: "Credential reference configured",
    detail: { authType: meta.authType, fields: meta.secretFieldsPresent },
  });

  const creds = resolveCredentials(secretsRef);
  if (!creds) {
    checks.push({ check: "CREDENTIAL_RESOLVE", status: "BLOCKED", message: "Credential secret not resolvable" });
    blockerCodes.push("CREDENTIAL_SECRET_MISSING");
    return { status: "INVALID", credentialType, secretsRef, checks, blockerCodes };
  }

  const token = String(creds.accessToken || creds.token || creds.bearer || creds.apiKey || creds.key || "");
  if (isMockCredentialValue(token)) {
    checks.push({ check: "CREDENTIAL_MOCK", status: "BLOCKED", message: "Mock/test credential blocked for production validation" });
    blockerCodes.push("CREDENTIAL_MOCK");
    return { status: "BLOCKED", credentialType, secretsRef, checks, blockerCodes };
  }

  if (!hasLiveSupplierCredentials(profile)) {
    checks.push({ check: "CREDENTIAL_TOKEN", status: "BLOCKED", message: "OAuth/token missing" });
    blockerCodes.push("CREDENTIAL_INVALID");
    return { status: "INVALID", credentialType, secretsRef, checks, blockerCodes };
  }

  const auth = resolveSupplierAuth({
    authentication: profile.authentication,
    secretsRef: profile.secretsRef,
  });
  if (!auth.headers.Authorization?.startsWith("Bearer ")) {
    checks.push({
      check: "CREDENTIAL_AUTH_SCHEME",
      status: "BLOCKED",
      message: "Expected Authorization: Bearer <accessToken>",
    });
    blockerCodes.push("CREDENTIAL_AUTH_INVALID");
    return { status: "INVALID", credentialType, secretsRef, checks, blockerCodes };
  }

  const redacted = redactSecrets({ accessToken: token }) as { accessToken?: string };
  if (redacted.accessToken && redacted.accessToken !== "[REDACTED]") {
    checks.push({ check: "SECRET_REDACTION", status: "FAIL", message: "Secret redaction failed" });
    blockerCodes.push("SECRET_REDACTION_FAILED");
    return { status: "BLOCKED", credentialType, secretsRef, checks, blockerCodes };
  }

  checks.push({ check: "CREDENTIAL_VALID", status: "PASS", message: "Credential metadata validated (no secret exposed)" });
  return { status: "VALID", credentialType, secretsRef, checks, blockerCodes };
}
