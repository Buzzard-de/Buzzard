import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const chain = require("../lib/commerce/workflowChain");

test("a low net and a bad price do not create an order", () => {
  const low = chain.offerGate({ offerPrice: 10, supplierCost: 9.8, market: 20 });
  const bad = chain.offerGate({ offerPrice: 0, supplierCost: 4, market: 12 });
  assert.equal(low.reasons.includes("MIN_NET_PROFIT"), true);
  assert.equal(low.orderCreated, false);
  assert.equal(low.salesEnabled, false);
  assert.equal(bad.reasons.includes("PRICE_INVALID"), true);
  assert.equal(bad.livePriceWrite, false);
});

test("supplier silence keeps stock unknown and a delivered scan cannot jump the queue", () => {
  const timeout = chain.supplierSnapshot({ previousQty: 4, timedOut: true });
  const missing = chain.supplierSnapshot({ previousQty: 4, payload: {} });
  const tracking = chain.foldTracking([{ code: "delivered" }, { code: "pickup" }]);
  const rewind = chain.foldTracking([{ code: "pickup" }, { code: "delivered" }, { code: "pickup" }]);
  assert.equal(timeout.qty, 4);
  assert.equal(timeout.bought, false);
  assert.equal(missing.qty, "UNKNOWN");
  assert.equal(tracking.status, "PICKED_UP");
  assert.equal(tracking.ignored, 1);
  assert.equal(rewind.status, "DELIVERED");
  assert.equal(rewind.ignored, 1);
  assert.equal(tracking.live, false);
});

test("one payment key, one hostile order id, and a crashed queue stay single", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-chain-"));
  const race = chain.submitRace(path.join(dir, "race.sqlite"));
  const book = chain.openPayOnce(path.join(dir, "silent.sqlite"));
  const first = book.attempt("pay-silent", null);
  const second = book.attempt("pay-silent", null);
  book.close();
  const poison = chain.poisonOrderId(path.join(dir, "poison.sqlite"));
  const queue = chain.recoverQueue(path.join(dir, "queue.sqlite"));
  assert.equal(race.rows, 1);
  assert.equal(race.moneyMoved, 0);
  assert.equal(first.code, "PROVIDER_SILENT");
  assert.equal(second.inserted, false);
  assert.equal(poison.extraRow, false);
  assert.equal(queue.queue, "QUEUED");
  assert.equal(queue.refund, "BLOCKED_APPROVAL");
  assert.equal(queue.approval, "PERMISSION_DENIED");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("memory, locale, deny, cancel, and backup stay inside the synthetic tree", () => {
  const memory = chain.memoryWall();
  const crash = chain.crashIsolation();
  const locale = chain.missingLocale();
  const security = chain.securityEvent();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-chain-tail-"));
  const cancel = chain.cancelToJournal({ holdPath: path.join(dir, "holds.sqlite") });
  const backup = chain.roundtrip(path.join(dir, "backup.sqlite"));
  const report = chain.runChain({
    dir: path.join(dir, "run"),
    checkpointPath: path.join(dir, "checkpoint.json"),
  });
  assert.equal(memory.denied, "PERSONAL_MEMORY_DENIED");
  assert.equal(crash.crashed, "AGENT_ISOLATED");
  assert.equal(locale.listed, 30);
  assert.equal(locale.schema, "SALES_PRICE_BLOCKED");
  assert.equal(security.policyUnchanged, true);
  assert.equal(security.salesEnabled, false);
  assert.equal(security.seed, "SEED_IDENTITY_LOCKED");
  assert.equal(cancel.journal.supplierReimbursement, 0);
  assert.equal(cancel.moneyMoved, false);
  assert.equal(backup.ok, true);
  assert.equal(report.priorChecksPreserved, 23);
  assert.equal(report.liveVerified, false);
  assert.equal(report.softwareCompleted, report.softwareTasks);
  assert.equal(report.performance.productionLoad, false);
  fs.rmSync(dir, { recursive: true, force: true });
});
