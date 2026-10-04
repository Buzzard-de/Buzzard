import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  createProductionDbVerification,
  toPublicDbHealth,
  containsForbiddenPayload,
  EXPECTED_PRODUCTION_DB,
} = require("../lib/productionDbVerification.js");
const { PUBLIC_ROUTES, EXACT, resolveRoutePermission } = require("../lib/routePermissions.js");

function mockFs(files, dirs) {
  const constants = { F_OK: 0, R_OK: 4, W_OK: 2 };
  return {
    constants,
    existsSync(p) {
      return Boolean(files[p] || dirs[p]);
    },
    statSync(p) {
      if (dirs[p]) return { isDirectory: () => true, isFile: () => false, size: 0, mtime: new Date("2026-10-03T00:00:00.000Z") };
      if (files[p]) return { isDirectory: () => false, isFile: () => true, size: files[p].size, mtime: new Date(files[p].mtime) };
      throw new Error("ENOENT");
    },
    accessSync() {
      return undefined;
    },
    realpathSync(p) {
      return files[p]?.realpath || dirs[p]?.realpath || p;
    },
  };
}

function fakeDb({ mainPath, integrity = "ok", journal = "wal", mutations }) {
  return {
    prepare(sql) {
      const text = String(sql);
      if (/INSERT|UPDATE|DELETE|ALTER|DROP|CREATE/i.test(text) && !/PRAGMA/i.test(text)) {
        mutations?.push(text);
      }
      return {
        all() {
          if (text.includes("database_list")) {
            return [{ name: "main", file: mainPath }];
          }
          return [];
        },
        get() {
          if (text.includes("integrity_check")) return { integrity_check: integrity };
          if (text.includes("journal_mode")) return { journal_mode: journal };
          return {};
        },
        run() {
          mutations?.push(text);
        },
      };
    },
    exec(sql) {
      mutations?.push(sql);
    },
  };
}

function productionEnv(overrides = {}) {
  return {
    NODE_ENV: "production",
    BUZZARD_DB_PATH: EXPECTED_PRODUCTION_DB,
    BUZZARD_BACKUP_DIR: "/var/data/backups",
    BUZZARD_SALES_ENABLED: "0",
    BUZZARD_PRODUCT_SOT_ACTIVE: "0",
    ...overrides,
  };
}

function passingFs() {
  return mockFs(
    {
      "/var/data/buzzard.db": { size: 4096, mtime: "2026-10-03T12:00:00.000Z", realpath: "/var/data/buzzard.db" },
    },
    {
      "/var/data": { realpath: "/var/data" },
      "/var/data/backups": { realpath: "/var/data/backups" },
    }
  );
}

function verifyWith(overrides = {}) {
  const mutations = [];
  const service = createProductionDbVerification(overrides.db || fakeDb({ mainPath: "/var/data/buzzard.db", mutations }), {
    env: overrides.env || productionEnv(),
    fs: overrides.fs || passingFs(),
    resolveDbPath: overrides.resolveDbPath || (() => overrides.env?.BUZZARD_DB_PATH || EXPECTED_PRODUCTION_DB),
    resolveBackupDir: overrides.resolveBackupDir || (() => overrides.env?.BUZZARD_BACKUP_DIR || "/var/data/backups"),
    idFactory: () => "11111111-2222-4333-8444-555555555555",
    now: () => new Date("2026-10-03T20:00:00.000Z"),
    readSqliteMeta: overrides.readSqliteMeta,
  });
  const result = service.verifyProductionDb({ correlationId: overrides.correlationId || "corr_test" });
  return { result, mutations };
}

describe("production DB persistent disk verification", () => {
  it("TEST 1: production /var/data/buzzard.db runtime proof is CONDITIONAL", () => {
    const { result } = verifyWith();
    expect(result.runtimeProof.verified).toBe(true);
    expect(result.persistence.persistent).toBe(true);
    expect(result.persistence.mode).toBe("render_persistent_disk");
    expect(result.status).toBe("CONDITIONAL");
    expect(result.redeployProof.status).toBe("REDEPLOY_PERSISTENCE_PROOF_REQUIRED");
    expect(result.verification.verificationId).toBe("11111111-2222-4333-8444-555555555555");
  });

  it("TEST 2: production default server/data path fails", () => {
    const { result } = verifyWith({
      env: productionEnv({ BUZZARD_DB_PATH: "/workspace/server/data/buzzard.db" }),
      resolveDbPath: () => "/workspace/server/data/buzzard.db",
      fs: mockFs(
        { "/workspace/server/data/buzzard.db": { size: 10, mtime: "2026-10-03T00:00:00.000Z" } },
        { "/workspace/server/data": {} }
      ),
      db: fakeDb({ mainPath: "/workspace/server/data/buzzard.db" }),
    });
    expect(result.verified).toBe(false);
    expect(result.reasons).toContain("PRODUCTION_DB_NOT_ON_PERSISTENT_DISK");
    expect(result.status).toBe("FAIL");
  });

  it("TEST 3: SQLite database_list mismatch fails", () => {
    const { result } = verifyWith({
      db: fakeDb({ mainPath: "/tmp/other.db" }),
    });
    expect(result.reasons).toContain("SQLITE_DB_PATH_MISMATCH");
    expect(result.status).toBe("FAIL");
  });

  it("TEST 4: integrity_check != ok fails", () => {
    const { result } = verifyWith({
      db: fakeDb({ mainPath: "/var/data/buzzard.db", integrity: "corrupt" }),
    });
    expect(result.reasons).toContain("SQLITE_INTEGRITY_CHECK_FAILED");
    expect(result.status).toBe("FAIL");
  });

  it("TEST 5: missing /var/data fails", () => {
    const { result } = verifyWith({
      fs: mockFs(
        { "/var/data/buzzard.db": { size: 1, mtime: "2026-10-03T00:00:00.000Z" } },
        { "/var/data/backups": {} }
      ),
    });
    expect(result.reasons).toContain("PERSISTENT_MOUNT_MISSING");
    expect(result.status).toBe("FAIL");
  });

  it("TEST 6: backup path outside /var/data fails", () => {
    const { result } = verifyWith({
      env: productionEnv({ BUZZARD_BACKUP_DIR: "/tmp/backups" }),
      resolveBackupDir: () => "/tmp/backups",
      fs: mockFs(
        { "/var/data/buzzard.db": { size: 1, mtime: "2026-10-03T00:00:00.000Z" } },
        { "/var/data": {}, "/tmp/backups": {} }
      ),
    });
    expect(result.reasons).toContain("BACKUP_PATH_NOT_ON_PERSISTENT_DISK");
    expect(result.status).toBe("FAIL");
  });

  it("TEST 7: non-production does not require /var/data", () => {
    const { result } = verifyWith({
      env: productionEnv({
        NODE_ENV: "test",
        BUZZARD_DB_PATH: "/workspace/server/data/buzzard.db",
        BUZZARD_BACKUP_DIR: "/workspace/server/data/backups",
      }),
      resolveDbPath: () => "/workspace/server/data/buzzard.db",
      resolveBackupDir: () => "/workspace/server/data/backups",
      fs: mockFs(
        { "/workspace/server/data/buzzard.db": { size: 8, mtime: "2026-10-03T00:00:00.000Z" } },
        { "/workspace/server/data": {}, "/workspace/server/data/backups": {} }
      ),
      db: fakeDb({ mainPath: "/workspace/server/data/buzzard.db" }),
    });
    expect(result.environment.nodeEnv).toBe("test");
    expect(result.reasons).not.toContain("PRODUCTION_DB_NOT_ON_PERSISTENT_DISK");
    expect(result.persistence.persistent).toBe(false);
    expect(result.verification.checksPassed).toContain("non_production_path_requirement_skipped");
  });

  it("TEST 8: sales enabled fails safety", () => {
    const { result } = verifyWith({
      env: productionEnv({ BUZZARD_SALES_ENABLED: "1" }),
    });
    expect(result.reasons).toContain("SALES_NOT_LOCKED");
    expect(result.safety.salesLocked).toBe(false);
    expect(result.status).toBe("FAIL");
  });

  it("TEST 9: product SoT active fails safety", () => {
    const { result } = verifyWith({
      env: productionEnv({ BUZZARD_PRODUCT_SOT_ACTIVE: "1" }),
    });
    expect(result.reasons).toContain("PRODUCT_SOT_NOT_LOCKED");
    expect(result.safety.productSotLocked).toBe(false);
    expect(result.status).toBe("FAIL");
  });

  it("TEST 10: verification does not mutate the database", () => {
    const mutations = [];
    verifyWith({ db: fakeDb({ mainPath: "/var/data/buzzard.db", mutations }) });
    expect(mutations).toEqual([]);
  });

  it("TEST 11: secrets and PII are not exposed", () => {
    const { result } = verifyWith();
    expect(containsForbiddenPayload(result)).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/ADMIN_PASSWORD|JWT_SECRET|password/i);
  });

  it("TEST 12: public health does not expose DB path", () => {
    const { result } = verifyWith();
    const pub = toPublicDbHealth(result);
    expect(pub.database.connected).toBe(true);
    expect(pub.persistence.mode).toBe("render_persistent_disk");
    expect(pub.salesEnabled).toBe(false);
    expect(JSON.stringify(pub)).not.toContain("/var/data");
    expect(pub.database.path).toBeUndefined();
  });

  it("TEST 13: admin endpoint requires RBAC", () => {
    expect(PUBLIC_ROUTES.has("GET /api/admin/system/production-db-verification")).toBe(false);
    expect(EXACT["GET /api/admin/system/production-db-verification"]).toBe("system.read");
    expect(resolveRoutePermission("GET", "/api/admin/system/production-db-verification")).toEqual({
      permission: "system.read",
    });
  });

  it("TEST 14: verificationId is generated", () => {
    const { result } = verifyWith();
    expect(result.verification.verificationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("TEST 15: correlationId is propagated", () => {
    const { result } = verifyWith({ correlationId: "corr_abc123" });
    expect(result.verification.correlationId).toBe("corr_abc123");
  });
});
