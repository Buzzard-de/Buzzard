/**
 * Executes a specialist action. Rule-based / adapter. Not 17 LLMs.
 */
const { think } = require("./sharedThinking");
const { getAgent, ids } = require("./identityRegistry");
const { resolveIdentity } = require("./councilAliasMap");
const { check } = require("./permissionEngine");
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
const esat = require("../../security/esatBey");
const { createDoguDesk } = require("../../pusat/doguResearch");
const { draft: brandDraft, campaignAnalyze, requestApproval } = require("./specialists/brandDraft");

const doguDesk = createDoguDesk();

const AGENT_KINDS = Object.freeze({
  pusat: ["THINK", "REPORT", "ASSIGN_TASK"],
  sinan_bey: ["THINK", "REPORT", "ANALYZE_CODE"],
  esat_bey: ["THINK", "REPORT", "SECURITY_STATUS", "INCIDENT_CLASSIFY", "SECURITY_REPORT"],
  dogu_bey: ["THINK", "REPORT", "RESEARCH_REQUEST", "SOURCE_ASSESS"],
  nedim_bey: ["THINK", "REPORT", "TAX_SPLIT", "BANK_TRANSFER"],
  tuncay_bey: ["THINK", "REPORT", "SANCTIONS_SCREEN"],
  amelia: ["THINK", "REPORT", "BRAND_DRAFT", "APPROVAL_REQUEST"],
  adrian: ["THINK", "REPORT", "BRAND_DRAFT", "APPROVAL_REQUEST"],
  mira: ["THINK", "REPORT", "INFLUENCER_DRAFT", "CAMPAIGN_ANALYZE", "APPROVAL_REQUEST"],
  leon: ["THINK", "REPORT", "INFLUENCER_DRAFT", "CAMPAIGN_ANALYZE", "APPROVAL_REQUEST"],
  stock_ai: ["THINK", "REPORT", "STOCK_READ", "STOCK_BUY"],
  category_ai: ["THINK", "REPORT", "CATEGORY_READ"],
  pricing_ai: ["THINK", "REPORT", "PRICE_CALCULATE"],
  seo_ai: ["THINK", "REPORT", "SEO_DRAFT"],
  banu_hanim: ["THINK", "REPORT", "CUSTOMER_REPLY", "CUSTOMER_READ", "CUSTOMER_REFUND"],
  sales_analysis_ai: ["THINK", "REPORT", "SALES_REPORT"],
  zeynep_hanim: ["THINK", "REPORT", "PHONE_SESSION", "PHONE_LIVE_CALL"],
});

function allowedKinds(nativeId) {
  return AGENT_KINDS[nativeId] || [];
}

function dispatch({ agentId, kind = "THINK", input = {} } = {}) {
  const resolved = resolveIdentity(agentId);
  const nativeId = resolved.ok ? resolved.nativeId : agentId;
  const agent = getAgent(nativeId);
  if (!agent) return { ok: false, code: "UNKNOWN_AGENT", llmCompleted: false, live: false };
  const base = { agentId: nativeId, requestedId: agentId, identitiesMerged: false, llmCompleted: false, live: false };
  const allowed = allowedKinds(nativeId);
  if (!allowed.includes(kind)) {
    return { ...base, ok: false, code: "UNAUTHORIZED_KIND", kind, allowed };
  }

  function wrap(nextKind, result, extra = {}) {
    const ok = extra.ok !== undefined ? extra.ok : Boolean(result && result.ok !== false);
    return { ...base, ok, kind: nextKind, result, code: extra.code || result?.code || (ok ? "OK" : "FAIL"), humanApproved: Boolean(input.humanApproved) };
  }

  try {
    if (kind === "THINK" || kind === "REPORT") {
      return wrap(kind, think({ agentId: nativeId, facts: { ask_expertise: true, ...input } }));
    }
    if (kind === "ASSIGN_TASK") {
      return wrap(kind, { ok: check("pusat", "ASSIGN_TASK").ok, live: false });
    }
    if (kind === "PRICE_CALCULATE") return wrap(kind, quote({ actorId: "pricing_ai", ...input }));
    if (kind === "STOCK_READ") return wrap(kind, inspectFeeds({ actorId: "stock_ai", feeds: input.feeds || [] }));
    if (kind === "STOCK_BUY") {
      const blocked = {
        ...buyStock(),
        ok: false,
        purchased: false,
        live: false,
        mock: false,
        status: "BLOCKED_EXTERNAL",
        dryRun: false,
      };
      if (input.humanApproved) {
        return wrap(kind, { ...blocked, code: "PURCHASE_BLOCKED" }, { ok: false, code: "PURCHASE_BLOCKED" });
      }
      return wrap(kind, blocked, { ok: false, code: "HUMAN_GATE_REQUIRED" });
    }
    if (kind === "CATEGORY_READ") return wrap(kind, inspectTree({ actorId: "category_ai", ...input }));
    if (kind === "CUSTOMER_REPLY" || kind === "CUSTOMER_READ") {
      return wrap(kind, reply({ actorId: "banu_hanim", ...input }));
    }
    if (kind === "CUSTOMER_REFUND") return wrap(kind, refund(), { ok: false, code: "HUMAN_GATE_REQUIRED" });
    if (kind === "PHONE_SESSION") return wrap(kind, session({ actorId: "zeynep_hanim", ...input }));
    if (kind === "PHONE_LIVE_CALL") return wrap(kind, liveDial(), { ok: false, code: "HUMAN_GATE_REQUIRED" });
    if (kind === "SALES_REPORT") return wrap(kind, report({ actorId: "sales_analysis_ai", ...input }));
    if (kind === "SEO_DRAFT") return wrap(kind, draft({ actorId: "seo_ai", ...input }));
    if (kind === "ANALYZE_CODE") return wrap(kind, analyze({ actorId: "sinan_bey", ...input }));
    if (kind === "SANCTIONS_SCREEN") return wrap(kind, screen(input));
    if (kind === "TAX_SPLIT") return wrap(kind, { ok: true, ...split(input) });
    if (kind === "BANK_TRANSFER") return wrap(kind, initiateTransfer(), { ok: false, code: "HUMAN_GATE_REQUIRED" });
    if (kind === "SECURITY_STATUS") return wrap(kind, { ok: true, ...esat.status() });
    if (kind === "INCIDENT_CLASSIFY") {
      const classified = esat.inspect({ type: input.type || "WATCH", details: input, actor: "esat_bey" });
      return wrap(kind, { ...classified, ok: true });
    }
    if (kind === "SECURITY_REPORT") return wrap(kind, { ok: true, recent: esat.recent(input.limit || 5), liveSoc: false });
    if (kind === "RESEARCH_REQUEST") {
      return wrap(
        kind,
        doguDesk.requestResearch({
          fromId: input.fromId || "pusat",
          topic: input.topic || "categories",
          question: input.question || "local_only",
        })
      );
    }
    if (kind === "SOURCE_ASSESS") {
      return wrap(
        kind,
        doguDesk.complete({
          requestId: input.requestId,
          sources: input.sources || [],
          findings: input.findings || "UNVERIFIED without dated URL",
        })
      );
    }
    if (kind === "BRAND_DRAFT" || kind === "INFLUENCER_DRAFT") {
      return wrap(kind, brandDraft({ actorId: nativeId, kind, facts: input }));
    }
    if (kind === "CAMPAIGN_ANALYZE") return wrap(kind, campaignAnalyze({ actorId: nativeId, rows: input.rows || [] }));
    if (kind === "APPROVAL_REQUEST") return wrap(kind, requestApproval({ actorId: nativeId, action: input.action }), { ok: false, code: "HUMAN_GATE_REQUIRED" });
    if (kind === "TRANSFER_MONEY" || kind === "DEPLOY") {
      return { ...base, ok: false, code: "HUMAN_GATE_REQUIRED", kind };
    }
    return { ...base, ok: false, code: "UNAUTHORIZED_KIND", kind };
  } catch (err) {
    return { ...base, ok: false, code: "DISPATCH_ERROR", error: String(err.message || err) };
  }
}

module.exports = { dispatch, AGENT_KINDS, allowedKinds, seedIds: ids };
