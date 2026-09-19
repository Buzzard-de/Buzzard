import type { ExternalBlocker } from "./types";
import type { MasterProviderMatrixRow } from "./types";

export function buildExternalBlockers(matrix: MasterProviderMatrixRow[]): ExternalBlocker[] {
  const blockers: ExternalBlocker[] = [];
  for (const row of matrix) {
    if (!row.blocking) continue;
    const id = `${row.category}_${row.provider}_BLOCKED`.replace(/\s+/g, "_").toUpperCase();
    blockers.push({
      id,
      provider: row.provider,
      category: row.category,
      status: row.liveValidation,
      reason: row.credentialState === "NOT_CONFIGURED" ? "CREDENTIAL_MISSING" : "LIVE_VALIDATION_MISSING",
      requiredHumanAction: row.nextHumanAction,
      requiredEvidence: row.liveValidation === "VALIDATED" ? "HUMAN_APPROVAL" : "EXTERNAL_LIVE",
      blocking: true,
    });
  }
  const seen = new Set<string>();
  return blockers.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });
}
