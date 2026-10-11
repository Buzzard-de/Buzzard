import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Pusat memory", () => {
  let pusat;
  let db;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    db = require("../lib/db").db;
    pusat.initialize(db);
  });

  it("persists writes in SQLite and reads them back", () => {
    const written = pusat.memory.writeMemory({
      kind: "verified_fact",
      subject: `mem-persist-${Date.now()}`,
      content: { sku: "PUSAT-MEM-1", confirmed: true },
      source: "unit-test",
      agentId: "price_ai",
    });
    expect(written.ok).toBe(true);
    const row = db.prepare("SELECT * FROM core_ai_memory WHERE id = ?").get(written.record.id);
    expect(row).toBeTruthy();
    expect(row.kind).toBe("verified_fact");
    const read = pusat.memory.getMemory(written.record.id, { role: "admin" });
    expect(read.content.sku).toBe("PUSAT-MEM-1");
    expect(pusat.memory.memoryHealth().persistent).toBe(true);
    expect(pusat.memory.memoryHealth().backend).toBe("sqlite");
  });

  it("rejects secret-bearing content and invalid kinds", () => {
    const secret = pusat.memory.writeMemory({
      kind: "verified_fact",
      subject: "secret-test",
      content: { api_key: "should-not-store" },
      source: "unit-test",
    });
    expect(secret.ok).toBe(false);
    expect(secret.error).toBe("sensitive_field_rejected");

    const invalid = pusat.memory.writeMemory({
      kind: "not_a_kind",
      subject: "bad",
      content: { a: 1 },
    });
    expect(invalid.ok).toBe(false);
  });

  it("records conflicts when the same subject changes", () => {
    const subject = `mem-conflict-${Date.now()}`;
    const first = pusat.memory.writeMemory({
      kind: "unverified_observation",
      subject,
      content: { value: 1 },
      source: "a",
    });
    const second = pusat.memory.writeMemory({
      kind: "unverified_observation",
      subject,
      content: { value: 2 },
      source: "b",
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.conflict).toBe(true);
    expect(second.conflictOf).toBe(first.record.id);
  });

  it("denies memory to unauthorized roles", () => {
    const written = pusat.memory.writeMemory({
      kind: "derived_analysis",
      subject: `mem-acl-${Date.now()}`,
      content: { n: 1 },
      accessRoles: ["admin"],
    });
    const denied = pusat.memory.getMemory(written.record.id, { role: "anonymous" });
    expect(denied.denied).toBe(true);
  });
});

describe("Pusat Guardian", () => {
  let pusat;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    pusat.guardian.resetRateLimiter();
  });

  it("allows a permitted read tool and denies a missing permission", () => {
    const employee = {
      id: "price_ai",
      status: "ACTIVE",
      permissions: ["products.read", "ai.execute"],
      tools: ["stock.evaluate"],
    };
    const allowed = pusat.guardian.evaluate({
      agentId: "price_ai",
      employee,
      action: "price.recommend",
      tool: "stock.evaluate",
      payload: { sku: "X" },
      permissionsRequired: ["products.read"],
    });
    expect(allowed.allowed).toBe(true);

    const denied = pusat.guardian.evaluate({
      agentId: "price_ai",
      employee,
      action: "prices.update",
      payload: { sku: "X" },
      permissionsRequired: ["prices.update"],
    });
    expect(denied.allowed).toBe(false);
    expect(denied.code).toBe("PUSAT_PERMISSION_DENIED");
  });

  it("rejects secret payloads and requires approval for sensitive actions", () => {
    const employee = { id: "esat_bey", status: "ACTIVE", permissions: ["security.read", "ai.execute"] };
    const secrets = pusat.guardian.evaluate({
      agentId: "esat_bey",
      employee,
      action: "inspect",
      payload: { token: "abc" },
    });
    expect(secrets.allowed).toBe(false);

    const sensitive = pusat.guardian.evaluate({
      agentId: "esat_bey",
      employee,
      action: "refund.issue",
      payload: { orderNumber: "1" },
      permissionsRequired: [],
    });
    expect(sensitive.allowed).toBe(true);
    expect(sensitive.requireApproval).toBe(true);
  });

  it("blocks paused agents", () => {
    const result = pusat.guardian.evaluate({
      agentId: "price_ai",
      employee: { id: "price_ai", status: "PAUSED", permissions: ["ai.execute"] },
      action: "price.recommend",
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("PUSAT_AGENT_UNAVAILABLE");
  });
});
