import { isActivationKillSwitched } from "@/lib/supplier-order-readiness/killSwitch";
import type { ReadinessChannel } from "@/lib/supplier-order-readiness/types";

export function isObservationKillSwitched(scope: {
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
}): boolean {
  return isActivationKillSwitched(scope);
}
