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
  });

  it("rejects malformed reports and unknown task ids", () => {
    const { engine, workspace } = engineWithWorkspace();
    const bad = path.join(workspace, "bad.json");
    fs.writeFileSync(bad, "{not json");
    expect(() => engine.importReport(bad)).toThrow(/Malformed/);
    fs.writeFileSync(bad, JSON.stringify({ id: "missing", summary: "nope" }));
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
    expect(status.chatgptSession.status).toBe("NOT_AVAILABLE");
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
        taskId: task.id,
        summary: "ok",
        exec: `echo pwned > "${marker}"`,
      })
    );
    engine.importReport(reportPath);
    expect(fs.existsSync(marker)).toBe(false);
  });
});
