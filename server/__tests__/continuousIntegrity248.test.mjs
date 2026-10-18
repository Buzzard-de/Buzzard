import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("system failure classification by code", () => {
  it("classifySystemFailure uses codes and names, not free-text UNIQUE/timeout", () => {
    const { classifySystemFailure } = require("../lib/security.js");
    expect(classifySystemFailure({ name: "AbortError", message: "UNIQUE jwt timeout" })).toBe("TIMEOUT");
    expect(classifySystemFailure({ code: "ETIMEDOUT" })).toBe("TIMEOUT");
    expect(classifySystemFailure({ code: "ECONNRESET", message: "sql network timeout" })).toBe("NETWORK");
    expect(classifySystemFailure({ code: "SQLITE_BUSY" })).toBe("DATABASE");
    expect(classifySystemFailure({ code: "SQLITE_CONSTRAINT_UNIQUE" })).toBe("CONFLICT");
    expect(classifySystemFailure(new Error("timeout network sql provider"))).toBe(null);
  });

  it("jobWorker classifyError does not substring-scan err.message", () => {
    const { classifyError } = require("../lib/jobWorker.js");
    const src = fs.readFileSync(path.join(__dirname, "../lib/jobWorker.js"), "utf8");
    expect(src).not.toMatch(/msg\.includes/);
    expect(classifyError({ failureKind: "PROVIDER" })).toBe("PROVIDER");
    expect(classifyError({ code: "ECONNREFUSED", message: "fetch timeout sql" })).toBe("NETWORK");
    expect(classifyError(new Error("timeout network sql provider"))).toBe("UNKNOWN");
  });

  it("exceptions prefer sqlite/network codes over message text", () => {
    const pusat = require("../lib/pusat");
    const db = pusat.exceptions.classify({ code: "SQLITE_IOERR", message: "timeout unauthorized" }, { action: "prices.update" });
    expect(db.code).toBe("PUSAT_DATABASE_FAILURE");
    const net = pusat.exceptions.classify({ code: "ENOTFOUND", message: "timeout" }, { action: "prices.update" });
    expect(net.code).toBe("PUSAT_PROVIDER_UNAVAILABLE");
  });

  it("API payload-too-large and static 403 use codes only", () => {
    const src = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
    expect(src).not.toMatch(/error\.message === ["']Payload too large["']/);
    expect(src).toMatch(/error\.code === ["']PAYLOAD_TOO_LARGE["']/);
    expect(src).toMatch(/publicErrorBody\(['"]security\.forbidden['"]\)/);
    expect(src).not.toMatch(/Zugriff verweigert/);
  });

  it("desktop-bridge HTTP 401/404 and stderr use keys", () => {
    const http = fs.readFileSync(path.join(__dirname, "../../desktop-bridge/src/http.js"), "utf8");
    const index = fs.readFileSync(path.join(__dirname, "../../desktop-bridge/src/index.js"), "utf8");
    expect(http).toMatch(/errorKey:\s*"BRIDGE_UNAUTHORIZED"/);
    expect(http).toMatch(/errorKey:\s*"BRIDGE_NOT_FOUND"/);
    expect(http).not.toMatch(/error:\s*"Unauthorized"/);
    expect(index).not.toMatch(/error\.message/);
    expect(index).toMatch(/BRIDGE_PORT_IN_USE/);
  });

  it("automation dashboard counts timeout/cost by keys not substrings", () => {
    const src = fs.readFileSync(path.join(__dirname, "../lib/pusat/automations.js"), "utf8");
    expect(src).not.toMatch(/includes\(["']timeout["']\)/);
    expect(src).not.toMatch(/includes\(["']cost["']\)/);
    expect(src).toMatch(/EXCEPTION_CODES\.TASK_TIMEOUT/);
    expect(src).toMatch(/EXCEPTION_CODES\.MISSING_COST/);
  });
});
