import { buildInterCarsAccessStatusReport } from "@/lib/supplier-inter-cars-production-access/statusReport";
import { resolveInterCarsSecretRef } from "@/lib/production-access/secretRefs";
import { getAllProviderStates } from "@/lib/production-access/providerRegistry";
import type { GoLiveDependencyStep } from "./types";

function stepStatus(
  complete: boolean,
  blocked: boolean,
  configured: boolean,
): GoLiveDependencyStep["status"] {
  if (complete) return "COMPLETE";
  if (blocked) return "BLOCKED";
  if (configured) return "CONFIGURED";
  return "NOT_CONFIGURED";
}

export function buildGoLiveDependencyGraph(): GoLiveDependencyStep[] {
  const interCars = buildInterCarsAccessStatusReport();
  const secret = resolveInterCarsSecretRef();
  const providers = getAllProviderStates();
  const paymentOk = providers.find((p) => p.providerId === "payment")?.liveValidation === "VALIDATED";
  const carrierOk = providers.find((p) => p.providerId === "carrier")?.liveValidation === "VALIDATED";
  const returnsOk = providers.find((p) => p.providerId === "returns")?.liveValidation === "VALIDATED";

  const credentialsConfigured = secret.secretRefConfigured;
  const stageAComplete = interCars.stageA === "VALIDATED";
  const stage342Complete = interCars.stage342 === "VALIDATED";

  return [
    {
      id: "external-credentials",
      label: "EXTERNAL CREDENTIALS",
      status: stepStatus(false, !credentialsConfigured, credentialsConfigured),
      blockingReason: credentialsConfigured ? undefined : "BLOCKED — MISSING PRODUCTION CREDENTIALS / ACCESS",
    },
    {
      id: "preflight",
      label: "PREFLIGHT",
      status: credentialsConfigured ? "CONFIGURED" : "BLOCKED",
      blockingReason: credentialsConfigured ? undefined : "AWAITING_CREDENTIALS",
    },
    {
      id: "read-only-live-validation",
      label: "READ-ONLY LIVE VALIDATION",
      status: stepStatus(stageAComplete, !credentialsConfigured, credentialsConfigured),
      blockingReason: stageAComplete ? undefined : "STAGE_A_NOT_VALIDATED",
    },
    {
      id: "342-human-approval",
      label: "#342 HUMAN APPROVAL",
      status: stepStatus(stage342Complete, !stageAComplete, stageAComplete),
      requiredHumanApproval: true,
      blockingReason: stage342Complete ? undefined : "FOUR_EYES_APPROVAL_REQUIRED",
    },
    {
      id: "controlled-create-order",
      label: "CONTROLLED CREATE ORDER",
      status: stepStatus(stage342Complete, interCars.stage342 === "UNVERIFIED", stageAComplete),
      requiredHumanApproval: true,
      blockingReason: interCars.stage342 === "UNVERIFIED" ? "CREATE_ORDER_UNVERIFIED" : undefined,
    },
    {
      id: "343-production-order-arming",
      label: "#343 PRODUCTION ORDER ARMING",
      status: stepStatus(false, !stage342Complete, stage342Complete),
      requiredHumanApproval: true,
      blockingReason: "ARMING_NOT_COMPLETE",
    },
    {
      id: "344-first-order-execution",
      label: "#344 FIRST ORDER EXECUTION",
      status: "BLOCKED",
      requiredHumanApproval: true,
      blockingReason: "FIRST_ORDER_NOT_EXECUTED",
    },
    {
      id: "345-post-first-order-validation",
      label: "#345 POST-FIRST-ORDER VALIDATION",
      status: "BLOCKED",
      requiredHumanApproval: true,
      blockingReason: "CONTROLLED_GO_LIVE_NOT_COMPLETE",
    },
    {
      id: "346-observation",
      label: "#346 OBSERVATION / BROADER ROLLOUT",
      status: "BLOCKED",
      requiredHumanApproval: true,
      blockingReason: "OBSERVATION_NOT_COMPLETE",
    },
    {
      id: "provider-validation",
      label: "PROVIDER VALIDATION",
      status: stepStatus(paymentOk && carrierOk && returnsOk, false, credentialsConfigured),
      blockingReason: paymentOk && carrierOk && returnsOk ? undefined : "PROVIDER_LIVE_VALIDATION_INCOMPLETE",
    },
    {
      id: "final-go-live-gate",
      label: "FINAL GO-LIVE GATE",
      status: "BLOCKED",
      blockingReason: "CREDENTIALS_AND_APPROVAL",
    },
    {
      id: "sales-enabled",
      label: "SALES_ENABLED=1",
      status: "BLOCKED",
      requiredHumanApproval: true,
      blockingReason: "EXPLICIT_GO_LIVE_APPROVAL_REQUIRED",
    },
  ];
}

export function getCurrentBlockingStep(graph: GoLiveDependencyStep[]): GoLiveDependencyStep | undefined {
  return graph.find((s) => s.status === "BLOCKED" || s.status === "NOT_CONFIGURED");
}
