import { getLatestArmingForScope } from "./persistence";
import { loadOfficialValidationEvidence } from "./evidence";
import { isArmingKillSwitched } from "./killSwitch";

export function buildProductionArmingFctSnapshot(scope: {
  supplierId: string;
  market: string;
  channel: string;
  environment: string;
}): Record<string, unknown> {
  const arming = getLatestArmingForScope(scope);
  const { evidence } = loadOfficialValidationEvidence(scope);
  return {
    supplier: scope.supplierId,
    armingState: arming?.status || "ARMING_BLOCKED",
    scope: arming?.scope,
    limits: arming?.limits,
    validationState: evidence?.createOrderCapability || "UNVERIFIED",
    validationEvidenceId: evidence?.validationId,
    readiness: arming?.status === "ARMED" ? "ARMED" : "NOT_ARMED",
    killSwitch: isArmingKillSwitched({
      supplierId: scope.supplierId,
      market: scope.market,
      channel: scope.channel as import("@/lib/supplier-order-readiness/types").ReadinessChannel,
    })
      ? "ON"
      : "OFF",
  };
}
