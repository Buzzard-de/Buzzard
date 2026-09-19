import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";
import { executeMasterExternalPhasesInOrder } from "./phaseExecution";
import type { MasterProviderMatrixRow } from "./types";

export function buildMasterProviderMatrix(): MasterProviderMatrixRow[] {
  return executeMasterExternalPhasesInOrder().masterMatrix;
}

export function rowScore(rows: MasterProviderMatrixRow[], provider: string): ControlCenterStatus {
  const match = rows.filter((r) => r.provider === provider || (provider.length <= 12 && r.category === provider && r.provider === provider));
  const categoryMatch = rows.filter((r) => r.category === provider);
  const use = match.length ? match : categoryMatch;
  if (use.length === 0) return "NOT_CONFIGURED";
  const primary = use.find((r) => r.provider === provider) ?? use[0];
  if (primary.liveValidation === "VALIDATED") return "VALIDATED";
  if (primary.credentialState === "REFERENCE_PRESENT") return "HUMAN_REQUIRED";
  if (primary.credentialState === "NOT_CONFIGURED") return "NOT_CONFIGURED";
  if (primary.credentialState === "CONFIGURED") return "UNVERIFIED_EXTERNAL";
  return "BLOCKED_EXTERNAL_ACCESS";
}
