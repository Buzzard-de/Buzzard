import { isActivationKillSwitched } from "@/lib/supplier-order-readiness/killSwitch";

export function isFirstOrderKillSwitched(scope: {
  supplierId: string;
  market: string;
  channel: string;
}): boolean {
  return isActivationKillSwitched({
    supplierId: scope.supplierId,
    market: scope.market,
    channel: scope.channel as import("@/lib/supplier-order-readiness/types").ReadinessChannel,
  });
}
