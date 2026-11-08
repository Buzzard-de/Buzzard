/**
 * Buzzard Native AI Core identity registry. Does not rewrite existing council MEMBERS.
 */
const fs = require("fs");
const path = require("path");

const now = "2026-11-08T18:27:00+01:00";
const expansionAt = "2026-11-08T19:13:00+01:00";

function voice(id, extra) {
  return {
    voice_profile_id: `${id}_voice_v1`,
    status: extra.status,
    cloneAuthorized: false,
    officialSinan: extra.officialSinan || false,
    ...extra,
  };
}

function avatar(id, extra) {
  return {
    avatar_profile_id: `${id}_avatar_v1`,
    status: extra.status,
    is3d: false,
    ...extra,
  };
}

const SEED_IDS = Object.freeze([
  "pusat",
  "sinan_bey",
  "esat_bey",
  "dogu_bey",
  "nedim_bey",
  "tuncay_bey",
  "amelia",
  "adrian",
  "mira",
  "leon",
]);

const AGENTS = [
  {
    agent_id: "pusat",
    display_name: "Pusat",
    role: "central_orchestrator",
    specialization: "CENTRAL_AI_ORCHESTRATOR",
    personality_profile: "coordinator_neutral",
    expertise: ["task_routing", "coordination", "permission_management"],
    expertise_profile: "orchestration",
    voice_profile: voice("pusat", { status: "NOT_CONFIGURED" }),
    avatar_profile: avatar("pusat", { status: "NOT_CONFIGURED" }),
    memory_namespace: "memory/pusat/",
    permission_profile: "pusat",
    capability_profile: "pusat",
    status: "CODE_READY",
    created_at: now,
    updated_at: now,
    impersonates: [],
  },
  {
    agent_id: "sinan_bey",
    display_name: "Sinan Bey",
    role: "chief_software_architect",
    specialization: "CHIEF_SOFTWARE_ARCHITECT",
    personality_profile: "serious_calm_professional_male",
    expertise: ["software_architecture", "code_analysis", "native_ai"],
    expertise_profile: "software",
    voice_profile: voice("sinan_bey", {
      status: "REFERENCE_REGISTERED",
      officialSinan: true,
      file: "public/council/sinan-bey-official-voice-v1.m4a",
    }),
    avatar_profile: avatar("sinan_bey", {
      status: "TESTED",
      file: "public/council/sinan-bey.png",
    }),
    memory_namespace: "memory/sinan/",
    permission_profile: "sinan_bey",
    capability_profile: "sinan_bey",
    status: "CODE_READY",
    created_at: now,
    updated_at: now,
    impersonates: [],
  },
  {
    agent_id: "esat_bey",
    display_name: "Esat Bey",
    role: "cyber_security_guardian",
    specialization: "CHIEF_CYBER_SECURITY_GUARDIAN",
    personality_profile: "security_reserved_male",
    expertise: ["security_audit", "threat_analysis", "egress"],
    expertise_profile: "security",
    voice_profile: voice("esat_bey", { status: "NOT_CONFIGURED" }),
    avatar_profile: avatar("esat_bey", { status: "NOT_CONFIGURED" }),
    memory_namespace: "memory/esat/",
    permission_profile: "esat_bey",
    capability_profile: "esat_bey",
    status: "CODE_READY",
    created_at: now,
    updated_at: now,
    impersonates: [],
  },
  {
    agent_id: "dogu_bey",
    display_name: "Doğu Bey",
    role: "research_intelligence",
    specialization: "RESEARCH_AND_INTELLIGENCE_SPECIALIST",
    personality_profile: "research_measured_male",
    expertise: ["research", "source_verification", "intelligence"],
    expertise_profile: "research",
    voice_profile: voice("dogu_bey", { status: "NOT_CONFIGURED" }),
    avatar_profile: avatar("dogu_bey", { status: "NOT_CONFIGURED" }),
    memory_namespace: "memory/dogu/",
    permission_profile: "dogu_bey",
    capability_profile: "dogu_bey",
    status: "CODE_READY",
    created_at: now,
    updated_at: now,
    impersonates: [],
  },
  {
    agent_id: "nedim_bey",
    display_name: "Nedim Bey",
    role: "global_tax_and_finance_compliance_specialist",
    specialization: "GLOBAL_TAX_AND_FINANCE_COMPLIANCE_SPECIALIST",
    officialDuty: "VERGI_AI",
    personality_profile: "tax_precise_male",
    expertise: ["vat", "oss_ioss", "corporate_tax_research", "tax_calendar", "net_income_reporting"],
    expertise_profile: "tax",
    voice_profile: voice("nedim_bey", { status: "NOT_CONFIGURED" }),
    avatar_profile: avatar("nedim_bey", { status: "NOT_CONFIGURED" }),
    memory_namespace: "memory/nedim/",
    permission_profile: "nedim_bey",
    capability_profile: "nedim_bey",
    status: "CODE_READY",
    created_at: expansionAt,
    updated_at: expansionAt,
    impersonates: [],
    notFinalCustomsExpert: true,
  },
  {
    agent_id: "tuncay_bey",
    display_name: "Tuncay Bey",
    role: "global_customs_and_trade_compliance_specialist",
    specialization: "GLOBAL_CUSTOMS_AND_TRADE_COMPLIANCE_SPECIALIST",
    officialDuty: "GUMRUK_AI",
    personality_profile: "customs_measured_male",
    expertise: ["hs_cn_taric", "origin", "sanctions_screen", "import_export_rules", "customs_documents"],
    expertise_profile: "customs",
    voice_profile: voice("tuncay_bey", { status: "NOT_CONFIGURED" }),
    avatar_profile: avatar("tuncay_bey", { status: "NOT_CONFIGURED" }),
    memory_namespace: "memory/tuncay/",
    permission_profile: "tuncay_bey",
    capability_profile: "tuncay_bey",
    status: "CODE_READY",
    created_at: expansionAt,
    updated_at: expansionAt,
    impersonates: [],
    notFinalTaxExpert: true,
  },
  {
    agent_id: "amelia",
    display_name: "Amelia",
    role: "brand_ambassador_female",
    specialization: "FEMALE_BRAND_AMBASSADOR",
    personality_profile: "brand_welcome_female",
    expertise: ["brand_communication", "customer_greeting"],
    expertise_profile: "brand",
    voice_profile: voice("amelia", { status: "NOT_CONFIGURED" }),
    avatar_profile: avatar("amelia", { status: "NOT_CONFIGURED" }),
    memory_namespace: "memory/amelia/",
    permission_profile: "amelia",
    capability_profile: "amelia",
    status: "CODE_READY",
    created_at: now,
    updated_at: now,
    impersonates: [],
  },
  {
    agent_id: "adrian",
    display_name: "Adrian",
    role: "brand_ambassador_male",
    specialization: "MALE_BRAND_AMBASSADOR",
    personality_profile: "brand_promo_male",
    expertise_profile: "brand",
    expertise: ["brand_communication", "product_intro"],
    voice_profile: voice("adrian", { status: "NOT_CONFIGURED" }),
    avatar_profile: avatar("adrian", { status: "NOT_CONFIGURED" }),
    memory_namespace: "memory/adrian/",
    permission_profile: "adrian",
    capability_profile: "adrian",
    status: "CODE_READY",
    created_at: now,
    updated_at: now,
    impersonates: [],
  },
  {
    agent_id: "mira",
    display_name: "Mira",
    role: "ai_influencer_female",
    specialization: "FEMALE_AI_INFLUENCER",
    personality_profile: "social_story_female",
    expertise_profile: "influencer",
    expertise: ["content_planning", "campaign_ideas"],
    voice_profile: voice("mira", { status: "NOT_CONFIGURED" }),
    avatar_profile: avatar("mira", { status: "NOT_CONFIGURED" }),
    memory_namespace: "memory/mira/",
    permission_profile: "mira",
    capability_profile: "mira",
    status: "CODE_READY",
    created_at: now,
    updated_at: now,
    impersonates: [],
  },
  {
    agent_id: "leon",
    display_name: "Leon",
    role: "ai_influencer_male",
    specialization: "MALE_AI_INFLUENCER",
    personality_profile: "social_promo_male",
    expertise_profile: "influencer",
    expertise: ["content_planning", "marketing_analysis"],
    voice_profile: voice("leon", { status: "NOT_CONFIGURED" }),
    avatar_profile: avatar("leon", { status: "NOT_CONFIGURED" }),
    memory_namespace: "memory/leon/",
    permission_profile: "leon",
    capability_profile: "leon",
    status: "CODE_READY",
    created_at: now,
    updated_at: now,
    impersonates: [],
  },
];

function getAgent(id) {
  return AGENTS.find((a) => a.agent_id === id) || null;
}

function ids() {
  return AGENTS.map((a) => a.agent_id);
}

function registerAgent(profile) {
  if (!profile || !profile.agent_id || !profile.display_name) {
    return { ok: false, code: "INVALID_AGENT_PROFILE" };
  }
  if (ids().includes(profile.agent_id)) return { ok: false, code: "AGENT_ID_CONFLICT" };
  if (AGENTS.some((a) => a.display_name === profile.display_name)) return { ok: false, code: "DISPLAY_NAME_CONFLICT" };
  if (SEED_IDS.includes(profile.agent_id)) return { ok: false, code: "SEED_IDENTITY_LOCKED" };
  const rec = {
    ...profile,
    created_at: profile.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    voice_profile: profile.voice_profile || voice(profile.agent_id, { status: "NOT_CONFIGURED" }),
    avatar_profile: profile.avatar_profile || avatar(profile.agent_id, { status: "NOT_CONFIGURED" }),
    memory_namespace: profile.memory_namespace || `memory/${profile.agent_id}/`,
    cloneAuthorized: false,
    impersonates: [],
  };
  AGENTS.push(rec);
  return { ok: true, agent: rec, dynamic: true, liveVerified: false };
}

function unregisterAgent(id) {
  if (SEED_IDS.includes(id)) return { ok: false, code: "SEED_IDENTITY_LOCKED" };
  const i = AGENTS.findIndex((a) => a.agent_id === id);
  if (i < 0) return { ok: false, code: "UNKNOWN_AGENT" };
  AGENTS.splice(i, 1);
  return { ok: true, removed: id };
}

function assignVoice({ actorId, fromId, toId }) {
  if (fromId === "sinan_bey" && toId !== "sinan_bey") {
    return { ok: false, code: "VOICE_IDENTITY_NOT_COPYABLE", actorId };
  }
  if (fromId !== toId) return { ok: false, code: "VOICE_ASSIGN_CROSS_IDENTITY_DENIED" };
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "OFFICIAL_CHARACTER_CHANGE" };
}

function assignAvatar({ fromId, toId }) {
  if (fromId !== toId) return { ok: false, code: "AVATAR_CROSS_IDENTITY_DENIED" };
  return { ok: false, code: "HUMAN_GATE_REQUIRED" };
}

function impersonate({ actorId, asId }) {
  if (actorId !== asId) return { ok: false, code: "IMPERSONATION_DENIED" };
  return { ok: true, agent: getAgent(actorId) };
}

function verifySinanAssets() {
  const voiceFile = path.join(process.cwd(), "public/council/sinan-bey-official-voice-v1.m4a");
  const avatarFile = path.join(process.cwd(), "public/council/sinan-bey.png");
  return {
    voiceExists: fs.existsSync(voiceFile),
    avatarExists: fs.existsSync(avatarFile),
  };
}

module.exports = {
  AGENTS,
  SEED_IDS,
  getAgent,
  ids,
  registerAgent,
  unregisterAgent,
  assignVoice,
  assignAvatar,
  impersonate,
  verifySinanAssets,
};
