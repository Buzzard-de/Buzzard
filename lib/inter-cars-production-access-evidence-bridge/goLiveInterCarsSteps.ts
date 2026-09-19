import type { GoLiveControlStep } from "@/lib/external-access-control-center/types";
import { resolveInterCarsCredentialBridgeState } from "./secretRefBridge";
import { buildInterCarsCapabilityMatrix } from "./capabilityMatrix";

export function buildInterCarsGoLiveSteps(): GoLiveControlStep[] {
  const credential = resolveInterCarsCredentialBridgeState();
  const matrix = buildInterCarsCapabilityMatrix();
  const readOk = matrix
    .filter((c) => ["health", "catalog", "stock", "pricing"].includes(c.capability))
    .every((c) => c.status === "LIVE_READ_VALIDATED");
  const createOrder = matrix.find((c) => c.capability === "createOrder");

  const step = (
    id: string,
    label: string,
    status: GoLiveControlStep["status"],
    blockingReason?: string,
  ): GoLiveControlStep => ({
    id,
    label,
    status,
    blockingReason,
    requiredHumanApproval: true,
  });

  return [
    step(
      "inter-cars-secret-reference",
      "INTER_CARS_SECRET_REFERENCE",
      credential === "NOT_CONFIGURED" ? "HUMAN_REQUIRED" : "CONFIGURED",
    ),
    step(
      "inter-cars-credential-validated",
      "INTER_CARS_CREDENTIAL_VALIDATED",
      credential === "VALIDATED" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
    ),
    step(
      "inter-cars-read-access-validated",
      "INTER_CARS_READ_ACCESS_VALIDATED",
      readOk ? "VALIDATED" : "BLOCKED_EXTERNAL_ACCESS",
      readOk ? undefined : "READ_ONLY_LIVE_EVIDENCE_REQUIRED",
    ),
    step(
      "inter-cars-create-order-validation",
      "INTER_CARS_CREATE_ORDER_VALIDATION",
      createOrder?.status === "ORDER_VALIDATED" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
      "ONLY_342_MAY_VALIDATE_CREATE_ORDER",
    ),
    step("inter-cars-production-order-arming", "INTER_CARS_PRODUCTION_ORDER_ARMING", "BLOCKED_EXTERNAL_ACCESS"),
    step("first-order-gate", "FIRST_ORDER_GATE", "BLOCKED_EXTERNAL_ACCESS"),
    step("post-order-validation", "POST_ORDER_VALIDATION", "BLOCKED_EXTERNAL_ACCESS"),
  ];
}
