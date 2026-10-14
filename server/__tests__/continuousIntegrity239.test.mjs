import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("item 193 — redact secret-shaped strings without mutating input", () => {
  it("redacts nested secret values and leaves the original object intact", () => {
    const { redactForLog } = require("../lib/security.js");
    const original = {
      note: "provider token sk_live_abc123XYZ",
      nested: { header: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb" },
      safe: "order-42",
    };
    const copy = JSON.parse(JSON.stringify(original));
    const redacted = redactForLog(original);
    expect(original).toEqual(copy);
    expect(JSON.stringify(redacted)).not.toContain("sk_live_abc123XYZ");
    expect(JSON.stringify(redacted)).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(redacted.safe).toBe("order-42");
    expect(redacted.note).toContain("[redacted]");
  });
});

describe("items 15/31 — automation health probes", () => {
  it("does not attach exception text to collectHealth failures", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "../plugins/aiAutomationPlugin.js"),
      "utf8"
    );
    expect(src).not.toMatch(/error:\s*error\.message/);
    expect(src).not.toMatch(/error:\s*err\.message/);
    expect(src).toMatch(/health\.probeFailed/);
  });
});

describe("items 98/99 — payment session errors stay public-key only", () => {
  it("maps provider failures to stable codes", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "../lib/commercialIntegrations.js"),
      "utf8"
    );
    expect(src).toMatch(/stripe\.session_failed/);
    expect(src).toMatch(/paypal\.auth_failed/);
    expect(src).not.toMatch(/throw new Error\(data\.error/);
    expect(src).not.toMatch(/throw new Error\(tokenData/);
  });
});

describe("item 117 — VAT messages do not echo request input", () => {
  it("fail-closes unknown country/category without interpolating the input", () => {
    const tax = require("../lib/commerce/taxProvider.js");
    const unknown = tax.calculateTax({ country: "XX<script>", subtotal: 10 });
    expect(unknown.ok).toBe(false);
    expect(unknown.invented).toBe(false);
    expect(JSON.stringify(unknown)).not.toContain("<script>");
    const category = tax.calculateTax({ country: "DE", subtotal: 10, category: "tires-secret" });
    expect(category.code).toBe("tax_category_rate_unknown");
    expect(JSON.stringify(category)).not.toContain("tires-secret");
  });
});

describe("item 43 — job errors are classified for clients", () => {
  it("replaces free-text worker errors with a stable public key", () => {
    const { sanitizePublicJobError } = require("../lib/jobQueue.js");
    expect(sanitizePublicJobError("SQLITE_ERROR: no such table /var/data/secret")).toBe("job.failed");
    expect(sanitizePublicJobError("TIMEOUT")).toBe("TIMEOUT");
    expect(sanitizePublicJobError(null)).toBeNull();
  });
});

describe("item 36 — sales agent database failures stay coded", () => {
  it("does not include exception.message on database_failure", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "../lib/pusat/agents.js"),
      "utf8"
    );
    expect(src).not.toMatch(/AGENT_CODES\.SALES[\s\S]{0,120}message: error\.message/);
  });
});
