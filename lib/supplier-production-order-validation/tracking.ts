import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";

export function evaluateTrackingCapability(): "UNVERIFIED" | "VALIDATED" | "DECLARED" {
  const profile = resolvePredefinedLiveProfile();
  const declared = Boolean(profile?.capabilities?.trackingAPI || profile?.capabilities?.tracking);
  if (!declared) return "UNVERIFIED";
  return "UNVERIFIED";
}
