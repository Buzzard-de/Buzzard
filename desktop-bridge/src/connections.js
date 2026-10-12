const { spawnSync } = require("child_process");
const { openaiStatus } = require("./openaiOptional");

function detectCursorCli() {
  try {
    const bin = process.platform === "win32" ? "where" : "which";
    const result = spawnSync(bin, ["cursor"], { encoding: "utf8", timeout: 2000 });
    if (result.status === 0 && String(result.stdout || "").trim()) {
      return { available: true, path: String(result.stdout).split(/\r?\n/)[0].trim(), status: "CLI_DETECTED" };
    }
  } catch {
    /* ignore */
  }
  return { available: false, path: null, status: "FILE_HANDOFF" };
}

function connectionStatus(settings = {}, extras = {}) {
  const cursor = detectCursorCli();
  const openai = openaiStatus(settings);
  return {
    chatgptSession: {
      status: "SESSION_NOT_AVAILABLE",
      mode: "NONE",
      note: "DIRECT_CHATGPT_SESSION: NOT_AVAILABLE. This app cannot access the ChatGPT application conversation.",
    },
    chatgptFileHandoff: {
      status: "FILE_HANDOFF",
      mode: "FILE_AND_CLIPBOARD",
      note: "Export a structured prompt/task file for paste into ChatGPT. Import the returned report file.",
    },
    openaiApi: {
      status: openai.status,
      mode: "OPTIONAL_API",
      authenticated: false,
      reachable: false,
      chatgptSession: false,
      note: openai.note,
    },
    cursor: {
      status: cursor.status,
      invocationVerified: false,
      taskExecutionVerified: false,
      resultReturned: false,
      path: cursor.path,
      note: "The bridge does not auto-run Cursor, commit, push, merge, or deploy.",
    },
    process: {
      status: extras.processRunning ? "PROCESS_RUNNING" : "NOT_CONFIGURED",
    },
    pusat: {
      status: "SEPARATE",
      mode: "NOT_AN_ORCHESTRATOR",
      note: "Pusat remains Buzzard's sole business/AI orchestrator.",
    },
    twoWayDirect: false,
  };
}

function handoffSteps(exportResult = {}) {
  return [
    "Review the draft task in the bridge UI.",
    "Export writes .buzzard-bridge/outbox and inbox under the authorized workspace.",
    `Open ${exportResult.files?.mdPath || "the .prompt.md file"} in an editor or paste it into ChatGPT manually.`,
    "Open the same workspace in Cursor. Do not treat CLI_DETECTED as auto-execution.",
    "Approve any code-changing Cursor actions yourself. The bridge will not commit, push, merge, or deploy.",
    "Save a report JSON using schema buzzard.desktop-bridge.report.v1.",
    "Import the report. The bridge evaluates completion; imported productionVerified claims are ignored.",
  ];
}

module.exports = { connectionStatus, detectCursorCli, handoffSteps };
