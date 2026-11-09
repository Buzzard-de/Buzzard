/**
 * Executes a specialist action. Rule-based / adapter. Not 17 LLMs.
 */
const { think } = require("./sharedThinking");
const { getAgent } = require("./identityRegistry");
const { resolveIdentity } = require("./councilAliasMap");
const { quote } = require("./specialists/pricingEngine");
const { inspectFeeds, buyStock } = require("./specialists/stockEngine");
const { inspectTree } = require("./specialists/categoryEngine");
const { reply, refund } = require("./specialists/banuEngine");
const { session, liveDial } = require("./specialists/zeynepEngine");
const { report } = require("./specialists/salesEngine");
const { draft } = require("./specialists/seoEngine");
const { analyze } = require("../sinan/repoAnalysis");
const { screen } = require("../../compliance/sanctionsAdapter");
const { split } = require("../../finance/taxReserves");
const { initiateTransfer } = require("../../finance/bankingAdapter");

function dispatch({ agentId, kind = "THINK", input = {} } = {}) {
  const resolved = resolveIdentity(agentId);
  const nativeId = resolved.ok ? resolved.nativeId : agentId;
  const agent = getAgent(nativeId);
  if (!agent) return { ok: false, code: "UNKNOWN_AGENT", llmCompleted: false };
  const base = { agentId: nativeId, requestedId: agentId, identitiesMerged: false, llmCompleted: false, live: false };

  function wrap(kind, result, extra = {}) {
    const ok = extra.ok !== undefined ? extra.ok : Boolean(result && result.ok !== false);
    return { ...base, ok, kind, result, code: extra.code || result?.code || (ok ? "OK" : "FAIL") };
  }

  try {
    if (kind === "THINK" || kind === "REPORT") {
      return wrap(kind, think({ agentId: nativeId, facts: { ask_expertise: true, ...input } }));
    }
    if (nativeId === "pricing_ai" && kind === "PRICE_CALCULATE") {
      return wrap(kind, quote({ actorId: "pricing_ai", ...input }));
    }
    if (nativeId === "stock_ai" && kind === "STOCK_READ") {
      return wrap(kind, inspectFeeds({ actorId: "stock_ai", feeds: input.feeds || [] }));
    }
    if (nativeId === "stock_ai" && kind === "STOCK_BUY") {
      return wrap(kind, buyStock(), { ok: false, code: "HUMAN_GATE_REQUIRED" });
    }
    if (nativeId === "category_ai" && kind === "CATEGORY_READ") {
      return wrap(kind, inspectTree({ actorId: "category_ai", ...input }));
    }
    if (nativeId === "banu_hanim" && (kind === "CUSTOMER_REPLY" || kind === "CUSTOMER_READ")) {
      return wrap(kind, reply({ actorId: "banu_hanim", ...input }));
    }
    if (nativeId === "banu_hanim" && kind === "CUSTOMER_REFUND") {
      return wrap(kind, refund(), { ok: false, code: "HUMAN_GATE_REQUIRED" });
    }
    if (nativeId === "zeynep_hanim" && kind === "PHONE_SESSION") {
      return wrap(kind, session({ actorId: "zeynep_hanim", ...input }));
    }
    if (nativeId === "zeynep_hanim" && kind === "PHONE_LIVE_CALL") {
      return wrap(kind, liveDial(), { ok: false, code: "HUMAN_GATE_REQUIRED" });
    }
    if (nativeId === "sales_analysis_ai" && kind === "SALES_REPORT") {
      return wrap(kind, report({ actorId: "sales_analysis_ai", ...input }));
    }
    if (nativeId === "seo_ai" && kind === "SEO_DRAFT") {
      return wrap(kind, draft({ actorId: "seo_ai", ...input }));
    }
    if (nativeId === "sinan_bey" && kind === "ANALYZE_CODE") {
      return wrap(kind, analyze({ actorId: "sinan_bey", ...input }));
    }
    if (nativeId === "tuncay_bey" && kind === "SANCTIONS_SCREEN") {
      return wrap(kind, screen(input));
    }
    if (nativeId === "nedim_bey" && kind === "TAX_SPLIT") {
      return wrap(kind, split(input));
    }
    if (nativeId === "nedim_bey" && kind === "BANK_TRANSFER") {
      return wrap(kind, initiateTransfer(), { ok: false, code: "HUMAN_GATE_REQUIRED" });
    }
    if (kind === "TRANSFER_MONEY" || kind === "DEPLOY") {
      return { ...base, ok: false, code: "HUMAN_GATE_REQUIRED", kind };
    }
    return wrap("THINK", think({ agentId: nativeId, facts: { ask_expertise: true } }));
  } catch (err) {
    return { ...base, ok: false, code: "DISPATCH_ERROR", error: String(err.message || err) };
  }
}

module.exports = { dispatch };
