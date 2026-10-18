import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("security / monitoring / backup / production infrastructure — established fail-closed", () => {
  let software;

  beforeAll(() => {
    software = require("../lib/software");
  });

  it("restore never executes, including /tmp and allow-flag production targets", () => {
    const tmp = path.join(os.tmpdir(), "buzzard-restore.db");
    const ephemeral = software.restoreGuard.executeRestore(
      { dbPath: tmp },
      { NODE_ENV: "production", BUZZARD_ALLOW_PRODUCTION_RESTORE: "1" }
    );
    expect(ephemeral.executed).toBe(false);
    expect(ephemeral.reason).toBe("PRODUCTION_EPHEMERAL_PATH");

    const allowed = software.restoreGuard.executeRestore(
      { dbPath: "/var/data/buzzard.db" },
      { NODE_ENV: "production", BUZZARD_ALLOW_PRODUCTION_RESTORE: "1" }
    );
    expect(allowed.executed).toBe(false);
    expect(allowed.restored).toBe(false);
    expect(allowed.reason).toBe("RESTORE_EXECUTE_BLOCKED");
    expect(allowed.allowFlagIgnored).toBe(true);
    expect(software.restoreGuard.confirmRestore().reason).toBe("RESTORE_CONFIRM_BLOCKED");

    const safety = require("../lib/operations/restoreSafety");
    const exec = safety.executeRestore({
      sourcePath: "/tmp/missing.db",
      targetPath: "/var/data/buzzard.db",
      environment: "production",
    });
    expect(exec.executed).toBe(false);
    expect(exec.autoRestore).toBe(false);
    expect(exec.reason).toBe("RESTORE_EXECUTE_BLOCKED");
  });

  it("local metrics and monitoring never export Prometheus or dispatch alerts", () => {
    const metrics = require("../lib/operations/localMetrics");
    const snapshot = metrics.getLocalMetricsSnapshot(null);
    expect(snapshot.prometheus).toBe(false);
    expect(snapshot.liveExporter).toBe(false);
    expect(snapshot.secretsExposed).toBe(false);
    expect(metrics.exportPrometheus().reason).toBe("PROMETHEUS_EXPORT_BLOCKED");
    expect(metrics.scrapeRemote().httpAttempted).toBe(false);

    expect(software.monitoringReady.confirmLive().liveVerified).toBe(false);
    expect(software.monitoringReady.dispatchAlerts().reason).toBe("MONITORING_ALERT_DISPATCH_BLOCKED");
    expect(software.monitoringReady.readiness().liveVerified).toBe(false);
  });

  it("secret vault never writes or returns secret values", () => {
    const previous = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test-presence-only";
    try {
      const got = software.secretVault.getSecret("OPENAI_API_KEY");
      expect(got.present).toBe(true);
      expect(got.value).toBeNull();
      expect(got.writtenToGit).toBe(false);
      expect(software.secretVault.writeSecret().reason).toBe("SECRET_WRITE_BLOCKED");
      expect(software.secretVault.redact("sk-test-presence-only").value).toBeNull();
    } finally {
      if (previous === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previous;
    }
  });

  it("production config, deploy, DNS, go-live, first order, and merge stay refused", () => {
    expect(software.productionConfigGate.apply({ actor: "operator", forceApply: true, updates: { JWT_SECRET: "x" } }).reason).toBe(
      "HUMAN_PRODUCTION_CONFIG_REQUIRED"
    );
    expect(software.productionConfigGate.apply({ actor: "operator", forceApply: true }).processEnvMutated).toBe(false);
    expect(software.productionDeployGate.trigger({ actor: "operator", forceDeploy: true }).reason).toBe("HUMAN_DEPLOY_REQUIRED");
    expect(software.productionDeployGate.trigger({ actor: "operator" }).hookCalled).toBe(false);
    expect(software.goLiveGate.approve({ actor: "operator", forceApprove: true }).reason).toBe("HUMAN_GO_LIVE_REQUIRED");
    expect(software.goLiveGate.activateSales({ actor: "operator" }).salesEnabled).toBe(false);
    expect(software.dnsAccessGate.inspect().dnsChanged).toBe(false);
    expect(software.firstOrderGate.place({ actor: "operator" }).commercialCreated).toBe(false);
    expect(software.protectedBranchMergeGate.merge({ actor: "operator", target: "main" }).merged).toBe(false);
    expect(software.protectedBranchMergeGate.merge({ actor: "operator", target: "main" }).gitExecuted).toBe(false);
  });

  it("local operations pack keeps sales/SoT locked and production restore blocked", () => {
    const pack = software.operationsPack.runLocalOperationsPack({});
    expect(pack.local).toBe(true);
    expect(pack.productionVerified).toBe(false);
    expect(pack.salesLocked).toBe(true);
    expect(pack.envDoesNotActivate).toBe(true);
    expect(pack.productionRestoreBlocked).toBe(true);
    expect(pack.providers.live).toBe(0);
  });
});
