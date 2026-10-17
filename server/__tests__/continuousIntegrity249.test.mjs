import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("exception classify without free-text inference", () => {
  it("maps HTTP status and pusat codes, not message substrings", () => {
    const pusat = require("../lib/pusat");
    expect(pusat.exceptions.classify({ status: 401 }, { action: "health.probe" }).code).toBe("PUSAT_AUTH_FAILED");
    expect(pusat.exceptions.classify({ status: 429 }, { action: "health.probe" }).code).toBe("PUSAT_RATE_LIMIT");
    expect(pusat.exceptions.classify(new Error("401 unauthorized timeout guardian"), { action: "health.probe" }).code).toBe(
      "PUSAT_UNKNOWN"
    );
    expect(pusat.exceptions.classify(new Error("timeout"), { action: "payment.refund" }).code).toBe("PUSAT_SENSITIVE_NO_RETRY");
    expect(pusat.exceptions.classify(new Error("timeout"), { action: "payment.refund" }).retryable).toBe(false);
  });

  it("exceptions.js no longer substring-scans error text", () => {
    const src = fs.readFileSync(path.join(__dirname, "../lib/pusat/exceptions.js"), "utf8");
    expect(src).not.toMatch(/function inferCode/);
    expect(src).not.toMatch(/text\.includes\(["']timeout["']\)/);
    expect(src).not.toMatch(/unauthorized\|unauthenticated/);
    expect(src).toMatch(/httpStatusExceptionCode/);
  });

  it("contact file IO logs publicTaskError keys", () => {
    const src = fs.readFileSync(path.join(__dirname, "../plugins/contactStoragePlugin.js"), "utf8");
    expect(src).toMatch(/publicTaskError\(err, 'contact\.readFailed'\)/);
    expect(src).toMatch(/publicTaskError\(err, 'contact\.writeFailed'\)/);
    expect(src).not.toMatch(/console\.error\('Error reading submissions file:', err\)/);
    expect(src).not.toMatch(/console\.error\('Error writing submissions file:', err\)/);
  });
});
