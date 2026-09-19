import {
  isAcceptedEvidenceEnvironment,
  isRejectedEvidenceEnvironment,
} from "@/lib/production-access/evidencePolicy";
import { listProviderAccessEvidence } from "@/lib/production-access/evidenceStore";
import type { ProviderAccessEvidence } from "@/lib/production-access/types";
import type { EvidenceRecordView, EvidenceType } from "./types";

const KNOWN_PROVIDERS = [
  "inter-cars",
  "payment",
  "carrier",
  "ai",
  "returns",
  "marketing",
  "marketplace",
  "render",
  "deployment",
];

function mapEvidenceType(env: string): EvidenceType {
  if (env === "PRODUCTION") return "LIVE_API";
  if (env === "CONTROLLED_VALIDATION") return "LIVE_API";
  if (env === "SANDBOX") return "SANDBOX";
  if (env === "MOCK") return "LOCAL_TEST";
  return "CONFIGURATION";
}

function toView(e: ProviderAccessEvidence): EvidenceRecordView {
  const rejected = isRejectedEvidenceEnvironment(e.environment);
  const accepted = isAcceptedEvidenceEnvironment(e.environment);
  return {
    id: e.evidenceId,
    providerId: e.provider,
    type: mapEvidenceType(e.environment),
    environment: e.environment,
    timestamp: e.timestamp,
    source: "production-access/evidenceStore",
    status: rejected ? "REJECTED_FOR_PRODUCTION" : accepted ? "ACCEPTED" : "UNVERIFIED",
    reference: e.correlationId,
    payloadHash: e.requestHash,
    operator: e.operator,
    isProductionEvidence: accepted && !rejected,
  };
}

export function collectEvidenceRecords(providerIds: string[] = KNOWN_PROVIDERS): EvidenceRecordView[] {
  const out: EvidenceRecordView[] = [];
  const seen = new Set<string>();
  for (const provider of providerIds) {
    for (const e of listProviderAccessEvidence(provider)) {
      if (seen.has(e.evidenceId)) continue;
      seen.add(e.evidenceId);
      out.push(toView(e));
    }
  }
  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function countFakeProductionEvidence(records: EvidenceRecordView[]): number {
  return records.filter((r) => !r.isProductionEvidence && r.status === "REJECTED_FOR_PRODUCTION").length;
}
