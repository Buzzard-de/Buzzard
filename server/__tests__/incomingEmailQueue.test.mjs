import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { processBatch } = require("../lib/customer/incomingEmailQueue.js");

describe("incoming email batch processor", () => {
  it("deduplicates and never auto-sends", () => {
    const msg = {
      from: "buyer@example.com",
      subject: "Bestellung",
      body: "Wo ist meine Bestellung?",
      idempotencyKey: "idem-1",
    };
    const batch = processBatch([msg, msg, { ...msg, subject: "Retoure", body: "Ich möchte retournieren" }]);
    expect(batch.autoSent).toBe(0);
    expect(batch.results.some((r) => r.code === "DUPLICATE_MESSAGE")).toBe(true);
  });
});