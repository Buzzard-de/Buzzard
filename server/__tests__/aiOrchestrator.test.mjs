import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  rejectClientTaskModification,
  canCustomerAccessTask,
  sanitizeClientTaskPatch,
} from "../core/aiOrchestratorRegistry.js";

describe("Server AI Orchestrator Registry", () => {
  it("rejects client status modification", () => {
    const result = rejectClientTaskModification({ status: "COMPLETED" });
    assert.equal(result.allowed, false);
  });

  it("rejects client authority modification", () => {
    const result = rejectClientTaskModification({ authorityLevel: "EXECUTE_LOW_RISK" });
    assert.equal(result.allowed, false);
  });

  it("rejects credentials in payload", () => {
    const result = rejectClientTaskModification({ apiKey: "secret" });
    assert.equal(result.allowed, false);
  });

  it("enforces customer isolation", () => {
    assert.equal(canCustomerAccessTask("cust_a", "cust_b"), false);
    assert.equal(canCustomerAccessTask("cust_a", "cust_a"), true);
    assert.equal(canCustomerAccessTask(undefined, "cust_a"), false);
  });

  it("sanitizes client task patches", () => {
    const sanitized = sanitizeClientTaskPatch(
      { entityId: "prod_1" },
      { entityId: "prod_2", recommendation: { price: 99 } }
    );
    assert.equal(sanitized.entityId, "prod_2");
    assert.equal(sanitized.recommendation, undefined);
  });
});
