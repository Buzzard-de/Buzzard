import { randomUUID } from "crypto";
import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import {
  extractProfileAllowedHosts,
  validateEndpointUrl,
} from "@/lib/supplier-production-validation/endpointSecurity";
import { getCreateOrderEndpointPath } from "@/lib/supplier-production-order-validation/config";
import { getLatestControlledValidationRun } from "@/lib/supplier-production-order-validation/persistence";
import { getCreateOrderValidationSafetyCounters } from "@/lib/supplier-production-order-validation/safety";
import { resolveCredentialDisplayStatus } from "./credentialStatus";
import { resolveNetworkState } from "./networkState";
import { buildProductionAccessChecklist } from "./checklist";
import { runProductionAccessPreflight } from "./preflight";
import { resolveReadOnlyLiveStatus } from "./readOnlyLive";
import { evaluateStageAReadValidation } from "./stageA";
import { getProductionAccessSafetyCounters } from "./safety";
import { getInterCarsSupplierId, isInterCarsProfileConfigured } from "./config";
import type { ProductionAccessDiagnostic } from "./types";

export function evaluateInterCarsProductionAccess(): ProductionAccessDiagnostic {
  const supplierId = getInterCarsSupplierId();
  const profile = resolvePredefinedLiveProfile();
  const credential = resolveCredentialDisplayStatus({ supplierId });
  const network = resolveNetworkState();
  const preflight = runProductionAccessPreflight();
  const safety342 = getCreateOrderValidationSafetyCounters();
  const safetyPrep = getProductionAccessSafetyCounters();

  const controlledRun = getLatestControlledValidationRun({ supplierId, market: "DE" });
  const stageA = evaluateStageAReadValidation(credential.status);
  const createOrderCapability =
    controlledRun?.liveValidation === "PASS" && controlledRun.createOrderCapability === "VALIDATED"
      ? ("VALIDATED" as const)
      : ("UNVERIFIED" as const);
  const handoffStage343 =
    createOrderCapability === "VALIDATED" ? ("READY_FOR_343_ARMING" as const) : ("BLOCKED" as const);

  let endpointAllowlisted = false;
  if (profile?.baseUrl) {
    const hosts = extractProfileAllowedHosts(profile.baseUrl, profile.allowedEndpoints || []);
    const path = getCreateOrderEndpointPath();
    const url = `${profile.baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
    endpointAllowlisted = validateEndpointUrl(url, hosts, true).allowed;
  }

  const blockers: string[] = [];
  if (!isInterCarsProfileConfigured()) blockers.push("INTER_CARS_PROFILE_NOT_CONFIGURED");
  if (credential.status === "NOT_CONFIGURED") blockers.push("CREDENTIAL_NOT_CONFIGURED");
  if (credential.status === "BLOCKED") blockers.push("CREDENTIAL_MOCK_OR_BLOCKED");
  if (network.supplierOrderNetwork === "ON") blockers.push("ORDER_NETWORK_MUST_BE_OFF_IN_PREP");
  if (createOrderCapability !== "VALIDATED") blockers.push("CREATE_ORDER_UNVERIFIED");
  blockers.push(...preflight.blockers.filter((b) => !blockers.includes(b)));

  return {
    interCarsProfile: isInterCarsProfileConfigured() ? "CONFIGURED" : "NOT_CONFIGURED",
    environment: profile?.environment || "UNKNOWN",
    supplierProfile: process.env.SUPPLIER_LIVE_PROFILE || "none",
    productionCredentials: credential.status,
    credentialType: credential.credentialType,
    readOnlyLiveValidation: resolveReadOnlyLiveStatus(credential.status),
    stageAHandoff: stageA.handoff,
    handoffStage343,
    controlledLiveValidation: preflight.ready ? "READY" : preflight.stageAHandoff === "READY_FOR_STAGE_B_342" ? "NOT_RUN" : "BLOCKED",
    createOrderCapability,
    productionNetwork: network.productionNetwork,
    supplierOrderNetwork: network.supplierOrderNetwork,
    scopedValidationNetwork: network.scopedValidationNetwork,
    realHttpCalls: safety342.realSupplierOrderCalls + safetyPrep.realHttpCalls,
    realCreateOrderCalls: safety342.realSupplierOrderCalls,
    realSupplierOrders: safety342.realSupplierOrderCalls,
    realCustomerOrders: safety342.realCustomerOrders,
    checklist: buildProductionAccessChecklist({
      profileConfigured: isInterCarsProfileConfigured(),
      credentialsStatus: credential.status,
      endpointConfigured: Boolean(profile?.baseUrl),
      endpointAllowlisted,
      createOrderBlocked: true,
    }),
    blockers: [...new Set(blockers)],
    correlationId: randomUUID(),
    evaluatedAt: new Date().toISOString(),
  };
}
