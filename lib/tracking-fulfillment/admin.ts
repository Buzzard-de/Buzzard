import { TRACKING_FULFILLMENT_VERSION } from "./config";
import { assertTrackingSafetyInvariants, getTrackingSafetyCounters } from "./safety";
import type { TrackingFulfillmentDashboard } from "./types";

export function getTrackingFulfillmentDashboard(): TrackingFulfillmentDashboard {
  const safety = assertTrackingSafetyInvariants();
  return {
    version: TRACKING_FULFILLMENT_VERSION,
    liveStatus: "UNVERIFIED",
    productionEnabled: "DISABLED",
    safetyCounters: getTrackingSafetyCounters(),
    blockers: safety.ok ? [] : safety.violations,
  };
}
