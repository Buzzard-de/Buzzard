import { existsSync } from "fs";
import path from "path";
import { getProductionKillSwitchDashboard } from "@/lib/production-kill-switch";
import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import type { CompletionSectionReport } from "./types";

export function evaluateSecurityGate(): CompletionSectionReport {
  const blockers: CompletionSectionReport["blockers"] = [];
  const flags = getProductionFlagsSnapshot();

  const securityFiles = [
    "server/lib/rbac.js",
    "server/lib/routePermissions.js",
    "server/plugins/securityPlugin.js",
    "lib/supplier-production-validation/endpointSecurity.ts",
    "scripts/security-check.mjs",
  ];

  for (const f of securityFiles) {
    if (!existsSync(path.join(process.cwd(), f))) {
      blockers.push({
        code: "SECURITY_MODULE_MISSING",
        severity: "CRITICAL",
        description: `Security module missing: ${f}`,
        resolution: "Restore security module",
        status: "BLOCKED",
      });
    }
  }

  if (flags.SALES === "ON") {
    blockers.push({
      code: "SALES_ENABLED_IN_PREP",
      severity: "CRITICAL",
      description: "Sales enabled before final gate PASS",
      resolution: "Set SALES_ENABLED=0 until all gates pass",
      status: "BLOCKED",
    });
  }

  if (flags.SUPPLIER_ORDER_NETWORK === "ON") {
    blockers.push({
      code: "SUPPLIER_NETWORK_ENABLED_IN_PREP",
      severity: "CRITICAL",
      description: "Supplier order network enabled in prep phase",
      resolution: "Set SUPPLIER_ORDER_NETWORK_ENABLED=0 until controlled go-live",
      status: "BLOCKED",
    });
  }

  try {
    getProductionKillSwitchDashboard();
  } catch {
    blockers.push({
      code: "KILL_SWITCH_UNAVAILABLE",
      severity: "HIGH",
      description: "Global kill switch module unavailable",
      resolution: "Verify production-kill-switch module",
      status: "BLOCKED",
    });
  }

  const critical = blockers.filter((b) => b.severity === "CRITICAL");
  const status = critical.length > 0 ? "BLOCKED" : blockers.length > 0 ? "WARNING" : "PASS";

  return {
    section: "SECURITY",
    status,
    message: status === "PASS" ? "Core security modules present; production flags safe" : "Security blockers detected",
    blockers,
  };
}
