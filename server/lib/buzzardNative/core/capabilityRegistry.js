const { matrix, STATUS } = require("../platform/engineStatus");

const ENGINE = Object.freeze({
  thinking: { shared: true, live: matrix().thinking.structuredInference, note: "RULE_BASED_not_LLM" },
  hearing: { shared: true, live: matrix().hearing.stt, proto: matrix().hearing.toneCodecStt, note: "human_STT_absent" },
  speech: { shared: true, live: matrix().speech.officialTts, proto: matrix().speech.protoTone, note: "cloneAuthorized_false" },
  vision: { shared: true, live: matrix().vision.understand, proto: matrix().vision.bitmapOcr, note: "template_OCR_not_understanding" },
  memory: { shared: true, live: matrix().memory.isolation },
  digital_body: { shared: true, live: matrix().digital_body.body3d, proto: matrix().digital_body.pngAvatar, note: "png_not_3d" },
  motion: { shared: true, live: matrix().motion.lipSync, proto: matrix().motion.visemeSchedule, note: "viseme_not_lipsync" },
  realtime: { shared: true, live: matrix().realtime.liveMedia, proto: STATUS.TESTED, note: "in_process_not_network" },
  security_analysis: { shared: false, live: STATUS.CODE_READY },
  research_analysis: { shared: false, live: STATUS.CODE_READY },
  task_routing: { shared: false, live: STATUS.TESTED },
  event_coordination: { shared: false, live: STATUS.TESTED },
  permission_management: { shared: false, live: STATUS.TESTED },
  tax_analysis: { shared: false, live: STATUS.CODE_READY, note: "snapshot_unverified_not_live_legal" },
  customs_analysis: { shared: false, live: STATUS.CODE_READY, note: "schema_seed_not_live_taric" },
  stock_feeds: { shared: false, live: STATUS.CODE_READY, note: "dropship_feeds_not_live_supplier_api" },
  category_tree: { shared: false, live: STATUS.TESTED, note: "local_master_50_json" },
  pricing: { shared: false, live: STATUS.CODE_READY, note: "rule_quote_not_live_publish" },
  seo_draft: { shared: false, live: STATUS.CODE_READY, note: "draft_not_live_site" },
  customer_service: { shared: false, live: STATUS.CODE_READY, note: "policy_replies_not_live_mailbox" },
  sales_read: { shared: false, live: STATUS.CODE_READY, note: "in_process_aggregates" },
  phone_assistant: { shared: false, live: STATUS.NOT_IMPLEMENTED, note: "no_stt_tts_webrtc_carrier" },
});

function cap(name, granted) {
  const e = ENGINE[name];
  if (!granted) return { engine: name, granted: false, status: "NOT_CONFIGURED", active: false };
  if (!e) return { engine: name, granted: true, status: "NOT_CONFIGURED", active: false };
  const st = e.live;
  const liveOk = st === STATUS.LIVE_VERIFIED || st === STATUS.PRODUCTION_READY;
  return {
    engine: name,
    granted: true,
    status: st,
    protoStatus: e.proto || null,
    note: e.note || null,
    active: liveOk,
    testedLocal: st === STATUS.TESTED || e.proto === STATUS.TESTED,
  };
}

function list(names) {
  return names.map((n) => cap(n, true));
}

const PROFILES = Object.freeze({
  sinan_bey: list(["thinking", "hearing", "speech", "vision", "memory", "digital_body", "motion", "realtime"]),
  esat_bey: list(["thinking", "hearing", "speech", "vision", "memory", "security_analysis"]),
  dogu_bey: list(["thinking", "hearing", "speech", "vision", "memory", "research_analysis"]),
  amelia: list(["thinking", "hearing", "speech", "memory", "digital_body", "motion"]),
  adrian: list(["thinking", "hearing", "speech", "memory", "digital_body", "motion"]),
  mira: list(["thinking", "hearing", "speech", "vision", "memory", "digital_body", "motion"]),
  leon: list(["thinking", "hearing", "speech", "vision", "memory", "digital_body", "motion"]),
  pusat: list(["thinking", "hearing", "speech", "memory", "task_routing", "event_coordination", "permission_management"]),
  nedim_bey: list(["thinking", "hearing", "speech", "vision", "memory", "tax_analysis"]),
  tuncay_bey: list(["thinking", "hearing", "speech", "vision", "memory", "customs_analysis"]),
  stock_ai: list(["thinking", "memory", "stock_feeds"]),
  category_ai: list(["thinking", "memory", "category_tree"]),
  pricing_ai: list(["thinking", "memory", "pricing"]),
  seo_ai: list(["thinking", "memory", "seo_draft"]),
  banu_hanim: list(["thinking", "hearing", "speech", "memory", "customer_service"]),
  sales_analysis_ai: list(["thinking", "memory", "sales_read"]),
  zeynep_hanim: list(["thinking", "hearing", "speech", "memory", "phone_assistant"]),
});

function forAgent(id) {
  return PROFILES[id] || [];
}

function canUse(id, engine) {
  const row = forAgent(id).find((c) => c.engine === engine);
  return Boolean(row && row.granted);
}

module.exports = { PROFILES, forAgent, canUse, ENGINE, STATUS };
