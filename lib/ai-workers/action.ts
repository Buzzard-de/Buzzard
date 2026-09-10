import type { ActionCategory, ProposedAction, StructuredWorkerOutput } from "./types";
import type { AuthorityLevel } from "@/lib/ai-orchestrator/types";

export function buildProposedAction(input: {
  actionType: string;
  entityType: string;
  entityId: string;
  parameters?: Record<string, unknown>;
  authorityRequired?: AuthorityLevel;
  riskLevel?: ProposedAction["riskLevel"];
  financialImpact?: number;
  reversible?: boolean;
  requiresApproval?: boolean;
  category?: ActionCategory;
}): ProposedAction {
  const category = input.category ?? categorizeAction(input.actionType, input.reversible ?? true);
  return {
    actionType: input.actionType,
    entityType: input.entityType,
    entityId: input.entityId,
    parameters: input.parameters,
    authorityRequired: input.authorityRequired ?? "RECOMMEND",
    riskLevel: input.riskLevel ?? "LOW",
    financialImpact: input.financialImpact,
    reversible: input.reversible ?? true,
      requiresApproval: input.requiresApproval ?? (category === "HIGH_RISK_ACTION" || category === "IRREVERSIBLE_ACTION"),
    category,
  };
}

export function categorizeAction(actionType: string, reversible: boolean): ActionCategory {
  if (actionType.startsWith("OBSERVE_") || actionType === "ANALYZE") return "OBSERVATION";
  if (!reversible) return "IRREVERSIBLE_ACTION";
  if (["RECOMMEND_PRICE", "RECOMMEND_SUPPLIER", "RECOMMEND_LISTING"].includes(actionType)) {
    return "RECOMMENDATION";
  }
  if (["APPLY_PRICE", "ASSIGN_SUPPLIER"].includes(actionType)) {
    return "HIGH_RISK_ACTION";
  }
  return "RECOMMENDATION";
}

export function isActionSafe(output: StructuredWorkerOutput): boolean {
  if (!output.action) return true;
  if (output.action.category === "IRREVERSIBLE_ACTION" && !output.requiredApproval) {
    return false;
  }
  return true;
}
