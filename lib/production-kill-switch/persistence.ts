import type { GlobalProductionKillSwitchState } from "./types";

let inMemory: GlobalProductionKillSwitchState | null = null;

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_PRODUCTION_KILL_SWITCH_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/production-kill-switch/persistentStore.js") as {
      createProductionKillSwitchStore: () => KillSwitchStore;
    };
    return mod.createProductionKillSwitchStore();
  } catch {
    return null;
  }
}

interface KillSwitchStore {
  saveState(row: Record<string, unknown>): void;
  getState(): Record<string, unknown> | undefined;
}

export function saveGlobalKillSwitchState(state: GlobalProductionKillSwitchState): void {
  inMemory = state;
  getPersistentStore()?.saveState({
    global: state.global ? 1 : 0,
    domains_json: JSON.stringify(state.domains),
    updated_at: state.updatedAt,
    updated_by: state.updatedBy || null,
    correlation_id: state.correlationId || null,
    reason: state.reason || null,
  });
}

export function getGlobalKillSwitchState(): GlobalProductionKillSwitchState | null {
  if (inMemory) return inMemory;
  const row = getPersistentStore()?.getState();
  if (!row) return null;
  return {
    global: Boolean(row.global),
    domains: JSON.parse(String(row.domains_json || "{}")),
    updatedAt: String(row.updated_at),
    updatedBy: row.updated_by ? String(row.updated_by) : undefined,
    correlationId: row.correlation_id ? String(row.correlation_id) : undefined,
    reason: row.reason ? String(row.reason) : undefined,
  };
}

export function resetGlobalKillSwitchForTests(): void {
  inMemory = null;
}
