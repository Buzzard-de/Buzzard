import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const links = require("../lib/commerce/integrationLinks");
const { createStore, runIsolatedOrder } = require("../lib/commerce/isolatedOrder");

test("customs holds a dual-use item and an invented freight price is not attached", () => {
  const held = links.routeShipment({ sku: "encryption_module", origin: "DE", destination: "FR" });
  const sanctioned = links.routeShipment({ sku: "brake_pad", origin: "DE", destination: "KP" });
  const lane = links.routeShipment({ sku: "brake_pad", origin: "DE", destination: "FR" });
  assert.equal(held.code, "SHIPMENT_HELD");
  assert.equal(held.laneAttached, false);
  assert.equal(sanctioned.code, "SHIPMENT_HELD");
  assert.equal(lane.shippingPrice, "UNKNOWN");
  assert.equal(lane.inventedPriceDiscarded, true);
  assert.equal(JSON.stringify(lane).includes("8.9"), false);
  assert.equal(lane.liveCarrier, false);
});

test("holds release, rate-limit, and refuse secrets in an isolated file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-links-"));
  const holds = links.openHolds(path.join(dir, "holds.sqlite"));
  const first = holds.reserve({ key: "k1", qty: 2 });
  const second = holds.reserve({ key: "k1", qty: 9 });
  const released = holds.release("k1");
  let limited = null;
  for (let i = 0; i < 6; i += 1) limited = holds.reserve({ key: `b${i}`, actor: "burst" });
  const secret = holds.reserve({ key: "s", sku: "sk_live_example" });
  assert.equal(first.code, "RESERVED");
  assert.equal(second.code, "DUPLICATE_HOLD");
  assert.equal(second.qty, 2);
  assert.equal(released.held, 0);
  assert.equal(limited.code, "RATE_LIMITED");
  assert.equal(secret.code, "SECRET_REJECTED");
  assert.equal(secret.stored, false);
  holds.close();
  assert.throws(() => links.openHolds(path.join(dir, "buzzard.db")), /DEV_DB_FORBIDDEN/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("council, voice, report redaction, and the link checkpoint stay offline", () => {
  const council = links.councilThink();
  assert.equal(council.agents, 17);
  assert.equal(council.denied, "UNAUTHORIZED_KIND");
  const voice = links.voiceBoundary();
  assert.equal(voice.liveCalls, false);
  assert.equal(voice.clone, "CLONE_DENIED");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-links-order-"));
  const store = createStore({ dbPath: path.join(dir, "order.sqlite") });
  const order = runIsolatedOrder({ scenario: "happy", store, orderId: "SYN-LINK" });
  const redacted = links.reportOrder(order);
  assert.equal(redacted.exportedRawCustomer, false);
  assert.equal(JSON.stringify(redacted.report).includes("SYN-CUST"), false);
  const report = links.runLinks({
    holdPath: path.join(dir, "holds.sqlite"),
    checkpointPath: path.join(dir, "checkpoint.json"),
    order,
  });
  assert.equal(report.liveVerified, false);
  assert.equal(report.softwareCompleted, report.softwareTasks);
  assert.equal(report.tasks.every((task) => task.status === "TEST_COMPLETE"), true);
  assert.equal(report.blocked.find((task) => task.id === "LIVE_VOICE_CALL").status, "HUMAN_APPROVAL_REQUIRED");
  store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
