import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { ids, getAgent, ORIGINAL_10_IDS, registerAgent, unregisterAgent, assignVoice } = require("../lib/buzzardNative/core/identityRegistry.js");
const { createMultiMemory } = require("../lib/buzzardNative/core/multiMemory.js");
const { inspectFeeds, buyStock } = require("../lib/buzzardNative/core/specialists/stockEngine.js");
const { inspectTree, restoreRetired, renameCode } = require("../lib/buzzardNative/core/specialists/categoryEngine.js");
const { quote, publishLive, MIN_NET } = require("../lib/buzzardNative/core/specialists/pricingEngine.js");
const { draft, inventClaim, livePublish } = require("../lib/buzzardNative/core/specialists/seoEngine.js");
const { reply, refund } = require("../lib/buzzardNative/core/specialists/banuEngine.js");
const { report, transfer, changePrice } = require("../lib/buzzardNative/core/specialists/salesEngine.js");
const { session, liveDial, copySinanVoice } = require("../lib/buzzardNative/core/specialists/zeynepEngine.js");
const { runCouncil17 } = require("../lib/buzzardNative/core/council17.js");
const { check, selfElevate } = require("../lib/buzzardNative/core/permissionEngine.js");
const { createRouter } = require("../lib/buzzardNative/core/taskRouter.js");
const { MEMBERS } = require("../lib/pusat/council.js");
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
    expect(getAgent("stock_ai").display_name).toBe("Stok AI");
    expect(getAgent("category_ai").display_name).toBe("Kategori AI");
    expect(getAgent("pricing_ai").display_name).toBe("Fiyatlandırma AI");
    expect(getAgent("seo_ai").display_name).toBe("SEO AI");
    expect(getAgent("banu_hanim").display_name).toBe("Banu Hanım");
    expect(getAgent("sales_analysis_ai").display_name).toBe("Satış Analiz AI");
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
    expect(session().stt).toBe("NOT_IMPLEMENTED");
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
    router.assign({ taskId: t.task.id, agentId: "stock_ai" });
    router.assign({ taskId: t.task.id, agentId: "zeynep_hanim" });
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
});
