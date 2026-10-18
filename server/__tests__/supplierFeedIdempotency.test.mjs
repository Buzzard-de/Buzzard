import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("supplier feed preview idempotency (item 93)", () => {
  beforeEach(() => {
    require("../lib/software/supplierFeeds").resetPreviewIdempotency();
  });

  it("replays the same key without a live fetch or write", () => {
    const software = require("../lib/software");
    const payload = "sku,price,currency,stock\nSKU-1,10,EUR,3\n";
    const first = software.supplierFeeds.previewIdempotent({
      format: "csv",
      payload,
      supplierId: "fixture",
      idempotencyKey: "feed-1",
    });
    const second = software.supplierFeeds.previewIdempotent({
      format: "csv",
      payload,
      supplierId: "fixture",
      idempotencyKey: "feed-1",
    });
    expect(first.live).toBe(false);
    expect(first.written).toBe(false);
    expect(first.purchaseOrderSent).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.written).toBe(false);
    expect(second.live).toBe(false);
  });

  it("conflicts when the same key carries a different payload", () => {
    const software = require("../lib/software");
    software.supplierFeeds.previewIdempotent({
      format: "csv",
      payload: "sku,price,currency,stock\nSKU-1,10,EUR,3\n",
      idempotencyKey: "feed-2",
    });
    const conflict = software.supplierFeeds.previewIdempotent({
      format: "csv",
      payload: "sku,price,currency,stock\nSKU-2,11,EUR,1\n",
      idempotencyKey: "feed-2",
    });
    expect(conflict.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(conflict.written).toBe(false);
    expect(conflict.live).toBe(false);
  });
});
