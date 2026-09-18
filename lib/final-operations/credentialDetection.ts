import { resolveInterCarsSecretRef, resolveGenericSecretRef } from "@/lib/production-access/secretRefs";
import { hasProductionEvidence } from "@/lib/production-access/evidenceStore";
import { resolveCredentialDisplayStatus } from "@/lib/supplier-inter-cars-production-access/credentialStatus";
import { getInterCarsSupplierId } from "@/lib/supplier-inter-cars-production-access/config";
import type { CredentialMeta, CredentialMetaStatus } from "./types";

const SECRET_REF_KEYS = [
  { providerId: "inter-cars", envKey: "SUPPLIER_LIVE_CREDENTIALS_SECRET_REF", fallback: "SUPPLIER_LIVE_CREDENTIALS" },
  { providerId: "payment", envKey: "PAYMENT_PROVIDER_SECRET_REF", fallback: "PAYMENT_PROVIDER_SECRET" },
  { providerId: "carrier", envKey: "CARRIER_PROVIDER_SECRET_REF" },
  { providerId: "ai", envKey: "AI_PROVIDER_SECRET_REF" },
  { providerId: "returns", envKey: "RETURNS_PROVIDER_SECRET_REF" },
  { providerId: "google-ads", envKey: "GOOGLE_ADS_SECRET_REF" },
  { providerId: "meta", envKey: "META_SECRET_REF" },
] as const;

function toMetaStatus(input: {
  refConfigured: boolean;
  resolvable: boolean;
  blocked: boolean;
  validated: boolean;
}): CredentialMetaStatus {
  if (input.validated) return "VALIDATED";
  if (input.blocked) return "INVALID";
  if (input.refConfigured || input.resolvable) return "CONFIGURED";
  return "MISSING";
}

/** Metadata only — never reads or logs secret values. */
export function detectCredentialMetadata(): CredentialMeta[] {
  const now = new Date().toISOString();
  const results: CredentialMeta[] = [];

  for (const spec of SECRET_REF_KEYS) {
    let refConfigured = Boolean(process.env[spec.envKey]?.trim());
    let resolvable = false;
    let blocked = false;
    let validated = false;

    if (spec.providerId === "inter-cars") {
      const ic = resolveInterCarsSecretRef();
      refConfigured = ic.secretRefConfigured;
      resolvable = ic.secretResolvable;
      blocked = ic.credentialStatus === "BLOCKED";
      const cred = resolveCredentialDisplayStatus({ supplierId: getInterCarsSupplierId() });
      blocked = blocked || cred.status === "BLOCKED" || cred.status === "INVALID";
      validated =
        hasProductionEvidence("inter-cars", "health") ||
        cred.status === "VALID";
    } else if (spec.providerId === "returns") {
      refConfigured = refConfigured || Boolean(process.env.RETURNS_PROVIDER_SECRET?.trim());
      resolvable = refConfigured;
      validated = hasProductionEvidence("returns", "refund");
    } else if (spec.providerId === "google-ads" || spec.providerId === "meta") {
      resolvable = refConfigured;
      validated = hasProductionEvidence("marketing", spec.providerId);
    } else {
      const generic = resolveGenericSecretRef({
        providerId: spec.providerId,
        secretRefEnvKey: spec.envKey,
        fallbackEnvKey: "fallback" in spec ? spec.fallback : undefined,
      });
      refConfigured = generic.secretRefConfigured;
      resolvable = generic.secretResolvable;
      blocked = generic.credentialStatus === "BLOCKED";
      validated = hasProductionEvidence(spec.providerId, "health") || hasProductionEvidence(spec.providerId, "authentication");
    }

    results.push({
      providerId: spec.providerId,
      secretRefKey: spec.envKey,
      status: toMetaStatus({ refConfigured, resolvable, blocked, validated }),
      updatedAt: now,
    });
  }

  return results;
}

export function getInterCarsCredentialMeta(): CredentialMetaStatus {
  return detectCredentialMetadata().find((c) => c.providerId === "inter-cars")?.status || "MISSING";
}
