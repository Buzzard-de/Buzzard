const fs = require("fs");
const path = require("path");
const { loadState, saveSettings, saveTasks } = require("./store");
const { assertAuthorized, ensureDir, writeAtomic, normalize, realpathIfExists } = require("./paths");
const { appendAudit, readAudit } = require("./audit");
const { redactValue, containsSecret } = require("./redact");
const { connectionStatus, handoffSteps } = require("./connections");
const {
  SCHEMA_TASK,
  SCHEMA_REPORT,
  TASK_STATUSES,
  MAX_IMPORT_BYTES,
  nowIso,
  newId,
  canTransition,
  assertSupportedSchema,
  evaluateImportedReport,
} = require("./schema");

const UNTRUSTED_COMMAND_KEYS = ["commands", "shell", "exec", "spawn", "bash", "powershell", "cmd"];

function createEngine(options = {}) {
  const home = options.home;
  let state = loadState(home);

  function persistTasks() {
    saveTasks(state.home, state.tasks);
  }

  function persistSettings() {
    saveSettings(state.home, state.settings);
  }

  function audit(event, extra = {}) {
    return appendAudit(state.home, { event, ...redactValue(extra) });
  }

  function snapshot() {
    return {
      home: state.home,
      settings: {
        workspaceRoots: state.settings.workspaceRoots || [],
        bind: state.settings.bind || "127.0.0.1",
        port: state.settings.port || 47821,
        openaiApiKeyPresent: Boolean(state.settings.openaiApiKeyPresent),
      },
      tasks: state.tasks.map((task) => redactValue(task)),
      connections: connectionStatus(state.settings, { processRunning: Boolean(options.processRunning) }),
      salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
      productSourceOfTruthActive: false,
      orchestrator: "pusat",
      bridgeRole: "local-handoff",
    };
  }

  function listTasks() {
    return state.tasks.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function getTask(id) {
    return state.tasks.find((task) => task.id === id) || null;
  }

  function addWorkspaceRoot(candidate) {
    const resolved = realpathIfExists(normalize(candidate));
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      const error = new Error("Workspace root must be an existing directory");
      error.code = "WORKSPACE_INVALID";
      throw error;
    }
    const roots = state.settings.workspaceRoots || [];
    if (!roots.includes(resolved)) roots.push(resolved);
    state.settings.workspaceRoots = roots;
    persistSettings();
    audit("WORKSPACE_ADDED", { path: resolved });
    return resolved;
  }

  function authorizeWorkspace(candidate) {
    return assertAuthorized(candidate, state.settings.workspaceRoots || []);
  }

  function createTask(input = {}) {
    const title = String(input.title || "").trim();
    const instructions = String(input.instructions || "").trim();
    if (!title || !instructions) {
      const error = new Error("Title and instructions are required");
      error.code = "TASK_INVALID";
      throw error;
    }
    if (input.id && getTask(input.id)) {
      const error = new Error("Duplicate task identifier");
      error.code = "TASK_DUPLICATE";
      throw error;
    }
    const workspace = input.workspace ? authorizeWorkspace(input.workspace) : null;
    const task = {
      schema: SCHEMA_TASK,
      id: input.id || newId("task"),
      title,
      instructions,
      workspace,
      status: "DRAFT",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      approvals: [],
      errors: [],
      exportPath: null,
      reportPath: null,
      cursorHandoff: "FILE_HANDOFF",
      chatgptHandoff: "FILE_AND_CLIPBOARD",
      openaiApiUsed: false,
      secretsPresent: containsSecret(input),
    };
    if (task.secretsPresent) {
      task.instructions = String(redactValue(task.instructions));
    }
    state.tasks.push(task);
    persistTasks();
    audit("TASK_CREATED", { id: task.id, status: task.status });
    return { ...task };
  }

  function transition(id, next, context = {}) {
    const task = getTask(id);
    if (!task) {
      const error = new Error("Task not found");
      error.code = "TASK_NOT_FOUND";
      throw error;
    }
    if (!TASK_STATUSES.includes(next)) {
      const error = new Error("Invalid task status");
      error.code = "STATUS_INVALID";
      throw error;
    }
    if (!canTransition(task.status, next)) {
      const error = new Error(`Invalid transition ${task.status} → ${next}`);
      error.code = "TRANSITION_DENIED";
      throw error;
    }
    if (context.denied) {
      task.status = "BLOCKED";
      task.updatedAt = nowIso();
      task.errors.push({ at: nowIso(), code: "DENIED", message: context.reason || "Action denied" });
      persistTasks();
      audit("ACTION_DENIED", { id, reason: context.reason || "denied" });
      return { ...task };
    }
    if (next === "RUNNING" && !context.approved) {
      const from = task.status;
      task.status = "WAITING_FOR_APPROVAL";
      task.updatedAt = nowIso();
      persistTasks();
      audit("APPROVAL_REQUIRED", { id, from, requested: next });
      return { ...task, approvalRequired: true };
    }
    const from = task.status;
    task.status = next;
    task.updatedAt = nowIso();
    if (context.approved) {
      task.approvals.push({ at: nowIso(), actor: context.actor || "local-user", action: next });
    }
    persistTasks();
    audit("STATUS_CHANGED", { id, from, to: next });
    return { ...task };
  }

  function exportTask(id) {
    const task = getTask(id);
    if (!task) {
      const error = new Error("Task not found");
      error.code = "TASK_NOT_FOUND";
      throw error;
    }
    if (!task.workspace) {
      const error = new Error("Task has no authorized workspace");
      error.code = "WORKSPACE_REQUIRED";
      throw error;
    }
    const workspace = authorizeWorkspace(task.workspace);
    const outbox = ensureDir(path.join(workspace, ".buzzard-bridge", "outbox"));
    const inbox = ensureDir(path.join(workspace, ".buzzard-bridge", "inbox"));
    const payload = redactValue({
      schema: SCHEMA_TASK,
      schemaVersion: 1,
      id: task.id,
      project: "buzzard",
      title: task.title,
      instructions: task.instructions,
      expectedOutputs: task.expectedOutputs || ["report.json"],
      requestedTests: task.requestedTests || [],
      status: "READY",
      workspace,
      createdAt: task.createdAt,
      exportedAt: nowIso(),
      orchestrator: "pusat",
      bridge: "desktop-bridge",
      connection: {
        chatgpt: "FILE_HANDOFF",
        cursor: "FILE_HANDOFF",
        twoWayDirect: false,
      },
      constraints: {
        doNotExecuteCommands: true,
        doNotCommit: true,
        doNotPush: true,
        doNotDeploy: true,
        doNotUnlockSales: true,
        doNotActivateProductSoT: true,
      },
    });
    const jsonPath = path.join(outbox, `${task.id}.task.json`);
    const mdPath = path.join(outbox, `${task.id}.prompt.md`);
    const inboxPath = path.join(inbox, `${task.id}.task.json`);
    writeAtomic(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
    writeAtomic(inboxPath, `${JSON.stringify(payload, null, 2)}\n`);
    writeAtomic(
      mdPath,
      `# Buzzard Bridge task ${task.id}\n\n${task.title}\n\n${task.instructions}\n\n---\nConnection mode: file handoff. This is not a live ChatGPT session or Cursor remote-control channel.\n`
    );
    task.exportPath = jsonPath;
    task.updatedAt = nowIso();
    if (task.status === "DRAFT") task.status = "READY";
    persistTasks();
    audit("TASK_EXPORTED", { id: task.id, path: jsonPath });
    const files = { jsonPath, mdPath, inboxPath };
    return {
      task: { ...task },
      files,
      clipboardText: payload.instructions,
      cursorAutoInvoked: false,
      steps: handoffSteps({ files }),
    };
  }

  function ignoredUntrusted(report) {
    const found = UNTRUSTED_COMMAND_KEYS.filter((key) => report && Object.prototype.hasOwnProperty.call(report, key));
    return found;
  }

  function importReport(source) {
    let report = source;
    let fromPath = null;
    if (typeof source === "string") {
      fromPath = source;
      if (!fs.existsSync(fromPath)) {
        const error = new Error("Report file not found");
        error.code = "REPORT_NOT_FOUND";
        throw error;
      }
      const stat = fs.statSync(fromPath);
      if (stat.size > MAX_IMPORT_BYTES) {
        const error = new Error("Report file exceeds size limit");
        error.code = "REPORT_TOO_LARGE";
        throw error;
      }
      try {
        report = JSON.parse(fs.readFileSync(fromPath, "utf8"));
      } catch {
        const error = new Error("Malformed report file");
        error.code = "REPORT_MALFORMED";
        throw error;
      }
    }
    if (!report || typeof report !== "object") {
      const error = new Error("Malformed report");
      error.code = "REPORT_MALFORMED";
      throw error;
    }
    assertSupportedSchema(report.schema, "report");
    const untrusted = ignoredUntrusted(report);
    if (untrusted.length) {
      audit("UNTRUSTED_COMMAND_IGNORED", { keys: untrusted, id: report.id || null });
    }
    const id = report.taskId || report.id;
    const task = id ? getTask(id) : null;
    if (!task) {
      const error = new Error("Report does not match a known task");
      error.code = "REPORT_UNKNOWN_TASK";
      throw error;
    }
    const evaluation = evaluateImportedReport(report, task);
    const clean = redactValue({
      schema: SCHEMA_REPORT,
      taskId: task.id,
      importedAt: nowIso(),
      summary: evaluation.summary,
      reportStatus: report.status || null,
      taskStatus: evaluation.status,
      evaluation: evaluation.reason,
      claims: evaluation.claims,
      untrustedCommandsIgnored: untrusted,
      sourcePath: fromPath,
      sourceCommit: report.sourceCommit || report.head || null,
    });
    task.reportPath = fromPath;
    task.updatedAt = nowIso();
    task.status = evaluation.status;
    persistTasks();
    audit("REPORT_IMPORTED", { id: task.id, status: task.status, evaluation: evaluation.reason, untrusted: untrusted.length });
    return { task: { ...task }, report: clean };
  }

  function recover() {
    state = loadState(state.home);
    const interrupted = state.tasks.filter((task) => task.status === "RUNNING");
    for (const task of interrupted) {
      task.status = "BLOCKED";
      task.errors.push({ at: nowIso(), code: "INTERRUPTED", message: "Recovered after restart; running work was not auto-resumed" });
      task.updatedAt = nowIso();
    }
    if (interrupted.length) persistTasks();
    audit("RECOVERED", { interrupted: interrupted.length });
    return snapshot();
  }

  function pollInbox() {
    const imported = state.settings.importedReports || {};
    const found = [];
    const errors = [];
    for (const root of state.settings.workspaceRoots || []) {
      const inbox = path.join(root, ".buzzard-bridge", "inbox");
      if (!fs.existsSync(inbox)) continue;
      const names = fs.readdirSync(inbox).filter((name) => name.endsWith(".report.json") || name.endsWith(".task.json"));
      for (const name of names) {
        const file = path.join(inbox, name);
        const stamp = `${file}:${fs.statSync(file).mtimeMs}`;
        if (imported[file] === stamp) continue;
        try {
          if (name.endsWith(".report.json")) {
            found.push(importReport(file));
          }
          imported[file] = stamp;
        } catch (error) {
          errors.push({
            file: path.basename(file),
            code: error.code || "WATCH_ERROR",
          });
        }
      }
    }
    state.settings.importedReports = imported;
    persistSettings();
    const heartbeat = {
      at: nowIso(),
      chatgptSession: "SESSION_NOT_AVAILABLE",
      cursorAutoInvoked: false,
      twoWayDirect: false,
      scanned: Object.keys(imported).length,
      imported: found.length,
      errors: errors.length,
    };
    writeAtomic(path.join(state.home, "heartbeat.json"), `${JSON.stringify(heartbeat, null, 2)}\n`);
    if (found.length || errors.length) {
      audit("WATCH_TICK", { imported: found.length, errors: errors.length });
    }
    return { heartbeat, imported: found, errors };
  }

  return {
    snapshot,
    listTasks,
    getTask,
    addWorkspaceRoot,
    authorizeWorkspace,
    createTask,
    transition,
    exportTask,
    importReport,
    recover,
    pollInbox,
    auditLog: (limit) => readAudit(state.home, limit),
    home: () => state.home,
  };
}

module.exports = { createEngine, UNTRUSTED_COMMAND_KEYS };
