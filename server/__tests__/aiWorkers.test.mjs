import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  rejectClientExecutionModification,
  validateWorkerIdentity,
} from "../core/aiWorkersRegistry.js";

describe("Server AI Workers Registry", () => {
  it("rejects client validation status modification", () => {
    const result = rejectClientExecutionModification({ validationStatus: "PASSED" });
    assert.equal(result.allowed, false);
  });

  it("rejects client recommendation modification", () => {
    const result = rejectClientExecutionModification({ recommendation: { price: 99 } });
    assert.equal(result.allowed, false);
  });

  it("rejects credentials in payload", () => {
    const result = rejectClientExecutionModification({ apiKey: "secret" });
    assert.equal(result.allowed, false);
  });

  it("validates worker identity", () => {
    assert.equal(validateWorkerIdentity("PRODUCT_AI", "PRODUCT_AI"), true);
    assert.equal(validateWorkerIdentity("PRODUCT_AI", "SUPPLIER_AI"), false);
  });
});
