import { recordRejectedEvidenceAttempt } from "@/lib/production-access/evidencePolicy";
import type { ExternalProviderEvidenceInput } from "./types";

const FORBIDDEN_CAPABILITIES = [
  "charge",
  "capture",
  "refund_execute",
  "create_label",
  "create_shipment",
  "publish_listing",
  "activate_campaign",
  "create_order",
];

export function validateExternalProviderEvidenceInput(input: ExternalProviderEvidenceInput): void {
  if (input.source !== "EXTERNAL_LIVE") {
    recordRejectedEvidenceAttempt();
    throw new Error("EXTERNAL_PROVIDER_EVIDENCE:SOURCE_NOT_LIVE");
  }
  if (input.environment !== "PRODUCTION" && input.environment !== "CONTROLLED_VALIDATION") {
    recordRejectedEvidenceAttempt();
    throw new Error("EXTERNAL_PROVIDER_EVIDENCE:ENVIRONMENT_NOT_PRODUCTION");
  }
  if (!input.timestamp || !input.evidenceReference?.trim() || !input.operator?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("EXTERNAL_PROVIDER_EVIDENCE:MISSING_METADATA");
  }
  if (input.responseStatus < 200 || input.responseStatus >= 300) {
    recordRejectedEvidenceAttempt();
    throw new Error("EXTERNAL_PROVIDER_EVIDENCE:NON_SUCCESS");
  }
  if (!input.endpoint.startsWith("https://")) {
    recordRejectedEvidenceAttempt();
    throw new Error("EXTERNAL_PROVIDER_EVIDENCE:HTTPS_REQUIRED");
  }
  const cap = input.capability.toLowerCase();
  if (FORBIDDEN_CAPABILITIES.some((f) => cap.includes(f))) {
    recordRejectedEvidenceAttempt();
    throw new Error("EXTERNAL_PROVIDER_EVIDENCE:FORBIDDEN_SIDE_EFFECT_CAPABILITY");
  }
}
