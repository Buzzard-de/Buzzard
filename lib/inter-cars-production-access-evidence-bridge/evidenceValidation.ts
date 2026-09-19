import { recordRejectedEvidenceAttempt } from "@/lib/production-access/evidencePolicy";
import type { InterCarsCapabilityId, InterCarsCredentialEvidenceInput } from "./types";

const READ_ONLY_CAPABILITIES: InterCarsCapabilityId[] = ["health", "catalog", "products", "stock", "pricing"];

const ORDER_CAPABILITIES: InterCarsCapabilityId[] = [
  "createOrder",
  "cancelOrder",
  "orderStatus",
  "tracking",
  "returns",
  "refund",
];

export function assertInterCarsLiveEvidenceSource(input: InterCarsCredentialEvidenceInput): void {
  if (input.source !== "INTER_CARS_LIVE") {
    recordRejectedEvidenceAttempt();
    throw new Error("INTER_CARS_EVIDENCE:SOURCE_NOT_LIVE");
  }
  if (input.environment !== "PRODUCTION" && input.environment !== "CONTROLLED_VALIDATION") {
    recordRejectedEvidenceAttempt();
    throw new Error("INTER_CARS_EVIDENCE:ENVIRONMENT_NOT_PRODUCTION");
  }
  if (!input.timestamp || !input.evidenceReference?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("INTER_CARS_EVIDENCE:MISSING_REFERENCE_OR_TIMESTAMP");
  }
  if (!input.operator?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("INTER_CARS_EVIDENCE:MISSING_OPERATOR");
  }
  if (!input.secretRef?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("INTER_CARS_EVIDENCE:MISSING_SECRET_REF");
  }
  if (input.responseStatus < 200 || input.responseStatus >= 300) {
    recordRejectedEvidenceAttempt();
    throw new Error("INTER_CARS_EVIDENCE:NON_SUCCESS_RESPONSE");
  }
}

export function validateInterCarsCredentialEvidenceInput(input: InterCarsCredentialEvidenceInput): void {
  assertInterCarsLiveEvidenceSource(input);
  if (ORDER_CAPABILITIES.includes(input.capability)) {
    recordRejectedEvidenceAttempt();
    throw new Error("INTER_CARS_EVIDENCE:ORDER_CAPABILITY_NOT_ALLOWED_IN_BRIDGE");
  }
  if (!READ_ONLY_CAPABILITIES.includes(input.capability)) {
    recordRejectedEvidenceAttempt();
    throw new Error("INTER_CARS_EVIDENCE:UNKNOWN_CAPABILITY");
  }
  if (!input.endpoint.startsWith("https://")) {
    recordRejectedEvidenceAttempt();
    throw new Error("INTER_CARS_EVIDENCE:HTTPS_REQUIRED");
  }
}

export const INTER_CARS_READ_ONLY_CAPABILITIES = READ_ONLY_CAPABILITIES;
