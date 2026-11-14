import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runProgram } = require("../lib/platform/tenModuleProgram.js");
const { decideAsset } = require("../lib/banking/eu27/fiatPolicy.js");
const { quoteRate } = require("../lib/banking/eu27/fx.js");
const { registryComplete } = require("../lib/banking/eu27/inventory.js");
const { createMemoryStore } = require("../lib/pusat/memory.js");
const { placeOrder } = require("../lib/commerce/storefrontCatalogAdapter.js");
const { handle } = require("../lib/customer/banuDesk.js");
const { notifyCustomer } = require("../lib/logistics/v5/notifyStub.js");
const { startReturn } = require("../lib/logistics/v5/returnsEngine.js");

const FORBIDDEN_CLAIMS = ["TEST_COMPLETE", "INTEGRATION_COMPLETE", "SECURITY_VERIFIED", "PERFORMANCE_TESTED", "CODE_COMPLETE", "VERIFIED_COMPLETE"];

test("the closed journey calls engines and does not award completion labels", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-ten-"));
  const before = fs.statSync("/workspace/server/data/buzzard.db").mtimeMs;
  const report = runProgram({ dir });
  const after = fs.statSync("/workspace/server/data/buzzard.db").mtimeMs;
  const fds = fs.readdirSync("/proc/self/fd").map((fd) => {
    try { return fs.readlinkSync(`/proc/self/fd/${fd}`); } catch { return ""; }
  });
  const fiat = {
    eur: decideAsset({ currency: "EUR" }),
    btc: decideAsset({ currency: "BTC", assetType: "crypto" }),
    digitalEuro: decideAsset({ currency: "EUR", assetType: "digital_euro" }),
    unknown: decideAsset({ currency: "ZZZ" }),
    fx: quoteRate({ base: "EUR", quote: "PLN" }),
  };
  const memory = createMemoryStore();
  memory.putPersonal("sinan_bey", { key: "audit", value: "local" });
  const denied = memory.getPersonal("sinan_bey", "esat_bey");
  const registry = registryComplete();
  const order = placeOrder();
  const desk = handle({ text: "Bestellung SYN-CHAIN-1", locale: "de", facts: { orderId: "SYN-CHAIN-1" } });
  const notice = notifyCustomer({ channel: "EMAIL", event: "ORDER_UPDATE", verified: false });
  const returned = startReturn({ shipmentId: "" });
  const source = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "../lib/platform/tenModuleProgram.js"), "utf8");
  const serialized = JSON.stringify(report);

  assert.equal(fiat.eur.code, "FIAT_ACCEPTED");
  assert.equal(fiat.btc.code, "REJECTED_CRYPTO_POLICY");
  assert.equal(fiat.digitalEuro.code, "REJECTED_CBDC_POLICY");
  assert.equal(fiat.unknown.code, "REJECTED_UNKNOWN_ASSET");
  assert.equal(fiat.fx.code, "FX_RATE_UNKNOWN");
  assert.equal(fiat.fx.invented, false);
  assert.equal(denied.code, "PERSONAL_MEMORY_DENIED");
  assert.equal(registry.code, "EU27_REGISTRY_INCOMPLETE");
  assert.equal(registry.complete, false);
  assert.equal(registry.countries.filter((row) => !row.complete).length, 27);
  assert.equal(order.code, "SALES_CLOSED");
  assert.equal(order.orderCreated, false);
  assert.equal(desk.sent, false);
  assert.equal(notice.sent, false);
  assert.equal(returned.labelIssued, false);
  assert.equal(report.journey.steps.order.code, order.code);
  assert.equal(report.journey.steps.order.orderCreated, false);
  assert.equal(report.journey.steps.order.invoked, "storefrontCatalogAdapter.placeOrder");
  assert.equal(report.journey.steps.customer.sent, desk.sent);
  assert.equal(report.journey.steps.customer.intent, desk.intent || null);
  assert.equal(report.journey.steps.notification.reason, notice.reason);
  assert.equal(report.journey.steps.notification.status, "BLOCKED");
  assert.equal(report.journey.steps.returns.status, "BLOCKED");
  assert.equal(report.journey.steps.returns.labelIssued, false);
  assert.equal(report.modules.find((row) => row.id === "eu27").registry, registry.code);
  assert.equal(report.modules.find((row) => row.id === "live_operations").implementation, "BLOCKED");
  assert.equal(report.orderCreated, false);
  assert.equal(report.moneyMoved, false);
  assert.equal(report.shipmentCreated, false);
  assert.equal(report.supplierPurchased, false);
  for (const claim of FORBIDDEN_CLAIMS) {
    assert.equal(serialized.includes(claim), false, claim);
    assert.equal(source.includes(claim), false, claim);
  }
  assert.equal(fds.some((fd) => fd.endsWith("/buzzard.db")), false);
  assert.equal(after, before);
});

test("importing the ten-module contract creates no sqlite file", () => {
  const probe = spawnSync(process.execPath, ["--input-type=commonjs", "-e", `
    const fs = require("fs");
    require("./server/lib/platform/tenModuleProgram.js");
    const fds = fs.readdirSync("/proc/self/fd").map((fd) => {
      try { return fs.readlinkSync("/proc/self/fd/" + fd); } catch { return ""; }
    });
    const opened = fds.filter((target) => /\\.(sqlite|db)$/.test(target) || target.includes("buzzard-wa"));
    if (opened.length) {
      console.log(opened.join("\\n"));
      process.exit(2);
    }
  `], { cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..") });
  assert.equal(probe.status, 0, probe.stdout.toString() + probe.stderr.toString());
});
