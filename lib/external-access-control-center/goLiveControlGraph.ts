import { buildGoLiveDependencyGraph } from "@/lib/final-external-access/goLiveDependencyGraph";
import { validateRenderBlueprint } from "@/lib/production-storage-preflight/renderBlueprintValidation";
import type { GoLiveControlStep } from "./types";

function mapStepStatus(status: string): GoLiveControlStep["status"] {
  if (status === "COMPLETE") return "VALIDATED";
  if (status === "CONFIGURED") return "CONFIGURED";
  if (status === "BLOCKED") return "BLOCKED_EXTERNAL_ACCESS";
  if (status === "NOT_CONFIGURED") return "NOT_CONFIGURED";
  return "UNVERIFIED_EXTERNAL";
}

export function buildExtendedGoLiveGraph(): GoLiveControlStep[] {
  const blueprint = validateRenderBlueprint();
  const base = buildGoLiveDependencyGraph();

  const prefix: GoLiveControlStep[] = [
    {
      id: "software-complete",
      label: "SOFTWARE_COMPLETE",
      status: "VALIDATED",
    },
    {
      id: "configuration-complete",
      label: "CONFIGURATION_COMPLETE",
      status: blueprint.BLUEPRINT_CONFIGURATION === "PASS" ? "CONFIGURED" : "UNVERIFIED_EXTERNAL",
    },
    {
      id: "external-access-complete",
      label: "EXTERNAL_ACCESS_COMPLETE",
      status: "BLOCKED_EXTERNAL_ACCESS",
      blockingReason: "PROVIDER_CREDENTIALS_AND_HUMAN_ACTIONS_PENDING",
    },
    {
      id: "render-persistence-validated",
      label: "RENDER_PERSISTENCE_VALIDATED",
      status:
        blueprint.LIVE_RENDER_DISK === "PASS"
          ? "VALIDATED"
          : blueprint.BLUEPRINT_CONFIGURATION === "PASS"
            ? "HUMAN_REQUIRED"
            : "UNVERIFIED_EXTERNAL",
      blockingReason:
        blueprint.LIVE_RENDER_DISK === "PASS" ? undefined : "LIVE_PERSISTENT_DISK_UNVERIFIED",
      requiredHumanApproval: true,
    },
    {
      id: "supplier-live-validated",
      label: "SUPPLIER_LIVE_VALIDATED",
      status: "UNVERIFIED_EXTERNAL",
      blockingReason: "INTER_CARS_STAGE_A_NOT_COMPLETE",
    },
    {
      id: "payment-live-validated",
      label: "PAYMENT_LIVE_VALIDATED",
      status: "NOT_CONFIGURED",
    },
    {
      id: "carrier-live-validated",
      label: "CARRIER_LIVE_VALIDATED",
      status: "NOT_CONFIGURED",
    },
    {
      id: "returns-live-validated",
      label: "RETURNS_LIVE_VALIDATED",
      status: "NOT_CONFIGURED",
    },
    {
      id: "marketplace-live-validated",
      label: "MARKETPLACE_LIVE_VALIDATED",
      status: "NOT_CONFIGURED",
    },
    {
      id: "ai-provider-validated",
      label: "AI_PROVIDER_VALIDATED",
      status: "NOT_CONFIGURED",
    },
    {
      id: "marketing-validated",
      label: "MARKETING_VALIDATED",
      status: "NOT_CONFIGURED",
    },
  ];

  const mappedBase: GoLiveControlStep[] = base.map((s) => ({
    id: s.id,
    label: s.label,
    status: mapStepStatus(s.status),
    blockingReason: s.blockingReason,
    requiredHumanApproval: s.requiredHumanApproval,
  }));

  const salesStep = mappedBase.find((s) => s.id === "sales-enabled");
  if (salesStep) {
    salesStep.status = "BLOCKED_EXTERNAL_ACCESS";
    salesStep.blockingReason = "SALES_ENABLEMENT_BLOCKED_UNTIL_ALL_GATES";
  }

  return [...prefix, ...mappedBase];
}
