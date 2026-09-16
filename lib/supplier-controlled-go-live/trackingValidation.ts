import type { GoLiveCheckResult } from "./types";

export function validateTrackingCapability(): GoLiveCheckResult {
  const trackingValidated = process.env.SUPPLIER_TRACKING_LIVE_VALIDATED === "1";
  if (trackingValidated) {
    return { check: "TRACKING", category: "TRACKING", level: "PASS", message: "Live tracking validated" };
  }
  return {
    check: "TRACKING",
    category: "TRACKING",
    level: "UNVERIFIED",
    message: "Inter Cars tracking endpoint not live-validated",
    blocking: false,
  };
}
