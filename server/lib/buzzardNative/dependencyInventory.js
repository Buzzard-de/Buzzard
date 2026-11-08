/**
 * Third-party inventory. Does not add new AI providers.
 */
function dependencyInventory() {
  return {
    retrievedAt: "2026-11-08",
    defaultEgress: "DENY",
    rootNpm: [
      { name: "next", role: "frontend_framework", license: "MIT", aiEngine: false },
      { name: "react", role: "ui", license: "MIT", aiEngine: false },
      { name: "vitest", role: "tests", license: "MIT", aiEngine: false },
    ],
    serverNpm: [
      { name: "better-sqlite3", role: "local_db", license: "MIT", aiEngine: false, dataLeavesHost: false },
      { name: "jsonwebtoken", role: "auth", license: "MIT", aiEngine: false },
      { name: "fast-xml-parser", role: "xml", license: "MIT", aiEngine: false },
    ],
    existingButNotCoreEngine: [
      { name: "in-process-webrtc-signaling", path: "server/lib/voice/signaling.js", liveMedia: false },
      { name: "twilio-env-probe", path: "server/lib/integrations/sandboxReadiness.js", configured: false, replacementForNativeVoice: false },
    ],
    forbiddenAsEngine: ["openai", "anthropic", "claude", "claude-code", "external-stt", "external-tts", "digital-human-saas"],
    newAiProviderAddedThisRun: false,
  };
}

module.exports = { dependencyInventory };
