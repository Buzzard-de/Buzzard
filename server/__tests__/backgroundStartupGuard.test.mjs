import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverPath = path.join(repoRoot, "server/server.js");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");
const source = fs.readFileSync(serverPath, "utf8");

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);

const decisionSource = source.slice(
  source.indexOf("function resolveBackgroundStartup"),
  source.indexOf("const backgroundStartup = resolveBackgroundStartup();")
);
const bootSource = source.slice(
  source.indexOf("const backgroundStartup = resolveBackgroundStartup();"),
  source.indexOf("const server = http.createServer")
);

const context = { process };
vm.createContext(context);
vm.runInContext(decisionSource, context);
const resolveBackgroundStartup = context.resolveBackgroundStartup;

function boot(env) {
  const calls = { startWorker: 0, tickScheduler: 0, enqueueJob: 0 };
  const sandbox = {
    process: { env },
    resolveBackgroundStartup,
    calls,
    startWorker() { calls.startWorker += 1; },
    tickScheduler() { calls.tickScheduler += 1; },
    enqueueJob() { calls.enqueueJob += 1; },
  };
  vm.createContext(sandbox);
  vm.runInContext(`
    const backgroundStartup = resolveBackgroundStartup(process.env);
    if (backgroundStartup.startWorker || backgroundStartup.startScheduler) {
      startWorker();
      tickScheduler();
      enqueueJob();
      throw new Error("background startup is closed");
    }
  `, sandbox);
  return { calls, decision: resolveBackgroundStartup(env) };
}

const cases = [
  ["missing", {}],
  ["empty", { BUZZARD_WORKER_ENABLED: "" }],
  ["blank", { BUZZARD_WORKER_ENABLED: "   " }],
  ["zero", { BUZZARD_WORKER_ENABLED: "0" }],
  ["false", { BUZZARD_WORKER_ENABLED: "false" }],
  ["invalid", { BUZZARD_WORKER_ENABLED: "enabled" }],
  ["ambiguous", { BUZZARD_WORKER_ENABLED: "yes" }],
  ["explicit-1", { BUZZARD_WORKER_ENABLED: "1" }],
  ["explicit-true", { BUZZARD_WORKER_ENABLED: "true" }],
  ["explicit-on", { BUZZARD_WORKER_ENABLED: "on" }],
];

describe("server background startup stays closed", () => {
  it("does not start the worker for a missing, empty, or invalid setting", () => {
    for (const name of ["missing", "empty", "blank", "zero", "false", "invalid"]) {
      const env = cases.find(([label]) => label === name)[1];
      const started = boot(env);
      expect(started.decision.startWorker).toBe(false);
      expect(started.decision.startScheduler).toBe(false);
      expect(started.calls).toEqual({ startWorker: 0, tickScheduler: 0, enqueueJob: 0 });
    }
  });

  it("does not let an explicit enable value bypass the closed startup policy", () => {
    for (const name of ["ambiguous", "explicit-1", "explicit-true", "explicit-on"]) {
      const env = {
        ...cases.find(([label]) => label === name)[1],
        BUZZARD_SALES_ENABLED: "0",
      };
      const started = boot(env);
      expect(started.decision.startWorker).toBe(false);
      expect(started.decision.startScheduler).toBe(false);
      expect(started.calls).toEqual({ startWorker: 0, tickScheduler: 0, enqueueJob: 0 });
      expect(env.BUZZARD_SALES_ENABLED).toBe("0");
    }
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });

  it("keeps the server boot path from calling the worker or scheduler", () => {
    expect(bootSource).not.toMatch(/startWorker\s*\(|tickScheduler\s*\(|enqueueJob\s*\(|setupGracefulShutdown\s*\(/);
    expect(bootSource).toMatch(/background startup is closed/);
    expect(source).not.toMatch(/jobWorker\.startWorker|jobScheduler\.tickScheduler|setupGracefulShutdown\s*\(/);
    const started = boot({ BUZZARD_WORKER_ENABLED: "1", BUZZARD_SCHEDULER_POLL_MS: "1000" });
    expect(started.calls.startWorker).toBe(0);
    expect(started.calls.tickScheduler).toBe(0);
    expect(started.calls.enqueueJob).toBe(0);
  });

  it("leaves the commerce database untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  });
});
