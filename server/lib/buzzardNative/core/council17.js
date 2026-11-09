const { ids, getAgent, ORIGINAL_10_IDS, assignVoice, registerAgent, unregisterAgent } = require("./identityRegistry");
const { createRouter } = require("./taskRouter");
const { inspectFeeds, buyStock } = require("./specialists/stockEngine");
const { inspectTree, restoreRetired } = require("./specialists/categoryEngine");
const { quote, publishLive } = require("./specialists/pricingEngine");
const { draft, inventClaim } = require("./specialists/seoEngine");
const { reply, refund } = require("./specialists/banuEngine");
const { report, transfer } = require("./specialists/salesEngine");
const { session, liveDial, copySinanVoice } = require("./specialists/zeynepEngine");
const { runLoad } = require("./loadProbe");
const { cloneAttempt, verifyOfficialFile } = require("../speech/officialVoiceGuard");
const { evaluateEgress } = require("../../security/egressPolicy");
const { createMultiMemory } = require("./multiMemory");
const { speak } = require("./sharedSpeech");
const { check } = require("./permissionEngine");
const { MEMBERS } = require("../../pusat/council");

function runCouncil17({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  const router = createRouter();
  const t = router.create({ title: "daily ops", fromId: "pusat", kind: "OPS_REVIEW" });
  for (const id of ["stock_ai", "category_ai", "pricing_ai", "seo_ai", "banu_hanim", "sales_analysis_ai", "zeynep_hanim"]) {
    router.assign({ taskId: t.task.id, agentId: id });
  }
  const ran = router.runAssigned(t.task.id);
  const mem = createMultiMemory();
  mem.put({ actorId: "stock_ai", ownerId: "stock_ai", type: "personal", key: "s", value: 1 });
  const extra = registerAgent({ agent_id: "probe_ai", display_name: "Probe AI", role: "probe" });
  unregisterAgent("probe_ai");
  return {
    ok: true,
    budgetEur: 0,
    liveVerified: false,
    productionReady: false,
    registered: ids().length,
    original10: ORIGINAL_10_IDS.every((id) => ids().includes(id)),
    added7: [
      "stock_ai",
      "category_ai",
      "pricing_ai",
      "seo_ai",
      "banu_hanim",
      "sales_analysis_ai",
      "zeynep_hanim",
    ].map((id) => ({ id, name: getAgent(id).display_name })),
    councilMembersUntouched: {
      stock_ai: Boolean(MEMBERS.find((m) => m.id === "stock_ai")),
      phone_ai: Boolean(MEMBERS.find((m) => m.id === "phone_ai")),
      zeynepInMembers: Boolean(MEMBERS.find((m) => m.id === "zeynep_hanim")),
    },
    assign: ran.task.assignees,
    completed: ran.completed,
    stock: inspectFeeds({
      feeds: [
        { supplier: "a", sku: "x", qty: 0, updatedAt: Date.now(), format: "xml" },
        { supplier: "b", sku: "x", qty: 4, updatedAt: Date.now(), format: "csv" },
      ],
    }),
    buy: buyStock(),
    categories: inspectTree(),
    restoreFood: restoreRetired(),
    price: quote({
      supplierCost: 10,
      shipping: 2,
      marketplaceCommission: 1,
      vat: 2.28,
      returnReserve: 0.5,
      paymentFees: 0.3,
      category: "other",
    }),
    priceMissing: quote({ supplierCost: 10 }),
    publish: publishLive(),
    seo: draft({ titleFacts: ["Bremsscheibe", "320mm"], lang: "de" }),
    seoFake: inventClaim(),
    banu: reply({ intent: "order_status", verifiedFacts: { orderId: "o1", answer: "shipped" } }),
    banuRefund: refund(),
    sales: report({ rows: [{ units: 2, revenue: 20, returns: 0, net: 3 }] }),
    salesPay: transfer(),
    zeynep: session(),
    zeynepLive: liveDial(),
    zeynepVoice: copySinanVoice(),
    banuVoice: speak({ agentId: "banu_hanim", text: "a" }).voiceStatus,
    sinanCopyBanu: assignVoice({ fromId: "sinan_bey", toId: "banu_hanim" }),
    stockPeekBanu: mem.get({ actorId: "banu_hanim", ownerId: "stock_ai", type: "personal", key: "s" }).code,
    clone: cloneAttempt({ requested: true }),
    official: verifyOfficialFile(),
    egress: evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed,
    esat: check("esat_bey", "SECURITY_POLICY_CHANGE"),
    dynamic: extra.ok,
    load: runLoad(),
  };
}

module.exports = { runCouncil17 };
