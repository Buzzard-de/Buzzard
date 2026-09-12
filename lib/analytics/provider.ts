import type { AnalyticsProviderDefinition, AnalyticsProviderTrackInput, ConsentState } from "./types";
import { GA4_EVENT_MAP, MOCK_ANALYTICS_PROVIDER_ID } from "./constants";
import { isTrackingAllowed } from "./consent";

export interface AnalyticsProvider {
  definition: AnalyticsProviderDefinition;
  initialize(): { ok: boolean };
  track(input: AnalyticsProviderTrackInput): { ok: boolean; mappedEvent?: string };
  page(path: string, consent: ConsentState): { ok: boolean };
  identify(_anonymousVisitorId: string, consent: ConsentState): { ok: boolean };
  consent(consent: ConsentState): { ok: boolean };
}

const trackedEvents: AnalyticsProviderTrackInput[] = [];

export const MockAnalyticsProvider: AnalyticsProvider = {
  definition: {
    id: MOCK_ANALYTICS_PROVIDER_ID,
    name: "Mock Analytics Provider",
    enabled: true,
  },
  initialize() {
    return { ok: true };
  },
  track(input) {
    if (!isTrackingAllowed(String(input.payload.eventType ?? ""), input.consent)) {
      return { ok: false };
    }
    trackedEvents.push(input);
    const mapped = GA4_EVENT_MAP[String(input.payload.eventType ?? "")];
    return { ok: true, mappedEvent: mapped };
  },
  page(_path, consent) {
    return { ok: isTrackingAllowed("PAGE_VIEW", consent) };
  },
  identify(_id, consent) {
    return { ok: consent.analytics === "GRANTED" || !consent.consentRequired };
  },
  consent(_consent) {
    return { ok: true };
  },
};

export function getMockProviderTrackedEvents(): AnalyticsProviderTrackInput[] {
  return [...trackedEvents];
}

export function clearMockProviderEvents(): void {
  trackedEvents.length = 0;
}

export function mapToGa4Event(internalEventType: string): string | undefined {
  return GA4_EVENT_MAP[internalEventType];
}
