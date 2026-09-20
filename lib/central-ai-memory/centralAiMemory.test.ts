import { describe, it, expect, beforeEach } from "vitest";
import { resetCentralMemoryStoreForTests, writeMemory, listMemories } from "./store";

describe("central-ai-memory", () => {
  beforeEach(() => resetCentralMemoryStoreForTests());

  it("denies secret-like payloads", () => {
    const r = writeMemory({
      type: "FACT",
      scope: "GLOBAL",
      scopeKey: "x",
      sensitivity: "INTERNAL",
      payloadSummary: "token=abc123",
      confidence: 0.5,
      sourceType: "TEST",
      sourceId: "1",
      createdBy: "SYSTEM",
    });
    expect(r.ok).toBe(false);
  });

  it("allows public product facts", () => {
    const r = writeMemory({
      type: "FACT",
      scope: "PRODUCT",
      scopeKey: "SKU-1",
      sensitivity: "PUBLIC",
      payloadSummary: "Category: brakes",
      confidence: 0.9,
      sourceType: "PRODUCT_ENGINE",
      sourceId: "pe",
      createdBy: "SYSTEM",
    });
    expect(r.ok).toBe(true);
    expect(listMemories({ scope: "PRODUCT" }).length).toBe(1);
  });
});
