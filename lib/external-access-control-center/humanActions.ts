import { buildExternalAccessPreflightReport } from "@/lib/final-external-access/preflightReport";
import { buildMasterExternalHumanActions } from "@/lib/master-external-provider-readiness/humanActionsMaster";
import { buildMasterProviderMatrix } from "@/lib/master-external-provider-readiness/masterProviderMatrix";
import { buildInterCarsHumanActions } from "@/lib/inter-cars-production-access-evidence-bridge/humanActions";
import { buildRenderPersistenceHumanActions } from "@/lib/render-persistence-evidence-bridge/humanActions";
import type { HumanActionItem, ProviderRegistryEntry } from "./types";

export function buildNextHumanActions(registry: ProviderRegistryEntry[]): HumanActionItem[] {
  const actions: HumanActionItem[] = [
    ...buildRenderPersistenceHumanActions(),
    ...buildInterCarsHumanActions(),
    ...buildMasterExternalHumanActions(buildMasterProviderMatrix()),
  ];
  const preflight = buildExternalAccessPreflightReport();

  for (const step of preflight.nextRequiredActions.slice(0, 5)) {
    actions.push({
      priority: 10 + actions.length,
      provider: "Platform",
      action: step,
      why: "From external access preflight SSOT",
      requiredEvidence: "HUMAN_APPROVAL",
      verificationMethod: "Operator confirmation",
      blocking: true,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}
