import type { SupplierCapabilities, SupplierCapability } from "./types";

export function hasCapability(
  capabilities: SupplierCapabilities | undefined,
  capability: SupplierCapability
): boolean {
  return capabilities?.[capability] === true;
}

export function listConfiguredCapabilities(capabilities: SupplierCapabilities = {}): SupplierCapability[] {
  return (Object.keys(capabilities) as SupplierCapability[]).filter((k) => capabilities[k] === true);
}

export function assertCapability(
  capabilities: SupplierCapabilities | undefined,
  capability: SupplierCapability
): { allowed: boolean; reason?: string } {
  if (!hasCapability(capabilities, capability)) {
    return { allowed: false, reason: `CAPABILITY_NOT_CONFIGURED:${capability}` };
  }
  return { allowed: true };
}
