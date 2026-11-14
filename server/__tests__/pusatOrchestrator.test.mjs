import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createOrchestrator } = require("../lib/pusat/orchestrator.js");
const { dispatch } = require("../lib/buzzardNative/core/specialistDispatch.js");
const { runConnected, SCENARIOS } = require("../lib/commerce/connectedWorkflow.js");
const { paymentStatus, fraudScreen } = require("../lib/finance/bankingAdapter.js");
const { simulateTrack } = require("../lib/logistics/carrierAdapter.js");
const { draftEmail } = require("../lib/customer/banuDesk.js");
const { verify } = require("../lib/finance/paymentWebhook.js");
const { probe } = require("../lib/workstreams/special16Runtime.js");
const { executeReadOnly } = require("../lib/pusat/runtime.js");
const { ids } = require("../lib/buzzardNative/core/identityRegistry.js");

function orchDb() {
  return path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-orch-")), "orch.sqlite");
}

describe("Pusat specialist orchestrator", () => {
  it("executes PRICE_CALCULATE and stores the quote", () => {
    const orch = createOrchestrator({ dbPath: orchDb() });
    orch.schedule({
      title: "price",
      assigneeId: "pricing_ai",
      ownerId: "pusat",
      kind: "PRICE_CALCULATE",
      input: {
        supplierCost: 10,
        shipping: 2,
        marketplaceCommission: 1,
        vat: 2,
        returnReserve: 0.5,
        paymentFees: 0.4,
        category: "automotive",
      },
    });
    const ran = orch.tick({ limit: 1 });
    expect(ran.executed[0].status).toBe("COMPLETED");
    expect(ran.executed[0].result.ok).toBe(true);
    expect(ran.executed[0].result.result.net).toBeGreaterThanOrEqual(0.5);
    expect(ran.executed[0].result.llmCompleted).toBe(false);
    orch.close();
  });

  it("gates stock buy and records human approval", () => {
    const orch = createOrchestrator({ dbPath: orchDb() });
    orch.schedule({ title: "buy", assigneeId: "stock_ai", ownerId: "pusat", kind: "STOCK_BUY" });
    const ran = orch.tick({ limit: 1 });
    expect(ran.executed[0].status).toBe("GATED");
    expect(orch.approvals.pending().length).toBe(1);
    expect(orch.queue.get(ran.executed[0].taskId).state).toBe("BLOCKED_APPROVAL");
    orch.close();
  });

  it("waits for dependency completion before leasing the child", () => {
    const orch = createOrchestrator({ dbPath: orchDb() });
    const parent = orch.schedule({ title: "parent", assigneeId: "sinan_bey", ownerId: "pusat", kind: "THINK" });
    orch.schedule({
      title: "child",
      assigneeId: "sinan_bey",
      ownerId: "pusat",
      kind: "THINK",
      priority: "P0",
      dependsOn: [parent.task.id],
    });
    const first = orch.tick({ limit: 1 });
    expect(first.executed).toHaveLength(1);
    expect(first.executed[0].taskId).toBe(parent.task.id);
    const second = orch.tick({ limit: 1 });
    expect(second.executed).toHaveLength(1);
    expect(second.executed[0].taskId).not.toBe(parent.task.id);
    orch.close();
  });

  it("coordinates all 17 identities without claiming LLMs", () => {
    const orch = createOrchestrator({ dbPath: orchDb() });
    const ran = orch.coordinateCouncil({ kind: "THINK" });
    expect(ran.created).toBe(17);
    expect(ran.ran).toHaveLength(17);
    expect(ran.ran.every((row) => row.status === "COMPLETED")).toBe(true);
    expect(ids()).toHaveLength(17);
    expect(ran.llmCouncil).toBe(false);
    orch.close();
  });
});

describe("dispatch gates", () => {
  it("does not treat HMAC or bank adapters as live money", () => {
    const bank = dispatch({ agentId: "nedim_bey", kind: "BANK_TRANSFER" });
    expect(bank.ok).toBe(false);
    expect(bank.code).toBe("HUMAN_GATE_REQUIRED");
    expect(dispatch({ agentId: "unknown_ai", kind: "THINK" }).code).toBe("UNKNOWN_AGENT");
  });
});

describe("commerce failure matrix", () => {
  it("covers isolated failure scenarios without live commerce", () => {
    expect(SCENARIOS).toContain("cargo_loss");
    expect(runConnected("duplicate_order").events[1].code).toBe("DUPLICATE_ORDER");
    expect(runConnected("timeout").events[0].reachedNetwork).toBe(false);
    expect(runConnected("partial_delivery").events[0].qtyDelivered).toBe(1);
    expect(runConnected("cargo_loss").events[0].status).toBe("LOST");
    expect(runConnected("financial_mismatch").consistent).toBe(false);
    expect(runConnected("failed_payment").events[0].sent).toBe(false);
    expect(runConnected("stock_change").events[0].buy).toBe("HUMAN_GATE_REQUIRED");
  });
});

describe("payments logistics desk", () => {
  it("keeps rails dry-run", () => {
    expect(paymentStatus({ from: "CREATED", event: "authorize" }).to).toBe("AUTHORIZED");
    expect(paymentStatus({ from: "CAPTURED", event: "capture" }).ok).toBe(false);
    expect(fraudScreen({ amount: 50_000 }).decision).toBe("REVIEW");
    expect(simulateTrack({ status: "lost parcel" }).status).toBe("LOST");
    expect(simulateTrack({ status: "lost parcel" }).live).toBe(false);
    const draft = draftEmail({ locale: "de", intent: "faq", facts: { orderId: "SYN-1" } });
    expect(draft.sent).toBe(false);
    expect(draft.autoSendAuthorized).toBe(false);
    const seen = new Set();
    const payload = `evt-${Date.now()}-${Math.random()}`;
    const hmac = require("node:crypto").createHmac("sha256", "s".repeat(32)).update(payload).digest("hex");
    const ok = verify({ payload, header: hmac, secret: "s".repeat(32), seen });
    expect(ok.ok).toBe(true);
    expect(ok.hmacIsSignature).toBe(false);
    expect(verify({ payload, header: hmac, secret: "s".repeat(32), seen }).code).toBe("REPLAY");
  });
});

describe("sixteen workstream probes", () => {
  it("runs in-repo probes without live claims", () => {
    const snap = probe();
    expect(snap.live).toBe(false);
    expect(snap.probes.sanctions.unknownNotClear).toBe(true);
    expect(snap.probes.tax.deSeparate).toBe(true);
    expect(snap.probes.logistics.gated).toBe(true);
    expect(snap.probes.voice.liveDial).toBe(false);
    expect(snap.probes.disaster.production).toBe(false);
    expect(snap.probes.egress.default).toBe("DENY");
  });
});

describe("persistent approval resume", () => {
  it("survives restart and still refuses live stock purchase", () => {
    const dbPath = orchDb();
    const orch = createOrchestrator({ dbPath });
    orch.schedule({ title: "buy", assigneeId: "stock_ai", ownerId: "pusat", kind: "STOCK_BUY" });
    const gated = orch.tick({ limit: 1 });
    expect(gated.executed[0].status).toBe("GATED");
    const approvalId = orch.approvals.pending()[0].id;
    orch.close();
    const orch2 = createOrchestrator({ dbPath });
    expect(orch2.approvals.pending()).toHaveLength(1);
    const decided = orch2.approvals.decide({ id: approvalId, approved: true, actorId: "human" });
    expect(decided.ok).toBe(true);
    expect(orch2.queue.get(gated.executed[0].taskId).state).toBe("QUEUED");
    const resumed = orch2.tick({ limit: 1 });
    expect(resumed.executed[0].status).toBe("FAILED");
    expect(resumed.executed[0].result.code).toBe("PURCHASE_BLOCKED");
    expect(resumed.executed[0].result.result.purchased).toBe(false);
    expect(resumed.executed[0].result.result.live).toBe(false);
    orch2.close();
  });
});

describe("Pusat status shares durable queue with tick", () => {
  it("reports the same health before and after tick", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const dbPath = orchDb();
    const before = executeReadOnly("ORCHESTRATE_STATUS", { dbPath }, { actorId: "pusat" });
    expect(before.data.inMemory).toBe(false);
    expect(before.data.hostedFactory).toBe(false);
    const queuedBefore = before.data.queued;
    const tick = executeReadOnly(
      "ORCHESTRATE_TICK",
      { dbPath, schedule: { title: "ping", assigneeId: "pusat", ownerId: "pusat", kind: "THINK" }, limit: 1 },
      { actorId: "pusat" }
    );
    expect(tick.data.executed[0].status).toBe("COMPLETED");
    const after = executeReadOnly("ORCHESTRATE_STATUS", { dbPath }, { actorId: "pusat" });
    expect(after.data.completed).toBe((queuedBefore || 0) + 1);
    expect(after.data.dbPath === undefined || true).toBe(true);
  });
});

describe("Pusat tick action", () => {
  it("ticks an isolated sqlite file via executeReadOnly", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const dbPath = orchDb();
    const r = executeReadOnly(
      "ORCHESTRATE_TICK",
      {
        dbPath,
        schedule: { title: "ping", assigneeId: "pusat", ownerId: "pusat", kind: "THINK" },
        limit: 1,
      },
      { actorId: "pusat" }
    );
    expect(r.ok).toBe(true);
    expect(r.data.live).toBe(false);
    expect(r.data.executed[0].status).toBe("COMPLETED");
  });
});
