/**
 * Optional OpenAI API helper. Disabled by default.
 * This is not the ChatGPT application session and cannot read that conversation.
 * Live HTTP is never performed unless BUZZARD_BRIDGE_OPENAI_LIVE=1, which this
 * task does not set. Tests must use mocks.
 */

function openaiStatus(settings = {}) {
  const keyPresent = Boolean(process.env.OPENAI_API_KEY || settings.openaiApiKeyPresent);
  const liveAuthorized = process.env.BUZZARD_BRIDGE_OPENAI_LIVE === "1";
  if (!keyPresent) {
    return {
      status: "NOT_CONFIGURED",
      live: false,
      chatgptSession: false,
      note: "File handoff works without an API key.",
    };
  }
  if (!liveAuthorized) {
    return {
      status: "API_CONFIGURED",
      live: false,
      chatgptSession: false,
      note: "Key presence is not authentication, reachability, or this ChatGPT session.",
    };
  }
  return {
    status: "BLOCKED",
    live: false,
    chatgptSession: false,
    note: "Live OpenAI calls remain blocked in this environment.",
  };
}

function completeDisabled() {
  return {
    ok: false,
    status: "NOT_CONFIGURED",
    executed: false,
    chatgptSession: false,
    reason: "OPENAI_OPTIONAL_DISABLED",
  };
}

module.exports = { openaiStatus, completeDisabled };
