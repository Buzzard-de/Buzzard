import { randomUUID } from "crypto";
import { isCarrierProductionEnabled } from "./config";
import { assertCarrierProductionSafety } from "./safety";
import { saveCarrierLabelRecord } from "./persistence";
import type { CarrierLabelRecord, CarrierLabelRequest } from "./types";

export function validateParcel(input: CarrierLabelRequest): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (input.weightKg <= 0) errors.push("INVALID_WEIGHT");
  if (input.dimensionsCm.length <= 0 || input.dimensionsCm.width <= 0 || input.dimensionsCm.height <= 0) {
    errors.push("INVALID_DIMENSIONS");
  }
  if (!input.country || input.country.length !== 2) errors.push("INVALID_COUNTRY");
  return { ok: errors.length === 0, errors };
}

export function requestLabelDryRun(input: CarrierLabelRequest): CarrierLabelRecord {
  assertCarrierProductionSafety();
  const validation = validateParcel(input);
  if (!validation.ok) throw new Error(`CARRIER_VALIDATION:${validation.errors.join(",")}`);

  const record: CarrierLabelRecord = {
    labelId: randomUUID(),
    shipmentId: input.shipmentId,
    carrierId: input.carrierId,
    labelReference: `MOCK-LABEL-${input.shipmentId.slice(0, 8)}`,
    trackingReference: `MOCK-TRACK-${input.shipmentId.slice(0, 8)}`,
    state: "BLOCKED",
    dryRun: !isCarrierProductionEnabled(),
    createdAt: new Date().toISOString(),
  };
  saveCarrierLabelRecord(record);
  return record;
}

export function authorizeLabelPurchase(_labelId: string, _approverId: string): { authorized: boolean } {
  assertCarrierProductionSafety();
  return { authorized: false };
}
