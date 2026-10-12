const { spawnSync } = require("child_process");

function detectCursorCli() {
  try {
    const bin = process.platform === "win32" ? "where" : "which";
    const result = spawnSync(bin, ["cursor"], { encoding: "utf8", timeout: 2000 });
    if (result.status === 0 && String(result.stdout || "").trim()) {
      return { available: true, path: String(result.stdout).split(/\r?\n/)[0].trim(), mode: "CLI_DETECTED" };
    }
  } catch {
    /* ignore */
  }
  return { available: false, path: null, mode: "FILE_HANDOFF" };
}

function connectionStatus(settings = {}) {
  const cursor = detectCursorCli();
  const openaiKey = Boolean(process.env.OPENAI_API_KEY || settings.openaiApiKeyPresent);
  return {
    chatgptSession: {
      status: "NOT_AVAILABLE",
      mode: "NONE",
      note: "This app cannot access the ChatGPT application session or private conversation. Do not assume a hidden ChatGPT endpoint.",
    },
    chatgptFileHandoff: {
      status: "IMPLEMENTED",
      mode: "FILE_AND_CLIPBOARD",
      note: "Export a structured prompt/task file for paste into ChatGPT. Import the returned report file.",
    },
    openaiApi: {
      status: openaiKey ? "CONFIGURED_NOT_VERIFIED" : "NOT_CONFIGURED",
      mode: "OPTIONAL_API",
      note: "A configured OPENAI_API_KEY is a separate API integration. It does not share this ChatGPT conversation or subscription. Live calls are not made unless separately authorized.",
    },
    cursor: {
      status: cursor.available ? "CLI_DETECTED" : "FILE_HANDOFF",
      mode: cursor.available ? "CLI_PLUS_FILES" : "FILE_HANDOFF",
      path: cursor.path,
      note: "Approved task files are written under the authorized workspace .buzzard-bridge directory. The bridge does not auto-run Cursor, commit, push, merge, or deploy.",
    },
    pusat: {
      status: "SEPARATE",
      mode: "NOT_AN_ORCHESTRATOR",
      note: "Pusat remains Buzzard's sole business/AI orchestrator. This bridge only coordinates local task/report handoff.",
    },
    twoWayDirect: false,
  };
}

module.exports = { connectionStatus, detectCursorCli };
