import { getLatestArmingForScope } from "@/lib/supplier-production-order-arming/persistence";
import { getLatestFirstProductionOrderForScope } from "@/lib/supplier-first-production-order/persistence";
import { isControlledGoLiveActive } from "@/lib/supplier-controlled-go-live";
import { getLatestObservationForScope } from "@/lib/supplier-go-live-observation/persistence";
import { loadOfficialValidationEvidence } from "@/lib/supplier-production-order-arming/evidence";
import { evaluateInterCarsProductionAccess } from "./diagnostic";
import { getInterCarsSupplierId } from "./config";

export function getProductionAccessDashboard() {
  const diagnostic = evaluateInterCarsProductionAccess();
  const supplierId = getInterCarsSupplierId();
  const { evidence } = loadOfficialValidationEvidence({
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });
  const arming = getLatestArmingForScope({
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });
  const firstOrder = getLatestFirstProductionOrderForScope({ supplierId, market: "DE", channel: "DIRECT" });
  const observation = getLatestObservationForScope({ supplierId, market: "DE", channel: "DIRECT" });

  return {
    ...diagnostic,
    liveValidationEvidence: evidence ? "PRESENT" : "NONE",
    armingState: arming?.status || "ARMING_BLOCKED",
    firstOrderState: firstOrder?.state || "BLOCKED",
    controlledGoLive: isControlledGoLiveActive({ supplierId, market: "DE", channel: "DIRECT" })
      ? "ACTIVE"
      : "BLOCKED",
    observationState: observation?.state || "BLOCKED",
    broaderRollout:
      observation?.state === "BROADER_ROLLOUT_ACTIVE" ? "ACTIVE" : "BLOCKED",
  };
}
