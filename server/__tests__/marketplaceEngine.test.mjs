import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  rejectClientMarketplaceModification,
  sanitizeClientMarketplacePatch,
  redactMarketplaceSecrets,
} from "../core/marketplaceEngineRegistry.js";

describe("Server Marketplace Engine Registry", () => {
  it("rejects client credential payloads", () => {
    const result = rejectClientMarketplaceModification({ apiKey: "secret-key" });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "CREDENTIALS_NOT_ALLOWED_ON_CLIENT");
  });

  it("rejects client listing id modification", () => {
    const result = rejectClientMarketplaceModification({ marketplaceListingId: "ASIN-123" });
    assert.equal(result.allowed, false);
  });

  it("rejects client price/stock modification", () => {
    assert.equal(rejectClientMarketplaceModification({ price: 1 }).allowed, false);
    assert.equal(rejectClientMarketplaceModification({ stock: 99 }).allowed, false);
  });

  it("sanitizes client marketplace patches", () => {
    const sanitized = sanitizeClientMarketplacePatch(
      { displayName: "Amazon" },
      { displayName: "Changed", marketplaceListingId: "hack" }
    );
    assert.equal(sanitized.displayName, "Changed");
    assert.equal(sanitized.marketplaceListingId, undefined);
  });

  it("redacts secrets from logs", () => {
    const redacted = redactMarketplaceSecrets({ apiSecret: "xyz", name: "Amazon" });
    assert.equal(redacted.apiSecret, "[REDACTED]");
    assert.equal(redacted.name, "Amazon");
  });
});
