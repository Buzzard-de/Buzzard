/**
 * Local development automation for workstream 14.
 * Intake, inspect, plan, run one safe syntax check, collect, gate.
 * This process is not a 24/7 hosted factory.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const DEFAULT_ROOT = path.join(__dirname, "..", "..", "..");

function runDevAutomation({ root = DEFAULT_ROOT, task = {} } = {}) {
  const audit = [];
  const rec = (step, detail) => audit.push({ step, at: new Date().toISOString(), ...detail });
  const blocked = Boolean(task.deploy || task.network || task.factory || task.hosted);
  rec("intake", { title: String(task.title || "local-dev"), blocked });
  if (blocked) {
    rec("approval", { code: "HUMAN_GATE_REQUIRED" });
    return {
      ok: false,
      code: "HUMAN_GATE_REQUIRED",
      live: false,
      hostedFactory: false,
      cursorIsNot247Factory: true,
      sessionNotFactory: true,
      audit,
    };
  }

  const pkgPath = path.join(root, "package.json");
  let pkg = null;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    rec("inspect", { ok: false, code: "PACKAGE_UNREADABLE" });
    return { ok: false, code: "PACKAGE_UNREADABLE", live: false, hostedFactory: false, audit };
  }
  const scripts = Object.keys(pkg.scripts || {});
  rec("inspect", { name: pkg.name || null, scripts: scripts.length });
  const dependencies = Object.keys(pkg.dependencies || {});
  rec("plan", { dependencies: dependencies.length, testScript: scripts.includes("test:unit") });

  const target = path.join(root, "server", "lib", "pusat", "dispatchVerify.js");
  const checked = spawnSync(process.execPath, ["--check", target], { timeout: 15_000, encoding: "utf8" });
  rec("test", { status: checked.status, file: "server/lib/pusat/dispatchVerify.js" });
  const ok = checked.status === 0 && dependencies.length > 0 && scripts.length > 0;
  rec("collect", { ok });
  rec("approval", { code: "LOCAL_ONLY" });
  return {
    ok,
    code: ok ? "LOCAL_DEV_OK" : "LOCAL_DEV_FAILED",
    live: false,
    hostedFactory: false,
    cursorIsNot247Factory: true,
    sessionNotFactory: true,
    approval: "LOCAL_ONLY",
    audit,
    plan: { dependencies: dependencies.length, scripts: scripts.length },
  };
}

module.exports = { runDevAutomation };
