import { buildExternalAccessPreflightReport } from "@/lib/final-external-access/preflightReport";
import { buildGoLiveDependencyGraph, getCurrentBlockingStep } from "@/lib/final-external-access/goLiveDependencyGraph";
import { buildReadinessMatrix } from "./readinessMatrix";
import type { ClassifiedBlocker, BlockerCategory } from "./types";

function classify(code: string, message: string): ClassifiedBlocker {
  const upper = `${code} ${message}`.toUpperCase();
  let category: BlockerCategory = "CONFIGURATION";

  if (upper.includes("MISSING PRODUCTION CREDENTIAL") || upper.includes("SECRET_REF") || upper.includes("PROVIDER_NOT_CONFIGURED")) {
    category = "EXTERNAL_CREDENTIAL";
  } else if (upper.includes("MANUAL DEPLOYMENT") || upper.includes("/VAR/DATA") || upper.includes("RENDER")) {
    category = "MANUAL_DEPLOYMENT";
  } else if (upper.includes("HUMAN APPROVAL") || upper.includes("FOUR_EYES") || upper.includes("#342") || upper.includes("#343") || upper.includes("#344")) {
    category = "HUMAN_APPROVAL";
  } else if (upper.includes("LIVE VALIDATION") || upper.includes("STAGE_A") || upper.includes("UNVERIFIED")) {
    category = "LIVE_VALIDATION";
  } else if (upper.includes("EXTERNAL ACCESS") || upper.includes("NO_LABEL") || upper.includes("NETWORK")) {
    category = "EXTERNAL_ACCESS";
  } else if (upper.includes("LEGAL") || upper.includes("COMPLIANCE")) {
    category = "LEGAL_BUSINESS";
  } else if (upper.includes("SOFTWARE") || upper.includes("MISSING ENGINE") || upper.includes("DUPLICATE")) {
    category = "SOFTWARE";
  }

  return { code, category, message };
}

export function buildClassifiedBlockers(): ClassifiedBlocker[] {
  const preflight = buildExternalAccessPreflightReport();
  const matrix = buildReadinessMatrix();
  const graph = buildGoLiveDependencyGraph();
  const current = getCurrentBlockingStep(graph);

  const blockers: ClassifiedBlocker[] = [];

  for (const b of preflight.blockers) {
    blockers.push(classify(b.split(":")[0] ?? "EXTERNAL", b));
  }

  for (const entry of matrix) {
    if (entry.status === "BLOCKED") {
      blockers.push(classify(entry.area, `${entry.area}: ${entry.notes}`));
    }
  }

  if (current?.blockingReason) {
    blockers.push(classify(current.id, current.blockingReason));
  }

  if (preflight.productionFlags.SALES_ENABLED === "1") {
    blockers.push(classify("SALES_ENABLED", "SALES_ENABLED unexpectedly ON — AUDIT FAILURE"));
  }

  const seen = new Set<string>();
  return blockers.filter((b) => {
    const key = `${b.category}:${b.code}:${b.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildWarnings(): string[] {
  const preflight = buildExternalAccessPreflightReport();
  const matrix = buildReadinessMatrix();
  const warnings = [...preflight.warnings];

  for (const entry of matrix) {
    if (entry.status === "WARNING") {
      warnings.push(`${entry.area}: ${entry.notes}`);
    }
  }

  return [...new Set(warnings)];
}
