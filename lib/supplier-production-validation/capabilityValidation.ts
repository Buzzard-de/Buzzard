import { getSupplier } from "@/lib/supplier-engine/registry";
import { resolvePredefinedLiveProfile, resolveLiveSupplierProfile } from "@/lib/supplier-engine/liveSupplier/config";
import type { CapabilityStatus, ValidationCheckResult } from "./types";

export interface CapabilityValidationResult {
  createOrderCapability: CapabilityStatus;
  orderStatusCapability: CapabilityStatus;
  trackingCapability: CapabilityStatus;
  returnCapability: CapabilityStatus;
  refundCapability: CapabilityStatus;
  dropshippingCapability: CapabilityStatus;
  blindShippingCapability: CapabilityStatus;
  whiteLabelCapability: CapabilityStatus;
  checks: ValidationCheckResult[];
  blockerCodes: string[];
}

export function validateDeclaredCapabilities(supplierId: string): CapabilityValidationResult {
  const profile = resolveLiveSupplierProfile() || resolvePredefinedLiveProfile();
  const supplier = getSupplier(supplierId);
  const caps = { ...(supplier?.capabilities || {}), ...(profile?.capabilities || {}) };
  const checks: ValidationCheckResult[] = [];
  const blockerCodes: string[] = [];

  const createOrderCapability: CapabilityStatus = "UNVERIFIED";
  checks.push({
    check: "CREATE_ORDER_CAPABILITY",
    status: "PASS",
    message: "createOrder not validated in #339 — UNVERIFIED by design",
    detail: { status: createOrderCapability },
  });
  blockerCodes.push("REAL_ORDER_ENDPOINT_NOT_VALIDATED");

  const orderStatusCapability: CapabilityStatus = caps.orderStatus ? "DECLARED" : "UNVERIFIED";
  const trackingCapability: CapabilityStatus = caps.trackingAPI ? "DECLARED" : "UNVERIFIED";
  const returnCapability: CapabilityStatus = caps.returnsAPI ? "DECLARED" : "UNVERIFIED";
  const refundCapability: CapabilityStatus = caps.refund ? "DECLARED" : "UNVERIFIED";

  const configDropship = Boolean(profile?.dropshipping ?? profile?.capabilities?.dropshipping);
  const configWhiteLabel = Boolean(profile?.whiteLabel ?? profile?.capabilities?.whiteLabel);
  const configBlind = Boolean(profile?.blindShipping ?? profile?.capabilities?.blindShipping);
  const connectorDropship = Boolean(caps.dropshipping);
  const connectorWhiteLabel = Boolean(caps.whiteLabel);
  const connectorBlind = Boolean(caps.blindShipping);

  let dropshippingCapability: CapabilityStatus = configDropship ? "DECLARED" : "NOT_CONFIGURED";
  let whiteLabelCapability: CapabilityStatus = configWhiteLabel ? "DECLARED" : "NOT_CONFIGURED";
  let blindShippingCapability: CapabilityStatus = configBlind ? "DECLARED" : "NOT_CONFIGURED";

  if (configDropship !== connectorDropship) {
    checks.push({ check: "DROPSHIPPING_MISMATCH", status: "BLOCKED", message: "Config/connector dropshipping mismatch" });
    dropshippingCapability = "BLOCKED";
    blockerCodes.push("CAPABILITY_MISMATCH");
  }
  if (configWhiteLabel !== connectorWhiteLabel) {
    checks.push({ check: "WHITE_LABEL_MISMATCH", status: "BLOCKED", message: "Config/connector whiteLabel mismatch" });
    whiteLabelCapability = "BLOCKED";
    blockerCodes.push("CAPABILITY_MISMATCH");
  }
  if (configBlind !== connectorBlind) {
    checks.push({ check: "BLIND_SHIPPING_MISMATCH", status: "BLOCKED", message: "Config/connector blindShipping mismatch" });
    blindShippingCapability = "BLOCKED";
    blockerCodes.push("CAPABILITY_MISMATCH");
  }

  if (!blockerCodes.includes("CAPABILITY_MISMATCH")) {
    checks.push({ check: "FULFILLMENT_CAPABILITIES", status: "PASS", message: "Fulfillment capability config consistent" });
  }

  return {
    createOrderCapability,
    orderStatusCapability,
    trackingCapability,
    returnCapability,
    refundCapability,
    dropshippingCapability,
    blindShippingCapability,
    whiteLabelCapability,
    checks,
    blockerCodes,
  };
}
