import { isSupplierSelectable } from "@/lib/supplier-engine/registry";
import { recordReadinessAudit } from "./audit";
import { saveKillSwitchState, getKillSwitchState } from "./persistence";
import type { ReadinessChannel } from "./types";

export interface KillSwitchState {
  global: boolean;
  suppliers: Record<string, boolean>;
  markets: Record<string, boolean>;
  channels: Record<string, boolean>;
  updatedAt: string;
  updatedBy?: string;
}

function defaultState(): KillSwitchState {
  return {
    global: process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH === "1",
    suppliers: {},
    markets: {},
    channels: {},
    updatedAt: new Date().toISOString(),
  };
}

export function getKillSwitch(): KillSwitchState {
  return getKillSwitchState() || defaultState();
}

export function isGlobalKillSwitchActive(): boolean {
  return getKillSwitch().global || process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH === "1";
}

export function isSupplierKillSwitchActive(supplierId: string): boolean {
  const state = getKillSwitch();
  if (!isSupplierSelectable(supplierId)) return true;
  return Boolean(state.suppliers[supplierId]);
}

export function isMarketKillSwitchActive(market: string): boolean {
  return Boolean(getKillSwitch().markets[market]);
}

export function isChannelKillSwitchActive(channel: ReadinessChannel): boolean {
  return Boolean(getKillSwitch().channels[channel]);
}

export function isActivationKillSwitched(input: {
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
}): boolean {
  if (isGlobalKillSwitchActive()) return true;
  if (isSupplierKillSwitchActive(input.supplierId)) return true;
  if (isMarketKillSwitchActive(input.market)) return true;
  if (isChannelKillSwitchActive(input.channel)) return true;
  return false;
}

export function setGlobalKillSwitch(enabled: boolean, actor: string, correlationId: string): KillSwitchState {
  const next = { ...getKillSwitch(), global: enabled, updatedAt: new Date().toISOString(), updatedBy: actor };
  saveKillSwitchState(next);
  recordReadinessAudit({
    type: "KILL_SWITCH_CHANGED",
    actor,
    correlationId,
    detail: { global: enabled },
  });
  return next;
}

export function resetKillSwitchForTests(): void {
  saveKillSwitchState(defaultState());
}
