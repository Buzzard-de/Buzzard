import { getLatestControlledValidationRun } from "@/lib/supplier-production-order-validation/persistence";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { evaluateStageAReadValidation } from "@/lib/supplier-inter-cars-production-access/stageA";
import { resolveCredentialDisplayStatus } from "@/lib/supplier-inter-cars-production-access/credentialStatus";
import { getInterCarsSupplierId, isInterCarsProfileConfigured } from "@/lib/supplier-inter-cars-production-access/config";
import { resolveNetworkState } from "@/lib/supplier-inter-cars-production-access/networkState";
import { hasLiveEvidenceForCapability } from "./evidenceStore";
import type { InterCarsCapabilityId, InterCarsCapabilityMatrixRow, InterCarsCapabilityLiveStatus } from "./types";

const ALL_CAPABILITIES: InterCarsCapabilityId[] = [
  "health",
  "catalog",
  "products",
  "stock",
  "pricing",
  "createOrder",
  "cancelOrder",
  "orderStatus",
  "tracking",
  "returns",
  "refund",
];

function stageAKey(cap: InterCarsCapabilityId): "health" | "catalog" | "stock" | "price" | null {
  if (cap === "health") return "health";
  if (cap === "catalog" || cap === "products") return "catalog";
  if (cap === "stock") return "stock";
  if (cap === "pricing") return "price";
  return null;
}

function readCapabilityStatus(cap: InterCarsCapabilityId): InterCarsCapabilityLiveStatus {
  const key = stageAKey(cap);
  if (!key) return "UNVERIFIED";
  const evidenceCap = cap === "products" ? "catalog" : cap === "pricing" ? "pricing" : cap;
  const liveEvidence = hasLiveEvidenceForCapability(evidenceCap as "health" | "catalog" | "stock" | "pricing");
  const cred = resolveCredentialDisplayStatus({ supplierId: getInterCarsSupplierId() });
  const stageA = evaluateStageAReadValidation(cred.status);
  const ssotPass = stageA.capabilities[key === "price" ? "price" : key];
  if (liveEvidence || ssotPass) return "LIVE_READ_VALIDATED";
  if (cred.status === "NOT_CONFIGURED") return "BLOCKED_EXTERNAL_ACCESS";
  return "UNVERIFIED";
}

export function buildInterCarsCapabilityMatrix(): InterCarsCapabilityMatrixRow[] {
  const diag = evaluateInterCarsProductionAccess();
  const cred = resolveCredentialDisplayStatus({ supplierId: getInterCarsSupplierId() });
  const network = resolveNetworkState();
  const stageA = evaluateStageAReadValidation(cred.status);
  const controlled = getLatestControlledValidationRun({ supplierId: getInterCarsSupplierId(), market: "DE" });
  const createOrderValidated =
    controlled?.liveValidation === "PASS" && controlled.createOrderCapability === "VALIDATED";

  const readNetworkAllowed =
    network.productionNetwork === "OFF" &&
    network.supplierOrderNetwork === "OFF" &&
    diag.realHttpCalls === 0;

  return ALL_CAPABILITIES.map((capability) => {
    const isOrderCap = ["createOrder", "cancelOrder", "orderStatus", "tracking", "returns", "refund"].includes(
      capability,
    );
    let status: InterCarsCapabilityLiveStatus = "UNVERIFIED";
    if (capability === "createOrder") {
      status = createOrderValidated ? "ORDER_VALIDATED" : "UNVERIFIED";
    } else if (!isOrderCap) {
      status = readCapabilityStatus(capability);
    }

    const liveValidated = status === "LIVE_READ_VALIDATED" || status === "ORDER_VALIDATED";
    return {
      capability,
      configured: isInterCarsProfileConfigured(),
      credentialRequired: true,
      credentialAvailable: cred.status === "VALID" || cred.status === "CONFIGURED",
      endpointConfigured: diag.interCarsProfile === "CONFIGURED",
      networkAllowed: isOrderCap ? network.supplierOrderNetwork === "OFF" : readNetworkAllowed,
      liveValidated,
      productionEvidence: liveValidated && (capability === "createOrder" ? createOrderValidated : hasLiveEvidenceForCapability(
        capability === "products" ? "catalog" : capability === "pricing" ? "pricing" : capability,
      )),
      humanApprovalRequired: capability === "createOrder" || isOrderCap,
      status,
    };
  });
}

export function getCreateOrderCapabilityStatus(): InterCarsCapabilityLiveStatus {
  return buildInterCarsCapabilityMatrix().find((r) => r.capability === "createOrder")?.status ?? "UNVERIFIED";
}
