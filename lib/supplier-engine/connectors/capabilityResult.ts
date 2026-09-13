import type { FetchResult } from "../types";

export const CAPABILITY_NOT_SUPPORTED = "CAPABILITY_NOT_SUPPORTED";

export function capabilityNotSupportedFetch(): FetchResult {
  return {
    ok: false,
    records: [],
    total: 0,
    fetchedAt: new Date().toISOString(),
    error: CAPABILITY_NOT_SUPPORTED,
  };
}

export function capabilityNotSupportedOperation<T extends object = Record<string, never>>(
  extra?: T
): { ok: false; errorCode: string; dryRun: true } & T {
  return {
    ok: false,
    errorCode: CAPABILITY_NOT_SUPPORTED,
    dryRun: true,
    ...(extra || ({} as T)),
  };
}
