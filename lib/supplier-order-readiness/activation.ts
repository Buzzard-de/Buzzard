import { randomUUID } from "crypto";
import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { filterIncidents } from "@/lib/fulfillment-control-tower";
import { getReadinessPolicy } from "./config";
import { resolveEffectiveApproval } from "./approval";
import { isActivationKillSwitched } from "./killSwitch";
import { getReadinessByScope } from "./persistence";
import { recordReadinessAudit } from "./audit";
import type { ActivationAttemptResult, ReadinessScope } from "./types";

let realSupplierOrderHttpCallCount = 0;

export function getRealSupplierOrderHttpCallCount(): number {
  return realSupplierOrderHttpCallCount;
}

export function resetRealSupplierOrderHttpCallCountForTests(): void {
  realSupplierOrderHttpCallCount = 0;
}

/**
 * Implementation guard — #337 never sends real supplier orders.
 * Even when readiness + approval are satisfied, network disabled blocks activation.
 */
export function activateRealSupplierOrders(input: {
  scope: ReadinessScope;
  requester: string;
  correlationId?: string;
  orderValue?: number;
}): ActivationAttemptResult {
  const correlationId = input.correlationId || randomUUID();
  const readiness = getReadinessByScope(input.scope.supplierId, input.scope.market, input.scope.channel);
  const approval = resolveEffectiveApproval(input.scope);
  const policy = getReadinessPolicy();

  const hardStop = (code: string, reason: string): ActivationAttemptResult => {
    recordReadinessAudit({
      type: "ACTIVATION_ATTEMPT_BLOCKED",
      supplierId: input.scope.supplierId,
      market: input.scope.market,
      channel: input.scope.channel,
      actor: input.requester,
      correlationId,
      detail: { code, reason },
    });
    return {
      allowed: false,
      blocked: true,
      reason,
      code,
      networkStatus: isSupplierOrderNetworkEnabled() ? "ENABLED" : "DISABLED",
      readinessStatus: readiness?.overallStatus,
      approvalStatus: approval?.status || readiness?.approvalStatus,
      correlationId,
    };
  };

  if (isSupplierOrderNetworkEnabled()) {
    realSupplierOrderHttpCallCount++;
    return hardStop("NETWORK_SHOULD_BE_DISABLED_IN_337", "Real supplier order network must remain disabled in #337");
  }

  if (isActivationKillSwitched(input.scope)) {
    return hardStop("KILL_SWITCH_ACTIVE", "Supplier order activation blocked by kill switch");
  }

  if (!readiness) {
    return hardStop("READINESS_MISSING", "Supplier order readiness evaluation required");
  }

  if (readiness.overallStatus === "BLOCKED" || readiness.overallStatus === "EXPIRED") {
    return hardStop("READINESS_NOT_READY", `Readiness status ${readiness.overallStatus}`);
  }

  if (!approval) {
    return hardStop("APPROVAL_REQUIRED", "Explicit scoped approval required for activation");
  }

  const criticalIncidents = filterIncidents({
    supplierId: input.scope.supplierId,
    status: "OPEN",
    severity: "CRITICAL",
  });
  if (criticalIncidents.length > 0) {
    return hardStop("CRITICAL_INCIDENTS", "Critical incidents must be resolved before activation");
  }

  if (input.orderValue != null && input.orderValue > policy.maxSingleSupplierOrderValue) {
    return hardStop("ORDER_VALUE_LIMIT", "Order value exceeds configured supplier order limit");
  }

  return hardStop("NETWORK_DISABLED", "Supplier order network is DISABLED — activation blocked by design");
}
