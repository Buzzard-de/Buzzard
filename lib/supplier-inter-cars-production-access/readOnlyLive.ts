import { evaluateStageAReadValidation } from "./stageA";
import type { ReadOnlyLiveStatus } from "./types";

/** Reports read-only live status from #339 SSOT + evidence store — never fabricates VALIDATED. */
export function resolveReadOnlyLiveStatus(credentialsStatus: string): ReadOnlyLiveStatus {
  return evaluateStageAReadValidation(credentialsStatus).status;
}
