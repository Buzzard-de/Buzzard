import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { resolveInterCarsSecretRef, resolveGenericSecretRef } from "@/lib/production-access/secretRefs";
import { hasProductionEvidence } from "@/lib/production-access/evidenceStore";
import { getProductionArmingDashboard } from "@/lib/supplier-production-order-arming/admin";
import { getFirstProductionOrderDashboard } from "@/lib/supplier-first-production-order/admin";
import { getObservationDashboard } from "@/lib/supplier-go-live-observation/admin";
import { evaluateTrackingState } from "@/lib/production-access/providerRegistry";
import { evaluateSecurityGate } from "@/lib/production-completion/securityGate";
import { buildProductionMonitoringSnapshot } from "@/lib/production-completion/monitoringDashboard";
import { isProductionKillSwitchActive } from "@/lib/production-kill-switch";
import type { BlockerCode, FinalBlocker } from "./types";
import { getBackupRestoreEvidence } from "./backupRestore";

function blocker(
  code: BlockerCode | string,
  input: Omit<FinalBlocker, "code" | "updatedAt">,
): FinalBlocker {
  return { code, updatedAt: new Date().toISOString(), ...input };
}

export function buildFinalBlockerRegistry(): FinalBlocker[] {
  const blockers: FinalBlocker[] = [];
  const interCars = evaluateInterCarsProductionAccess();
  const icSecret = resolveInterCarsSecretRef();

  if (!icSecret.secretRefConfigured && !icSecret.secretResolvable) {
    blockers.push(
      blocker("INTER_CARS_CREDENTIAL", {
        provider: "inter-cars",
        severity: "CRITICAL",
        status: "NOT_CONFIGURED",
        description: "Inter Cars production credential not configured",
        requiredAction: "Deploy SUPPLIER_LIVE_CREDENTIALS_SECRET_REF via Secret Manager",
      }),
    );
  } else if (icSecret.credentialStatus === "BLOCKED") {
    blockers.push(
      blocker("INTER_CARS_CREDENTIAL", {
        provider: "inter-cars",
        severity: "CRITICAL",
        status: "BLOCKED",
        description: "Inter Cars credential blocked (mock/invalid)",
        requiredAction: "Replace with genuine production OAuth2 credentials",
      }),
    );
  } else if (icSecret.credentialStatus === "CONFIGURED" && interCars.readOnlyLiveValidation !== "VALIDATED") {
    blockers.push(
      blocker("INTER_CARS_API_ACCESS", {
        provider: "inter-cars",
        severity: "HIGH",
        status: "UNVERIFIED",
        description: "Credential configured but API access not validated",
        requiredAction: "Run read-only health/catalog/stock/price validation",
      }),
    );
  }

  if (interCars.readOnlyLiveValidation !== "VALIDATED") {
    blockers.push(
      blocker("INTER_CARS_READ_VALIDATION", {
        provider: "inter-cars",
        severity: "HIGH",
        status: "UNVERIFIED",
        description: "Inter Cars read-only live validation incomplete",
        requiredAction: "Enable SUPPLIER_LIVE_READ_ENABLED=1 and run Stage A checks",
      }),
    );
  }

  if (interCars.createOrderCapability !== "VALIDATED") {
    blockers.push(
      blocker("CREATE_ORDER_VALIDATION", {
        provider: "inter-cars",
        severity: "CRITICAL",
        status: "UNVERIFIED",
        description: "Controlled #342 CreateOrder not validated with genuine evidence",
        requiredAction: "Execute controlled validation with four-eyes approval",
      }),
    );
  }

  try {
    const firstOrder = getFirstProductionOrderDashboard();
    if (firstOrder.firstOrderState !== "EXECUTED") {
      blockers.push(
        blocker("FIRST_PRODUCTION_ORDER", {
          provider: "inter-cars",
          severity: "CRITICAL",
          status: "BLOCKED",
          description: "First production supplier order not executed",
          requiredAction: "Complete #343 arming and execute #344 first order with dual approval",
        }),
      );
    }
  } catch {
    blockers.push(
      blocker("FIRST_PRODUCTION_ORDER", {
        provider: "inter-cars",
        severity: "CRITICAL",
        status: "BLOCKED",
        description: "First production order module unavailable",
        requiredAction: "Verify supplier-first-production-order module",
      }),
    );
  }

  const tracking = evaluateTrackingState();
  if (tracking.liveValidation !== "VALIDATED" && !hasProductionEvidence("inter-cars", "tracking")) {
    blockers.push(
      blocker("TRACKING_VALIDATION", {
        provider: "inter-cars",
        severity: "HIGH",
        status: "UNVERIFIED",
        description: "Tracking production validation incomplete",
        requiredAction: "Validate tracking with carrier credentials when available",
      }),
    );
  }

  const paymentSecret = resolveGenericSecretRef({
    providerId: "payment",
    secretRefEnvKey: "PAYMENT_PROVIDER_SECRET_REF",
    fallbackEnvKey: "PAYMENT_PROVIDER_SECRET",
  });
  if (!paymentSecret.secretResolvable) {
    blockers.push(
      blocker("PAYMENT_CREDENTIAL", {
        provider: "payment",
        severity: "HIGH",
        status: "NOT_CONFIGURED",
        description: "Payment provider credential not configured",
        requiredAction: "Set PAYMENT_PROVIDER_SECRET_REF in Secret Manager",
      }),
    );
  } else if (!hasProductionEvidence("payment", "authentication")) {
    blockers.push(
      blocker("PAYMENT_VALIDATION", {
        provider: "payment",
        severity: "HIGH",
        status: "UNVERIFIED",
        description: "Payment production validation incomplete",
        requiredAction: "Run safe payment authentication/webhook validation",
      }),
    );
  }

  const carrierSecret = resolveGenericSecretRef({
    providerId: "carrier",
    secretRefEnvKey: "CARRIER_PROVIDER_SECRET_REF",
  });
  if (!carrierSecret.secretResolvable) {
    blockers.push(
      blocker("CARRIER_CREDENTIAL", {
        provider: "carrier",
        severity: "HIGH",
        status: "NOT_CONFIGURED",
        description: "Carrier provider credential not configured",
        requiredAction: "Set CARRIER_PROVIDER_SECRET_REF in Secret Manager",
      }),
    );
  } else if (!hasProductionEvidence("carrier", "health")) {
    blockers.push(
      blocker("CARRIER_VALIDATION", {
        provider: "carrier",
        severity: "HIGH",
        status: "UNVERIFIED",
        description: "Carrier production validation incomplete",
        requiredAction: "Run safe carrier health/label validation",
      }),
    );
  }

  const aiSecret = resolveGenericSecretRef({
    providerId: "ai",
    secretRefEnvKey: "AI_PROVIDER_SECRET_REF",
  });
  if (!aiSecret.secretResolvable) {
    blockers.push(
      blocker("AI_CREDENTIAL", {
        provider: "ai",
        severity: "MEDIUM",
        status: "NOT_CONFIGURED",
        description: "AI provider credential not configured",
        requiredAction: "Set AI_PROVIDER_SECRET_REF in Secret Manager",
      }),
    );
  } else if (!hasProductionEvidence("ai", "health")) {
    blockers.push(
      blocker("AI_VALIDATION", {
        provider: "ai",
        severity: "MEDIUM",
        status: "UNVERIFIED",
        description: "AI production validation incomplete",
        requiredAction: "Run AI provider health check with OBSERVE authority only",
      }),
    );
  }

  blockers.push(
    blocker("RETURNS_CREDENTIAL", {
      provider: "returns",
      severity: "MEDIUM",
      status: "NOT_CONFIGURED",
      description: "Returns/refunds production path not configured",
      requiredAction: "Configure returns production validation when payment/supplier paths ready",
    }),
  );
  blockers.push(
    blocker("RETURNS_VALIDATION", {
      provider: "returns",
      severity: "MEDIUM",
      status: "UNVERIFIED",
      description: "Returns production validation incomplete",
      requiredAction: "Validate customer refund and supplier credit paths separately",
    }),
  );

  const marketingConfigured = ["GOOGLE_ADS", "META", "TIKTOK", "YOUTUBE"].some((p) =>
    Boolean(process.env[`${p}_SECRET_REF`]?.trim()),
  );
  if (!marketingConfigured) {
    blockers.push(
      blocker("MARKETING_CREDENTIAL", {
        provider: "marketing",
        severity: "LOW",
        status: "NOT_CONFIGURED",
        description: "Marketing provider credentials not configured",
        requiredAction: "Set provider *_SECRET_REF when marketing spend approval granted",
      }),
    );
  } else {
    blockers.push(
      blocker("MARKETING_VALIDATION", {
        provider: "marketing",
        severity: "LOW",
        status: "UNVERIFIED",
        description: "Marketing production validation incomplete",
        requiredAction: "Validate marketing providers with spend disabled",
      }),
    );
  }

  const backup = getBackupRestoreEvidence();
  if (backup.result !== "PASS") {
    blockers.push(
      blocker("BACKUP_RESTORE", {
        severity: backup.result === "BLOCKED" ? "CRITICAL" : "HIGH",
        status: backup.result === "BLOCKED" ? "BLOCKED" : "UNVERIFIED",
        description: "Backup/restore validation not passed",
        requiredAction: "Run isolated backup restore verification workflow",
        evidenceId: backup.evidenceId,
      }),
    );
  }

  const security = evaluateSecurityGate();
  if (security.status !== "PASS") {
    blockers.push(
      blocker("SECURITY", {
        severity: "CRITICAL",
        status: security.status === "BLOCKED" ? "BLOCKED" : "UNVERIFIED",
        description: security.message,
        requiredAction: "Resolve security gate blockers before go-live",
      }),
    );
  }

  const monitoring = buildProductionMonitoringSnapshot();
  if (monitoring.healthStatus === "CRITICAL") {
    blockers.push(
      blocker("MONITORING", {
        severity: "HIGH",
        status: "BLOCKED",
        description: `Monitoring health critical: ${monitoring.criticalIncidents} incidents`,
        requiredAction: "Resolve critical incidents and unknown outcomes",
      }),
    );
  }

  blockers.push(
    blocker("FINANCIAL_RECONCILIATION", {
      severity: "HIGH",
      status: "UNVERIFIED",
      description: "Financial reconciliation not validated with live orders",
      requiredAction: "Complete FCT reconciliation after first production order",
    }),
  );

  try {
    const obs = getObservationDashboard();
    if (obs.observationState !== "COMPLETED") {
      blockers.push(
        blocker("OBSERVATION", {
          provider: "inter-cars",
          severity: "CRITICAL",
          status: obs.observationState === "ACTIVE" ? "UNVERIFIED" : "BLOCKED",
          description: "Observation period #346 not completed",
          requiredAction: "Complete observation window after controlled go-live",
        }),
      );
    }
  } catch {
    blockers.push(
      blocker("OBSERVATION", {
        provider: "inter-cars",
        severity: "CRITICAL",
        status: "BLOCKED",
        description: "Observation module unavailable",
        requiredAction: "Verify supplier-go-live-observation module",
      }),
    );
  }

  if (isProductionKillSwitchActive()) {
    blockers.push(
      blocker("SECURITY", {
        severity: "CRITICAL",
        status: "BLOCKED",
        description: "Global production kill switch is active",
        requiredAction: "Clear kill switch after incident resolution with audited approval",
      }),
    );
  }

  return blockers;
}

export function getCriticalBlockers(blockers: FinalBlocker[]): FinalBlocker[] {
  return blockers.filter((b) => b.severity === "CRITICAL" || b.status === "BLOCKED");
}
