import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createStore, runIsolatedOrder } = require("../lib/commerce/isolatedOrder");
const pass = require("../lib/commerce/integrationPass");

test("a second processing of the same order does not create another payment", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-pass-"));
  const dbPath = path.join(dir, "orders.sqlite");
  const store = createStore({ dbPath });
  const first = pass.processOnce({ store, orderId: "SYN-ONCE" });
  const second = pass.processOnce({ store, orderId: "SYN-ONCE" });
  assert.equal(first.code, "RECORDED");
  assert.equal(second.code, "DUPLICATE_ORDER");
  assert.equal(second.order.stages.payment.moneyMoved, false);
  assert.equal(second.order.ledger.length, first.order.ledger.length);
  store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("the integration pass covers the requested flows without live effects", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-pass-"));
  const dbPath = path.join(dir, "orders.sqlite");
  const report = pass.runPass({ dbPath, checkpointPath: path.join(dir, "checkpoint.json") });
  assert.equal(report.liveVerified, false);
  assert.equal(report.productionReady, false);
  assert.equal(report.cursorRunsContinuously, false);
  assert.equal(report.softwareCompleted, report.softwareTasks);
  assert.equal(report.integrationCompletion, 1);
  const failed = report.tasks.filter((task) => task.status !== "TEST_COMPLETE").map((task) => task.id);
  assert.deepEqual(failed, []);
  const layers = pass.securityLayers();
  assert.equal(layers.salesEnabled, false);
  assert.equal(layers.cbdc, "REJECTED_CBDC_POLICY");
  const carrier = pass.carrierChange();
  assert.equal(carrier.from, "IN_TRANSIT");
  assert.equal(carrier.to, "DELAYED");
  assert.equal(carrier.live, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("duplicate scenario is stored, not only returned", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-dup-"));
  const store = createStore({ dbPath: path.join(dir, "orders.sqlite") });
  const duplicate = runIsolatedOrder({ scenario: "duplicate_order", store, orderId: "SYN-DUP" });
  const loaded = store.get("SYN-DUP");
  assert.equal(duplicate.events[1].code, "DUPLICATE_ORDER");
  assert.equal(loaded.scenario, "duplicate_order");
  assert.equal(loaded.duplicate, true);
  assert.equal(loaded.live, false);
  store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
