import { getLatestValidationForScope } from "./persistence";

export function buildCreateOrderFctSnapshot(scope: {
  supplierId: string;
  market: string;
  channel: string;
  environment: string;
}): Record<string, unknown> {
  const validation = getLatestValidationForScope(scope);
  const controlled = validation?.controlledValidation ? "CONTROLLED_VALIDATION" : "STANDARD";
  return {
    supplierCapability: validation?.createOrderCapability || "UNVERIFIED",
    trackingCapability: validation?.trackingCapability || "UNVERIFIED",
    supplierOrderReadiness: validation?.overallStatus || "UNKNOWN",
    supplierOrderReference: validation?.supplierOrderId,
    reconciliationState: validation?.unknownOutcome ? "UNKNOWN_OUTCOME" : "OK",
    validationId: validation?.validationId,
    fulfillmentClassification: controlled,
    liveValidation: validation?.liveValidation,
  };
}
