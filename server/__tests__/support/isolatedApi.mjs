import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedSyntheticAdmins, tempDataDir } from "./freshServerLib.mjs";

const serverEntry = fileURLToPath(new URL("../../server.js", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

export const ALL_ROLES = [
  "administrator",
  "admin",
  "catalog_manager",
  "order_manager",
  "staff",
  "ai_agent",
  "read_only",
];

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/**
 * Starts the real API server as a child process on a loopback port, with its
 * own JSON stores and SQLite file under the OS temp dir and synthetic admin
 * accounts. Nothing here reads or writes server/data, and the developer ports
 * 3000/3001 are never used.
 */
export async function startIsolatedApi({ env = {}, roles = ALL_ROLES, seed = true, expectExit = false, prepare } = {}) {
  const root = tempDataDir("api");
  const dataDir = path.join(root, "data");
  mkdirSync(dataDir, { recursive: true });
  const accounts = seed ? seedSyntheticAdmins(dataDir, roles) : {};
  // Lets a test put synthetic store files in place before the server reads them.
  if (prepare) prepare(dataDir, accounts);
  const port = await freePort();
  if (port === 3000 || port === 3001) throw new Error("developer port selected");

  const childEnv = {
    ...process.env,
    PORT: String(port),
    BUZZARD_BIND_HOST: "127.0.0.1",
    BUZZARD_DATA_DIR: dataDir,
    BUZZARD_CATALOG_DIR: path.join(root, "catalog"),
    BUZZARD_DB_PATH: path.join(root, "catalog.sqlite"),
    BUZZARD_BACKUP_DIR: path.join(root, "backups"),
    BUZZARD_E2E_DB: "1",
    BUZZARD_COMMERCE_CORE: "1",
    BUZZARD_SALES_ENABLED: "0",
    BUZZARD_WORKER_ENABLED: "0",
    NODE_ENV: "test",
    JWT_SECRET: randomBytes(32).toString("hex"),
  };
  delete childEnv.BUZZARD_SALES_GATE_BYPASS;
  // Webhook secrets come only from the test that needs them, never from the shell that runs the suite.
  for (const name of Object.keys(childEnv)) {
    if (name.startsWith("BUZZARD_WEBHOOK_SECRET_")) delete childEnv[name];
  }
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete childEnv[key];
    else childEnv[key] = String(value);
  }

  const child = spawn(process.execPath, [serverEntry], { cwd: repoRoot, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  const exited = new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));

  const url = `http://127.0.0.1:${port}`;
  const api = {
    url,
    port,
    root,
    dataDir,
    accounts,
    child,
    exited,
    output: () => output,
    alive: () => child.exitCode === null && child.signalCode === null,
    readStore: (name) => JSON.parse(readFileSync(path.join(dataDir, name), "utf8")),
    async request(method, route, { token, body, headers = {}, raw } = {}) {
      const init = { method, headers: { Accept: "application/json", ...headers } };
      if (token) init.headers.Authorization = `Bearer ${token}`;
      if (raw !== undefined) {
        init.body = raw;
      } else if (body !== undefined) {
        init.headers["Content-Type"] = init.headers["Content-Type"] || "application/json";
        init.body = JSON.stringify(body);
      }
      const res = await fetch(url + route, init);
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        /* not JSON */
      }
      return { status: res.status, json, text, headers: res.headers };
    },
    async login(role, extra = {}) {
      const account = accounts[role];
      if (!account) throw new Error(`no synthetic account for role ${role}`);
      const res = await api.request("POST", "/api/admin/login", {
        body: { email: account.email, password: account.password },
        ...extra,
      });
      if (!res.json?.token) throw new Error(`login failed for ${role}: ${res.status} ${res.json?.errorKey}`);
      return res.json.token;
    },
    async stop() {
      if (api.alive()) child.kill("SIGTERM");
      await exited;
    },
  };

  if (expectExit) return api;

  const deadline = Date.now() + 60_000;
  for (;;) {
    if (!api.alive()) throw new Error(`API exited during start:\n${output.slice(-2000)}`);
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) break;
    } catch {
      /* not listening yet */
    }
    if (Date.now() > deadline) {
      await api.stop();
      throw new Error(`API did not become ready:\n${output.slice(-2000)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return api;
}
