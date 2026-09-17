import { isControlledGoLiveActive, getControlledGoLiveRecord } from "@/lib/supplier-controlled-go-live";
import { loadOfficialValidationEvidence } from "@/lib/supplier-production-order-arming/evidence";
import { getLatestArmingForScope } from "@/lib/supplier-production-order-arming/persistence";
import { getLatestFirstProductionOrderForScope } from "@/lib/supplier-first-production-order/persistence";
import { loadFirstOrderEvidence } from "@/lib/supplier-controlled-go-live/firstOrderValidation";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { isObservationKillSwitched } from "./killSwitch";
import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export function evaluateObservationEligibility(input: {
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  environment: string;
  requester: string;
  goLiveId?: string;
}): { allowed: boolean; blockers: string[]; goLiveId?: string } {
  const blockers: string[] = [];
  const environment = input.environment === "SANDBOX" ? "SANDBOX" : "PRODUCTION";

  if (isAiActor(input.requester)) blockers.push("AI_BOUNDARY:REQUEST_FORBIDDEN");

  const { evidence: validationEvidence } = loadOfficialValidationEvidence({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    environment,
  });
  if (!validationEvidence || validationEvidence.createOrderCapability !== "VALIDATED") {
    blockers.push("CREATE_ORDER_UNVERIFIED");
  }

  const arming = getLatestArmingForScope({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    environment,
  });
  if (!arming || arming.status !== "ARMED") blockers.push("ARMING_NOT_ARMED");

  const firstOrder = getLatestFirstProductionOrderForScope({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
  });
  if (!firstOrder || firstOrder.state !== "EXECUTED") blockers.push("FIRST_ORDER_NOT_EXECUTED");

  const controlledActive = isControlledGoLiveActive({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
  });
  if (!controlledActive) blockers.push("CONTROLLED_GO_LIVE_NOT_ACTIVE");

  const goLiveRecord = input.goLiveId
    ? getControlledGoLiveRecord(input.goLiveId)
    : undefined;
  const goLiveId = goLiveRecord?.goLiveId;

  if (goLiveRecord) {
    const evidence = loadFirstOrderEvidence({
      executionId: goLiveRecord.firstOrderEvidence?.executionId,
      supplierId: input.supplierId,
      market: input.market,
      channel: input.channel,
    });
    blockers.push(...evidence.blockers);
    if (!goLiveRecord.firstOrderEvidence?.supplierOrderReference) {
      blockers.push("FIRST_ORDER_REFERENCE_MISSING");
    }
  } else if (controlledActive) {
    blockers.push("GO_LIVE_RECORD_MISSING");
  }

  if (isObservationKillSwitched(input)) blockers.push("KILL_SWITCH_ACTIVE");

  return {
    allowed: blockers.length === 0,
    blockers: [...new Set(blockers)],
    goLiveId,
  };
}
