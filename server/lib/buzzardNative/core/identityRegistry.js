/**
 * Buzzard Native AI Core identity registry. Does not rewrite existing council MEMBERS.
 */
const fs = require("fs");
const path = require("path");

const now = "2026-11-08T18:27:00+01:00";

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

const AGENTS = Object.freeze([
  {
    agent_id: "pusat",
    display_name: "Pusat",
    role: "central_orchestrator",
    personality_profile: "coordinator_neutral",
    expertise: ["task_routing", "coordination", "permission_management"],
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
    personality_profile: "serious_calm_professional_male",
    expertise: ["software_architecture", "code_analysis", "native_ai"],
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
    personality_profile: "security_reserved_male",
    expertise: ["security_audit", "threat_analysis", "egress"],
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
    personality_profile: "research_measured_male",
    expertise: ["research", "source_verification", "intelligence"],
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
    agent_id: "amelia",
    display_name: "Amelia",
    role: "brand_ambassador_female",
    personality_profile: "brand_welcome_female",
    expertise: ["brand_communication", "customer_greeting"],
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
    personality_profile: "brand_promo_male",
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
    personality_profile: "social_story_female",
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
    personality_profile: "social_promo_male",
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
]);

function getAgent(id) {
  return AGENTS.find((a) => a.agent_id === id) || null;
}

function ids() {
  return AGENTS.map((a) => a.agent_id);
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

module.exports = { AGENTS, getAgent, ids, assignVoice, assignAvatar, impersonate, verifySinanAssets };
