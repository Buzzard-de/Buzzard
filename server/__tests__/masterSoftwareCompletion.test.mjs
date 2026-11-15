import { createRequire } from "node:module";
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { dispatch, AGENT_KINDS } = require("../lib/buzzardNative/core/specialistDispatch.js");
const { ids } = require("../lib/buzzardNative/core/identityRegistry.js");
const { runIsolatedOrder, createStore, SCENARIOS } = require("../lib/commerce/isolatedOrder.js");
const { CARRIER_IDS, getAdapter } = require("../lib/logistics/carrierContract.js");
const { ibanValid, pain001, parseCamt, ebicsEnvelope, paypalNvp, reconcile } = require("../lib/finance/bankingAdapter.js");
const { session, liveDial } = require("../lib/buzzardNative/core/specialists/zeynepEngine.js");
const { verifyInbound, send } = require("../lib/comms/whatsappSandbox.js");
const { probe, executeAll } = require("../lib/workstreams/special16Runtime.js");
const { convert } = require("../lib/finance/fxFixture.js");
const { createOrchestrator } = require("../lib/pusat/orchestrator.js");
const { runCorruptBackupDrill } = require("../lib/survival/isolatedDisasterDrill.js");
const { mkdtempSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

describe("17-agent dispatch matrix", () => {
  it("allows listed kinds and fails closed otherwise", () => {
    expect(ids()).toHaveLength(17);
    expect(Object.keys(AGENT_KINDS)).toHaveLength(17);
    for (const id of ids()) {
      const think = dispatch({ agentId: id, kind: "THINK" });
      expect(think.ok).toBe(true);
      expect(think.llmCompleted).toBe(false);
      expect(dispatch({ agentId: id, kind: "DEPLOY" }).ok).toBe(false);
    }
    expect(dispatch({ agentId: "amelia", kind: "BRAND_DRAFT" }).ok).toBe(true);
    expect(dispatch({ agentId: "leon", kind: "CAMPAIGN_ANALYZE" }).ok).toBe(true);
    expect(dispatch({ agentId: "esat_bey", kind: "SECURITY_STATUS" }).ok).toBe(true);
    expect(dispatch({ agentId: "dogu_bey", kind: "RESEARCH_REQUEST" }).ok).toBe(true);
    expect(dispatch({ agentId: "pricing_ai", kind: "STOCK_BUY" }).code).toBe("UNAUTHORIZED_KIND");
  });
});

describe("isolated order lifecycle", () => {
  it("shares one orderId across engines and failure branches", () => {
    const store = createStore();
    const happy = runIsolatedOrder({ scenario: "happy", store, orderId: "SYN-LIFE" });
    expect(happy.orderId).toBe("SYN-LIFE");
    expect(happy.productId).toBe("SYN-PAD");
    expect(happy.stages.payment.moneyMoved).toBe(false);
    expect(happy.stages.notify.sent).toBe(false);
    expect(happy.stages.inventory.buy).toBe("HUMAN_GATE_REQUIRED");
    for (const name of SCENARIOS) {
      const row = runIsolatedOrder({ scenario: name, store, orderId: `SYN-${name}` });
      expect(row.orderId).toBe(`SYN-${name}`);
      expect(row.live).toBe(false);
    }
  });
});

describe("carrier contract", () => {
  it("implements the contract per carrier id", () => {
    expect(CARRIER_IDS.length).toBeGreaterThan(30);
    const secret = "s".repeat(32);
    for (const id of CARRIER_IDS) {
      const adapter = getAdapter(id);
      expect(adapter.createShipment({ orderId: "x" }).liveShipment).toBe(false);
      expect(adapter.trackShipment({ status: "LOST" }).status).toBe("LOST");
      const payload = `${id}-hook`;
      const header = createHmac("sha256", secret).update(payload).digest("hex");
      expect(adapter.verifyWebhook({ payload, header, secret }).ok).toBe(true);
      expect(adapter.verifyWebhook({ payload, header, secret }).code).toBe("REPLAY");
    }
  });
});

describe("bank documents", () => {
  it("validates IBAN and dry-run documents without sending", () => {
    expect(ibanValid("DE89370400440532013000")).toBe(true);
    expect(ibanValid("DE00")).toBe(false);
    expect(pain001().submitted).toBe(false);
    expect(parseCamt().entries).toBeGreaterThan(0);
    expect(ebicsEnvelope({ payload: "x" }).live).toBe(false);
    expect(paypalNvp().submitted).toBe(false);
    expect(reconcile({ statementXml: "<Stmt><Amt>1.00</Amt></Stmt>", expected: [1] }).ok).toBe(true);
    expect(reconcile({ statementXml: "<Stmt><Amt>1.00</Amt></Stmt>", expected: [9] }).mismatch).toBe(true);
  });
});

describe("voice loopback and whatsapp inbound", () => {
  it("loops voice without live calls and verifies inbound without send", () => {
    const s = session({ actorId: "zeynep_hanim", scriptedUtterance: "hallo" });
    expect(s.stt).toBe("LOOPBACK");
    expect(s.liveCall).toBe(false);
    expect(s.transcript.length).toBe(2);
    expect(liveDial().ok).toBe(false);
    const payload = JSON.stringify({ from: "49111", text: "status" });
    const secret = "w".repeat(32);
    const header = createHmac("sha256", secret).update(payload).digest("hex");
    const inbound = verifyInbound({ payload, header, secret, timestamp: Date.now() });
    expect(inbound.ok).toBe(true);
    expect(inbound.sent).toBe(false);
    expect(inbound.outbound.sent).toBe(false);
    expect(send().sent).toBe(false);
  });
});

describe("sixteen streams", () => {
  it("executes local adapters without live claims", () => {
    const snap = probe();
    expect(snap.registry.streams).toHaveLength(16);
    expect(snap.probes.voice.stt).toBe("LOOPBACK");
    const all = executeAll();
    expect(all.results).toHaveLength(16);
    expect(all.allLocalOk).toBe(true);
    expect(all.live).toBe(false);
  });
});

describe("queue concurrency and backup corruption", () => {
  it("leases distinct tasks across ticks", () => {
    const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-conc-")), "orch.sqlite");
    const orch = createOrchestrator({ dbPath });
    for (let i = 0; i < 8; i += 1) {
      orch.schedule({ title: `t${i}`, assigneeId: "sinan_bey", ownerId: "pusat", kind: "THINK" });
    }
    const first = orch.tick({ limit: 4 });
    const second = orch.tick({ limit: 4 });
    const ids = [...first.executed, ...second.executed].map((row) => row.taskId);
    expect(ids).toHaveLength(8);
    expect(new Set(ids).size).toBe(8);
    orch.close();
  });

  it("detects a corrupt sqlite backup without production restore", () => {
    const corrupt = runCorruptBackupDrill();
    expect(corrupt.status).toBe("ISOLATED_CORRUPTION_DETECTED");
    expect(corrupt.productionTouched).toBe(false);
    expect(corrupt.restoreClaimed).toBe(false);
  });
});

describe("currency fixture", () => {
  it("converts with frozen rates and never claims live FX", () => {
    expect(convert({ amount: 10, from: "EUR", to: "TRY" }).converted).toBe(375);
    expect(convert({ amount: 10, from: "EUR", to: "TRY" }).live).toBe(false);
    expect(convert({ amount: 1, from: "XXX", to: "EUR" }).ok).toBe(false);
  });
});
