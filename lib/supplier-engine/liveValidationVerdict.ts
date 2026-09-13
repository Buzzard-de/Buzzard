import type { LiveOnboardingReport } from "./liveOnboarding";

export type LiveValidationVerdict =
  | "LIVE VALIDATED"
  | "LIVE NOT VALIDATED / SKIPPED"
  | "LIVE VALIDATION FAILED";

export interface LiveValidationSummary {
  verdict: LiveValidationVerdict;
  message: string;
  connection: "CONNECTED" | "FAILED" | "SKIPPED";
  testSync: "PASS" | "FAIL" | "SKIPPED";
  liveRead: "PASS" | "FAIL" | "SKIPPED";
  realB2bSupplierOnboardingValidated: boolean;
  deploymentCredentialBlocker: boolean;
}

function connectionStatus(report: LiveOnboardingReport): "CONNECTED" | "FAILED" | "SKIPPED" {
  if ("status" in report.connection && report.connection.status === "SKIPPED") return "SKIPPED";
  if ("status" in report.connection && report.connection.status === "CONNECTED") return "CONNECTED";
  return "FAILED";
}

function testSyncStatus(report: LiveOnboardingReport): "PASS" | "FAIL" | "SKIPPED" {
  if ("status" in report.dryRun && report.dryRun.status === "SKIPPED") return "SKIPPED";
  if ("ok" in report.dryRun && report.dryRun.ok && report.dryRun.source === "live") return "PASS";
  if ("ok" in report.dryRun && report.dryRun.source === "live") return "FAIL";
  return "SKIPPED";
}

function liveReadStatus(report: LiveOnboardingReport): "PASS" | "FAIL" | "SKIPPED" {
  if ("status" in report.liveRead && report.liveRead.status === "SKIPPED") return "SKIPPED";
  if (Array.isArray(report.liveRead)) {
    const last = report.liveRead[report.liveRead.length - 1];
    return last?.status === "COMPLETED" || last?.status === "PARTIAL" ? "PASS" : "FAIL";
  }
  return "SKIPPED";
}

export function computeLiveValidationVerdict(
  report: LiveOnboardingReport,
  options: { credentialsPresent?: boolean } = {}
): LiveValidationSummary {
  const connection = connectionStatus(report);
  const testSync = testSyncStatus(report);
  const liveRead = liveReadStatus(report);
  const credentialsPresent = options.credentialsPresent ?? report.source !== "SKIPPED";

  if (!credentialsPresent || report.limitations.some((l) => l.includes("credentials"))) {
    return {
      verdict: "LIVE NOT VALIDATED / SKIPPED",
      message: "LIVE VALIDATION BLOCKED — REAL INTER CARS CREDENTIALS REQUIRED",
      connection,
      testSync,
      liveRead,
      realB2bSupplierOnboardingValidated: false,
      deploymentCredentialBlocker: true,
    };
  }

  if (connection === "CONNECTED" && testSync === "PASS" && liveRead === "PASS") {
    return {
      verdict: "LIVE VALIDATED",
      message: "REAL B2B SUPPLIER ONBOARDING VALIDATED",
      connection,
      testSync,
      liveRead,
      realB2bSupplierOnboardingValidated: true,
      deploymentCredentialBlocker: false,
    };
  }

  if (connection === "SKIPPED" && testSync === "SKIPPED" && liveRead === "SKIPPED") {
    return {
      verdict: "LIVE NOT VALIDATED / SKIPPED",
      message: "LIVE VALIDATION BLOCKED — REAL INTER CARS CREDENTIALS REQUIRED",
      connection,
      testSync,
      liveRead,
      realB2bSupplierOnboardingValidated: false,
      deploymentCredentialBlocker: true,
    };
  }

  return {
    verdict: "LIVE VALIDATION FAILED",
    message: "Live Inter Cars validation attempted but one or more phases failed",
    connection,
    testSync,
    liveRead,
    realB2bSupplierOnboardingValidated: false,
    deploymentCredentialBlocker: false,
  };
}
