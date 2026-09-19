import { describe, it, expect, beforeEach } from "vitest";
import { resetRejectedEvidenceAttemptsForTests } from "@/lib/production-access/evidencePolicy";
import { buildRenderPersistenceLiveStatus, buildRenderPersistenceLocalHints } from "./persistenceStatus";
import { buildRenderPersistenceVerificationReport } from "./renderPersistenceReport";
import { evaluateHealthDbResponse } from "./healthDbEvaluation";
import { hashRenderPersistenceEvidenceMetadata } from "./evidenceHash";
import {
  registerRenderPersistenceEvidence,
  resetRenderPersistenceEvidenceStoreForTests,
} from "./evidenceStore";
import type { RenderPersistenceEvidenceInput } from "./types";

function validHealthInput(overrides: Partial<RenderPersistenceEvidenceInput> = {}): RenderPersistenceEvidenceInput {
  return {
    kind: "RENDER_PERSISTENCE_HEALTH",
    environment: "PRODUCTION",
    source: "RENDER_LIVE",
    timestamp: new Date().toISOString(),
    endpoint: "https://buzzard-api.onrender.com/api/health/db",
    dbPath: "/var/data/buzzard.db",
    persistent: true,
    backupPath: "/var/data/backups",
    healthStatus: "ok",
    evidenceReference: "ref-health-1",
    operator: "operator@test",
    ...overrides,
  };
}

describe("Render Persistence Evidence Bridge", () => {
  beforeEach(() => {
    resetRenderPersistenceEvidenceStoreForTests();
    resetRejectedEvidenceAttemptsForTests();
    process.env.SALES_ENABLED = "0";
  });

  it("keeps LIVE_RENDER_DISK UNVERIFIED when blueprint valid but no RENDER_LIVE evidence", () => {
    const live = buildRenderPersistenceLiveStatus();
    expect(live.BLUEPRINT_CONFIGURATION).toBe("VALIDATED");
    expect(live.LIVE_RENDER_DISK).toBe("UNVERIFIED_EXTERNAL");
    expect(live.LIVE_BACKUP).toBe("UNVERIFIED_EXTERNAL");
    expect(live.PERSISTENCE).toBe("HUMAN_REQUIRED");
  });

  it("anti-false-positive: local varData writable does not validate LIVE_RENDER_DISK", () => {
    const hints = buildRenderPersistenceLocalHints();
    const live = buildRenderPersistenceLiveStatus();
    if (hints.localVarDataWritable) {
      expect(live.LIVE_RENDER_DISK).toBe("UNVERIFIED_EXTERNAL");
    }
    expect(hints.note).toContain("never promote LIVE");
  });

  it("anti-false-positive: local restart PASS does not validate LIVE_RESTART_PERSISTENCE", () => {
    const hints = buildRenderPersistenceLocalHints();
    if (hints.localRestartTest === "PASS") {
      const live = buildRenderPersistenceLiveStatus();
      expect(live.LIVE_RESTART_PERSISTENCE).toBe("UNVERIFIED_EXTERNAL");
    }
  });

  it("rejects LOCAL source pretending to be live", () => {
    expect(() => registerRenderPersistenceEvidence(validHealthInput({ source: "LOCAL" }))).toThrow(
      /SOURCE_NOT_RENDER_LIVE/,
    );
  });

  it("rejects sandbox environment", () => {
    expect(() => registerRenderPersistenceEvidence(validHealthInput({ environment: "SANDBOX" }))).toThrow(
      /ENVIRONMENT_NOT_PRODUCTION/,
    );
  });

  it("rejects missing persistent=true", () => {
    expect(() => registerRenderPersistenceEvidence(validHealthInput({ persistent: false }))).toThrow(
      /PERSISTENT_NOT_TRUE/,
    );
  });

  it("rejects wrong DB path", () => {
    expect(() => registerRenderPersistenceEvidence(validHealthInput({ dbPath: "/tmp/buzzard.db" }))).toThrow(
      /WRONG_DB_PATH/,
    );
  });

  it("accepts valid Render health evidence and validates live disk", () => {
    registerRenderPersistenceEvidence(validHealthInput());
    const live = buildRenderPersistenceLiveStatus();
    expect(live.LIVE_RENDER_DISK).toBe("VALIDATED");
    expect(live.LIVE_DB_PATH).toBe("VALIDATED");
    expect(live.LIVE_DB_HEALTH).toBe("VALIDATED");
    expect(live.PERSISTENCE).toBe("HUMAN_REQUIRED");
  });

  it("validates restart and backup evidence", () => {
    registerRenderPersistenceEvidence(validHealthInput());
    registerRenderPersistenceEvidence({
      kind: "RENDER_RESTART_PERSISTENCE",
      environment: "PRODUCTION",
      source: "RENDER_LIVE",
      timestamp: new Date().toISOString(),
      evidenceReference: "ref-restart-1",
      operator: "operator@test",
      restart: {
        before: "/var/data/buzzard.db",
        after: "/var/data/buzzard.db",
        samePersistentPath: true,
        databaseIntegrity: "ok",
      },
    });
    registerRenderPersistenceEvidence({
      kind: "RENDER_BACKUP",
      environment: "PRODUCTION",
      source: "RENDER_LIVE",
      timestamp: new Date().toISOString(),
      evidenceReference: "ref-backup-1",
      operator: "operator@test",
      backup: {
        backupPath: "/var/data/backups/buzzard-2026.db",
        databasePath: "/var/data/buzzard.db",
        success: true,
        artifactReference: "s3://operator-vault/backup-meta.json",
      },
    });
    const live = buildRenderPersistenceLiveStatus();
    expect(live.LIVE_RESTART_PERSISTENCE).toBe("VALIDATED");
    expect(live.LIVE_BACKUP).toBe("VALIDATED");
    expect(live.PERSISTENCE).toBe("VALIDATED");
  });

  it("expires evidence and drops LIVE validation", () => {
    registerRenderPersistenceEvidence(
      validHealthInput({ expiresAt: new Date(Date.now() - 60_000).toISOString(), evidenceReference: "expired-1" }),
    );
    const live = buildRenderPersistenceLiveStatus();
    expect(live.LIVE_RENDER_DISK).toBe("UNVERIFIED_EXTERNAL");
    const report = buildRenderPersistenceVerificationReport();
    expect(report.expiredEvidenceCount).toBeGreaterThanOrEqual(1);
  });

  it("evaluates health/db response without HTTP", () => {
    const evalOk = evaluateHealthDbResponse({
      success: true,
      database: {
        path: "/var/data/buzzard.db",
        persistence: { persistent: true, backupDir: "/var/data/backups" },
      },
    });
    expect(evalOk.meetsLivePersistenceCriteria).toBe(true);
    const evalBad = evaluateHealthDbResponse({
      database: { path: "server/data/buzzard.db", persistence: { persistent: false } },
    });
    expect(evalBad.meetsLivePersistenceCriteria).toBe(false);
  });

  it("hashes metadata deterministically", () => {
    const a = hashRenderPersistenceEvidenceMetadata(validHealthInput());
    const b = hashRenderPersistenceEvidenceMetadata(validHealthInput());
    expect(a).toBe(b);
  });

  it("rejects duplicate evidence", () => {
    registerRenderPersistenceEvidence(validHealthInput());
    expect(() => registerRenderPersistenceEvidence(validHealthInput())).toThrow(/DUPLICATE/);
  });

  it("rejects missing operator", () => {
    expect(() => registerRenderPersistenceEvidence(validHealthInput({ operator: "" }))).toThrow(/MISSING_OPERATOR/);
  });
});
