import type { AuthorityLevel } from "@/lib/ai-orchestrator/types";
import type { StructuredWorkerOutput } from "./types";
import { FORBIDDEN_WORKER_ACTIONS } from "./constants";

const VALID_AUTHORITY: AuthorityLevel[] = [
  "OBSERVE",
  "ANALYZE",
  "RECOMMEND",
  "EXECUTE_LOW_RISK",
  "EXECUTE_WITH_APPROVAL",
  "NEVER_EXECUTE",
];

export function validateWorkerOutput(output: StructuredWorkerOutput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (output.recommendation === undefined || output.recommendation === null) {
    errors.push("MISSING_RECOMMENDATION");
  }

  if (typeof output.confidence !== "number" || output.confidence < 0 || output.confidence > 1) {
    errors.push("INVALID_CONFIDENCE");
  }

  if (!output.reasoningSummary || output.reasoningSummary.length > 2000) {
    errors.push("INVALID_REASONING_SUMMARY");
  }

  if (!VALID_AUTHORITY.includes(output.authorityRequired)) {
    errors.push("INVALID_AUTHORITY");
  }

  if (typeof output.requiredApproval !== "boolean") {
    errors.push("INVALID_REQUIRED_APPROVAL");
  }

  if (typeof output.deterministicValidationRequired !== "boolean") {
    errors.push("INVALID_DETERMINISTIC_FLAG");
  }

  if (output.action) {
    if (FORBIDDEN_WORKER_ACTIONS.has(output.action.actionType)) {
      errors.push(`FORBIDDEN_ACTION:${output.action.actionType}`);
    }
    if (output.action.category === "IRREVERSIBLE_ACTION" && !output.action.requiresApproval) {
      errors.push("IRREVERSIBLE_REQUIRES_APPROVAL");
    }
    if (output.action.financialImpact !== undefined && output.action.financialImpact < 0) {
      errors.push("INVALID_FINANCIAL_IMPACT");
    }
  }

  return { ok: errors.length === 0, errors };
}
