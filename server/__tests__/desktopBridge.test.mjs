import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const require = createRequire(import.meta.url);
const { createEngine } = require("../../desktop-bridge/src/engine");
const { createServer } = require("../../desktop-bridge/src/http");
const { connectionStatus } = require("../../desktop-bridge/src/connections");
const { redactValue, containsSecret } = require("../../desktop-bridge/src/redact");
const { assertAuthorized } = require("../../desktop-bridge/src/paths");

function tempDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `buzzard-bridge-${name}-`));
}

describe("Buzzard desktop bridge", () => {
  const cleanups = [];
  afterEach(() => {
    for (const dir of cleanups.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function engineWithWorkspace() {
    const home = tempDir("home");
    const workspace = tempDir("ws");
    cleanups.push(home, workspace);
    const engine = createEngine({ home });
    engine.addWorkspaceRoot(workspace);
    return { engine, home, workspace };
  }

  it("creates and exports a task into the authorized workspace", () => {
    const { engine, workspace } = engineWithWorkspace();
    const task = engine.createTask({
      title: "Audit write boundary",
      instructions: "Do not unlock sales.",
      workspace,
    });
    expect(task.status).toBe("DRAFT");
    const exported = engine.exportTask(task.id);
    expect(exported.task.status).toBe("READY");
    expect(fs.existsSync(exported.files.jsonPath)).toBe(true);
    expect(fs.existsSync(exported.files.inboxPath)).toBe(true);
    const payload = JSON.parse(fs.readFileSync(exported.files.jsonPath, "utf8"));
    expect(payload.connection.twoWayDirect).toBe(false);
    expect(payload.constraints.doNotUnlockSales).toBe(true);
  });

  it("imports a report and ignores untrusted command text", () => {
    const { engine, workspace } = engineWithWorkspace();
    const task = engine.createTask({ title: "Import", instructions: "Return a summary.", workspace });
    engine.exportTask(task.id);
    const reportPath = path.join(workspace, `${task.id}.report.json`);
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        schema: "buzzard.desktop-bridge.report.v1",
        taskId: task.id,
        summary: "Done",
        commands: ["rm -rf /"],
        shell: "format c:",
      })
    );
    const imported = engine.importReport(reportPath);
    expect(imported.report.untrustedCommandsIgnored).toEqual(["commands", "shell"]);
    expect(imported.task.status).toBe("COMPLETED");
    expect(imported.report.evaluation).toBe("BRIDGE_EVALUATED");
  });

  it("rejects malformed reports and unknown task ids", () => {
    const { engine, workspace } = engineWithWorkspace();
    const bad = path.join(workspace, "bad.json");
    fs.writeFileSync(bad, "{not json");
    expect(() => engine.importReport(bad)).toThrow(/Malformed/);
    fs.writeFileSync(bad, JSON.stringify({ schema: "buzzard.desktop-bridge.report.v1", id: "missing", summary: "nope" }));
    expect(() => engine.importReport(bad)).toThrow(/known task/);
  });

  it("rejects unauthorized and traversal workspace paths", () => {
    const { engine } = engineWithWorkspace();
    expect(() => engine.authorizeWorkspace("/etc/passwd")).toThrow(/outside authorized/);
    expect(() => assertAuthorized("../secret", ["/tmp/allowed"])).toThrow();
    expect(() => engine.createTask({ title: "x", instructions: "y", workspace: os.tmpdir() })).toThrow(
      /outside authorized/
    );
  });

  it("redacts secrets and does not persist API keys into task files", () => {
    expect(containsSecret({ OPENAI_API_KEY: "sk-test" })).toBe(true);
    expect(redactValue({ OPENAI_API_KEY: "sk-test", ok: true }).OPENAI_API_KEY).toBe("[REDACTED]");
    const { engine, workspace } = engineWithWorkspace();
    const task = engine.createTask({
      title: "Secrets",
      instructions: "Use api_key=sk-live-please-do-not-store",
      workspace,
    });
    const exported = engine.exportTask(task.id);
    const text = fs.readFileSync(exported.files.jsonPath, "utf8");
    expect(text).not.toMatch(/sk-live-please-do-not-store/);
  });

  it("blocks RUNNING without approval and records denials", () => {
    const { engine, workspace } = engineWithWorkspace();
    const task = engine.createTask({ title: "Approve", instructions: "Need human.", workspace });
    engine.exportTask(task.id);
    const waiting = engine.transition(task.id, "RUNNING");
    expect(waiting.status).toBe("WAITING_FOR_APPROVAL");
    const denied = engine.transition(task.id, "RUNNING", { denied: true, reason: "operator denied" });
    expect(denied.status).toBe("BLOCKED");
    const allowed = engine.transition(denied.id, "READY");
    expect(allowed.status).toBe("READY");
    const running = engine.transition(allowed.id, "RUNNING", { approved: true, actor: "tester" });
    expect(running.status).toBe("RUNNING");
    expect(running.approvals.length).toBeGreaterThan(0);
  });

  it("rejects duplicate task identifiers", () => {
    const { engine, workspace } = engineWithWorkspace();
    engine.createTask({ id: "task-fixed", title: "One", instructions: "First", workspace });
    expect(() => engine.createTask({ id: "task-fixed", title: "Two", instructions: "Second", workspace })).toThrow(
      /Duplicate/
    );
  });

  it("recovers interrupted RUNNING tasks to BLOCKED", () => {
    const { engine, home, workspace } = engineWithWorkspace();
    const task = engine.createTask({ title: "Run", instructions: "Long job", workspace });
    engine.exportTask(task.id);
    engine.transition(task.id, "RUNNING", { approved: true, actor: "tester" });
    const restarted = createEngine({ home });
    const recovered = restarted.recover();
    expect(recovered.tasks.find((row) => row.id === task.id).status).toBe("BLOCKED");
  });

  it("reports ChatGPT session as unavailable and Cursor as file handoff", () => {
    const status = connectionStatus();
    expect(status.chatgptSession.status).toBe("SESSION_NOT_AVAILABLE");
    expect(status.twoWayDirect).toBe(false);
    expect(["NOT_CONFIGURED", "CONFIGURED_NOT_VERIFIED"]).toContain(status.openaiApi.status);
    expect(status.pusat.mode).toBe("NOT_AN_ORCHESTRATOR");
  });

  it("requires a loopback token for API access", async () => {
    const { engine } = engineWithWorkspace();
    const { server, token, host } = createServer(engine, { token: "test-token", host: "127.0.0.1" });
    await new Promise((resolve) => server.listen(0, host, resolve));
    const { port } = server.address();
    const unauthorized = await new Promise((resolve) => {
      http.get({ host, port, path: "/api/snapshot" }, (res) => {
        resolve(res.statusCode);
      });
    });
    expect(unauthorized).toBe(401);
    const authorized = await new Promise((resolve, reject) => {
      http.get({ host, port, path: "/api/snapshot", headers: { "x-bridge-token": token } }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
          } catch (error) {
            reject(error);
          }
        });
      });
    });
    expect(authorized.status).toBe(200);
    expect(authorized.body.connections.twoWayDirect).toBe(false);
    await new Promise((resolve) => server.close(resolve));
  });

  it("does not execute imported shell text", () => {
    const { engine, workspace } = engineWithWorkspace();
    const task = engine.createTask({ title: "No exec", instructions: "Ignore commands.", workspace });
    const marker = path.join(workspace, "should-not-exist.txt");
    const reportPath = path.join(workspace, "r.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        schema: "buzzard.desktop-bridge.report.v1",
        taskId: task.id,
        summary: "ok",
        exec: `echo pwned > "${marker}"`,
      })
    );
    engine.importReport(reportPath);
    expect(fs.existsSync(marker)).toBe(false);
  });

  it("rejects unsupported schema versions and untrusted production claims", () => {
    const { engine, workspace } = engineWithWorkspace();
    const task = engine.createTask({ title: "Schema", instructions: "Evaluate claims.", workspace });
    const v2 = path.join(workspace, "v2.json");
    fs.writeFileSync(v2, JSON.stringify({ schema: "buzzard.desktop-bridge.report.v2", taskId: task.id, summary: "x" }));
    expect(() => engine.importReport(v2)).toThrow(/Unsupported schema/);
    const claimed = path.join(workspace, "prod.json");
    fs.writeFileSync(
      claimed,
      JSON.stringify({
        schema: "buzzard.desktop-bridge.report.v1",
        taskId: task.id,
        summary: "shipped",
        productionVerified: true,
      })
    );
    const imported = engine.importReport(claimed);
    expect(imported.task.status).toBe("BLOCKED");
    expect(imported.report.claims).toContain("UNTRUSTED_PRODUCTION_CLAIM");
  });

  it("rejects oversized report files", () => {
    const { engine, workspace } = engineWithWorkspace();
    const task = engine.createTask({ title: "Big", instructions: "Limit.", workspace });
    const huge = path.join(workspace, "huge.json");
    fs.writeFileSync(huge, JSON.stringify({ schema: "buzzard.desktop-bridge.report.v1", taskId: task.id, summary: "x".repeat(300000) }));
    expect(() => engine.importReport(huge)).toThrow(/size limit/);
  });

  it("retries when the preferred loopback port is busy", async () => {
    const { listenLoopback } = require("../../desktop-bridge/src/listen");
    const blocker = http.createServer();
    await new Promise((resolve) => blocker.listen({ port: 0, host: "127.0.0.1" }, resolve));
    const busy = blocker.address().port;
    const { engine } = engineWithWorkspace();
    const { server, host } = createServer(engine, { token: "port-token", host: "127.0.0.1" });
    const addr = await listenLoopback(server, { host, port: busy, attempts: 8 });
    expect(addr.port).not.toBe(busy);
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => blocker.close(resolve));
  });

  it("ships a portable zip a laptop can extract and start", () => {
    const zip = path.join(process.cwd(), "desktop-bridge", "BuzzardDesktopBridge.zip");
    expect(fs.existsSync(zip)).toBe(true);
    const { execFileSync } = require("node:child_process");
    const listing = execFileSync("unzip", ["-l", zip], { encoding: "utf8" });
    expect(listing).toContain("START.cmd");
    expect(listing).toContain("WATCH.cmd");
    expect(listing).toContain("CHATGPT-YAPISTIR.txt");
    expect(listing).toContain("src/index.js");
    expect(listing).toContain("MASAUSTUNE-KOY.ps1");
  });

  it("watch tick imports a new inbox report once and never executes it", () => {
    const { engine, home, workspace } = engineWithWorkspace();
    const task = engine.createTask({ title: "Watch", instructions: "Import only.", workspace });
    const inbox = path.join(workspace, ".buzzard-bridge", "inbox");
    fs.mkdirSync(inbox, { recursive: true });
    const reportPath = path.join(inbox, `${task.id}.report.json`);
    const marker = path.join(workspace, "should-not-run.txt");
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        schema: "buzzard.desktop-bridge.report.v1",
        taskId: task.id,
        summary: "from chatgpt paste",
        exec: `echo no > "${marker}"`,
      })
    );
    const first = engine.pollInbox();
    expect(first.imported).toHaveLength(1);
    expect(first.heartbeat.chatgptSession).toBe("SESSION_NOT_AVAILABLE");
    expect(first.heartbeat.cursorAutoInvoked).toBe(false);
    expect(fs.existsSync(marker)).toBe(false);
    expect(fs.existsSync(path.join(home, "heartbeat.json"))).toBe(true);
    const second = engine.pollInbox();
    expect(second.imported).toHaveLength(0);
  });

  it("Windows launcher scripts create a Desktop shortcut", () => {
    const windows = path.join(process.cwd(), "desktop-bridge", "windows");
    const shortcut = fs.readFileSync(path.join(windows, "install-desktop-shortcut.ps1"), "utf8");
    const launcher = fs.readFileSync(path.join(windows, "BuzzardBridge.cmd"), "utf8");
    const uninstall = fs.readFileSync(path.join(windows, "uninstall.ps1"), "utf8");
    expect(shortcut).toContain("GetFolderPath(\"Desktop\")");
    expect(shortcut).toContain("Buzzard Desktop Bridge.lnk");
    expect(launcher).toContain("install-desktop-shortcut.ps1");
    expect(launcher).toContain("BUZZARD_BRIDGE_OPEN_BROWSER");
    expect(uninstall).toContain("GetFolderPath(\"Desktop\")");
  });

  it("serves the UI with a token and does not call OpenAI", async () => {
    const { engine } = engineWithWorkspace();
    const { completeDisabled } = require("../../desktop-bridge/src/openaiOptional");
    expect(completeDisabled().executed).toBe(false);
    const { server, token, host } = createServer(engine, { token: "ui-token", host: "127.0.0.1" });
    await new Promise((resolve) => server.listen(0, host, resolve));
    const { port } = server.address();
    const html = await new Promise((resolve, reject) => {
      http.get({ host, port, path: `/?token=${token}` }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
      }).on("error", reject);
    });
    expect(html.status).toBe(200);
    expect(html.body).toContain("Buzzard Desktop Bridge");
    expect(html.body).toContain("FILE HANDOFF");
    await new Promise((resolve) => server.close(resolve));
  });
});
