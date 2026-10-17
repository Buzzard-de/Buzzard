import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("items 39/40 — lifecycle and orchestrator task errors", () => {
  let controlCenter;
  let pusat;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    controlCenter = require("../lib/controlCenter");
    pusat.initialize(require("../lib/db").db);
  });

  it("publicTaskError never returns SQL, stacks, or paths", () => {
    const { publicTaskError } = require("../lib/security.js");
    const err = new Error("SQLITE_ERROR: no such table /var/data/buzzard.db\n    at Object.run");
    expect(publicTaskError(err, "ai.task.failed")).toBe("ai.task.failed");
    err.code = "PROVIDER_UNAVAILABLE";
    expect(publicTaskError(err, "ai.task.failed")).toBe("PROVIDER_UNAVAILABLE");
    expect(publicTaskError({ error: "sk_live_abc123XYZ leaked" }, "ai.provider.failed")).toBe(
      "ai.provider.failed"
    );
  });

  it("mapped task API rows sanitize stored exception text", () => {
    const submitted = pusat.submitTask({
      title: "Integrity error storage",
      agentCode: "price_assistant",
      payload: { supplierCost: 10, salePrice: 20, sku: "PUSAT-ERR-SANITIZE" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const updated = controlCenter.updateTaskStatus(submitted.task.id, "FAILED", {
      error: "SQLITE_ERROR: no such table /var/data/secret.db",
    });
    expect(updated.error).toBe("ai.task.failed");
    expect(JSON.stringify(updated)).not.toContain("SQLITE_ERROR");
    expect(JSON.stringify(updated)).not.toContain("/var/data");
    const fetched = controlCenter.getAiTask(submitted.task.id);
    expect(fetched.error).toBe("ai.task.failed");
  });

  it("lifecycle and orchestrator no longer write err.message onto tasks or escalations", () => {
    const lifecycle = fs.readFileSync(path.join(__dirname, "../lib/pusat/lifecycle.js"), "utf8");
    const orchestrator = fs.readFileSync(path.join(__dirname, "../lib/aiOrchestrator.js"), "utf8");
    expect(lifecycle).not.toMatch(/updateTaskStatus\([^\)]*error:\s*(err|error)\.message/);
    expect(lifecycle).not.toMatch(/message:\s*err\.message/);
    expect(orchestrator).not.toMatch(/error:\s*err\.message/);
    expect(orchestrator).not.toMatch(/message:\s*err\.message/);
    expect(orchestrator).not.toMatch(/providerResult\.message/);
    expect(lifecycle).toMatch(/publicTaskError/);
    expect(orchestrator).toMatch(/publicTaskError/);
  });

  it("successful specialist execution still completes", async () => {
    const submitted = pusat.submitTask({
      title: "Price check after error-key change",
      agentCode: "price_assistant",
      payload: { supplierCost: 12, shippingCost: 2, salePrice: 22, sku: "PUSAT-PRICE-241" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const result = await pusat.executeTask(submitted.task.id);
    expect(result.status).toBe("COMPLETED");
    expect(result.error).toBeNull();
    expect(result.result.output.invented).toBe(false);
  });
});
