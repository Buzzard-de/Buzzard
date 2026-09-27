import {
  defaultMarketCountryCode,
  detectMarketCountryCode,
  getDeliverableMarketCountry,
} from "./countries";
import { hasManualCountryOverride, readStoredCountryCode } from "./storage";

/**
 * Country init priority:
 * 1. Explicit/manual persisted country
 * 2. Any valid stored country
 * 3. Automatic detection
 * 4. Default
 *
 * Language is never consulted.
 */
export function resolveInitialCountryCode(input: {
  stored: string | null | undefined;
  manual: boolean;
  detected: string;
  defaultCode?: string;
}): string {
  const fallback = input.defaultCode ?? defaultMarketCountryCode();
  if (input.manual && input.stored) {
    return getDeliverableMarketCountry(input.stored)?.code ?? fallback;
  }
  if (input.stored) {
    return getDeliverableMarketCountry(input.stored)?.code ?? fallback;
  }
  return getDeliverableMarketCountry(input.detected)?.code ?? fallback;
}

export function resolveBootCountryCode(): string {
  return resolveInitialCountryCode({
    stored: readStoredCountryCode(),
    manual: hasManualCountryOverride(),
    detected: detectMarketCountryCode(),
  });
}
