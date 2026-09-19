import type { HumanActionItem } from "@/lib/external-access-control-center/types";
import { resolveInterCarsCredentialBridgeState } from "./secretRefBridge";
import { buildInterCarsCapabilityMatrix } from "./capabilityMatrix";

export function buildInterCarsHumanActions(): HumanActionItem[] {
  const actions: HumanActionItem[] = [];
  const credential = resolveInterCarsCredentialBridgeState();
  const matrix = buildInterCarsCapabilityMatrix();
  const createOrder = matrix.find((c) => c.capability === "createOrder");

  if (credential === "NOT_CONFIGURED") {
    actions.push({
      priority: 1,
      provider: "Inter Cars",
      action: "Configure Inter Cars Production SecretRef (SUPPLIER_LIVE_CREDENTIALS_SECRET_REF)",
      why: "Production API access requires operator-provided credentials",
      requiredEvidence: "HUMAN_APPROVAL",
      verificationMethod: "Secret ref present without exposing values in repo",
      blocking: true,
    });
  }

  if (credential === "REFERENCE_PRESENT" || credential === "VALUE_PRESENT_UNVERIFIED") {
    actions.push({
      priority: 2,
      provider: "Inter Cars",
      action: "Run controlled read-only Inter Cars Production validation (health/catalog/stock/pricing)",
      why: "SecretRef alone is not production validation",
      requiredEvidence: "INTER_CARS_LIVE",
      verificationMethod: "Register read-only INTER_CARS_LIVE evidence after operator HTTP validation",
      blocking: true,
    });
  }

  const readReady = matrix
    .filter((c) => ["health", "catalog", "stock", "pricing"].includes(c.capability))
    .every((c) => c.status === "LIVE_READ_VALIDATED");

  if (readReady && createOrder?.status === "UNVERIFIED") {
    actions.push({
      priority: 3,
      provider: "Inter Cars",
      action: "Proceed through existing #342 controlled createOrder validation gate",
      why: "#362 cannot promote createOrder — only #342 may validate orders",
      requiredEvidence: "FOUR_EYES_APPROVAL",
      verificationMethod: "supplier-production-order-validation controlled run",
      blocking: true,
    });
  }

  if (createOrder?.status === "UNVERIFIED") {
    actions.push({
      priority: 4,
      provider: "Inter Cars",
      action: "Keep SUPPLIER_ORDER_NETWORK_ENABLED=0 until #342–#346 gates complete",
      why: "Order network must remain off during preparation",
      requiredEvidence: "CONFIGURATION",
      verificationMethod: "Environment flags",
      blocking: true,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}
