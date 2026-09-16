import { getSupplier } from "@/lib/supplier-engine/registry";
import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import { validateProductionCredentials } from "@/lib/supplier-production-validation/credentialValidation";
import {
  classifyEndpoint,
  extractProfileAllowedHosts,
  validateEndpointUrl,
} from "@/lib/supplier-production-validation/endpointSecurity";
import { getCreateOrderEndpointPath } from "./config";
import type { CreateOrderCapabilityState, CreateOrderCapabilityStatus } from "./types";

export function buildInitialCapabilityState(): CreateOrderCapabilityState {
  return {
    declared: false,
    configured: false,
    authenticated: false,
    endpointAvailable: false,
    requestValidated: false,
    responseValidated: false,
    idempotencyValidated: false,
    errorHandlingValidated: false,
    statusValidated: false,
    trackingValidated: false,
    productionValidated: false,
  };
}

export function evaluateDeclaredCapability(supplierId: string): {
  state: CreateOrderCapabilityState;
  blockers: string[];
} {
  const profile = resolvePredefinedLiveProfile();
  const supplier = getSupplier(supplierId);
  const state = buildInitialCapabilityState();
  const blockers: string[] = [];

  const declared = Boolean(
    profile?.capabilities?.createOrder ||
      profile?.capabilities?.orderAPI ||
      supplier?.capabilities?.createOrder ||
      supplier?.capabilities?.orderAPI,
  );
  state.declared = declared;
  if (!declared) blockers.push("CREATE_ORDER_NOT_DECLARED");

  const endpointPath = getCreateOrderEndpointPath();
  state.configured = Boolean(profile?.baseUrl && endpointPath);
  if (!state.configured) blockers.push("CREATE_ORDER_ENDPOINT_NOT_CONFIGURED");

  const credential = validateProductionCredentials({ supplierId, environment: "PRODUCTION" });
  state.authenticated = credential.status === "VALID" || credential.status === "CONFIGURED";
  if (credential.status === "NOT_CONFIGURED") {
    blockers.push("CREDENTIAL_NOT_CONFIGURED");
  } else if (credential.status === "BLOCKED" || credential.status === "INVALID") {
    blockers.push("CREDENTIAL_INVALID");
  }

  if (profile?.baseUrl && endpointPath) {
    const hosts = extractProfileAllowedHosts(profile.baseUrl, []);
    const url = `${profile.baseUrl.replace(/\/$/, "")}${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`;
    const endpointCheck = validateEndpointUrl(url, hosts, true);
    state.endpointAvailable = endpointCheck.allowed;
    if (!endpointCheck.allowed) blockers.push("ENDPOINT_SECURITY_BLOCKED");
    if (classifyEndpoint(endpointPath) !== "ORDER_CREATE") blockers.push("ENDPOINT_CLASSIFICATION_MISMATCH");
  }

  return { state, blockers };
}

export function deriveCreateOrderCapabilityStatus(
  state: CreateOrderCapabilityState,
): CreateOrderCapabilityStatus {
  if (state.productionValidated) return "VALIDATED";
  return "UNVERIFIED";
}
