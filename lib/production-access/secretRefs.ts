import { resolveCredentials } from "@/lib/supplier-engine/credentials";
import { resolveCredentialDisplayStatus } from "@/lib/supplier-inter-cars-production-access/credentialStatus";
import { getInterCarsSupplierId } from "@/lib/supplier-inter-cars-production-access/config";
import type { AccessStatus, SecretRefStatus } from "./types";

function normalizeSecretRef(raw: string | undefined, fallbackEnvKey: string): string {
  const value = raw?.trim();
  if (!value) return `env:${fallbackEnvKey}`;
  if (value.startsWith("env:")) return value;
  return `env:${value}`;
}

function secretRefConfigured(envKey: string): boolean {
  return Boolean(process.env[envKey]?.trim());
}

export function resolveInterCarsSecretRef(): SecretRefStatus {
  const secretRefKey =
    process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF?.trim() ||
    process.env.SUPPLIER_LIVE_SECRETS_REF?.trim() ||
    "env:SUPPLIER_LIVE_CREDENTIALS";
  const secretsRef = normalizeSecretRef(secretRefKey, "SUPPLIER_LIVE_CREDENTIALS");
  const envKey = secretsRef.startsWith("env:") ? secretsRef.slice(4) : secretsRef;
  const cred = resolveCredentialDisplayStatus({ supplierId: getInterCarsSupplierId() });
  const statusMap: Record<string, AccessStatus> = {
    NOT_CONFIGURED: "NOT_CONFIGURED",
    CONFIGURED: "CONFIGURED",
    VALID: "CONFIGURED",
    INVALID: "BLOCKED",
    EXPIRED: "BLOCKED",
    BLOCKED: "BLOCKED",
  };

  return {
    providerId: "inter-cars",
    secretRefKey: secretsRef,
    secretRefConfigured: secretRefConfigured(envKey) || Boolean(process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF?.trim()),
    secretResolvable: Boolean(resolveCredentials(secretsRef)),
    credentialStatus: statusMap[cred.status] || "UNVERIFIED",
  };
}

export function resolveGenericSecretRef(input: {
  providerId: string;
  secretRefEnvKey: string;
  fallbackEnvKey?: string;
}): SecretRefStatus {
  const raw = process.env[input.secretRefEnvKey]?.trim();
  const secretsRef = normalizeSecretRef(raw, input.fallbackEnvKey || input.secretRefEnvKey.replace(/_SECRET_REF$/, ""));
  const envKey = secretsRef.startsWith("env:") ? secretsRef.slice(4) : secretsRef;

  return {
    providerId: input.providerId,
    secretRefKey: secretsRef,
    secretRefConfigured: secretRefConfigured(envKey) || Boolean(raw),
    secretResolvable: Boolean(resolveCredentials(secretsRef)),
    credentialStatus: resolveCredentials(secretsRef) ? "CONFIGURED" : "NOT_CONFIGURED",
  };
}
