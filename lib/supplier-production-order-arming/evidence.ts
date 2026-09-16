import { getLatestValidationForScope, getControlledValidationRun } from "@/lib/supplier-production-order-validation/persistence";
import { deriveCreateOrderCapabilityStatus } from "@/lib/supplier-production-order-validation/capability";
import type { ValidationEvidence } from "./types";

/**
 * Official #342 validation evidence — no manual override accepted.
 */
export function loadOfficialValidationEvidence(scope: {
  supplierId: string;
  market: string;
  channel: string;
  environment: string;
}): { evidence?: ValidationEvidence; blockers: string[] } {
  const blockers: string[] = [];
  const validation = getLatestValidationForScope(scope);

  if (!validation) {
    blockers.push("VALIDATION_EVIDENCE_MISSING");
    blockers.push("CREATE_ORDER_UNVERIFIED");
    return { blockers };
  }

  const capability = deriveCreateOrderCapabilityStatus(validation.capabilityState);
  if (capability !== "VALIDATED" || !validation.capabilityState.productionValidated) {
    blockers.push("CREATE_ORDER_UNVERIFIED");
    return { blockers, evidence: undefined };
  }

  const controlledRun = getControlledValidationRun(validation.validationId);
  const liveValidation = validation.liveValidation || controlledRun?.liveValidation;

  if (validation.controlledValidation && liveValidation !== "PASS") {
    blockers.push("CONTROLLED_VALIDATION_NOT_PASSED");
    return { blockers };
  }

  if (!validation.controlledValidation && !validation.capabilityState.productionValidated) {
    blockers.push("NO_CONTROLLED_LIVE_EVIDENCE");
    return { blockers };
  }

  const evidence: ValidationEvidence = {
    validationId: validation.validationId,
    supplier: validation.supplierId,
    orderReference: validation.orderId,
    payloadHash: validation.requestPayloadHash,
    supplierOrderReference: validation.supplierOrderId || controlledRun?.supplierOrderReference,
    validationTimestamp: validation.updatedAt,
    result: liveValidation || validation.overallStatus,
    approvalReference: controlledRun?.approvedBy,
    liveValidation: liveValidation || "UNKNOWN",
    createOrderCapability: capability,
    productionValidated: validation.capabilityState.productionValidated,
  };

  if (!evidence.supplierOrderReference && validation.controlledValidation) {
    blockers.push("SUPPLIER_ORDER_REFERENCE_MISSING");
  }

  return { evidence, blockers };
}
