import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { ids, getAgent, getAgentExact, ORIGINAL_10_IDS, registerAgent, unregisterAgent, assignVoice } = require("../lib/buzzardNative/core/identityRegistry.js");
const { createMultiMemory } = require("../lib/buzzardNative/core/multiMemory.js");
const { dispatch } = require("../lib/buzzardNative/core/specialistDispatch.js");
const { createApprovalCenter } = require("../lib/pusat/humanApproval.js");
const { inspectFeeds, buyStock } = require("../lib/buzzardNative/core/specialists/stockEngine.js");
const { inspectTree, restoreRetired, renameCode } = require("../lib/buzzardNative/core/specialists/categoryEngine.js");
const { quote, publishLive, MIN_NET } = require("../lib/buzzardNative/core/specialists/pricingEngine.js");
const { draft, inventClaim, livePublish } = require("../lib/buzzardNative/core/specialists/seoEngine.js");
const { reply, refund } = require("../lib/buzzardNative/core/specialists/banuEngine.js");
const { report, transfer, changePrice } = require("../lib/buzzardNative/core/specialists/salesEngine.js");
const { session, liveDial, copySinanVoice } = require("../lib/buzzardNative/core/specialists/zeynepEngine.js");
const { runCouncil17 } = require("../lib/buzzardNative/core/council17.js");
const { check, selfElevate, explicitPermissions } = require("../lib/buzzardNative/core/permissionEngine.js");
const { createRouter } = require("../lib/buzzardNative/core/taskRouter.js");
const { createAgentBus } = require("../lib/buzzardNative/core/agentBus.js");
const { MEMBERS, roster, holdSeedMeeting, recordSeedDecision, assignFromSeedMeeting, delegateWithinMeeting } = require("../lib/pusat/council.js");
const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");
const { EXPECTED_SHA } = require("../lib/buzzardNative/speech/officialVoiceGuard.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");

describe("Buzzard 17-agent council", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
    unregisterAgent("probe_ai");
  });

  it("registers 17 identities, keeps original 10, blocks duplicate, allows dynamic extra", () => {
    expect(ids()).toHaveLength(17);
    expect(ORIGINAL_10_IDS.every((id) => ids().includes(id))).toBe(true);
    expect(getAgent("stock_ai").display_name).toBe("Çakır Bey");
    expect(getAgent("category_ai").display_name).toBe("Pelin Hanım");
    expect(getAgent("pricing_ai").display_name).toBe("Akın Bey");
    expect(getAgent("seo_ai").display_name).toBe("Yılmaz Bey");
    expect(getAgent("banu_hanim").display_name).toBe("Banu Hanım");
    expect(getAgent("sales_analysis_ai").display_name).toBe("Sencer Bey");
    expect(getAgent("zeynep_hanim").display_name).toBe("Zeynep Hanım");
    expect(getAgent("tuncay_bey").agent_id).toBe("tuncay_bey");
    expect(MEMBERS.some((m) => m.id === "stock_ai")).toBe(true);
    expect(MEMBERS.some((m) => m.id === "zeynep_hanim")).toBe(false);
    expect(MEMBERS.some((m) => m.id === "phone_ai")).toBe(true);
    expect(registerAgent({ agent_id: "stock_ai", display_name: "X", role: "y" }).code).toBe("AGENT_ID_CONFLICT");
    expect(registerAgent({ agent_id: "probe_ai", display_name: "Probe AI", role: "probe" }).ok).toBe(true);
    expect(ids()).toHaveLength(18);
    expect(unregisterAgent("sinan_bey").code).toBe("SEED_IDENTITY_LOCKED");
  });

  it("isolates memory and denies stock buy / min-net / invented SEO / finance / live phone", () => {
    const mem = createMultiMemory();
    mem.put({ actorId: "stock_ai", ownerId: "stock_ai", type: "personal", key: "q", value: 9 });
    expect(mem.get({ actorId: "pricing_ai", ownerId: "stock_ai", type: "personal", key: "q" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
    expect(buyStock().code).toBe("HUMAN_GATE_REQUIRED");
    const tree = inspectTree();
    expect(tree.main_categories).toBe(50);
    expect(tree.count).toBe(50);
    expect(tree.bike.num).toBe(49);
    expect(tree.renewable.num).toBe(50);
    expect(tree.foodRestored).toBe(false);
    expect(restoreRetired().code).toBe("CATEGORY_RETIRED_LOCKED");
    expect(renameCode().code).toBe("CATEGORY_ID_LOCKED");
    const okQuote = quote({
      supplierCost: 10,
      shipping: 1,
      marketplaceCommission: 1,
      vat: 1,
      returnReserve: 0.2,
      paymentFees: 0.2,
    });
    expect(okQuote.net).toBeGreaterThanOrEqual(MIN_NET);
    expect(okQuote.publish).toBe(false);
    expect(quote({ supplierCost: 5, shipping: 1 }).code).toBe("MISSING_COST");
    expect(
      quote({
        supplierCost: 10,
        shipping: 2,
        marketplaceCommission: 1,
        vat: 2,
        returnReserve: 1,
        paymentFees: 1,
        marketPrice: 10.05,
      }).humanReview,
    ).toBe(true);
    expect(publishLive().code).toBe("HUMAN_GATE_REQUIRED");
    expect(inventClaim().code).toBe("SEO_INVENTED_CLAIM_DENIED");
    expect(draft({ titleFacts: ["Pad", "iso 9001"] }).inventedClaimsRejected.length).toBeGreaterThan(0);
    expect(livePublish().code).toBe("HUMAN_GATE_REQUIRED");
    expect(refund().code).toBe("HUMAN_GATE_REQUIRED");
    expect(reply({ intent: "order_status" }).guessed).toBe(false);
    expect(transfer().code).toBe("HUMAN_GATE_REQUIRED");
    expect(changePrice().code).toBe("HUMAN_GATE_REQUIRED");
    expect(session().liveCall).toBe(false);
    expect(session().stt).toBe("LOOPBACK");
    expect(session().liveCall).toBe(false);
    expect(liveDial().code).toBe("HUMAN_GATE_REQUIRED");
    expect(copySinanVoice().code).toBe("VOICE_IDENTITY_NOT_COPYABLE");
    expect(assignVoice({ fromId: "sinan_bey", toId: "banu_hanim" }).code).toBe("VOICE_IDENTITY_NOT_COPYABLE");
    expect(check("banu_hanim", "CUSTOMER_REFUND").ok).toBe(false);
    expect(selfElevate("pricing_ai", "PRICE_PUBLISH_LIVE").code).toBe("SELF_ELEVATION_DENIED");
    expect(inspectFeeds({ feeds: [{ supplier: "s", sku: "a", qty: 0, updatedAt: Date.now() }] }).sellable).toBe(false);
  });

  it("Pusat routes to the seven specialists and council17 stays honest", () => {
    const router = createRouter();
    const t = router.create({ title: "ops", fromId: "pusat" });
    router.assign({ taskId: t.task.id, agentId: "stock_ai", fromId: "pusat" });
    router.assign({ taskId: t.task.id, agentId: "zeynep_hanim", fromId: "pusat" });
    const ran = router.runAssigned(t.task.id);
    expect(ran.task.assignees).toEqual(["stock_ai", "zeynep_hanim"]);
    expect(ran.completed).toBe(false);
    const r = runCouncil17({ actorId: "sinan_bey" });
    expect(r.registered).toBe(17);
    expect(r.original10).toBe(true);
    expect(r.added7).toHaveLength(7);
    expect(r.buy.code).toBe("HUMAN_GATE_REQUIRED");
    expect(r.categories.count).toBe(50);
    expect(r.banuRefund.code).toBe("HUMAN_GATE_REQUIRED");
    expect(r.zeynep.liveCall).toBe(false);
    expect(r.zeynepVoice.code).toBe("VOICE_IDENTITY_NOT_COPYABLE");
    expect(r.egress).toBe(false);
    expect(r.clone.code).toBe("CLONE_DENIED");
    expect(r.load.sufficientForSeventeenLlm).toBe(false);
    expect(createHash("sha256").update(readFileSync("public/council/sinan-bey-official-voice-v1.m4a")).digest("hex")).toBe(
      EXPECTED_SHA,
    );
    expect(evaluateEgress({ destinationUrl: "https://api.anthropic.com/v1" }).allowed).toBe(false);
    expect(report({ rows: [{ units: 1, revenue: 10, net: 1 }] }).readOnly).toBe(true);
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    expect(pusat.executeReadOnly("SEVENTEEN_AGENT_COUNCIL", {}, { actorId: "pusat" }).data.registered).toBe(17);
  });

  it("seats all 17 seed identities once in one synthetic meeting", () => {
    const meeting = holdSeedMeeting();
    const seated = meeting.participants.map((participant) => participant.id);
    expect(meeting.ok).toBe(true);
    expect(meeting.synthetic).toBe(true);
    expect(meeting.productionReady).toBe(false);
    expect(meeting.productionClaim).toBe(false);
    expect(meeting.salesEnabled).toBe(false);
    expect(meeting.chairId).toBe("pusat");
    expect(meeting.count).toBe(17);
    expect(meeting.uniqueCount).toBe(17);
    expect(seated).toEqual([...SEED_IDS]);
    expect(new Set(seated).size).toBe(17);
    expect(meeting.orderCreated).toBe(false);
    expect(meeting.paymentCreated).toBe(false);
    expect(meeting.purchased).toBe(false);
    expect(meeting.shipmentCreated).toBe(false);
    expect(meeting.refunded).toBe(false);
    expect(meeting.exported).toBe(false);
    expect(meeting.deployed).toBe(false);
    expect(meeting.decisions).toHaveLength(1);
    expect(meeting.decisions[0].executed).toBe(false);
    for (const participant of meeting.participants) {
      const agent = getAgent(participant.id);
      expect(participant.name).toBe(agent.display_name);
      expect(participant.role).toBe(agent.role);
      expect(participant.present).toBe(true);
      expect(participant.canBuyStock).toBe(false);
      expect(participant.canExecutePayments).toBe(false);
      expect(participant.canEnableSales).toBe(false);
      expect(participant.canExportCustomerData).toBe(false);
      expect(participant.canDeploy).toBe(false);
      expect(participant.canDistribute).toBe(false);
      expect(participant.permissions.includes("STOCK_BUY")).toBe(false);
      expect(participant.permissions.includes("SALES_ACTIVATE")).toBe(false);
      expect(participant.permissions.includes("DATA_EXPORT")).toBe(false);
      expect(participant.permissions.includes("DEPLOY")).toBe(false);
      expect(participant.permissions.includes("LIVE_PAYMENT")).toBe(false);
      expect(participant.permissions.includes("CUSTOMER_REFUND")).toBe(false);
      expect(participant.permissions.includes("SHIPMENT_CREATE")).toBe(false);
    }
    const before = roster("seed-meeting").find((participant) => participant.id === "stock_ai").permissions;
    const widened = delegateWithinMeeting({ fromId: "pusat", toId: "stock_ai", permission: "STOCK_BUY" });
    const after = roster("seed-meeting").find((participant) => participant.id === "stock_ai").permissions;
    expect(widened.ok).toBe(false);
    expect(widened.granted).toBe(false);
    expect(widened.permissionIncreased).toBe(false);
    expect(widened.executed).toBe(false);
    expect(widened.purchased).toBe(false);
    expect(after).toEqual(before);
    const shared = delegateWithinMeeting({ fromId: "amelia", toId: "adrian", permission: "CREATE_REPORTS" });
    expect(shared.ok).toBe(true);
    expect(shared.granted).toBe(false);
    expect(shared.permissionIncreased).toBe(false);
    expect(shared.executed).toBe(false);
    const outside = delegateWithinMeeting({ fromId: "stock_ai", toId: "pricing_ai", permission: "PRICE_PUBLISH_LIVE" });
    expect(outside.ok).toBe(false);
    expect(outside.permissionIncreased).toBe(false);
    expect(MEMBERS.some((member) => member.id === "phone_ai")).toBe(true);
    expect(MEMBERS.some((member) => member.id === "zeynep_hanim")).toBe(false);
    expect(roster().map((member) => member.id)).toEqual([...SEED_IDS]);
    expect(roster("official").map((member) => member.id)).toEqual([...SEED_IDS]);
    expect(roster("seed-meeting").map((member) => member.id)).toEqual([...SEED_IDS]);
    expect(roster().some((member) => member.id === "nesrin_hanim")).toBe(false);
    expect(roster().some((member) => member.id === "finance_ai")).toBe(false);
    expect(roster().some((member) => member.id === "phone_ai")).toBe(false);
    expect(roster().some((member) => member.id === "zeynep_hanim")).toBe(true);
    expect(roster("legacy").some((member) => member.id === "nesrin_hanim")).toBe(true);
    expect(roster("legacy").some((member) => member.id === "phone_ai")).toBe(true);
    expect(meeting.openedAt).toEqual(expect.any(String));
    expect(meeting.meetingId).toEqual(expect.any(String));
    expect(meeting.participants.filter((participant) => participant.chair).map((participant) => participant.id)).toEqual(["pusat"]);
    expect(meeting.opinions.map((opinion) => opinion.speakerId)).toEqual([...SEED_IDS]);
    expect(meeting.opinions.every((opinion) => opinion.executed === false && typeof opinion.at === "string")).toBe(true);
    expect(meeting.decisions.some((decision) => decision.speakerId)).toBe(false);
    expect(meeting.decisions[0].recordedBy).toBe("pusat");
    expect(meeting.decisions[0].at).toBe(meeting.openedAt);
    expect(meeting.decisionHistory[0]).toBe(meeting.decisions[0]);
    for (const legacyId of ["nesrin_hanim", "finance_ai", "textile_ai", "phone_ai", "customs_ai"]) {
      expect(seated.includes(legacyId)).toBe(false);
      expect(meeting.opinions.some((opinion) => opinion.speakerId === legacyId)).toBe(false);
    }
    const again = holdSeedMeeting();
    expect(again.ok).toBe(false);
    expect(again.code).toBe("DUPLICATE_MEETING");
    expect(again.meetingId).toBe(meeting.meetingId);
    expect(meeting.decisions).toHaveLength(1);
    const repeated = recordSeedDecision({
      meetingId: meeting.meetingId,
      text: meeting.decisions[0].text,
      recordedBy: "pusat",
    });
    expect(repeated.ok).toBe(false);
    expect(repeated.code).toBe("DUPLICATE_DECISION");
    expect(repeated.executed).toBe(false);
    expect(meeting.decisions).toHaveLength(1);
    const outsider = assignFromSeedMeeting({
      meetingId: meeting.meetingId,
      fromId: "sinan_bey",
      assigneeId: "esat_bey",
      title: "Do not assign",
    });
    expect(outsider.ok).toBe(false);
    expect(outsider.code).toBe("PERMISSION_DENIED");
    expect(outsider.executed).toBe(false);
    expect(meeting.tasks).toHaveLength(0);
    expect(meeting.decisions[0].executed).toBe(false);
    const assigned = assignFromSeedMeeting({
      meetingId: meeting.meetingId,
      fromId: "pusat",
      assigneeId: "sinan_bey",
      title: "Record only",
    });
    expect(assigned.ok).toBe(true);
    expect(assigned.executed).toBe(false);
    expect(assigned.purchased).toBe(false);
    expect(assigned.permissionIncreased).toBe(false);
    expect(assigned.assignment.sender).toBe("pusat");
    expect(assigned.assignment.receiver).toBe("sinan_bey");
    expect(assigned.assignment.permission_scope).toBe("task");
    expect(meeting.tasks).toHaveLength(1);
    expect(meeting.decisionHistory.some((entry) => entry.taskId === assigned.assignment.taskId && entry.executed === false)).toBe(true);
    const repeatedTask = assignFromSeedMeeting({
      meetingId: meeting.meetingId,
      fromId: "pusat",
      assigneeId: "sinan_bey",
      title: "Record only",
    });
    expect(repeatedTask.ok).toBe(false);
    expect(repeatedTask.code).toBe("DUPLICATE_ASSIGNMENT");
    expect(meeting.tasks).toHaveLength(1);
    expect(meeting.decisions[0].executed).toBe(false);
    expect(meeting.salesEnabled).toBe(false);
    expect(meeting.productionReady).toBe(false);
  });

  it("uses the registry memory path for Banu and Zeynep without mixing their records", () => {
    const unchanged = {
      pusat: "memory/pusat/",
      sinan_bey: "memory/sinan/",
      esat_bey: "memory/esat/",
      dogu_bey: "memory/dogu/",
      nedim_bey: "memory/nedim/",
      tuncay_bey: "memory/tuncay/",
      amelia: "memory/amelia/",
      adrian: "memory/adrian/",
      mira: "memory/mira/",
      leon: "memory/leon/",
      stock_ai: "memory/stock_ai/",
      category_ai: "memory/category_ai/",
      pricing_ai: "memory/pricing_ai/",
      seo_ai: "memory/seo_ai/",
      sales_analysis_ai: "memory/sales_analysis_ai/",
    };
    const mem = createMultiMemory();
    for (const [id, namespace] of Object.entries(unchanged)) {
      expect(getAgentExact(id).memory_namespace).toBe(namespace);
      expect(getAgentExact(id).agent_id).toBe(id);
      const written = mem.put({ actorId: id, ownerId: id, type: "personal", key: "path", value: id });
      expect(written.namespace).toBe(namespace);
      expect(mem.get({ actorId: id, ownerId: id, type: "personal", key: "path" }).value).toBe(id);
    }
    expect(getAgentExact("banu_hanim").agent_id).toBe("banu_hanim");
    expect(getAgentExact("zeynep_hanim").agent_id).toBe("zeynep_hanim");
    expect(getAgentExact("banu_hanim").memory_namespace).toBe("memory/banu/");
    expect(getAgentExact("zeynep_hanim").memory_namespace).toBe("memory/zeynep/");
    const banu = mem.put({ actorId: "banu_hanim", ownerId: "banu_hanim", type: "personal", key: "note", value: "banu-only" });
    const zeynep = mem.put({ actorId: "zeynep_hanim", ownerId: "zeynep_hanim", type: "personal", key: "note", value: "zeynep-only" });
    expect(banu.namespace).toBe("memory/banu/");
    expect(zeynep.namespace).toBe("memory/zeynep/");
    expect(mem.get({ actorId: "banu_hanim", ownerId: "banu_hanim", type: "personal", key: "note" })).toMatchObject({
      value: "banu-only",
      namespace: "memory/banu/",
    });
    expect(mem.get({ actorId: "zeynep_hanim", ownerId: "zeynep_hanim", type: "personal", key: "note" })).toMatchObject({
      value: "zeynep-only",
      namespace: "memory/zeynep/",
    });
    for (const actorId of ["pusat", "zeynep_hanim", "sinan_bey", "customer_ai"]) {
      expect(mem.get({ actorId, ownerId: "banu_hanim", type: "personal", key: "note" }).code).toBe("MEMORY_ISOLATION_DENIED");
    }
    for (const actorId of ["pusat", "banu_hanim", "sinan_bey", "phone_ai"]) {
      expect(mem.get({ actorId, ownerId: "zeynep_hanim", type: "personal", key: "note" }).code).toBe("MEMORY_ISOLATION_DENIED");
    }
    expect(mem.put({ actorId: "customer_ai", ownerId: "customer_ai", type: "personal", key: "note", value: "alias" }).namespace).toBe(
      "memory/customer_ai/",
    );
    expect(mem.put({ actorId: "phone_ai", ownerId: "phone_ai", type: "personal", key: "note", value: "alias" }).namespace).toBe(
      "memory/phone_ai/",
    );
    expect(mem.get({ actorId: "banu_hanim", ownerId: "customer_ai", type: "personal", key: "note" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
    expect(mem.get({ actorId: "zeynep_hanim", ownerId: "phone_ai", type: "personal", key: "note" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
  });

  it("records gated dispatch in the approval center without executing it", () => {
    const center = createApprovalCenter({
      dbPath: path.join(mkdtempSync(path.join(tmpdir(), "buzzard-dispatch-apr-")), "approvals.sqlite"),
    });
    try {
      expect(SEED_IDS).not.toContain("finance_ai");
      expect(dispatch({ agentId: "finance_ai", kind: "STOCK_BUY", approvals: center }).code).toBe("UNKNOWN_AGENT");
      expect(dispatch({ agentId: "banu_hanim", kind: "STOCK_BUY", approvals: center }).code).toBe("UNAUTHORIZED_KIND");
      expect(dispatch({ agentId: "sinan_bey", kind: "DEPLOY", approvals: center }).code).toBe("UNAUTHORIZED_KIND");
      expect(dispatch({ agentId: "tuncay_bey", kind: "SHIPMENT_CREATE", approvals: center }).code).toBe("UNAUTHORIZED_KIND");
      expect(center.pending()).toHaveLength(0);

      const buy = dispatch({ agentId: "stock_ai", kind: "STOCK_BUY", approvals: center });
      const refund = dispatch({ agentId: "banu_hanim", kind: "CUSTOMER_REFUND", approvals: center });
      const transfer = dispatch({ agentId: "nedim_bey", kind: "BANK_TRANSFER", approvals: center });
      const call = dispatch({ agentId: "zeynep_hanim", kind: "PHONE_LIVE_CALL", approvals: center });
      for (const row of [buy, refund, transfer, call]) {
        expect(row.ok).toBe(false);
        expect(row.code).toBe("HUMAN_GATE_REQUIRED");
        expect(row.approval.recorded).toBe(true);
        expect(row.approval.status).toBe("WAITING_APPROVAL");
        expect(row.approval.executed).toBe(false);
        expect(SEED_IDS).toContain(row.agentId);
      }
      expect(buy.result.purchased).toBe(false);
      expect(refund.result.refunded).toBe(false);
      expect(transfer.result.realMoneyMovement).toBe(false);
      expect(transfer.result.sent).toBe(false);
      expect(call.result.liveCall).toBe(false);
      expect(center.pending().map((item) => item.requested_by).sort()).toEqual(
        ["banu_hanim", "nedim_bey", "stock_ai", "zeynep_hanim"].sort(),
      );
      expect(center.pending().some((item) => item.requested_by === "finance_ai")).toBe(false);

      const claimed = dispatch({
        agentId: "stock_ai",
        kind: "STOCK_BUY",
        input: { humanApproved: true },
        approvals: center,
      });
      expect(claimed.code).toBe("PURCHASE_BLOCKED");
      expect(claimed.result.purchased).toBe(false);
      expect(claimed.approval.status).toBe("WAITING_APPROVAL");

      expect(center.decide({ id: buy.approval.id, approved: true, actorId: "stock_ai" }).code).toBe("PERMISSION_DENIED");
      const decidedBuy = center.decide({ id: buy.approval.id, approved: true, actorId: "human" });
      const decidedPay = center.decide({ id: transfer.approval.id, approved: true, actorId: "human" });
      const shipment = center.submit({
        action: "SHIPMENT_CREATE",
        requestedBy: "pusat",
        taskId: "shipment-hold",
        risk: "CRITICAL",
      });
      const decidedShip = center.decide({ id: shipment.item.id, approved: true, actorId: "human" });
      const deploy = center.submit({
        action: "DEPLOY",
        requestedBy: "sinan_bey",
        taskId: "deploy-hold",
        risk: "CRITICAL",
      });
      const decidedDeploy = center.decide({ id: deploy.item.id, approved: true, actorId: "human" });
      for (const decided of [decidedBuy, decidedPay, decidedShip, decidedDeploy]) {
        expect(decided.ok).toBe(true);
        expect(decided.item.status).toBe("APPROVED");
        expect(decided.task).toBeNull();
      }
      const replayBuy = dispatch({
        agentId: "stock_ai",
        kind: "STOCK_BUY",
        input: { humanApproved: true },
        approvals: center,
      });
      const replayPay = dispatch({
        agentId: "nedim_bey",
        kind: "BANK_TRANSFER",
        input: { humanApproved: true },
        approvals: center,
      });
      const replayRefund = dispatch({
        agentId: "banu_hanim",
        kind: "CUSTOMER_REFUND",
        input: { humanApproved: true },
        approvals: center,
      });
      expect(replayBuy.code).toBe("PURCHASE_BLOCKED");
      expect(replayBuy.result.purchased).toBe(false);
      expect(replayBuy.result.moneyMoved).toBe(false);
      expect(replayPay.code).toBe("HUMAN_GATE_REQUIRED");
      expect(replayPay.result.sent).toBe(false);
      expect(replayPay.result.realMoneyMovement).toBe(false);
      expect(replayRefund.code).toBe("HUMAN_GATE_REQUIRED");
      expect(replayRefund.result.refunded).toBe(false);
      expect(dispatch({ agentId: "pusat", kind: "DEPLOY", approvals: center }).code).toBe("UNAUTHORIZED_KIND");
      expect(dispatch({ agentId: "pusat", kind: "SHIPMENT_CREATE", approvals: center }).code).toBe("UNAUTHORIZED_KIND");
    } finally {
      center.close();
    }
  });

  it("binds local agent messages to the acting identity", () => {
    const bus = createAgentBus();
    expect(bus.liveNetwork).toBe(false);
    const spoof = bus.send({ actorId: "banu_hanim", sender: "pusat", receiver: "sinan_bey", type: "note", body: "x" });
    expect(spoof.code).toBe("SENDER_MISMATCH");
    expect(spoof.liveNetwork).toBe(false);
    expect(bus.all()).toHaveLength(0);
    expect(
      bus.send({
        actorId: "sinan_bey",
        sender: "sinan_bey",
        receiver: "esat_bey",
        permission_scope: "STOCK_BUY",
        body: "buy",
      }).code,
    ).toBe("PERMISSION_SCOPE_DENIED");
    expect(
      bus.send({
        actorId: "sinan_bey",
        sender: "sinan_bey",
        receiver: "mira",
        permission_scope: "personal_memory",
        body: { ownerId: "sinan_bey", value: "secret" },
      }).code,
    ).toBe("PRIVATE_MEMORY_TRANSFER_DENIED");
    const sent = bus.send({
      actorId: "sinan_bey",
      sender: "sinan_bey",
      receiver: "esat_bey",
      type: "note",
      permission_scope: "shared",
      body: "local",
    });
    expect(sent.message.sender_agent_id).toBe("sinan_bey");
    expect(sent.message.receiver_agent_id).toBe("esat_bey");
    expect(sent.message.liveNetwork).toBe(false);
    expect(sent.message.permission_scope).toBe("shared");
    expect(bus.read({ actorId: "banu_hanim", boxId: "esat_bey" }).code).toBe("MESSAGE_ISOLATION_DENIED");
    expect(bus.read({ actorId: "esat_bey" }).messages).toHaveLength(1);
    expect(bus.read({ actorId: "zeynep_hanim" }).messages).toHaveLength(0);

    const router = createRouter();
    expect(router.create({ title: "missing actor" }).code).toBe("ACTOR_REQUIRED");
    const task = router.create({ title: "bound", fromId: "pusat" });
    expect(router.assign({ taskId: task.task.id, agentId: "stock_ai" }).code).toBe("ACTOR_REQUIRED");
    const denied = router.assign({ taskId: task.task.id, agentId: "stock_ai", fromId: "banu_hanim" });
    expect(denied.ok).toBe(false);
    expect(denied.assigned).toBe(false);
    expect(task.task.assignees).toEqual([]);
    const assigned = router.assign({ taskId: task.task.id, agentId: "phone_ai", fromId: "pusat" });
    expect(assigned.nativeId).toBe("zeynep_hanim");
    expect(assigned.identitiesMerged).toBe(false);
    expect(assigned.task.assignees).toEqual(["zeynep_hanim"]);
    expect(assigned.task.requestedBy).toBe("pusat");
    expect(assigned.task.liveNetwork).toBe(false);
    const message = router.bus.all().find((row) => row.task_id === task.task.id);
    expect(message.sender_agent_id).toBe("pusat");
    expect(message.receiver_agent_id).toBe("zeynep_hanim");
    expect(message.liveNetwork).toBe(false);
    expect(message.permission_scope).toBe("task");
  });

  it("allows only Pusat to assign on the task router", () => {
    const before = Object.fromEntries(SEED_IDS.map((id) => [id, explicitPermissions(id)]));
    const router = createRouter();
    const created = router.create({ title: "held", fromId: "pusat" });
    expect(created.ok).toBe(true);
    for (const id of SEED_IDS) {
      if (id === "pusat") continue;
      expect(router.create({ title: "blocked", fromId: id }).ok).toBe(false);
      const denied = router.assign({ taskId: created.task.id, agentId: "sinan_bey", fromId: id });
      expect(denied.ok).toBe(false);
      expect(denied.assigned).toBe(false);
      expect(denied.created).toBe(false);
      const direct = dispatch({ agentId: id, kind: "ASSIGN_TASK", input: { assigneeId: "esat_bey", title: "blocked" } });
      expect(direct.ok).toBe(false);
      expect(direct.code).toBe("UNAUTHORIZED_KIND");
    }
    expect(router.assign({ taskId: created.task.id, agentId: "sinan_bey", fromId: "phone_ai" }).ok).toBe(false);
    expect(created.task.assignees).toEqual([]);
    expect(created.task.state).toBe("CREATED");
    expect(router.list()).toHaveLength(1);

    const assigned = dispatch({
      agentId: "pusat",
      kind: "ASSIGN_TASK",
      input: { assigneeId: "sinan_bey", title: "review" },
    });
    expect(assigned.ok).toBe(true);
    expect(assigned.live).toBe(false);
    expect(assigned.result.sender).toBe("pusat");
    expect(assigned.result.receiver).toBe("sinan_bey");
    expect(assigned.result.taskId).toMatch(/^task_/);
    expect(assigned.result.permission_scope).toBe("task");
    expect(assigned.result.permissionIncreased).toBe(false);
    expect(assigned.result.task.assignees).toEqual(["sinan_bey"]);
    expect(assigned.result.task.requestedBy).toBe("pusat");

    const delegated = dispatch({
      agentId: "pusat",
      kind: "ASSIGN_TASK",
      input: { assigneeId: "banu_hanim", originRequesterId: "zeynep_hanim", delegationChain: ["stock_ai"] },
    });
    expect(delegated.ok).toBe(false);
    expect(delegated.result.created).toBe(false);
    expect(delegated.result.assigned).toBe(false);

    for (const id of SEED_IDS) {
      expect(explicitPermissions(id)).toEqual(before[id]);
      if (id !== "pusat") expect(explicitPermissions(id).includes("ASSIGN_TASK")).toBe(false);
    }
  });
});
