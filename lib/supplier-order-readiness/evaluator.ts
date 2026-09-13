import { randomUUID } from "crypto";
import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { EVALUATOR_VERSION, READINESS_TTL_MS } from "./config";
import { evaluateAllReadinessChecks } from "./checks";
import { computeRiskClassification } from "./risk";
import { getApprovalStatusForScope } from "./approval";
import { recordReadinessAudit } from "./audit";
import { saveReadinessRecord, getReadinessByScope } from "./persistence";
import type {
  ReadinessDomainStatus,
  ReadinessOverallStatus,
  ReadinessScope,
  SupplierOrderReadiness,
  ReadinessEvaluationRun,
  ReadinessCheckResult,
} from "./types";

function domainStatus(checks: ReadinessCheckResult[], categories: string[]): ReadinessDomainStatus {
  const relevant = checks.filter((c) => categories.includes(c.category));
  if (relevant.some((c) => c.blocking)) return "BLOCKED";
  if (relevant.some((c) => c.level === "WARNING")) return "WARNING";
  if (relevant.length === 0) return "UNKNOWN";
  if (relevant.every((c) => c.level === "PASS")) return "PASS";
  return "UNKNOWN";
}

function deriveOverallStatus(checks: ReadinessCheckResult[], expiresAt: string): ReadinessOverallStatus {
  if (Date.parse(expiresAt) <= Date.now()) return "EXPIRED";
  const blockers = checks.filter((c) => c.blocking);
  if (blockers.length > 0) return "BLOCKED";
  const warnings = checks.filter((c) => c.level === "WARNING");
  if (warnings.length > 0) return "CONDITIONALLY_READY";
  return "READY";
}

export function buildReadinessId(scope: ReadinessScope): string {
  return `sor_${scope.supplierId}_${scope.market}_${scope.channel}`.replace(/[^a-zA-Z0-9:_-]/g, "_");
}

export function evaluateSupplierOrderReadiness(
  scope: ReadinessScope,
  options: { correlationId?: string; force?: boolean } = {}
): SupplierOrderReadiness {
  const correlationId = options.correlationId || randomUUID();
  const existing = getReadinessByScope(scope.supplierId, scope.market, scope.channel);
  if (existing && !options.force && Date.parse(existing.expiresAt) > Date.now() && existing.evaluatorVersion === EVALUATOR_VERSION) {
    return existing;
  }

  const checks = evaluateAllReadinessChecks(scope);
  const generatedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + READINESS_TTL_MS).toISOString();
  const overallStatus = deriveOverallStatus(checks, expiresAt);
  const blockers = checks.filter((c) => c.blocking).map((c) => c.code);
  const warnings = checks.filter((c) => c.level === "WARNING").map((c) => c.code);
  const riskLevel = computeRiskClassification(scope, checks);

  const record: SupplierOrderReadiness = {
    readinessId: buildReadinessId(scope),
    supplierId: scope.supplierId,
    market: scope.market,
    channel: scope.channel,
    environment: scope.environment || (process.env.NODE_ENV === "production" ? "PRODUCTION" : "SANDBOX"),
    generatedAt,
    expiresAt,
    overallStatus,
    approvalStatus: getApprovalStatusForScope(scope),
    networkStatus: isSupplierOrderNetworkEnabled() ? "ENABLED" : "DISABLED",
    credentialStatus: domainStatus(checks, ["CREDENTIAL"]),
    connectorStatus: domainStatus(checks, ["CAPABILITY", "SUPPLIER"]),
    supplierCapabilityStatus: domainStatus(checks, ["CAPABILITY"]),
    productReadinessStatus: domainStatus(checks, ["PRODUCT"]),
    stockReadinessStatus: domainStatus(checks, ["INVENTORY"]),
    priceReadinessStatus: domainStatus(checks, ["PRICE"]),
    fulfillmentReadinessStatus: domainStatus(checks, ["FULFILLMENT"]),
    reconciliationStatus: domainStatus(checks, ["FULFILLMENT"]),
    incidentStatus: domainStatus(checks, ["INCIDENT"]),
    securityStatus: domainStatus(checks, ["SECURITY"]),
    idempotencyStatus: domainStatus(checks, ["IDEMPOTENCY"]),
    retryStatus: domainStatus(checks, ["RETRY"]),
    auditStatus: "PASS",
    riskLevel,
    evaluatorVersion: EVALUATOR_VERSION,
    correlationId,
    checks,
    blockers,
    warnings,
  };

  saveReadinessRecord(record);
  recordReadinessAudit({
    type: overallStatus === "BLOCKED" ? "READINESS_BLOCKED" : overallStatus === "READY" ? "READINESS_READY" : "READINESS_CREATED",
    supplierId: scope.supplierId,
    market: scope.market,
    channel: scope.channel,
    correlationId,
    detail: { readinessId: record.readinessId, overallStatus, blockers: blockers.length },
  });
  return record;
}

export function runSupplierOrderReadinessEvaluation(
  scopes: ReadinessScope[],
  options: { correlationId?: string } = {}
): ReadinessEvaluationRun {
  const started = Date.now();
  const correlationId = options.correlationId || randomUUID();
  const runId = `sor_run_${Date.now()}_${randomUUID().slice(0, 8)}`;
  let ready = 0;
  let conditionallyReady = 0;
  let blocked = 0;
  let expired = 0;

  for (const scope of scopes) {
    try {
      const result = evaluateSupplierOrderReadiness(scope, { correlationId, force: true });
      switch (result.overallStatus) {
        case "READY":
          ready++;
          break;
        case "CONDITIONALLY_READY":
          conditionallyReady++;
          break;
        case "EXPIRED":
          expired++;
          break;
        default:
          blocked++;
      }
    } catch {
      blocked++;
    }
  }

  const completedAt = new Date().toISOString();
  return {
    runId,
    correlationId,
    startedAt: new Date(started).toISOString(),
    completedAt,
    evaluated: scopes.length,
    ready,
    conditionallyReady,
    blocked,
    expired,
    durationMs: Date.now() - started,
  };
}

export function invalidateReadiness(scope: ReadinessScope, reason: string, correlationId: string): SupplierOrderReadiness {
  const record = evaluateSupplierOrderReadiness(scope, { correlationId, force: true });
  recordReadinessAudit({
    type: "READINESS_RECHECKED",
    supplierId: scope.supplierId,
    market: scope.market,
    channel: scope.channel,
    correlationId,
    detail: { reason, overallStatus: record.overallStatus },
  });
  return record;
}
