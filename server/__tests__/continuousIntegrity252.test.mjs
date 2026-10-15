import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("KOMUT 5 sqlite unique, contact write, export sanitization", () => {
  it("classifies UNIQUE vs CHECK without exposing constraint text", () => {
    const {
      isUniqueConstraint,
      sqliteConstraintKind,
      publicTaskError,
      toPublicError,
      classifySystemFailure,
    } = require("../lib/security.js");

    const unique = {
      code: "SQLITE_CONSTRAINT",
      message: "UNIQUE constraint failed: software_shipments.tracking_number",
    };
    const check = {
      code: "SQLITE_CONSTRAINT",
      message: "CHECK constraint failed: amount_cents",
    };
    expect(sqliteConstraintKind(unique)).toBe("UNIQUE");
    expect(sqliteConstraintKind(check)).toBe("CHECK");
    expect(isUniqueConstraint(unique)).toBe(true);
    expect(isUniqueConstraint(check)).toBe(false);
    expect(isUniqueConstraint({ code: "SQLITE_CONSTRAINT_CHECK" })).toBe(false);
    expect(classifySystemFailure(unique)).toBe("CONFLICT");
    expect(classifySystemFailure(check)).toBe("DATABASE");
    expect(classifySystemFailure({ code: "SQLITE_BUSY" })).toBe("DATABASE");

    expect(publicTaskError(unique, "ai.task.failed")).toBe("db.uniqueConstraint");
    expect(publicTaskError(unique, "ai.task.failed")).not.toContain("software_shipments");
    expect(publicTaskError(check, "ai.task.failed")).toBe("db.constraint");
    const body = toPublicError(unique, "pusat.task.submitFailed");
    expect(body.errorKey).toBe("db.uniqueConstraint");
    expect(JSON.stringify(body)).not.toMatch(/software_shipments|tracking_number|UNIQUE constraint/);
  });

  it("unique conflicts are non-retryable validation, not generic database retries", () => {
    const pusat = require("../lib/pusat");
    const unique = pusat.exceptions.classify(
      { code: "SQLITE_CONSTRAINT_UNIQUE", message: "UNIQUE constraint failed: core_ai_task_meta.idempotency_key" },
      { action: "prices.update" }
    );
    expect(unique.code).toBe("PUSAT_VALIDATION_FAILED");
    expect(unique.retryable).toBe(false);
    expect(unique.message).toBe("PUSAT_VALIDATION_FAILED");
    expect(JSON.stringify(unique)).not.toContain("core_ai_task_meta");

    const io = pusat.exceptions.classify({ code: "SQLITE_IOERR" }, { action: "health.probe" });
    expect(io.code).toBe("PUSAT_DATABASE_FAILURE");
    expect(io.retryable).toBe(true);
  });

  it("submit unique race does not rethrow raw sqlite errors", () => {
    const src = fs.readFileSync(path.join(__dirname, "../lib/pusat/submit.js"), "utf8");
    expect(src).toMatch(/PUSAT_VALIDATION_FAILED/);
    expect(src).toMatch(/PUSAT_DATABASE_FAILURE/);
    expect(src).toMatch(/classified\.errorKey = publicTaskError/);
    expect(src).not.toMatch(/if \(replay\) return replay;\s*}\s*throw error;/);
  });

  it("contact write failure is not reported as success and keeps German UX", () => {
    const plugin = require("../plugins/contactStoragePlugin.js");
    const origWrite = fs.writeFileSync;
    const logs = [];
    const origError = console.error;
    fs.writeFileSync = () => {
      const err = new Error("EACCES: permission denied, open '/workspace/server/data/submissions.json'");
      err.code = "EACCES";
      throw err;
    };
    console.error = (...args) => logs.push(args.map(String).join(" "));
    try {
      expect(plugin.writeSubmissions([{ id: 1, email: "leak@example.com" }])).toBe(false);
    } finally {
      fs.writeFileSync = origWrite;
      console.error = origError;
    }
    const joined = logs.join(" ");
    expect(joined).toMatch(/contact\.writeFailed|EACCES/);
    expect(joined).not.toContain("/workspace/server/data");
    expect(joined).not.toContain("submissions.json");
    expect(joined).not.toContain("permission denied");
    expect(joined).not.toContain("leak@example.com");

    const src = fs.readFileSync(path.join(__dirname, "../plugins/contactStoragePlugin.js"), "utf8");
    expect(src).toMatch(/errorKey: 'contact\.writeFailed'/);
    expect(src).toMatch(/Nachricht konnte nicht gespeichert werden/);
    expect(src).toMatch(/Vielen Dank — Ihre Nachricht wurde erfolgreich empfangen/);
    expect(src).toMatch(/if \(!writeSubmissions\(submissions\)\)/);
  });

  it("customer and analytics exports drop secret-shaped fields", () => {
    const customerSrc = fs.readFileSync(path.join(__dirname, "../lib/customerStore.js"), "utf8");
    expect(customerSrc).toMatch(/password\|secret\|token/);
    expect(customerSrc).not.toMatch(/password_hash, \.\.\.safe/);

    const engine = require("../lib/analyticsEngine.js");
    const exported = engine.buildExport(
      "customers",
      { start: "2020-01-01", end: "2099-01-01" },
      "administrator",
      "json"
    );
    expect(exported.forbidden).not.toBe(true);
    expect(exported.body).not.toMatch(/password_hash|sk_live_|whsec_/);
    const parsed = JSON.parse(exported.body);
    expect(parsed.password_hash).toBeUndefined();
    expect(parsed.apiKey).toBeUndefined();
    if (Array.isArray(parsed.topCustomers)) {
      for (const row of parsed.topCustomers) {
        expect(String(row.email || "")).toMatch(/\*\*\*/);
      }
    }
  });
});
