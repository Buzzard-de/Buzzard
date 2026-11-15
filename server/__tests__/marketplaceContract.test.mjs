import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const hub = require("../lib/marketplaceHub.js");
const v35 = require("../lib/marketplaceV35.js");
const carriers = require("../lib/commerce/carrierAdapters.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

function closed(result) {
  assert.equal(result.ok, false);
  assert.equal(result.live, false);
  assert.equal(result.stored, false);
  assert.equal(result.published, false);
}

test("marketplace and carrier contracts do not publish or connect", () => {
  assert.equal(isSalesEnabled(), false);
  assert.deepEqual(hub.CHANNELS.map((row) => row[0]), ["amazon", "ebay", "google_shopping", "tiktok_shop"]);
  for (const [code] of hub.CHANNELS) {
    closed(hub.upsertListing({ marketplace: code, productSku: "SYN", price: 12, stock: 4, status: "active" }));
    assert.equal(hub.upsertListing({ marketplace: code }).code, "LISTING_NOT_LIVE");
    closed(hub.upsertSkuMapping({ marketplace: code, productSku: "SYN", channelSku: "CH-1" }));
    const account = hub.updateMarketplace(code, { enabled: true, accountLabel: "live-shop" });
    closed(account);
    assert.equal(account.connected, false);
    assert.equal(account.enabled, false);
  }
  for (const call of [hub.queueStockSync(), hub.queuePriceSync(), hub.queueOrderSync(), hub.updateSyncJobResult("1", { status: "success" })]) {
    closed(call);
    assert.equal(call.queued, 0);
  }
  const imported = hub.importOrderWebhook({ marketplace: "amazon", externalOrderId: "A-1", total: 10 });
  closed(imported);
  assert.equal(imported.orderImported, false);

  for (const code of ["amazon", "ebay", "google_shopping", "tiktok_shop"]) {
    const created = v35.createRecord({ code, name: code, status: "active" });
    assert.equal(created.created, false);
    assert.equal(created.live, false);
    assert.equal(created.published, false);
    assert.equal(created.stored, false);
  }
  assert.equal(v35.updateRecord(1, { status: "active" }).stored, false);
  assert.equal(v35.createJob({ type: "sync" }).queued, false);

  const rows = carriers.inventory();
  assert.equal(rows.length, 27 * (carriers.NETWORKS.length + 1));
  assert.equal(rows.every((row) => row.live === false && row.connected === false && row.auth === false), true);
  const label = carriers.dryRun({ network: "DHL", destination: "DE", action: "label" });
  assert.equal(label.code, "LIVE_SHIPMENT_BLOCKED");
  assert.equal(label.live, false);
  const quote = carriers.dryRun({ network: "DHL", destination: "DE", action: "quote" });
  assert.equal(quote.live, false);
  assert.equal(quote.shippingCost, null);
});
