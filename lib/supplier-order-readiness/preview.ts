import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { evaluateCapabilityChecks } from "./checks";
import { getReadinessPolicy } from "./config";
import { resolveEffectiveApproval } from "./approval";
import { isActivationKillSwitched, getKillSwitch } from "./killSwitch";
import { evaluateSupplierOrderReadiness } from "./evaluator";
import { activateRealSupplierOrders } from "./activation";
import type { ActivationPreview, ReadinessScope } from "./types";

export function buildDryRunActivationPreview(scope: ReadinessScope, correlationId: string): ActivationPreview {
  const readiness = evaluateSupplierOrderReadiness(scope, { correlationId, force: true });
  const approval = resolveEffectiveApproval(scope);
  const { capabilities } = evaluateCapabilityChecks(scope);
  const policy = getReadinessPolicy();
  const kill = getKillSwitch();
  const activation = activateRealSupplierOrders({
    scope,
    requester: "dry-run-preview",
    correlationId,
  });

  return {
    supplierId: scope.supplierId,
    market: scope.market,
    channel: scope.channel,
    readiness,
    approval,
    killSwitch: {
      global: kill.global,
      supplier: isActivationKillSwitched(scope),
      market: Boolean(kill.markets[scope.market]),
      channel: Boolean(kill.channels[scope.channel]),
    },
    networkState: {
      supplierOrderNetwork: isSupplierOrderNetworkEnabled() ? "ENABLED" : "DISABLED",
      currentEnvironment: readiness.environment,
    },
    capabilities,
    risk: readiness.riskLevel,
    limits: {
      maxOrderValue: policy.maxOrderValue,
      maxDailyOrderValue: policy.maxDailyOrderValue,
      maxSingleSupplierOrderValue: policy.maxSingleSupplierOrderValue,
    },
    wouldActivate: false,
    blockReasons: [activation.reason],
  };
}
