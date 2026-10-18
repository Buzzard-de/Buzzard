import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("test, reliability, and operations — established fail-closed", () => {
  it("keeps quality scripts local and never deploys, restores, or force-upgrades", () => {
    const { testReliabilityOpsIntegrity } = require("../lib/software");
    const inspect = testReliabilityOpsIntegrity.inspect();
    expect(inspect.salesEnabled).toBe(false);
    expect(inspect.productionLoad).toBe(false);
    expect(inspect.restoreExecuted).toBe(false);
    expect(inspect.deployed).toBe(false);
    expect(inspect.merged).toBe(false);
    expect(inspect.auditForceFix).toBe(false);
    expect(inspect.scripts.unit).toBe(true);
    expect(inspect.scripts.lint).toBe(true);
    expect(inspect.scripts.typecheck).toBe(true);
    expect(inspect.scripts.build).toBe(true);
    expect(inspect.scripts.audit).toBe(true);
    const restore = testReliabilityOpsIntegrity.executeRestoreEvenIfAllowed();
    expect(restore.executed).toBe(false);
    expect(restore.reason).toBe("RESTORE_EXECUTE_BLOCKED");
    expect(testReliabilityOpsIntegrity.auditPolicy().forceUpgrade).toBe(false);
    const writes = testReliabilityOpsIntegrity.refuseOpsWrites();
    expect(writes.deploy.hookCalled).toBe(false);
    expect(["HUMAN_APPROVAL_REQUIRED", "HUMAN_DEPLOY_REQUIRED", "DEPLOY_BLOCKED"]).toContain(writes.deploy.reason);
    expect(writes.monitoring.reason).toBe("MONITORING_LIVE_BLOCKED");
    expect(writes.siem.reason).toBe("SIEM_EXPORT_BLOCKED");
  });

  it("redacts structured logs, refuses /tmp ops source, and burst-limits without a production load test", () => {
    const { testReliabilityOpsIntegrity } = require("../lib/software");
    const logged = testReliabilityOpsIntegrity.structuredLog({ password: "secret", token: "abc" });
    expect(logged.secretPlaintext).toBe(false);
    expect(logged.live).toBe(false);
    const pack = testReliabilityOpsIntegrity.localOpsPack(require("../lib/db").db);
    expect(pack.sourceEphemeral).toBe(true);
    expect(pack.backupRestore.reason || pack.backupRestore.status).toMatch(/TMP|EPHEMERAL/);
    expect(pack.productionVerified).toBe(false);
    const burst = testReliabilityOpsIntegrity.burstRateLimit({ max: 8, requests: 24 });
    expect(burst.productionLoad).toBe(false);
    expect(burst.limited).toBe(16);
  });

  it("keeps CORS, guest IDOR, and finance locks fail-closed", () => {
    const { testReliabilityOpsIntegrity } = require("../lib/software");
    const cors = testReliabilityOpsIntegrity.corsNullOrigin();
    expect(cors.allowed).toBe(false);
    expect(cors.idempotencyHeaderAllowed).toBe(true);
    const access = testReliabilityOpsIntegrity.guestIdor();
    expect(access.guestBlocked).toBe(true);
    expect(access.idorCode).toBe("idor_denied");
    const finance = testReliabilityOpsIntegrity.financeLocks();
    expect(finance.commercialBlocked).toBe(true);
    expect(finance.unsignedCanMarkPaid).toBe(false);
  });
});
