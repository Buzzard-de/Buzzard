import { createRequire } from "node:module";
import { createHmac } from "node:crypto";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { dispatch, AGENT_KINDS } = require("../lib/buzzardNative/core/specialistDispatch.js");
const { verifyDispatch, TASK_KINDS } = require("../lib/pusat/dispatchVerify.js");
const { CARRIER_IDS, getAdapter, profileOf } = require("../lib/logistics/carrierContract.js");
const { createWhatsappSandbox } = require("../lib/comms/whatsappSandbox.js");
const { createStore, runIsolatedOrder } = require("../lib/commerce/isolatedOrder.js");
const { createDurableTaskQueue } = require("../lib/pusat/durableTaskQueue.js");
const { workerHealth } = require("../lib/pusat/orchRuntime.js");
const { runDevAutomation } = require("../lib/workstreams/devAutomation.js");

describe("dispatch verification policies", () => {
  it("rejects generic ok:true for every task kind", () => {
    expect(TASK_KINDS.length).toBe(27);
    const kinds = [...new Set(Object.values(AGENT_KINDS).flat())];
    expect(new Set(TASK_KINDS)).toEqual(new Set(kinds));
    for (const kind of TASK_KINDS) {
      const verdict = verifyDispatch({
        kind,
        result: { ok: true, llmCompleted: false, result: { ok: true } },
      });
      expect(verdict.code).toBe("NOT_VERIFIED");
      expect(verdict.testsPassed).toBe(false);
      expect(verdict.audit.independent).toBe(true);
      expect(verdict.audit.kind).toBe(kind);
    }
    expect(verifyDispatch({ kind: "DEPLOY", result: { ok: true } }).code).toBe("NOT_VERIFIED");
    expect(verifyDispatch({ kind: "THINK" }).code).toBe("NOT_VERIFIED");
  });

  it("accepts real specialist evidence and keeps gates closed", () => {
    const think = verifyDispatch({ kind: "THINK", result: dispatch({ agentId: "sinan_bey", kind: "THINK" }) });
    expect(think.code).toBe("INDEPENDENT_OK");
    expect(think.audit.acceptance).toContain("rule_based");
    const price = verifyDispatch({
      kind: "PRICE_CALCULATE",
      result: dispatch({
        agentId: "pricing_ai",
        kind: "PRICE_CALCULATE",
        input: { supplierCost: 40, shipping: 6, marketplaceCommission: 4, vat: 10, returnReserve: 0, paymentFees: 0, category: "automotive" },
      }),
    });
    expect(price.code).toBe("INDEPENDENT_OK");
    expect(price.audit.evidence).toContain("net");
    const gated = verifyDispatch({ kind: "PHONE_LIVE_CALL", result: dispatch({ agentId: "zeynep_hanim", kind: "PHONE_LIVE_CALL" }) });
    expect(gated.code).toBe("HUMAN_GATE_REQUIRED");
    const buy = verifyDispatch({
      kind: "STOCK_BUY",
      result: dispatch({ agentId: "stock_ai", kind: "STOCK_BUY", input: { humanApproved: true } }),
    });
    expect(buy.code).toBe("INDEPENDENT_OK");
    expect(dispatch({ agentId: "stock_ai", kind: "STOCK_BUY" }).code).toBe("HUMAN_GATE_REQUIRED");
  });
});

describe("provider carrier contracts", () => {
  it("uses distinct protocols, status maps, and validation failures", () => {
    const dhl = getAdapter("DHL");
    const ups = getAdapter("UPS");
    const post = getAdapter("POST_DE");
    const local = getAdapter("LocalCourier");
    expect(dhl.protocol).not.toBe(ups.protocol);
    expect(dhl.trackShipment({ status: "transit" }).status).toBe("IN_TRANSIT");
    expect(ups.trackShipment({ status: "I" }).status).toBe("IN_TRANSIT");
    expect(ups.trackShipment({ status: "M" }).status).not.toBe(dhl.trackShipment({ status: "failure" }).status);
    expect(dhl.trackShipment({ status: "LOST" }).status).toBe("LOST");
    expect(dhl.createShipment({ orderId: "x" }).liveShipment).toBe(false);
    expect(dhl.createShipment({ orderId: "x", address: {} }).code).toBe("DHL_POSTAL_REQUIRED");
    expect(ups.createShipment({ orderId: "x", address: {} }).code).toBe("UPS_SHIPPER_REQUIRED");
    expect(getAdapter("DPD").createShipment({ address: {} }).code).toBe("DPD_WEIGHT_REQUIRED");
    expect(getAdapter("GLS").createShipment({ address: {} }).code).toBe("GLS_CONTACT_REQUIRED");
    expect(getAdapter("Hermes").createShipment({ address: {} }).code).toBe("HERMES_HOUSENUMBER_REQUIRED");
    expect(getAdapter("AmazonLogistics").createShipment({ address: {} }).code).toBe("AMZ_ORDER_REQUIRED");
    expect(local.createShipment({ address: {} }).code).toBe("LOCAL_PHONE_REQUIRED");
    expect(post.createShipment({ address: { postcode: "12" } }).code).toBe("POST_CODE_REQUIRED");
    expect(post.createShipment({ address: { postcode: "10115" } }).code).toBe("HUMAN_GATE_REQUIRED");
    expect(post.createShipment({ address: { postcode: "10115" } }).liveShipment).toBe(false);
    expect(dhl.createShipment({ address: { postalCode: "10115" }, forceFailure: true }).code).toBe("DHL_ROUTING_REJECTED");
    const protocols = new Set(CARRIER_IDS.map((id) => profileOf(id).protocol));
    expect(protocols.size).toBe(CARRIER_IDS.length);
  });
});

describe("durable whatsapp replay", () => {
  it("rejects duplicates after restart and across connections", () => {
    const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-wa-")), "wa.sqlite");
    const payload = JSON.stringify({ id: "wamid.1", from: "49123", text: "hallo" });
    const secret = "w".repeat(32);
    const header = createHmac("sha256", secret).update(payload).digest("hex");
    const timestamp = Date.now();
    const first = createWhatsappSandbox({ dbPath });
    const accepted = first.verifyInbound({ payload, header, secret, timestamp });
    expect(accepted.ok).toBe(true);
    expect(accepted.ownerId).toBe("banu_hanim");
    expect(accepted.sent).toBe(false);
    expect(first.verifyInbound({ payload, header, secret, timestamp }).code).toBe("REPLAY");
    expect(first.send().sent).toBe(false);
    expect(first.migrateNumber().code).toBe("NUMBER_MIGRATION_DENIED");
    first.close();
    const restarted = createWhatsappSandbox({ dbPath });
    expect(restarted.verifyInbound({ payload, header, secret, timestamp }).code).toBe("REPLAY");
    const other = JSON.stringify({ id: "wamid.2", from: "49123", text: "nochmal" });
    const otherHeader = createHmac("sha256", secret).update(other).digest("hex");
    const a = createWhatsappSandbox({ dbPath });
    const b = createWhatsappSandbox({ dbPath });
    const one = a.verifyInbound({ payload: other, header: otherHeader, secret, timestamp });
    const two = b.verifyInbound({ payload: other, header: otherHeader, secret, timestamp });
    expect([one.code, two.code].filter((code) => code === "REPLAY" || code === undefined).length).toBeGreaterThan(0);
    expect([one.ok, two.ok].filter(Boolean)).toHaveLength(1);
    expect(a.verifyInbound({ payload: other, header: otherHeader, secret }).code).toBe("TIMESTAMP_REQUIRED");
    expect(a.verifyInbound({ payload: other, header: otherHeader, secret, timestamp: timestamp - 600_000 }).code).toBe("TIMESTAMP_SKEW");
    expect(restarted.audits().some((row) => row.code === "ACCEPTED")).toBe(true);
    a.close();
    b.close();
    restarted.close();
  });
});

describe("worker health and durable orders", () => {
  it("recovers a crashed worker lease and survives order restart", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "buzzard-gap-"));
    const queue = createDurableTaskQueue({ dbPath: path.join(dir, "orch.sqlite") });
    expect(queue.health().workers.healthy).toBe(false);
    queue.registerWorker({ workerId: "worker-a", identity: "pusat-a" });
    queue.heartbeat({ workerId: "worker-a" });
    expect(queue.health().workers.healthy).toBe(true);
    expect(queue.health().workers.identities).toContain("pusat-a");
    const task = queue.enqueue({ title: "owned", assigneeId: "sinan_bey", ownerId: "pusat", kind: "THINK" });
    const leased = queue.lease({ workerId: "worker-a" });
    expect(leased.ok).toBe(true);
    const crashed = queue.markCrashed("worker-a");
    expect(crashed.recovered).toBe(1);
    expect(queue.get(task.task.id).state).toBe("QUEUED");
    expect(queue.get(task.task.id).leaseOwner).toBe(null);
    queue.registerWorker({ workerId: "worker-b", identity: "pusat-b" });
    queue.heartbeat({ workerId: "worker-b" });
    const again = queue.lease({ workerId: "worker-b" });
    expect(again.task.id).toBe(task.task.id);
    expect(queue.health().workers.online).toBe(1);
    queue.close();

    const health = workerHealth({ dbPath: path.join(dir, "orch-runtime.sqlite") });
    expect(health.healthy).toBe(false);
    expect(health.live).toBe(false);

    const orderPath = path.join(dir, "orders.sqlite");
    const store = createStore({ dbPath: orderPath });
    const order = runIsolatedOrder({ scenario: "happy", store, orderId: "SYN-RESTART" });
    expect(order.stages.payment.moneyMoved).toBe(false);
    expect(order.stages.inventory.buy).toBe("HUMAN_GATE_REQUIRED");
    store.close();
    const reopened = createStore({ dbPath: orderPath });
    const loaded = reopened.get("SYN-RESTART");
    expect(loaded.productId).toBe("SYN-PAD");
    expect(loaded.supplierId).toBe("SYN-SUP");
    expect(loaded.customerId).toBe("SYN-CUST");
    expect(loaded.stages.payment.moneyMoved).toBe(false);
    expect(loaded.live).toBe(false);
    const duplicate = runIsolatedOrder({ scenario: "duplicate_order", store: reopened, orderId: "SYN-RESTART" });
    expect(duplicate.events.some((event) => event.code === "DUPLICATE_ORDER")).toBe(true);
    reopened.close();
    expect(() => createStore({ dbPath: path.join(dir, "buzzard_guardian.sqlite") })).toThrow(/GUARDIAN_SQLITE_FORBIDDEN/);
  });
});

describe("workstream 14 local automation", () => {
  it("runs a local inspect and blocks factory or deploy requests", () => {
    const ran = runDevAutomation({ task: { title: "gap-check" } });
    expect(ran.ok).toBe(true);
    expect(ran.hostedFactory).toBe(false);
    expect(ran.cursorIsNot247Factory).toBe(true);
    expect(ran.audit.map((row) => row.step)).toEqual(["intake", "inspect", "plan", "test", "collect", "approval"]);
    const blocked = runDevAutomation({ task: { deploy: true } });
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe("HUMAN_GATE_REQUIRED");
    expect(blocked.hostedFactory).toBe(false);
  });
});
