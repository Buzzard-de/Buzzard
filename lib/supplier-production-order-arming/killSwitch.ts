import { isActivationKillSwitched } from "@/lib/supplier-order-readiness/killSwitch";

export function isArmingKillSwitched(input: {
  supplierId: string;
  market: string;
  channel: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
}): boolean {
  return isActivationKillSwitched(input);
}
