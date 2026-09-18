import { getLatestValidationForScope } from "@/lib/supplier-production-validation/persistence";
import { resolveCredentialDisplayStatus } from "./credentialStatus";
import { getInterCarsSupplierId } from "./config";
import type { ReadOnlyLiveStatus } from "./types";

const STAGE_A_CAPABILITIES = ["health", "catalog", "stock", "price"] as const;

export type StageAHandoffStatus = "READY_FOR_STAGE_B_342" | "BLOCKED" | "NOT_RUN";

/** Stage A — read-only validation (health/catalog/stock/price). Never fabricates VALIDATED. */
export function evaluateStageAReadValidation(credentialsStatus: string): {
  status: ReadOnlyLiveStatus;
  capabilities: Record<(typeof STAGE_A_CAPABILITIES)[number], boolean>;
  handoff: StageAHandoffStatus;
  blockers: string[];
} {
  const blockers: string[] = [];
  const supplierId = getInterCarsSupplierId();
  const latest = getLatestValidationForScope({
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
  });

  const capabilities = {
    health: latest?.healthStatus === "LIVE_READ_VALIDATED",
    catalog: latest?.catalogReadStatus === "LIVE_READ_VALIDATED",
    stock: latest?.stockReadStatus === "LIVE_READ_VALIDATED",
    price: latest?.priceReadStatus === "LIVE_READ_VALIDATED",
  };

  const allPass = STAGE_A_CAPABILITIES.every((c) => capabilities[c]);

  if (credentialsStatus === "NOT_CONFIGURED") {
    blockers.push("CREDENTIAL_NOT_CONFIGURED");
    return { status: "BLOCKED", capabilities, handoff: "BLOCKED", blockers };
  }

  if (credentialsStatus === "BLOCKED") {
    blockers.push("CREDENTIAL_MOCK_OR_BLOCKED");
    return { status: "BLOCKED", capabilities, handoff: "BLOCKED", blockers };
  }

  if (allPass) {
    return { status: "VALIDATED", capabilities, handoff: "READY_FOR_STAGE_B_342", blockers: [] };
  }

  blockers.push("INTER_CARS_READ_VALIDATION");
  return { status: "NOT_RUN", capabilities, handoff: "BLOCKED", blockers };
}

export function isStageAValidated(credentialsStatus?: string): boolean {
  const cred =
    credentialsStatus ?? resolveCredentialDisplayStatus({ supplierId: getInterCarsSupplierId() }).status;
  return evaluateStageAReadValidation(cred).status === "VALIDATED";
}
