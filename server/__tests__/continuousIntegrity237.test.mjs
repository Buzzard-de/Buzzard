import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("item 21 — public error contracts", () => {
  it("strips stack traces and free-text from public error bodies", () => {
    const { publicErrorBody, toPublicError, sanitizeErrorKey } = require("../lib/security.js");
    expect(publicErrorBody("ENOENT: no such file /var/data/secret").errorKey).toBe("security.internalError");
    expect(toPublicError({ error: "disk full at /var/data" }).errorKey).toBe("security.internalError");
    expect(toPublicError({ errorKey: "ai.task.createFailed" }).errorKey).toBe("ai.task.createFailed");
    expect(toPublicError({ code: "PRODUCTION_EPHEMERAL_PATH" }).errorKey).toBe("PRODUCTION_EPHEMERAL_PATH");
    expect(JSON.stringify(toPublicError(new Error("EACCES /etc/passwd")))).not.toContain("/etc/passwd");
    expect(sanitizeErrorKey("ok.key-1")).toBe("ok.key-1");
  });
});

describe("item 28 — commerce idempotency fingerprint", () => {
  it("replays matching payloads and returns 409 on fingerprint conflict", () => {
    const idempotency = require("../lib/commerce/idempotency.js");
    const key = `fp-${crypto.randomBytes(4).toString("hex")}`;
    const fpA = idempotency.fingerprintOf({ productId: "p1", quantity: 1 });
    const fpB = idempotency.fingerprintOf({ productId: "p1", quantity: 2 });
    const first = idempotency.withIdempotency({
      key,
      scope: "unit-fp",
      fingerprint: fpA,
      handler: () => ({ ok: true, id: "once" }),
    });
    const replay = idempotency.withIdempotency({
      key,
      scope: "unit-fp",
      fingerprint: fpA,
      handler: () => ({ ok: false, id: "twice" }),
    });
    const conflict = idempotency.withIdempotency({
      key,
      scope: "unit-fp",
      fingerprint: fpB,
      handler: () => ({ ok: false, id: "other" }),
    });
    expect(first.id).toBe("once");
    expect(replay.idempotencyReplay).toBe(true);
    expect(replay.id).toBe("once");
    expect(conflict.status).toBe(409);
    expect(conflict.error).toBe("idempotency_conflict");
    expect(conflict.conflict).toBe(true);
  });

  it("does not store failed commerce results for replay", () => {
    const idempotency = require("../lib/commerce/idempotency.js");
    const key = `err-${crypto.randomBytes(4).toString("hex")}`;
    let calls = 0;
    idempotency.withIdempotency({
      key,
      scope: "unit-err",
      handler: () => {
        calls += 1;
        return { error: "cart_not_found", status: 404 };
      },
    });
    const second = idempotency.withIdempotency({
      key,
      scope: "unit-err",
      handler: () => {
        calls += 1;
        return { ok: true, id: "recovered" };
      },
    });
    expect(calls).toBe(2);
    expect(second.id).toBe("recovered");
  });
});

describe("item 29 — correlation id sanitization", () => {
  it("rejects header injection and oversize incoming ids", () => {
    const correlation = require("../lib/operations/correlationContext.js");
    expect(correlation.acceptIncomingId("req_ok-1")).toBe("req_ok-1");
    expect(correlation.acceptIncomingId("bad\ninjected")).toBeUndefined();
    expect(correlation.acceptIncomingId("x".repeat(200))).toBeUndefined();
    expect(correlation.acceptIncomingId("id with space")).toBeUndefined();
    const ctx = correlation.createContext({
      requestId: "evil\nX-Injected: 1",
      correlationId: "<script>alert(1)</script>",
      jobId: "job_ok-2",
    });
    expect(ctx.requestId).toMatch(/^req_/);
    expect(ctx.correlationId).toMatch(/^corr_/);
    expect(ctx.jobId).toBe("job_ok-2");
  });
});

describe("item 40 — pusat public submit errors", () => {
  it("maps pusat submit failures to safe error keys without exception text", () => {
    const { toPublicError } = require("../lib/security.js");
    const leaked = toPublicError(
      { message: "SQLITE_ERROR: no such table core_secret" },
      "pusat.task.submitFailed"
    );
    expect(leaked.errorKey).toBe("pusat.task.submitFailed");
    expect(JSON.stringify(leaked)).not.toContain("SQLITE_ERROR");
    expect(JSON.stringify(leaked)).not.toContain("core_secret");
  });
});

describe("item 85 — reservation expire parses sqlite stamps", () => {
  it("expires sqlite-formatted created_at and does not leak reserve errors", () => {
    const inventory = require("../lib/software/inventory.js");
    const { db } = require("../lib/db");
    require("../lib/software").initialize(db);
    const sku = `SKU-SQL-${Date.now()}`;
    const held = inventory.reserve(db, {
      sku,
      requestQuantity: 1,
      source: "supplier_feed",
      quantity: 4,
      lastSupplierUpdate: new Date().toISOString(),
      idempotencyKey: `res-${sku}`,
    });
    expect(held.ok).toBe(true);
    const sqliteStamp = new Date(Date.now() - 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, "");
    db.prepare("UPDATE software_reservations SET created_at = ? WHERE id = ?").run(
      sqliteStamp,
      held.reservation.id
    );
    const expired = inventory.expireDue(db, { sku, olderThanMs: 10 * 60 * 1000 });
    expect(expired.ok).toBe(true);
    expect(expired.expired).toBeGreaterThanOrEqual(1);
    const row = db.prepare("SELECT status FROM software_reservations WHERE id = ?").get(held.reservation.id);
    expect(row.status).toBe("EXPIRED");
    expect(inventory.reservedQuantity(db, sku)).toBe(0);
  });
});

describe("item 93/105 — job idempotency retry policy", () => {
  it("retries failed backup jobs but never retries financial operations", () => {
    const idempotency = require("../lib/operations/jobIdempotency.js");
    const { OPERATIONS_STATUS } = require("../core/operationsConstants.js");

    const backupKey = `bak-${crypto.randomBytes(4).toString("hex")}`;
    const first = idempotency.beginOperation({
      operation: "BACKUP",
      scope: "test",
      idempotencyKey: backupKey,
    });
    expect(first.ok).toBe(true);
    idempotency.failOperation(first.idempotencyKey, "disk_busy");
    const retry = idempotency.beginOperation({
      operation: "BACKUP",
      scope: "test",
      idempotencyKey: backupKey,
    });
    expect(retry.ok).toBe(true);
    expect(retry.retried).toBe(true);

    const payKey = `pay-${crypto.randomBytes(4).toString("hex")}`;
    const charge = idempotency.beginOperation({
      operation: "payment_or_refund",
      scope: "pusat",
      idempotencyKey: payKey,
    });
    idempotency.failOperation(charge.idempotencyKey, "provider_timeout");
    const refused = idempotency.beginOperation({
      operation: "payment_or_refund",
      scope: "pusat",
      idempotencyKey: payKey,
    });
    expect(refused.ok).toBe(false);
    expect(refused.retryable).toBe(false);
    expect(refused.code).toBe("failed_do_not_retry");

    idempotency.failOperation(retry.idempotencyKey, "fatal", { permanent: true });
    const dead = idempotency.beginOperation({
      operation: "BACKUP",
      scope: "test",
      idempotencyKey: backupKey,
    });
    expect(dead.code).toBe("permanently_failed");
    expect(dead.retryable).toBe(false);
    expect(OPERATIONS_STATUS.PERMANENTLY_FAILED).toBe("PERMANENTLY_FAILED");

    const payments = require("../lib/software/payments.js");
    const uncertainRetry = payments.draftCharge({ timeout: true, retry: true });
    expect(uncertainRetry.outcome).toBe("UNCERTAIN");
    expect(uncertainRetry.retryable).toBe(false);
    expect(uncertainRetry.refusedRetry).toBe(true);
  });
});

describe("items 186/195 — backup refuses ephemeral production paths", () => {
  it("assertDurableBackupDir fails closed on /tmp in production", () => {
    const dbPaths = require("../lib/dbPaths.js");
    expect(dbPaths.isEphemeralPath(os.tmpdir())).toBe(true);
    expect(() =>
      dbPaths.assertDurableBackupDir(path.join(os.tmpdir(), "buzzard-backups"), { NODE_ENV: "production" })
    ).toThrow(/ephemeral/);
    expect(() =>
      dbPaths.assertDurableBackupDir(path.join(root, "server", "data", "test-scratch"), { NODE_ENV: "test" })
    ).not.toThrow();
  });

  it("db-backup exits 1 when production backup dir is ephemeral", () => {
    const Database = require("better-sqlite3");
    const sourceDir = path.join(root, "server", "data", "test-scratch", "backup-ephemeral");
    const sourceDb = path.join(sourceDir, "source.db");
    require("node:fs").mkdirSync(sourceDir, { recursive: true });
    const db = new Database(sourceDb);
    db.exec("CREATE TABLE IF NOT EXISTS t (id INTEGER);");
    db.close();
    const result = spawnSync(process.execPath, ["scripts/db-backup.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "production",
        BUZZARD_DB_PATH: sourceDb,
        BUZZARD_BACKUP_DIR: path.join(os.tmpdir(), "buzzard-prod-backups"),
      },
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/PRODUCTION_EPHEMERAL_PATH/);
  });
});
