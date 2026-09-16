import { getKillSwitch, isActivationKillSwitched } from "@/lib/supplier-order-readiness/killSwitch";
import type { SupplierOrderActivationRequest } from "./types";

export function evaluateKillSwitch(activation: SupplierOrderActivationRequest): {
  blocked: boolean;
  state: Record<string, unknown>;
  blockers: string[];
} {
  const ks = getKillSwitch();
  const state = {
    global: ks.global,
    supplier: Boolean(ks.suppliers[activation.supplierId]),
    market: Boolean(ks.markets[activation.market]),
    channel: Boolean(ks.channels[activation.channel]),
  };
  const blockers: string[] = [];
  if (isActivationKillSwitched({
    supplierId: activation.supplierId,
    market: activation.market,
    channel: activation.channel,
  })) {
    blockers.push("KILL_SWITCH_ACTIVE");
  }
  return {
    blocked: blockers.length > 0,
    state,
    blockers,
  };
}
