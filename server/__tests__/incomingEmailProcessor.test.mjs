import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { processInboundEmail, verifySender } = require("../lib/customer/incomingEmailProcessor.js");

describe("incoming email processor", () => {
  it("classifies tracking mail and does not auto-send", () => {
    const result = processInboundEmail({
      from: "shopper@example.com",
      subject: "Sendungsstatus",
      body: "Wo ist meine Sendung?",
      locale: "de",
    });
    expect(result.ok).toBe(true);
    expect(result.intent).toBe("tracking");
    expect(result.autoSent).toBe(false);
    expect(result.sender.disclosePii).toBe(false);
  });

  it("allows drafts only for verified senders", () => {
    expect(verifySender({ from: "bad" }).ok).toBe(false);
    expect(verifySender({ from: "a@b.de", verifiedCustomerId: "SYN-9" }).disclosePii).toBe(true);
  });
});