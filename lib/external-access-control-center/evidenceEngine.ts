import {
  isAcceptedEvidenceEnvironment,
  isRejectedEvidenceEnvironment,
} from "@/lib/production-access/evidencePolicy";
import { listProviderAccessEvidence } from "@/lib/production-access/evidenceStore";
import type { ProviderAccessEvidence } from "@/lib/production-access/types";
import { listExternalProviderEvidence } from "@/lib/master-external-provider-readiness/externalProviderEvidenceStore";
import { listInterCarsCredentialEvidence } from "@/lib/inter-cars-production-access-evidence-bridge/evidenceStore";
import { listRenderPersistenceEvidence } from "@/lib/render-persistence-evidence-bridge/evidenceStore";
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

function renderPersistenceToView(e: ReturnType<typeof listRenderPersistenceEvidence>[number]): EvidenceRecordView {
  const accepted = e.source === "RENDER_LIVE" && (e.environment === "PRODUCTION" || e.environment === "CONTROLLED_VALIDATION");
  return {
    id: e.id,
    providerId: "render",
    type: e.kind === "RENDER_PERSISTENCE_HEALTH" ? "LIVE_HEALTH" : "CONFIGURATION",
    environment: e.environment,
    timestamp: e.timestamp,
    source: "render-persistence-evidence-bridge",
    status: accepted ? "ACCEPTED" : "REJECTED_FOR_PRODUCTION",
    reference: e.evidenceReference,
    payloadHash: e.payloadHash,
    operator: e.operator,
    isProductionEvidence: accepted,
  };
}

export function collectEvidenceRecords(providerIds: string[] = KNOWN_PROVIDERS): EvidenceRecordView[] {
  const out: EvidenceRecordView[] = [];
  const seen = new Set<string>();
  for (const e of listRenderPersistenceEvidence(false)) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(renderPersistenceToView(e));
  }
  for (const e of listExternalProviderEvidence(false)) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push({
      id: e.id,
      providerId: e.providerId,
      type: "LIVE_API",
      environment: e.environment,
      timestamp: e.timestamp,
      source: "master-external-provider-readiness",
      status: e.source === "EXTERNAL_LIVE" ? "ACCEPTED" : "REJECTED_FOR_PRODUCTION",
      reference: e.evidenceReference,
      payloadHash: e.payloadHash,
      operator: e.operator,
      isProductionEvidence: e.source === "EXTERNAL_LIVE",
    });
  }
  for (const e of listInterCarsCredentialEvidence(false)) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push({
      id: e.id,
      providerId: "inter-cars",
      type: "LIVE_API",
      environment: e.environment,
      timestamp: e.timestamp,
      source: "inter-cars-production-access-evidence-bridge",
      status: e.source === "INTER_CARS_LIVE" ? "ACCEPTED" : "REJECTED_FOR_PRODUCTION",
      reference: e.evidenceReference,
      payloadHash: e.payloadHash,
      operator: e.operator,
      isProductionEvidence: e.source === "INTER_CARS_LIVE",
    });
  }
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
