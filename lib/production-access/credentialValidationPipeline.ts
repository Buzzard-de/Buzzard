import { randomUUID } from "crypto";
import { hasProviderSecretRef, listAllProviderKinds } from "@/lib/payment-production/config";
import { isMockCredentialValue } from "@/lib/supplier-order-readiness/config";
import { resolveCredentials } from "@/lib/supplier-engine/credentials";
import { resolveGenericSecretRef, resolveInterCarsSecretRef } from "./secretRefs";
import { hasProductionEvidence } from "./evidenceStore";
import type { ProviderId } from "./providerRegistry";

export type CredentialPipelinePhase =
  | "SECRET_REF"
  | "CREDENTIAL_RESOLVE"
  | "MOCK_BLOCK"
  | "HEALTH"
  | "CAPABILITY";

export type CredentialPipelineStatus = "NOT_CONFIGURED" | "CONFIGURED" | "BLOCKED" | "VALIDATED";

export interface CredentialValidationResult {
  providerId: ProviderId | "inter-cars";
  correlationId: string;
  overallStatus: CredentialPipelineStatus;
  phases: Array<{
    phase: CredentialPipelinePhase;
    status: CredentialPipelineStatus;
    message: string;
  }>;
  blockers: string[];
  /** True only when real HTTP/API validation was attempted (never without credentials). */
  liveValidationAttempted: boolean;
}

function resolveRawCredential(secretRefKey: string): string | null {
  const ref = secretRefKey.startsWith("env:") ? secretRefKey.slice(4) : secretRefKey;
  const cred = resolveCredentials(secretRefKey.startsWith("env:") ? secretRefKey : `env:${ref}`);
  if (!cred) return null;
  if (typeof cred === "string") return cred;
  return JSON.stringify(cred);
}

function isMockValue(value: string | null): boolean {
  if (!value) return false;
  return isMockCredentialValue(value) || /mock|fake|test-token|sandbox-only/i.test(value);
}

function buildPaymentSecretStatus(): { configured: boolean; resolvable: boolean; blocked: boolean } {
  const kinds = listAllProviderKinds().filter((k) => k !== "MOCK");
  let configured = false;
  let resolvable = false;
  let blocked = false;
  for (const kind of kinds) {
    if (!hasProviderSecretRef(kind)) continue;
    configured = true;
    const refs = [
      process.env.PAYMENT_PROVIDER_SECRET_REF,
      process.env[`PAYMENT_${kind}_SECRET_REF`],
      process.env.PAYPAL_CLIENT_ID_SECRET_REF,
    ].filter(Boolean);
    for (const ref of refs) {
      const raw = resolveRawCredential(ref!.startsWith("env:") ? ref! : `env:${ref}`);
      if (raw && !isMockValue(raw)) resolvable = true;
      if (raw && isMockValue(raw)) blocked = true;
    }
  }
  return { configured, resolvable, blocked };
}

export function validateProviderCredentialPipeline(
  providerId: ProviderId | "inter-cars",
): CredentialValidationResult {
  const correlationId = randomUUID();
  const phases: CredentialValidationResult["phases"] = [];
  const blockers: string[] = [];

  if (providerId === "inter-cars") {
    const secret = resolveInterCarsSecretRef();
    phases.push({
      phase: "SECRET_REF",
      status: secret.secretRefConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
      message: secret.secretRefConfigured ? "Secret ref configured" : "SUPPLIER_LIVE_CREDENTIALS_SECRET_REF missing",
    });
    phases.push({
      phase: "CREDENTIAL_RESOLVE",
      status: secret.secretResolvable ? "CONFIGURED" : "NOT_CONFIGURED",
      message: secret.secretResolvable ? "Credential resolvable" : "Credential not resolvable",
    });
    phases.push({
      phase: "MOCK_BLOCK",
      status: secret.credentialStatus === "BLOCKED" ? "BLOCKED" : secret.secretResolvable ? "CONFIGURED" : "NOT_CONFIGURED",
      message: secret.credentialStatus === "BLOCKED" ? "Mock credential blocked" : "No mock detected",
    });
    if (secret.credentialStatus === "BLOCKED") blockers.push("MOCK_CREDENTIAL_BLOCKED");
    if (!secret.secretRefConfigured) blockers.push("SECRET_REF_NOT_CONFIGURED");
    const validated = hasProductionEvidence("inter-cars", "health");
    phases.push({
      phase: "HEALTH",
      status: validated ? "VALIDATED" : "NOT_CONFIGURED",
      message: validated ? "Production evidence recorded" : "Awaiting Stage A live validation",
    });
    return finalize(providerId, correlationId, phases, blockers, false);
  }

  if (providerId === "payment") {
    const pay = buildPaymentSecretStatus();
    phases.push({
      phase: "SECRET_REF",
      status: pay.configured ? "CONFIGURED" : "NOT_CONFIGURED",
      message: pay.configured ? "Per-provider secretRef configured" : "No payment provider secretRef",
    });
    phases.push({
      phase: "CREDENTIAL_RESOLVE",
      status: pay.resolvable ? "CONFIGURED" : "NOT_CONFIGURED",
      message: pay.resolvable ? "Payment credential resolvable" : "Credential not resolvable",
    });
    phases.push({
      phase: "MOCK_BLOCK",
      status: pay.blocked ? "BLOCKED" : pay.resolvable ? "CONFIGURED" : "NOT_CONFIGURED",
      message: pay.blocked ? "Mock payment credential blocked" : "No mock detected",
    });
    if (pay.blocked) blockers.push("MOCK_CREDENTIAL_BLOCKED");
    if (!pay.configured) blockers.push("PROVIDER_NOT_CONFIGURED");
    const validated = hasProductionEvidence("payment", "authentication");
    phases.push({
      phase: "HEALTH",
      status: validated ? "VALIDATED" : "NOT_CONFIGURED",
      message: validated ? "Production evidence recorded" : "Awaiting controlled payment validation",
    });
    return finalize(providerId, correlationId, phases, blockers, false);
  }

  const secretRefMap: Record<Exclude<ProviderId, "inter-cars" | "payment" | "marketing">, string> = {
    carrier: "CARRIER_PROVIDER_SECRET_REF",
    ai: "AI_PROVIDER_SECRET_REF",
    returns: "RETURNS_PROVIDER_SECRET_REF",
  };

  if (providerId === "marketing") {
    const providers = ["GOOGLE_ADS", "META", "TIKTOK", "YOUTUBE"] as const;
    const configured = providers.some((p) => Boolean(process.env[`${p}_SECRET_REF`]?.trim()));
    phases.push({
      phase: "SECRET_REF",
      status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
      message: configured ? "Marketing channel secretRef configured" : "No marketing secretRef",
    });
    if (!configured) blockers.push("PROVIDER_NOT_CONFIGURED");
    return finalize(providerId, correlationId, phases, blockers, false);
  }

  const envKey = secretRefMap[providerId as keyof typeof secretRefMap];
  const secret = resolveGenericSecretRef({ providerId, secretRefEnvKey: envKey });
  phases.push({
    phase: "SECRET_REF",
    status: secret.secretRefConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
    message: secret.secretRefConfigured ? `${envKey} configured` : `${envKey} missing`,
  });
  phases.push({
    phase: "CREDENTIAL_RESOLVE",
    status: secret.secretResolvable ? "CONFIGURED" : "NOT_CONFIGURED",
    message: secret.secretResolvable ? "Credential resolvable" : "Credential not resolvable",
  });
  const raw = secret.secretResolvable ? resolveRawCredential(secret.secretRefKey) : null;
  const mockBlocked = isMockValue(raw);
  phases.push({
    phase: "MOCK_BLOCK",
    status: mockBlocked ? "BLOCKED" : secret.secretResolvable ? "CONFIGURED" : "NOT_CONFIGURED",
    message: mockBlocked ? "Mock credential blocked" : "No mock detected",
  });
  if (mockBlocked) blockers.push("MOCK_CREDENTIAL_BLOCKED");
  if (!secret.secretRefConfigured) blockers.push("PROVIDER_NOT_CONFIGURED");
  const cap = providerId === "returns" ? "refund" : "health";
  const validated = hasProductionEvidence(providerId, cap);
  phases.push({
    phase: "HEALTH",
    status: validated ? "VALIDATED" : "NOT_CONFIGURED",
    message: validated ? "Production evidence recorded" : "Awaiting controlled validation",
  });
  return finalize(providerId, correlationId, phases, blockers, false);
}

function finalize(
  providerId: ProviderId | "inter-cars",
  correlationId: string,
  phases: CredentialValidationResult["phases"],
  blockers: string[],
  liveValidationAttempted: boolean,
): CredentialValidationResult {
  let overallStatus: CredentialPipelineStatus = "NOT_CONFIGURED";
  if (phases.some((p) => p.status === "BLOCKED")) overallStatus = "BLOCKED";
  else if (phases.some((p) => p.status === "VALIDATED")) overallStatus = "VALIDATED";
  else if (phases.some((p) => p.status === "CONFIGURED")) overallStatus = "CONFIGURED";
  return {
    providerId: providerId as ProviderId,
    correlationId,
    overallStatus,
    phases,
    blockers: [...new Set(blockers)],
    liveValidationAttempted,
  };
}

export function validateAllProviderCredentialPipelines(): CredentialValidationResult[] {
  return (
    ["inter-cars", "payment", "carrier", "ai", "returns", "marketing"] as const
  ).map((id) => validateProviderCredentialPipeline(id));
}
