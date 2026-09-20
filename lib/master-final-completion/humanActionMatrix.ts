import { buildMasterExternalHumanActions } from "@/lib/master-external-provider-readiness/humanActionsMaster";
import { buildMasterProviderMatrix } from "@/lib/master-external-provider-readiness/masterProviderMatrix";
import type { HumanActionMatrixRow } from "./types";

export function buildFinalHumanActionMatrix(): HumanActionMatrixRow[] {
  const matrix = buildMasterProviderMatrix();
  const actions = buildMasterExternalHumanActions(matrix);
  const rows: HumanActionMatrixRow[] = actions.map((a) => ({
    provider: a.provider,
    action: a.action,
    reason: a.why,
    blocking: a.blocking,
    requiredEvidence: a.requiredEvidence ?? "EXTERNAL_LIVE",
    verification: a.verificationMethod ?? "Operator attestation",
    status: a.blocking ? "HUMAN_REQUIRED" : "UNVERIFIED",
  }));

  rows.push({
    provider: "AI",
    action: "Configure AI provider SecretRef and run read-only validation",
    reason: "AI_PRODUCTION_ENABLED remains 0",
    blocking: true,
    requiredEvidence: "EXTERNAL_LIVE capability:health",
    verification: "status:master-external-readiness",
    status: "NOT_CONFIGURED",
  });

  rows.push({
    provider: "E2E",
    action: "Run controlled production E2E only after full gate chain",
    reason: "Default harness mode LOCAL",
    blocking: true,
    requiredEvidence: "Human approval + four-eyes + first-order gate",
    verification: "gate:supplier-order-rehearsal",
    status: "BLOCKED",
  });

  return rows;
}
