import type { GoLiveControlStep } from "@/lib/external-access-control-center/types";
import type { MasterProviderMatrixRow } from "./types";

function statusFromRow(rows: MasterProviderMatrixRow[], category: string): GoLiveControlStep["status"] {
  const subset = rows.filter((r) => r.category === category && !r.provider.includes("/"));
  if (subset.some((r) => r.liveValidation === "VALIDATED")) return "HUMAN_REQUIRED";
  if (subset.every((r) => r.credentialState === "NOT_CONFIGURED")) return "NOT_CONFIGURED";
  return "UNVERIFIED_EXTERNAL";
}

export function buildMasterGoLiveProviderSteps(matrix: MasterProviderMatrixRow[]): GoLiveControlStep[] {
  const step = (id: string, label: string, category: string): GoLiveControlStep => ({
    id,
    label,
    status: statusFromRow(matrix, category),
    blockingReason: `${category}_EXTERNAL_EVIDENCE_REQUIRED`,
    requiredHumanApproval: true,
  });
  return [
    step("payment-external", "PAYMENT", "PAYMENT"),
    step("carrier-external", "CARRIER", "CARRIER"),
    step("returns-external", "RETURNS", "RETURNS"),
    step("marketplace-external", "MARKETPLACE", "MARKETPLACE"),
    step("ai-external", "AI", "AI"),
    step("marketing-external", "MARKETING", "MARKETING"),
    {
      id: "35-market-readiness",
      label: "35_MARKET_READINESS",
      status: "PARTIAL",
      blockingReason: "PROVIDER_CREDENTIALS_PENDING_PER_MARKET",
      requiredHumanApproval: true,
    },
  ];
}
