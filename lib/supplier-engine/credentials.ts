import { redactSecrets } from "./security";

export interface SupplierCredentialRef {
  supplierId: string;
  secretsRef: string;
  configured: boolean;
  updatedAt: string;
}

/** Server-only credential store — values never exposed to client/logs. */
const credentialRefs = new Map<string, SupplierCredentialRef>();

export function registerCredentialRef(supplierId: string, secretsRef: string): SupplierCredentialRef {
  const entry: SupplierCredentialRef = {
    supplierId,
    secretsRef,
    configured: Boolean(secretsRef),
    updatedAt: new Date().toISOString(),
  };
  credentialRefs.set(supplierId, entry);
  return entry;
}

export function getCredentialRef(supplierId: string): SupplierCredentialRef | undefined {
  return credentialRefs.get(supplierId);
}

export function hasConfiguredCredentials(supplierId: string): boolean {
  return credentialRefs.get(supplierId)?.configured === true;
}

/** Resolve credentials from env using secretsRef — never log returned values. */
export function resolveCredentials(secretsRef: string): Record<string, string> | null {
  if (!secretsRef) return null;
  const envKey = secretsRef.startsWith("env:") ? secretsRef.slice(4) : secretsRef;
  const raw = process.env[envKey];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed;
  } catch {
    return { token: raw };
  }
}

export function sanitizeCredentialPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return redactSecrets(payload) as Record<string, unknown>;
}

export function resetCredentialRefs(): void {
  credentialRefs.clear();
}
