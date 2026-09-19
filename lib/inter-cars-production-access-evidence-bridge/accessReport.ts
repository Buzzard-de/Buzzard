import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";
import { countRejectedEvidenceAttempts } from "@/lib/production-access/evidencePolicy";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { getProductionAccessSafetyCounters } from "@/lib/supplier-inter-cars-production-access/safety";
import { buildInterCarsCapabilityMatrix, getCreateOrderCapabilityStatus } from "./capabilityMatrix";
import { buildInterCarsHumanActions } from "./humanActions";
import { resolveInterCarsCredentialBridgeState } from "./secretRefBridge";
import type { InterCarsProductionAccessBridgeReport } from "./types";

function mapCredentialValidation(state: ReturnType<typeof resolveInterCarsCredentialBridgeState>): ControlCenterStatus {
  switch (state) {
    case "VALIDATED":
      return "VALIDATED";
    case "REFERENCE_PRESENT":
    case "VALUE_PRESENT_UNVERIFIED":
      return "HUMAN_REQUIRED";
    case "EXPIRED":
    case "INVALID":
      return "FAILED";
    default:
      return "BLOCKED_EXTERNAL_ACCESS";
  }
}

export function buildInterCarsProductionAccessBridgeReport(): InterCarsProductionAccessBridgeReport {
  const diag = evaluateInterCarsProductionAccess();
  const credentialReference = resolveInterCarsCredentialBridgeState();
  const capabilities = buildInterCarsCapabilityMatrix();
  const createOrder = getCreateOrderCapabilityStatus();
  const counters = getProductionAccessSafetyCounters();
  const actions = buildInterCarsHumanActions();

  const readCaps = capabilities.filter((c) =>
    ["health", "catalog", "products", "stock", "pricing"].includes(c.capability),
  );
  const readValidated = readCaps.every((c) => c.status === "LIVE_READ_VALIDATED");
  let readOnlyAccess: ControlCenterStatus = "BLOCKED_EXTERNAL_ACCESS";
  if (credentialReference === "NOT_CONFIGURED") {
    readOnlyAccess = "BLOCKED_EXTERNAL_ACCESS";
  } else if (readValidated) {
    readOnlyAccess = "VALIDATED";
  } else if (credentialReference === "REFERENCE_PRESENT" || credentialReference === "VALUE_PRESENT_UNVERIFIED") {
    readOnlyAccess = "HUMAN_REQUIRED";
  }

  const stage342Gate =
    diag.createOrderCapability === "VALIDATED" ? "VALIDATED" : createOrder === "UNVERIFIED" ? "UNVERIFIED" : "BLOCKED";

  return {
    generatedAt: new Date().toISOString(),
    credentialReference,
    credentialValidation: mapCredentialValidation(credentialReference),
    readOnlyAccess,
    capabilities,
    createOrder,
    stage342Gate,
    blockers: [...new Set(diag.blockers)],
    humanActionCount: actions.length,
    nextHumanAction: actions[0]?.action,
    fakeProductionEvidence: countRejectedEvidenceAttempts(),
    realSideEffects: counters.realHttpCalls + diag.realHttpCalls + diag.realCreateOrderCalls,
  };
}
