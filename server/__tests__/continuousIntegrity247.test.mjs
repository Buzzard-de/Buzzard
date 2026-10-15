import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("sqlite unique constraint classification", () => {
  it("recognizes sqlite unique codes and rejects free-text UNIQUE", () => {
    const { isUniqueConstraint } = require("../lib/security.js");
    expect(isUniqueConstraint({ code: "SQLITE_CONSTRAINT_UNIQUE", message: "anything" })).toBe(true);
    expect(isUniqueConstraint({ code: "SQLITE_CONSTRAINT_PRIMARYKEY" })).toBe(true);
    expect(
      isUniqueConstraint({ code: "SQLITE_CONSTRAINT", message: "UNIQUE constraint failed: software_shipments.tracking_number" })
    ).toBe(true);
    expect(isUniqueConstraint(new Error("UNIQUE jwt must be unique"))).toBe(false);
    expect(isUniqueConstraint({ code: "SQLITE_BUSY", message: "UNIQUE constraint failed" })).toBe(false);
  });

  it("tracking, delivery, submit, and paymentLifecycle classify via isUniqueConstraint", () => {
    const files = [
      "../lib/software/tracking.js",
      "../lib/software/deliveryProof.js",
      "../lib/pusat/submit.js",
      "../lib/software/paymentLifecycle.js",
    ];
    for (const rel of files) {
      const src = fs.readFileSync(path.join(__dirname, rel), "utf8");
      expect(src, rel).toMatch(/isUniqueConstraint/);
      expect(src, rel).not.toMatch(/String\((error|err)\.message[^)]*\)\.includes\(["']UNIQUE["']\)/);
      expect(src, rel).not.toMatch(/\/UNIQUE\|unique\/i/);
      expect(src, rel).not.toMatch(/\/UNIQUE\/i\.test/);
    }
  });

  it("contact plugin does not log email and returns errorKey", () => {
    const src = fs.readFileSync(path.join(__dirname, "../plugins/contactStoragePlugin.js"), "utf8");
    expect(src).not.toMatch(/console\.log\([^)]*email/);
    expect(src).toMatch(/errorKey:\s*'contact\.rateLimited'/);
    expect(src).toMatch(/errorKey:\s*'contact\.received'/);
    expect(src).toMatch(/received:\s*true/);
  });
});
