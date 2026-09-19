import { buildExternalAccessPreflightReport } from "@/lib/final-external-access/preflightReport";
import { buildRenderPersistenceHumanActions } from "@/lib/render-persistence-evidence-bridge/humanActions";
import type { HumanActionItem, ProviderRegistryEntry } from "./types";

export function buildNextHumanActions(registry: ProviderRegistryEntry[]): HumanActionItem[] {
  const actions: HumanActionItem[] = [...buildRenderPersistenceHumanActions()];
  const preflight = buildExternalAccessPreflightReport();

  const interCars = registry.find((r) => r.name === "INTER CARS");
  if (interCars && interCars.credentialState !== "VALIDATED") {
    actions.push({
      priority: 2,
      provider: "Inter Cars",
      action: "Configure SUPPLIER_LIVE_CREDENTIALS_SECRET_REF and complete B2B/OAuth2 production access",
      why: "Supplier production network blocked without credentials",
      requiredEvidence: "LIVE_API",
      verificationMethod: "Stage A read-only validation + #342 human approval",
      blocking: true,
    });
  }

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
