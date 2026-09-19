import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildProductionStoragePreflightReport } from "./preflightReport";
import { resolvePersistenceMode, checkEnvironmentVariables } from "./environmentValidation";
import { runRestartPersistenceTest } from "./restartPersistenceTest";
import { checkDeploymentConfiguration } from "./deploymentConfig";
import { resetEvidenceStoreForTests } from "@/lib/production-access/evidenceStore";

describe("Production Storage Preflight", () => {
  beforeEach(() => {
    resetEvidenceStoreForTests();
    process.env.SALES_ENABLED = "0";
    process.env.SUPPLIER_NETWORK_ENABLED = "0";
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.PAYMENT_PRODUCTION_ENABLED = "0";
    process.env.CARRIER_PRODUCTION_ENABLED = "0";
    process.env.MARKETING_SPEND_ENABLED = "0";
    process.env.AI_PRODUCTION_ENABLED = "0";
    delete process.env.BUZZARD_DB_PATH;
    delete process.env.PERSISTENT_DATA_PATH;
  });

  it("uses BUZZARD_DB_PATH as canonical DB path SSOT", () => {
    process.env.BUZZARD_DB_PATH = "/var/data/buzzard.db";
    expect(resolvePersistenceMode()).toBe("PERSISTENT");
    const env = checkEnvironmentVariables();
    expect(env.find((e) => e.name === "BUZZARD_DB_PATH")?.configured).toBe(true);
    expect(env.find((e) => e.name === "BUZZARD_DB_PATH")?.valueHint).toBe("/var/data/buzzard.db");
  });

  it("detects EPHEMERAL mode in production without persistent path", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.BUZZARD_DB_PATH;
    expect(resolvePersistenceMode()).toBe("EPHEMERAL");
    vi.unstubAllEnvs();
  });

  it("runs isolated restart persistence test without touching production DB", () => {
    const result = runRestartPersistenceTest();
    expect(result.testDbPath).toContain("buzzard-storage-preflight");
    expect(result.cleanupOk).toBe(true);
    if (result.status === "PASS") {
      expect(result.writeOk).toBe(true);
      expect(result.readOk).toBe(true);
    }
  });

  it("confirms render.yaml supports persistent disk", () => {
    const deployment = checkDeploymentConfiguration();
    expect(deployment.renderYamlPresent).toBe(true);
    expect(deployment.persistentDiskInBlueprint).toBe(true);
    expect(deployment.buzzardDbPathInBlueprint).toBe(true);
  });

  it("validates buzzard-api blueprint disk without claiming live Render ready", async () => {
    const { validateRenderBlueprint, buildRenderBlueprintValidation } = await import("./renderBlueprintValidation");
    const sync = validateRenderBlueprint();
    expect(sync.buzzardApiServiceFound).toBe(true);
    expect(sync.RENDER_BLUEPRINT_DISK_CONFIGURED).toBe("PASS");
    expect(sync.RENDER_DISK_MOUNT_PATH).toBe("/var/data");
    expect(sync.RENDER_DB_PATH).toBe("/var/data/buzzard.db");
    expect(sync.RENDER_BACKUP_PATH).toBe("/var/data/backups");
    const full = await buildRenderBlueprintValidation();
    if (!process.env.BUZZARD_API_URL) {
      expect(full.RENDER_PERSISTENCE_READY).toBe("UNVERIFIED");
      expect(full.LIVE_RENDER_DISK).toBe("UNVERIFIED");
    }
    expect(full.BLUEPRINT_CONFIGURATION).toBe("PASS");
  });

  it("full preflight keeps SALES_ENABLED at 0 and zero side effects", () => {
    const report = buildProductionStoragePreflightReport();
    expect(report.salesEnabled).toBe("0");
    expect(report.softwarePersistenceSupport).toBe("PASS");
    expect(report.sideEffectCounters.realSupplierOrders).toBe(0);
    expect(report.sideEffectCounters.fakeEvidence).toBe(0);
    expect(report.productionFlags.SALES_ENABLED).toBe("0");
  });

  it("does not claim Render persistence ready without /var/data mount", () => {
    const report = buildProductionStoragePreflightReport();
    if (!report.varData.exists) {
      expect(report.renderPersistentDisk).toBe("BLOCKED");
      expect(report.livePersistenceValidation).toBe("UNVERIFIED");
      expect(report.productionReadyImpact).toBe("BLOCKED");
    }
  });

  it("never exposes secret values in environment checks", () => {
    process.env.JWT_SECRET = "super-secret-value";
    const env = checkEnvironmentVariables();
    for (const e of env) {
      expect(e.valueHint).not.toContain("super-secret");
    }
  });
});
