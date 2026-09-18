import { existsSync } from "fs";
import path from "path";
import { evaluateSecurityGate as baseSecurityGate } from "@/lib/production-completion/securityGate";
import { isProductionKillSwitchActive, getProductionKillSwitchDashboard } from "@/lib/production-kill-switch";
import { detectProductionBypasses } from "./bypassGuard";
import type { ClosureSectionStatus } from "./types";

const SECURITY_CHECKS = [
  "SECRET_LEAK",
  "PII_LEAK",
  "SSRF",
  "XXE",
  "RBAC",
  "AUTH",
  "AUTHORIZATION",
  "WEBHOOK",
  "REPLAY",
  "IDEMPOTENCY",
  "RATE_LIMIT",
  "CUSTOMER_ISOLATION",
  "AUDIT",
  "KILL_SWITCH",
] as const;

export function evaluateFinalSecurityGate(): {
  status: ClosureSectionStatus;
  checks: Array<{ check: string; status: ClosureSectionStatus; message: string }>;
  blockers: string[];
} {
  const blockers: string[] = [];
  const checks: Array<{ check: string; status: ClosureSectionStatus; message: string }> = [];

  const base = baseSecurityGate();
  if (base.status !== "PASS") {
    blockers.push(...base.blockers.map((b) => b.code));
  }

  const securityModules = [
    "server/lib/rbac.js",
    "server/lib/routePermissions.js",
    "lib/supplier-production-validation/endpointSecurity.ts",
    "scripts/security-check.mjs",
  ];
  for (const mod of securityModules) {
    checks.push({
      check: "RBAC",
      status: existsSync(path.join(process.cwd(), mod)) ? "PASS" : "BLOCKED",
      message: mod,
    });
  }

  checks.push({
    check: "KILL_SWITCH",
    status: isProductionKillSwitchActive() ? "BLOCKED" : "PASS",
    message: getProductionKillSwitchDashboard().global ? "ACTIVE" : "INACTIVE",
  });

  const bypasses = detectProductionBypasses();
  checks.push({
    check: "AUTH",
    status: bypasses.length > 0 ? "BLOCKED" : "PASS",
    message: bypasses.length ? `bypasses:${bypasses.join(",")}` : "no_bypass",
  });

  for (const check of SECURITY_CHECKS) {
    if (!checks.some((c) => c.check === check)) {
      checks.push({ check, status: "UNVERIFIED", message: "Requires live deployment verification" });
    }
  }

  const critical = checks.filter((c) => c.status === "BLOCKED");
  const status: ClosureSectionStatus =
    critical.length > 0 || base.status === "BLOCKED" ? "BLOCKED" : base.status === "PASS" ? "PASS" : "UNVERIFIED";

  return { status, checks, blockers: [...new Set([...blockers, ...critical.map((c) => c.check)])] };
}
