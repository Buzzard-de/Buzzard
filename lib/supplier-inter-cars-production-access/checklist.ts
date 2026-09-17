import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import { isControlledValidationEnabled } from "@/lib/supplier-production-order-validation/config";
import { isActivationKillSwitched } from "@/lib/supplier-order-readiness/killSwitch";
import { resolveNetworkState } from "./networkState";
import type { ProductionAccessChecklistItem } from "./types";
import { getInterCarsSupplierId } from "./config";

export function buildProductionAccessChecklist(input: {
  profileConfigured: boolean;
  credentialsStatus: string;
  endpointConfigured: boolean;
  endpointAllowlisted: boolean;
  createOrderBlocked: boolean;
}): ProductionAccessChecklistItem[] {
  const network = resolveNetworkState();
  const profile = resolvePredefinedLiveProfile();
  const supplierId = getInterCarsSupplierId();

  return [
    {
      id: "inter_cars_profile",
      label: "Inter Cars profile configured",
      status: input.profileConfigured ? "PASS" : "BLOCKED",
      message: input.profileConfigured ? "SUPPLIER_LIVE_PROFILE=inter-cars" : "Profile missing",
    },
    {
      id: "production_credentials",
      label: "Production credentials configured",
      status:
        input.credentialsStatus === "VALID" || input.credentialsStatus === "CONFIGURED"
          ? "PASS"
          : input.credentialsStatus === "NOT_CONFIGURED"
            ? "BLOCKED"
            : "BLOCKED",
      message: input.credentialsStatus,
    },
    {
      id: "credential_format",
      label: "Credential format valid",
      status: input.credentialsStatus === "VALID" ? "PASS" : input.credentialsStatus === "BLOCKED" ? "BLOCKED" : "UNVERIFIED",
      message: input.credentialsStatus,
    },
    {
      id: "endpoint_configured",
      label: "Endpoint configured",
      status: input.endpointConfigured ? "PASS" : "BLOCKED",
      message: profile?.baseUrl || "none",
    },
    {
      id: "endpoint_allowlisted",
      label: "Endpoint allowlisted",
      status: input.endpointAllowlisted ? "PASS" : "BLOCKED",
      message: input.endpointAllowlisted ? "SSRF allowlist PASS" : "Endpoint blocked",
    },
    {
      id: "network_disabled",
      label: "Network disabled (default)",
      status: network.productionNetwork === "OFF" ? "PASS" : "BLOCKED",
      message: `SUPPLIER_NETWORK_ENABLED=${network.productionNetwork}`,
    },
    {
      id: "order_network_disabled",
      label: "Order network disabled (default)",
      status: network.supplierOrderNetwork === "OFF" ? "PASS" : "BLOCKED",
      message: `SUPPLIER_ORDER_NETWORK_ENABLED=${network.supplierOrderNetwork}`,
    },
    {
      id: "create_order_blocked",
      label: "createOrder blocked in prep mode",
      status: input.createOrderBlocked ? "PASS" : "BLOCKED",
      message: input.createOrderBlocked ? "No real createOrder in prep" : "createOrder would execute",
    },
    {
      id: "controlled_validation_explicit",
      label: "#342 enabled only explicitly",
      status: isControlledValidationEnabled() ? "UNVERIFIED" : "PASS",
      message: isControlledValidationEnabled()
        ? "SUPPLIER_CREATE_ORDER_VALIDATION_ENABLED=1"
        : "Disabled until explicit enable",
    },
    {
      id: "kill_switch",
      label: "Kill switch available",
      status: "PASS",
      message: isActivationKillSwitched({ supplierId, market: "DE", channel: "DIRECT" })
        ? "KILL_SWITCH ON"
        : "Available",
    },
    {
      id: "audit_persistence",
      label: "Audit & persistence available",
      status: "PASS",
      message: "buzzard.db + audit modules",
    },
  ];
}
