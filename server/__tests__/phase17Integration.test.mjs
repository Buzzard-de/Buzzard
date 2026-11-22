import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runPhase17Evidence } = require("../lib/security/phase17Evidence.js");
const { evaluatePhase17Security } = require("../lib/platform/phase17Security.js");

describe("phase 17 security integration", () => {
  it("denies egress, unauthorized agents, cross-memory, and unapproved actions", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const evidence = runPhase17Evidence();
    expect(evidence.code).not.toBe("REFUSED_PRODUCTION_DB");
    expect(evidence.failed).toEqual([]);
    expect(evidence.egress.ai).toBe("EXTERNAL_AI_EGRESS_DENIED");
    expect(evidence.secrets.sales).toBe("LOCKED");
    expect(evidence.authz.payment).toBe("HUMAN_GATE_REQUIRED");
    expect(evidence.memory.crossCode).toBe("MEMORY_ISOLATION_DENIED");
    expect(evidence.approval.approved).toBe("APPROVED");
    expect(evidence.expiry.code).toBe("EXPIRED");
    expect(evidence.audit.persisted).toBe(true);
    expect(JSON.stringify(evidence)).not.toContain("not-returned");
    expect(evidence.live).toBe(false);
    expect(evidence.ok).toBe(true);
  });

  it("keeps the live restart blocked", () => {
    const report = evaluatePhase17Security();
    expect(report.checks.find((check) => check.id === "SEC_FAIL_CLOSED").ok).toBe(true);
    expect(report.checks.find((check) => check.id === "SEC_LIVE_RESTART").status).toBe("BLOCKED_EXTERNAL");
    expect(report.completeClaim).toBe(false);
    expect(report.live).toBe(false);
  });
});
