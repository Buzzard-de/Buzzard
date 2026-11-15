/**
 * Independent verification of specialist dispatch results.
 * A specialist cannot mark its own tests passed.
 * Generic ok:true is not evidence. Missing policy evidence is NOT_VERIFIED.
 */
const { AGENT_KINDS } = require("../buzzardNative/core/specialistDispatch");

const TASK_KINDS = Object.freeze([...new Set(Object.values(AGENT_KINDS).flat())]);

function auditRecord(kind, code, acceptance, evidence) {
  return {
    at: new Date().toISOString(),
    kind: kind || "UNKNOWN",
    code,
    acceptance: [...acceptance],
    evidence,
    schemaChecked: true,
    independent: true,
    humanReviewed: false,
  };
}

function fail(code, kind, acceptance = [], evidence = []) {
  return {
    ok: false,
    code,
    testsPassed: false,
    acceptancePassed: false,
    independent: true,
    notVerified: code === "NOT_VERIFIED",
    audit: auditRecord(kind, code, acceptance, evidence),
  };
}

function pass(kind, acceptance, evidence) {
  return {
    ok: true,
    code: "INDEPENDENT_OK",
    testsPassed: true,
    acceptancePassed: true,
    independent: true,
    notVerified: false,
    audit: auditRecord(kind, "INDEPENDENT_OK", acceptance, evidence),
  };
}

function has(inner, key) {
  return inner != null && Object.prototype.hasOwnProperty.call(inner, key) && inner[key] !== undefined;
}

function gated(kind, result, inner, acceptance) {
  if (result.ok === true) return fail("NOT_VERIFIED", kind, acceptance, ["ok_true_without_gate"]);
  const denied =
    result.code === "HUMAN_GATE_REQUIRED" &&
    inner &&
    inner.live !== true &&
    inner.sent !== true &&
    inner.liveCall !== true &&
    inner.livePublish !== true &&
    inner.purchased !== true;
  return denied ? fail("HUMAN_GATE_REQUIRED", kind, acceptance, ["human_gate"]) : fail("NOT_VERIFIED", kind, acceptance, []);
}

const POLICIES = {
  THINK(result, inner) {
    const acceptance = ["rule_based", "llm_off", "expertise_present", "source_present"];
    const ok =
      inner.kind === "RULE_BASED" &&
      inner.llmCompleted === false &&
      inner.ok !== false &&
      typeof inner.source === "string" &&
      Array.isArray(inner.expertise);
    return ok ? pass("THINK", acceptance, ["kind", "source", "expertise"]) : fail("NOT_VERIFIED", "THINK", acceptance, []);
  },
  REPORT(result, inner) {
    const acceptance = ["rule_based", "llm_off", "expertise_present", "source_present"];
    const ok =
      inner.kind === "RULE_BASED" &&
      inner.llmCompleted === false &&
      inner.ok !== false &&
      typeof inner.source === "string" &&
      Array.isArray(inner.expertise);
    return ok ? pass("REPORT", acceptance, ["kind", "source", "expertise"]) : fail("NOT_VERIFIED", "REPORT", acceptance, []);
  },
  ASSIGN_TASK(result, inner) {
    const acceptance = ["permission_ok", "not_live"];
    const ok = inner.ok === true && inner.live === false;
    return ok ? pass("ASSIGN_TASK", acceptance, ["ok", "live"]) : fail("NOT_VERIFIED", "ASSIGN_TASK", acceptance, []);
  },
  ANALYZE_CODE(result, inner) {
    const acceptance = ["local_repo", "llm_off", "not_live_verified"];
    const ok =
      inner.ok === true &&
      typeof inner.packageName === "string" &&
      inner.llmCompleted === false &&
      inner.liveVerified === false;
    return ok ? pass("ANALYZE_CODE", acceptance, ["packageName"]) : fail("NOT_VERIFIED", "ANALYZE_CODE", acceptance, []);
  },
  SECURITY_STATUS(result, inner) {
    const acceptance = ["status_snapshot", "not_sole_defense", "not_live_verified"];
    const ok = inner.ok === true && inner.liveVerified === false && inner.soleDefense === false && typeof inner.acceptanceStatus === "string";
    return ok ? pass("SECURITY_STATUS", acceptance, ["acceptanceStatus"]) : fail("NOT_VERIFIED", "SECURITY_STATUS", acceptance, []);
  },
  INCIDENT_CLASSIFY(result, inner) {
    const acceptance = ["classified_event", "reviewer_present"];
    const ok = inner.ok === true && typeof inner.eventId === "string" && typeof inner.reviewer === "string" && typeof inner.action === "string";
    return ok ? pass("INCIDENT_CLASSIFY", acceptance, ["eventId", "action"]) : fail("NOT_VERIFIED", "INCIDENT_CLASSIFY", acceptance, []);
  },
  SECURITY_REPORT(result, inner) {
    const acceptance = ["recent_events", "live_soc_off"];
    const ok = inner.ok === true && Array.isArray(inner.recent) && inner.liveSoc === false;
    return ok ? pass("SECURITY_REPORT", acceptance, ["recent"]) : fail("NOT_VERIFIED", "SECURITY_REPORT", acceptance, []);
  },
  RESEARCH_REQUEST(result, inner) {
    const acceptance = ["queued_request", "local_only"];
    const ok = inner.ok === true && inner.request && typeof inner.request.id === "string" && inner.request.status === "QUEUED";
    return ok ? pass("RESEARCH_REQUEST", acceptance, ["request.id"]) : fail("NOT_VERIFIED", "RESEARCH_REQUEST", acceptance, []);
  },
  SOURCE_ASSESS(result, inner) {
    const acceptance = ["verification_label", "sources_match_claim"];
    const report = inner.report || inner;
    const verification = report.verification;
    const sources = Array.isArray(inner.sources) ? inner.sources : Array.isArray(report.sources) ? report.sources : null;
    if (typeof verification !== "string" || !sources) return fail("NOT_VERIFIED", "SOURCE_ASSESS", acceptance, []);
    if (verification === "SOURCED" && sources.length === 0) return fail("NOT_VERIFIED", "SOURCE_ASSESS", acceptance, ["empty_sources"]);
    if (verification === "UNVERIFIED" || verification === "SOURCED") {
      return pass("SOURCE_ASSESS", acceptance, ["verification"]);
    }
    return fail("NOT_VERIFIED", "SOURCE_ASSESS", acceptance, []);
  },
  TAX_SPLIT(result, inner) {
    const acceptance = ["reserve_number", "no_authority_payment", "elster_off"];
    const ok =
      inner.ok === true &&
      typeof inner.emergencyReserve === "number" &&
      inner.paymentAuthority === false &&
      inner.elsterLive === false &&
      typeof inner.country === "string";
    return ok ? pass("TAX_SPLIT", acceptance, ["emergencyReserve", "country"]) : fail("NOT_VERIFIED", "TAX_SPLIT", acceptance, []);
  },
  BANK_TRANSFER(result, inner) {
    return gated("BANK_TRANSFER", result, inner, ["no_money_movement", "human_gate"]);
  },
  SANCTIONS_SCREEN(result, inner) {
    const acceptance = ["decision_present", "unknown_is_not_clear", "lists_not_live"];
    if (typeof inner.decision !== "string" || inner.liveLists === true) return fail("NOT_VERIFIED", "SANCTIONS_SCREEN", acceptance, []);
    if (inner.decision === "CLEAR" && inner.clear !== true) return fail("NOT_VERIFIED", "SANCTIONS_SCREEN", acceptance, []);
    if (inner.decision === "UNKNOWN" && inner.clear !== false) return fail("NOT_VERIFIED", "SANCTIONS_SCREEN", acceptance, []);
    return pass("SANCTIONS_SCREEN", acceptance, ["decision"]);
  },
  BRAND_DRAFT(result, inner) {
    const acceptance = ["draft_text", "publish_off", "llm_off"];
    const ok = inner.ok === true && typeof inner.text === "string" && inner.livePublish === false && inner.llmCompleted === false;
    return ok ? pass("BRAND_DRAFT", acceptance, ["text"]) : fail("NOT_VERIFIED", "BRAND_DRAFT", acceptance, []);
  },
  INFLUENCER_DRAFT(result, inner) {
    const acceptance = ["draft_text", "publish_off", "llm_off"];
    const ok = inner.ok === true && typeof inner.text === "string" && inner.livePublish === false && inner.llmCompleted === false;
    return ok ? pass("INFLUENCER_DRAFT", acceptance, ["text"]) : fail("NOT_VERIFIED", "INFLUENCER_DRAFT", acceptance, []);
  },
  CAMPAIGN_ANALYZE(result, inner) {
    const acceptance = ["impression_count", "live_ads_off"];
    const ok = inner.ok === true && typeof inner.impressions === "number" && inner.liveAds === false;
    return ok ? pass("CAMPAIGN_ANALYZE", acceptance, ["impressions"]) : fail("NOT_VERIFIED", "CAMPAIGN_ANALYZE", acceptance, []);
  },
  APPROVAL_REQUEST(result, inner) {
    return gated("APPROVAL_REQUEST", result, inner, ["publish_blocked"]);
  },
  STOCK_READ(result, inner) {
    const acceptance = ["feed_snapshot", "warehouse_off", "supplier_api_off"];
    const ok = inner.ok === false && inner.sellable === false && inner.chosen == null && inner.buzzardWarehouse === false && inner.liveSupplierApi === false && Array.isArray(inner.stale);
    return ok ? pass("STOCK_READ", acceptance, ["stale"]) : fail("NOT_VERIFIED", "STOCK_READ", acceptance, []);
  },
  STOCK_BUY(result, inner) {
    const acceptance = ["not_purchased", "purchase_blocked"];
    if (inner.purchased === true || (result.ok === true && inner.purchased === false)) {
      return fail("STOCK_PURCHASE_REJECTED", "STOCK_BUY", acceptance, ["purchased"]);
    }
    if (result.code === "PURCHASE_BLOCKED" || inner.code === "PURCHASE_BLOCKED") {
      return fail("PURCHASE_BLOCKED", "STOCK_BUY", acceptance, ["purchase_blocked"]);
    }
    if (result.code === "HUMAN_GATE_REQUIRED" || inner.code === "HUMAN_GATE_REQUIRED") {
      return fail("HUMAN_GATE_REQUIRED", "STOCK_BUY", acceptance, ["human_gate"]);
    }
    return fail("NOT_VERIFIED", "STOCK_BUY", acceptance, []);
  },
  CATEGORY_READ(result, inner) {
    const acceptance = ["master_count", "marketplace_map_off"];
    const ok = inner.ok === true && inner.main_categories === 50 && inner.liveMarketplaceMap === false && Array.isArray(inner.codes);
    return ok ? pass("CATEGORY_READ", acceptance, ["main_categories"]) : fail("NOT_VERIFIED", "CATEGORY_READ", acceptance, []);
  },
  PRICE_CALCULATE(result, inner) {
    const acceptance = ["net_number", "min_net", "publish_off"];
    const ok = inner.ok === true && typeof inner.net === "number" && inner.net >= 0.5 && inner.livePublish !== true && inner.publish !== true;
    return ok ? pass("PRICE_CALCULATE", acceptance, ["net"]) : fail("NOT_VERIFIED", "PRICE_CALCULATE", acceptance, [inner.code || "missing_net"]);
  },
  SEO_DRAFT(result, inner) {
    const acceptance = ["schema_fields", "publish_off"];
    const ok =
      inner.ok === true &&
      typeof inner.lang === "string" &&
      has(inner, "title") &&
      inner.livePublish === false &&
      Array.isArray(inner.keywords);
    return ok ? pass("SEO_DRAFT", acceptance, ["lang", "keywords"]) : fail("NOT_VERIFIED", "SEO_DRAFT", acceptance, []);
  },
  CUSTOMER_REPLY(result, inner) {
    const acceptance = ["draft_only", "mailbox_off"];
    const ok = inner.ok === true && inner.sent === false && inner.liveMailbox === false && typeof inner.text === "string";
    return ok ? pass("CUSTOMER_REPLY", acceptance, ["text"]) : fail("NOT_VERIFIED", "CUSTOMER_REPLY", acceptance, []);
  },
  CUSTOMER_READ(result, inner) {
    const acceptance = ["draft_only", "mailbox_off"];
    const ok = inner.ok === true && inner.sent === false && inner.liveMailbox === false && typeof inner.text === "string";
    return ok ? pass("CUSTOMER_READ", acceptance, ["text"]) : fail("NOT_VERIFIED", "CUSTOMER_READ", acceptance, []);
  },
  CUSTOMER_REFUND(result, inner) {
    return gated("CUSTOMER_REFUND", result, inner, ["refund_not_sent"]);
  },
  SALES_REPORT(result, inner) {
    const acceptance = ["read_only", "bi_off", "no_write"];
    const ok = inner.ok === true && inner.readOnly === true && inner.liveBi === false && inner.write === false && typeof inner.revenue === "number";
    return ok ? pass("SALES_REPORT", acceptance, ["revenue"]) : fail("NOT_VERIFIED", "SALES_REPORT", acceptance, []);
  },
  PHONE_SESSION(result, inner) {
    const acceptance = ["loopback_stt", "live_call_off"];
    const ok = inner.ok === true && inner.stt === "LOOPBACK" && inner.liveCall === false && Array.isArray(inner.transcript);
    return ok ? pass("PHONE_SESSION", acceptance, ["stt"]) : fail("NOT_VERIFIED", "PHONE_SESSION", acceptance, []);
  },
  PHONE_LIVE_CALL(result, inner) {
    return gated("PHONE_LIVE_CALL", result, inner, ["live_call_blocked"]);
  },
};

function verifyDispatch({ kind, result } = {}) {
  if (!result) return fail("NOT_VERIFIED", kind);
  if (result.llmCompleted === true) return fail("LLM_CLAIM_REJECTED", kind);
  if (result.live === true) return fail("LIVE_CLAIM_REJECTED", kind);
  const inner = result.result || {};
  if (inner.live === true || inner.liveCall === true || inner.purchased === true || inner.sent === true) {
    return fail("LIVE_ACTION_REJECTED", kind);
  }
  const policy = POLICIES[kind];
  if (!policy) return fail("NOT_VERIFIED", kind, ["explicit_policy"]);
  return policy(result, inner);
}

module.exports = { verifyDispatch, POLICIES, TASK_KINDS };
