import {
  extractProfileAllowedHosts,
  validateEndpointUrl,
} from "@/lib/supplier-production-validation/endpointSecurity";
import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import { getCreateOrderEndpointPath } from "@/lib/supplier-production-order-validation/config";
import { isControlledValidationEnabled } from "@/lib/supplier-production-order-validation/config";
import { evaluateUpstreamGates } from "@/lib/supplier-production-order-validation/eligibility";
import { isActivationKillSwitched } from "@/lib/supplier-order-readiness/killSwitch";
import { resolveCredentialDisplayStatus } from "./credentialStatus";
import { resolveNetworkState } from "./networkState";
import { evaluateStageAReadValidation } from "./stageA";
import { getInterCarsSupplierId } from "./config";

/** Dry-run #342 readiness — no HTTP, no createOrder, no order payload. */
export function runProductionAccessPreflight(): {
  ready: boolean;
  stageAHandoff: "READY_FOR_STAGE_B_342" | "BLOCKED" | "NOT_RUN";
  blockers: string[];
  checks: { check: string; status: string; message: string }[];
} {
  const supplierId = getInterCarsSupplierId();
  const credential = resolveCredentialDisplayStatus({ supplierId });
  const network = resolveNetworkState();
  const profile = resolvePredefinedLiveProfile();
  const checks: { check: string; status: string; message: string }[] = [];
  const blockers: string[] = [...credential.blockers];

  checks.push({
    check: "PROFILE",
    status: profile ? "PASS" : "BLOCKED",
    message: profile ? process.env.SUPPLIER_LIVE_PROFILE || "inter-cars" : "missing",
  });
  if (!profile) blockers.push("INTER_CARS_PROFILE_NOT_CONFIGURED");

  checks.push({
    check: "CREDENTIALS",
    status: credential.status === "VALID" || credential.status === "CONFIGURED" ? "PASS" : "BLOCKED",
    message: credential.status,
  });

  let endpointAllowlisted = false;
  if (profile?.baseUrl) {
    const hosts = extractProfileAllowedHosts(profile.baseUrl, profile.allowedEndpoints || []);
    const path = getCreateOrderEndpointPath();
    const url = `${profile.baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
    endpointAllowlisted = validateEndpointUrl(url, hosts, true).allowed;
    checks.push({
      check: "ENDPOINT",
      status: endpointAllowlisted ? "PASS" : "BLOCKED",
      message: url,
    });
    if (!endpointAllowlisted) blockers.push("ENDPOINT_SECURITY_BLOCKED");
  } else {
    checks.push({ check: "ENDPOINT", status: "BLOCKED", message: "baseUrl missing" });
    blockers.push("ENDPOINT_NOT_CONFIGURED");
  }

  checks.push({
    check: "NETWORK_DEFAULT",
    status: network.productionNetwork === "OFF" && network.supplierOrderNetwork === "OFF" ? "PASS" : "BLOCKED",
    message: `network=${network.productionNetwork} orderNetwork=${network.supplierOrderNetwork}`,
  });
  if (network.supplierOrderNetwork === "ON") blockers.push("ORDER_NETWORK_MUST_BE_OFF");

  checks.push({
    check: "SCOPED_VALIDATION_NETWORK",
    status: network.scopedValidationNetwork === "OFF" ? "PASS" : "UNVERIFIED",
    message: "Scoped network only during explicit #342 run",
  });

  const upstream = evaluateUpstreamGates({
    supplierId,
    market: "DE",
    channel: "DIRECT",
    environment: "PRODUCTION",
    requester: "ops@example.com",
  });
  checks.push({
    check: "UPSTREAM_GATES",
    status: upstream.blockers.length === 0 ? "PASS" : "BLOCKED",
    message: upstream.blockers.join(",") || "PASS",
  });
  blockers.push(...upstream.blockers);

  if (isActivationKillSwitched({ supplierId, market: "DE", channel: "DIRECT" })) {
    blockers.push("KILL_SWITCH_ACTIVE");
  }

  checks.push({
    check: "CONTROLLED_VALIDATION_ENABLED",
    status: isControlledValidationEnabled() ? "UNVERIFIED" : "PASS",
    message: isControlledValidationEnabled()
      ? "Explicitly enabled — await controlled run"
      : "Disabled until operational enable",
  });

  const stageA = evaluateStageAReadValidation(credential.status);
  checks.push({
    check: "STAGE_A_READ_ONLY",
    status: stageA.status === "VALIDATED" ? "PASS" : stageA.status === "NOT_RUN" ? "UNVERIFIED" : "BLOCKED",
    message: `health=${stageA.capabilities.health} catalog=${stageA.capabilities.catalog} stock=${stageA.capabilities.stock} price=${stageA.capabilities.price}`,
  });
  if (stageA.status !== "VALIDATED" && (credential.status === "VALID" || credential.status === "CONFIGURED")) {
    blockers.push("STAGE_A_READ_VALIDATION_REQUIRED");
  }

  const credentialReady = credential.status === "VALID" || credential.status === "CONFIGURED";
  const ready =
    credentialReady &&
    endpointAllowlisted &&
    network.supplierOrderNetwork === "OFF" &&
    upstream.blockers.length === 0 &&
    stageA.handoff === "READY_FOR_STAGE_B_342";

  return {
    ready,
    stageAHandoff: stageA.handoff,
    blockers: [...new Set(blockers)],
    checks,
  };
}
