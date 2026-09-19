import type { ExternalAccessEntry } from "@/lib/final-external-access/types";
import type { AccessStatus } from "@/lib/production-access/types";
import type { ControlCenterStatus } from "./types";

export function mapAccessStatus(status: AccessStatus | string): ControlCenterStatus {
  switch (status) {
    case "VALIDATED":
      return "VALIDATED";
    case "CONFIGURED":
    case "VALIDATING":
      return "CONFIGURED";
    case "NOT_CONFIGURED":
      return "NOT_CONFIGURED";
    case "BLOCKED":
      return "BLOCKED_EXTERNAL_ACCESS";
    case "FAILED":
      return "FAILED";
    case "UNVERIFIED":
      return "UNVERIFIED_EXTERNAL";
    default:
      return "UNVERIFIED_EXTERNAL";
  }
}

export function mapExternalEntryStatus(entry: ExternalAccessEntry): ControlCenterStatus {
  if (entry.status === "VALIDATED" || entry.status === "ENABLED") return "VALIDATED";
  if (entry.status === "READY") return "READY";
  if (entry.status === "BLOCKED") return "BLOCKED_EXTERNAL_ACCESS";
  if (entry.status === "CONFIGURED") return "CONFIGURED";
  if (entry.requiredHumanApproval && !entry.credentialConfigured) return "HUMAN_REQUIRED";
  if (!entry.credentialConfigured) return "NOT_CONFIGURED";
  return "UNVERIFIED_EXTERNAL";
}

/** CONFIGURED is never promoted to VALIDATED without production evidence */
export function liveValidationFromEntry(
  entry: ExternalAccessEntry,
  hasProductionEvidence: boolean,
): ControlCenterStatus {
  if (entry.capabilityValidated && hasProductionEvidence) return "VALIDATED";
  if (entry.status === "BLOCKED") return "BLOCKED_EXTERNAL_ACCESS";
  if (entry.credentialConfigured) return "UNVERIFIED_EXTERNAL";
  return "NOT_CONFIGURED";
}

export function productionEvidenceLabel(hasEvidence: boolean, entry: ExternalAccessEntry): "NONE" | "PARTIAL" | "VALIDATED" {
  if (entry.capabilityValidated && hasEvidence) return "VALIDATED";
  if (hasEvidence) return "PARTIAL";
  return "NONE";
}
