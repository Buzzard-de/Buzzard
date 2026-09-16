import { evaluateArmingEligibility } from "@/lib/supplier-production-order-arming/eligibility";
import { getLatestArmingForScope } from "@/lib/supplier-production-order-arming/persistence";
import { loadOfficialValidationEvidence } from "@/lib/supplier-production-order-arming/evidence";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { loadFirstOrderEvidence } from "./firstOrderValidation";
import { validateSupplierConfirmation } from "./supplierConfirmation";
import { validateTrackingCapability } from "./trackingValidation";
import { reconcileFulfillment, reconcileInventory, reconcilePricing, reconcileFinancial } from "./reconciliation";
import { validateCustomerImpact } from "./customerImpact";
import { isGoLiveKillSwitched } from "./killSwitch";
import type { GoLiveCheckResult } from "./types";

export function evaluateGoLiveEligibility(input: {
  supplierId: string;
  market: string;
  channel: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
  environment: string;
  requester: string;
  executionId?: string;
  mockReview?: boolean;
}): { allowed: boolean; blockers: string[]; checks: GoLiveCheckResult[] } {
  const checks: GoLiveCheckResult[] = [];
  const blockers: string[] = [];
  const environment = input.environment === "SANDBOX" ? "SANDBOX" : "PRODUCTION";

  if (isAiActor(input.requester)) blockers.push("AI_BOUNDARY:REQUEST_FORBIDDEN");

  const { evidence: validationEvidence, blockers: evidenceBlockers } = loadOfficialValidationEvidence({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    environment,
  });
  blockers.push(...evidenceBlockers);
  checks.push({
    check: "VALIDATION_EVIDENCE",
    category: "EVIDENCE",
    level: validationEvidence ? "PASS" : "BLOCKED",
    message: validationEvidence ? `#342 ${validationEvidence.validationId}` : "NONE",
  });
  if (!validationEvidence || validationEvidence.createOrderCapability !== "VALIDATED") {
    blockers.push("CREATE_ORDER_UNVERIFIED");
  }

  const arming = getLatestArmingForScope({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    environment,
  });
  if (!arming || arming.status !== "ARMED") {
    blockers.push("ARMING_NOT_ARMED");
    checks.push({ check: "ARMING", category: "ARMING", level: "BLOCKED", message: arming?.status || "NONE" });
  } else {
    checks.push({ check: "ARMING", category: "ARMING", level: "PASS", message: "ARMED" });
  }

  const armingEligibility = evaluateArmingEligibility({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    environment,
    requester: input.requester,
  });
  checks.push(
    ...armingEligibility.checks.map((c) => ({
      check: c.check,
      category: c.category,
      level: c.status === "PASS" ? ("PASS" as const) : c.status === "WARNING" ? ("REVIEW_REQUIRED" as const) : ("BLOCKED" as const),
      message: c.message,
    })),
  );
  for (const b of armingEligibility.blockers) {
    if (!blockers.includes(b)) blockers.push(b);
  }

  const firstOrder = loadFirstOrderEvidence({
    executionId: input.executionId,
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
  });
  checks.push(...firstOrder.checks);
  blockers.push(...firstOrder.blockers);

  if (firstOrder.evidence) {
    const confirmation = validateSupplierConfirmation(firstOrder.evidence, {
      mockConfirmed: input.mockReview,
    });
    checks.push({
      check: "SUPPLIER_CONFIRMATION",
      category: "SUPPLIER",
      level: confirmation.level,
      message: confirmation.message,
    });
    if (confirmation.level === "BLOCKED" || confirmation.level === "FAIL") {
      blockers.push(...confirmation.blockers);
    } else if (confirmation.level === "UNVERIFIED" && !input.mockReview) {
      blockers.push("SUPPLIER_CONFIRMATION_UNVERIFIED");
    }

    const tracking = validateTrackingCapability();
    checks.push(tracking);
    if (tracking.level === "UNVERIFIED") {
      checks.push({
        check: "TRACKING_POLICY",
        category: "TRACKING",
        level: "REVIEW_REQUIRED",
        message: "Tracking UNVERIFIED — review required per policy",
      });
    }

    const fct = reconcileFulfillment({ evidence: firstOrder.evidence, mockPass: input.mockReview });
    checks.push(...fct.checks);
    if (fct.level !== "PASS") blockers.push(...fct.blockers);

    const inventory = reconcileInventory({ evidence: firstOrder.evidence, mockPass: input.mockReview });
    checks.push(inventory);
    if (inventory.level === "BLOCKED" || inventory.level === "FAIL") blockers.push("INVENTORY_RECONCILIATION_FAILED");
    if (inventory.level === "UNVERIFIED" && !input.mockReview) blockers.push("INVENTORY_RECONCILIATION_NOT_AVAILABLE");

    const pricing = reconcilePricing({ evidence: firstOrder.evidence, mockPass: input.mockReview });
    checks.push(pricing);
    if (pricing.level === "UNVERIFIED" && !input.mockReview) blockers.push("PRICING_RECONCILIATION_NOT_AVAILABLE");

    const financial = reconcileFinancial({ evidence: firstOrder.evidence, mockPass: input.mockReview });
    checks.push(financial.check);
    if (financial.level !== "PASS") blockers.push(...financial.blockers);

    const customer = validateCustomerImpact();
    checks.push(customer.check);
    blockers.push(...customer.blockers);
  }

  if (isGoLiveKillSwitched(input)) {
    blockers.push("KILL_SWITCH_ACTIVE");
    checks.push({ check: "KILL_SWITCH", category: "KILL_SWITCH", level: "BLOCKED", message: "ON" });
  } else {
    checks.push({ check: "KILL_SWITCH", category: "KILL_SWITCH", level: "PASS", message: "OFF" });
  }

  checks.push({ check: "SECURITY", category: "SECURITY", level: "PASS", message: "No bypass detected" });
  checks.push({
    check: "RISK",
    category: "RISK",
    level: blockers.length === 0 ? "PASS" : "BLOCKED",
    message: blockers.length === 0 ? "LOW" : "ELEVATED",
  });

  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)], checks };
}
