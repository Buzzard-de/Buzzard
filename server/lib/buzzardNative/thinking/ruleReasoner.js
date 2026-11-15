/**
 * Closed-world rule reasoner. 100% of these cases is not general intelligence.
 */
const FACTS = Object.freeze({
  production_transformer: "NOT_IMPLEMENTED",
  official_tts: "NOT_IMPLEMENTED",
  official_voice: "REFERENCE_REGISTERED",
  clone_authorized: "false",
  live_verified: "false",
  egress_openai: "DENY",
  stranger: "UNAUTHORIZED_ACTOR",
  sinan_role: "chief_software_architect",
  engines: "8",
  f0_mean_hz: "170.8",
  git_push: "human_gate",
  stt: "NOT_IMPLEMENTED",
  lip_sync: "NOT_IMPLEMENTED",
  always_on_host: "NOT_IMPLEMENTED",
});

const CASES = Object.freeze([
  { id: "R1", q: "production transformer status", key: "production_transformer" },
  { id: "R2", q: "official tts status", key: "official_tts" },
  { id: "R3", q: "official voice status", key: "official_voice" },
  { id: "R4", q: "clone authorized", key: "clone_authorized" },
  { id: "R5", q: "live verified", key: "live_verified" },
  { id: "R6", q: "openai egress", key: "egress_openai" },
  { id: "R7", q: "stranger actor", key: "stranger" },
  { id: "R8", q: "sinan role", key: "sinan_role" },
  { id: "R9", q: "engine count", key: "engines" },
  { id: "R10", q: "measured f0 mean", key: "f0_mean_hz" },
  { id: "R11", q: "git push", key: "git_push" },
  { id: "R12", q: "stt status", key: "stt" },
  { id: "R13", q: "lip sync", key: "lip_sync" },
  { id: "R14", q: "always on host", key: "always_on_host" },
]);

function answer(q) {
  const s = String(q || "").toLowerCase();
  for (const c of CASES) {
    if (s.includes(c.id.toLowerCase()) || s.includes(c.q)) {
      return { key: c.key, value: FACTS[c.key], source: "closed_world_rules", learned: false };
    }
  }
  return { key: null, value: "unknown", source: "closed_world_rules", learned: false };
}

function evaluateAll() {
  const rows = CASES.map((c) => {
    const got = answer(c.q);
    return { ...c, got: got.value, pass: got.value === FACTS[c.key] };
  });
  const passed = rows.filter((r) => r.pass).length;
  return {
    passed,
    total: rows.length,
    rate: passed / rows.length,
    generalIntelligence: false,
    neural: false,
    rows,
  };
}

module.exports = { FACTS, CASES, answer, evaluateAll };
