import type { HumanActionItem } from "@/lib/external-access-control-center/types";
import type { MasterProviderMatrixRow } from "./types";

export function buildMasterExternalHumanActions(matrix: MasterProviderMatrixRow[]): HumanActionItem[] {
  const actions: HumanActionItem[] = [];
  let priority = 20;
  for (const row of matrix) {
    if (!row.blocking) continue;
    actions.push({
      priority: priority++,
      provider: row.provider,
      action: row.nextHumanAction,
      why: `${row.category}: ${row.credentialState} / live=${row.liveValidation}`,
      requiredEvidence: "EXTERNAL_LIVE",
      verificationMethod: "Operator-run provider validation + evidence registration",
      blocking: true,
    });
  }
  return actions.sort((a, b) => a.priority - b.priority).slice(0, 25);
}
