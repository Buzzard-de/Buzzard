import { resolveInterCarsSecretRef } from "@/lib/production-access/secretRefs";
import { buildInterCarsAccessStatusReport } from "@/lib/supplier-inter-cars-production-access/statusReport";
import { buildGoLiveDependencyGraph } from "@/lib/final-external-access/goLiveDependencyGraph";
import { buildClassifiedBlockers } from "./blockerClassification";
import type { NextActionItem } from "./types";

export function buildNextActions(): NextActionItem[] {
  const secret = resolveInterCarsSecretRef();
  const interCars = buildInterCarsAccessStatusReport();
  const graph = buildGoLiveDependencyGraph();
  const blockers = buildClassifiedBlockers();
  const softwareBlockers = blockers.filter((b) => b.category === "SOFTWARE");

  const step = (n: number, label: string, status: NextActionItem["status"]): NextActionItem => ({
    step: n,
    label,
    status,
  });

  return [
    step(
      1,
      "Resolve internal software blockers",
      softwareBlockers.length === 0 ? "COMPLETE" : "PENDING",
    ),
    step(
      2,
      "Manual configuration (Render /var/data, env vars, secret refs)",
      process.env.PERSISTENT_DATA_PATH === "/var/data" && secret.secretRefConfigured ? "COMPLETE" : "BLOCKED",
    ),
    step(
      3,
      "External credentials (Inter Cars, Payment, Carrier)",
      secret.secretRefConfigured ? "COMPLETE" : "BLOCKED",
    ),
    step(
      4,
      "Read-only validation (Inter Cars Stage A, payment/carrier dry-run)",
      interCars.stageA === "VALIDATED" ? "COMPLETE" : secret.secretRefConfigured ? "PENDING" : "BLOCKED",
    ),
    step(
      5,
      "Human approval (#342 four-eyes chain)",
      interCars.stage342 === "VALIDATED" ? "COMPLETE" : interCars.stageA === "VALIDATED" ? "PENDING" : "BLOCKED",
    ),
    step(
      6,
      "Controlled first production order (#344)",
      graph.find((s) => s.id === "344-first-order-execution")?.status === "COMPLETE" ? "COMPLETE" : "BLOCKED",
    ),
    step(
      7,
      "Post-order validation (#345)",
      graph.find((s) => s.id === "345-post-first-order-validation")?.status === "COMPLETE" ? "COMPLETE" : "BLOCKED",
    ),
    step(
      8,
      "Observation period (#346)",
      graph.find((s) => s.id === "346-observation-period")?.status === "COMPLETE" ? "COMPLETE" : "BLOCKED",
    ),
    step(
      9,
      "Final go-live gate",
      graph.find((s) => s.id === "final-go-live")?.status === "COMPLETE" ? "COMPLETE" : "BLOCKED",
    ),
    step(
      10,
      "SALES_ENABLED activation",
      process.env.SALES_ENABLED === "1" ? "COMPLETE" : "BLOCKED",
    ),
  ];
}
