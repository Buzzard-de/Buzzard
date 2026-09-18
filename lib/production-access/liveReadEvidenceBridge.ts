import { getLatestValidationForScope } from "@/lib/supplier-production-validation/persistence";
import { recordProviderAccessEvidence, hasProductionEvidence } from "./evidenceStore";

const CAPABILITY_MAP = [
  { field: "healthStatus" as const, capability: "health", endpoint: "/health" },
  { field: "catalogReadStatus" as const, capability: "catalog", endpoint: "/catalog" },
  { field: "stockReadStatus" as const, capability: "stock", endpoint: "/stock" },
  { field: "priceReadStatus" as const, capability: "price", endpoint: "/price" },
];

/**
 * Bridge #339 live-read validation into metadata-only production evidence.
 * Only records when validation shows LIVE_READ_VALIDATED — never fabricates.
 */
export function syncLiveReadEvidenceFromValidation(input: {
  supplierId: string;
  market?: string;
  channel?: string;
}): { synced: string[]; skipped: string[] } {
  const validation = getLatestValidationForScope({
    supplierId: input.supplierId,
    market: input.market ?? "DE",
    channel: input.channel ?? "DIRECT",
    environment: "PRODUCTION",
  });

  const synced: string[] = [];
  const skipped: string[] = [];

  if (!validation) return { synced, skipped: CAPABILITY_MAP.map((c) => c.capability) };

  for (const { field, capability, endpoint } of CAPABILITY_MAP) {
    if (hasProductionEvidence("inter-cars", capability)) {
      skipped.push(capability);
      continue;
    }
    if (validation[field] !== "LIVE_READ_VALIDATED") {
      skipped.push(capability);
      continue;
    }
    recordProviderAccessEvidence({
      provider: "inter-cars",
      capability,
      endpoint,
      correlationId: validation.validationId,
      requestPayload: { validationId: validation.validationId, capability },
      responseStatus: 200,
      environment: "PRODUCTION",
    });
    synced.push(capability);
  }

  return { synced, skipped };
}
