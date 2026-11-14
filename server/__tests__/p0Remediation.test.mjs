import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createDurableTaskQueue } = require("../lib/pusat/durableTaskQueue.js");
const { createTaskQueue } = require("../lib/pusat/taskQueue.js");
const { createRouter } = require("../lib/buzzardNative/core/taskRouter.js");
const { createApprovalCenter, RISK } = require("../lib/pusat/humanApproval.js");
const { classifyAction, AUTO_LOW, HUMAN_REQUIRED } = require("../lib/pusat/actionPolicy.js");
const { check, explicitPermissions, authorizeDelegated, grantPermission, revokePermission, clearRevocations, auditDecisions, SAFE } = require("../lib/buzzardNative/core/permissionEngine.js");
const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");
const { createTask } = require("../lib/pusat/council.js");
const { send } = require("../lib/comms/whatsappSandbox.js");

const SENSITIVE_ACTIONS = [
  "STOCK_BUY",
  "DATA_EXPORT",
  "SUPPLIER_PAY",
  "SECURITY_POLICY_CHANGE",
  "CUSTOMER_REFUND",
  "PAYMENT_ACTIVATE",
  "SHIPMENT_CREATE",
  "DEPLOYMENT",
  "POLICY_CHANGE",
];
const UNREGISTERED_ACTIONS = ["UNKNOWN_ACTION", "NEW_UNREGISTERED_ACTION"];

test("assignment requires an explicit ASSIGN_TASK decision", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-p0-"));
  const queue = createDurableTaskQueue({ dbPath: path.join(dir, "queue.sqlite") });
  const pusat = queue.enqueue({ title: "allowed", ownerId: "pusat", assigneeId: "sinan_bey" });
  const esat = queue.enqueue({ title: "bypass", ownerId: "esat_bey", assigneeId: "sinan_bey" });
  const stock = queue.enqueue({ title: "buy", ownerId: "stock_ai", assigneeId: "pusat" });
  const stranger = queue.enqueue({ title: "spoof", ownerId: "pusat-admin", assigneeId: "sinan_bey" });
  queue.close();
  const memory = createTaskQueue();
  const memoryDenied = memory.enqueue({ title: "memory", ownerId: "banu_hanim", assigneeId: "sinan_bey" });
  const router = createRouter();
  const routed = router.create({ title: "route", fromId: "sinan_bey" });
  assert.equal(check("pusat", "ASSIGN_TASK").code, "ALLOW");
  assert.equal(pusat.ok, true);
  assert.equal(pusat.permission.code, "ALLOW");
  assert.equal(esat.ok, false);
  assert.equal(esat.code, "PERMISSION_DENIED");
  assert.equal(esat.assigned, false);
  assert.equal(stock.code, "PERMISSION_DENIED");
  assert.equal(stranger.code, "UNKNOWN_IDENTITY");
  assert.equal(memoryDenied.code, "PERMISSION_DENIED");
  assert.equal(routed.code, "PERMISSION_DENIED");
});

test("sensitive actions cannot auto-approve at low risk", () => {
  const center = createApprovalCenter({ dbPath: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-p0-apr-")), "approvals.sqlite") });
  for (const action of SENSITIVE_ACTIONS) {
    const policy = classifyAction(action);
    const result = center.submit({
      action,
      requestedBy: "esat_bey",
      reason: "bypass",
      risk: RISK.LOW,
      taskId: `sensitive-${action}`,
    });
    assert.equal(policy.classification, "HUMAN_REQUIRED", action);
    assert.equal(policy.risk, "CRITICAL", action);
    assert.equal(result.auto, false, action);
    assert.equal(result.callerRisk, "LOW", action);
    assert.equal(result.item.status, "WAITING_APPROVAL", action);
    assert.equal(result.item.risk, policy.risk, action);
    assert.equal(result.item.payload.policy.callerRisk, "LOW", action);
  }
  const allowedLow = center.submit({ action: "CREATE_REPORTS", requestedBy: "esat_bey", reason: "note", risk: RISK.LOW });
  assert.equal(allowedLow.item.status, "APPROVED");
  assert.equal(allowedLow.permission.code, "ALLOW");
  assert.equal(classifyAction("CREATE_REPORTS").classification, "AUTO_LOW");
  center.close();
});

test("default deny holds unknown actions and ignores caller low risk", () => {
  const center = createApprovalCenter({ dbPath: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-p0-deny-")), "approvals.sqlite") });
  const src = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "../lib/pusat/humanApproval.js"), "utf8");
  assert.equal(src.includes("SENSITIVE_ACTION"), false);
  assert.equal(src.includes("PAYMENT|BANK"), false);
  for (const action of [...SENSITIVE_ACTIONS, ...UNREGISTERED_ACTIONS, "SEND_AGENT_MESSAGE", "stock buy", ""]) {
    const policy = classifyAction(action);
    assert.equal(policy.autoEligible, action.trim().toUpperCase() === "CREATE_REPORTS");
    const result = center.submit({
      action,
      requestedBy: "pusat",
      reason: "caller says low",
      risk: "low",
      taskId: `deny-${policy.action || "blank"}-${policy.classification}`,
    });
    assert.equal(result.auto, false, action || "blank");
    assert.notEqual(result.item && result.item.status, "APPROVED", action || "blank");
    assert.equal(result.item.risk, "CRITICAL", action || "blank");
    assert.equal(result.callerRisk, "LOW", action || "blank");
  }
  for (const action of UNREGISTERED_ACTIONS) {
    const result = center.submit({
      action,
      requestedBy: "pusat",
      risk: RISK.LOW,
      taskId: `unreg-${action}`,
    });
    assert.equal(result.code, "UNREGISTERED_ACTION", action);
    assert.equal(result.classification, "UNREGISTERED", action);
    assert.equal(classifyAction(action).registered, false, action);
  }
  const raised = center.submit({
    action: "CREATE_REPORTS",
    requestedBy: "esat_bey",
    risk: RISK.HIGH,
    taskId: "reports-high",
  });
  assert.equal(raised.auto, false);
  assert.equal(raised.item.status, "WAITING_APPROVAL");
  assert.equal(raised.item.risk, "HIGH");
  center.close();
});

test("permissions are independent for the 17 identities, unknowns, and delegations", () => {
  assert.equal(SEED_IDS.length, 17);
  assert.deepEqual(AUTO_LOW, ["CREATE_REPORTS"]);
  for (const action of SENSITIVE_ACTIONS) assert.equal(HUMAN_REQUIRED.includes(action), true, action);
  const center = createApprovalCenter({ dbPath: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-p0-ident-")), "approvals.sqlite") });
  for (const id of SEED_IDS) {
    const reports = check(id, "CREATE_REPORTS");
    assert.equal(reports.ok, true, id);
    assert.equal(reports.code, "ALLOW", id);
    assert.equal(explicitPermissions(id).includes("CREATE_REPORTS"), true, id);
    const submitted = center.submit({
      action: "CREATE_REPORTS",
      requestedBy: id,
      risk: RISK.LOW,
      taskId: `reports-${id}`,
    });
    assert.equal(submitted.auto, true, id);
    assert.equal(submitted.item.status, "APPROVED", id);
    assert.equal(submitted.permission.permissionIncreased, false, id);
    for (const action of SENSITIVE_ACTIONS) {
      const decision = check(id, action);
      assert.equal(decision.ok, false, `${id}:${action}`);
      assert.equal(decision.code, "HUMAN_GATE_REQUIRED", `${id}:${action}`);
      const held = center.submit({
        action,
        requestedBy: id,
        risk: RISK.LOW,
        taskId: `${id}-${action}`,
      });
      assert.equal(held.auto, false, `${id}:${action}`);
      assert.equal(held.item.status, "WAITING_APPROVAL", `${id}:${action}`);
      assert.equal(held.item.risk, classifyAction(action).risk, `${id}:${action}`);
    }
    const assignment = check(id, "ASSIGN_TASK");
    assert.equal(assignment.ok, id === "pusat", id);
  }
  for (const id of ["", "ghost", "pusat-admin", "finance_ai", "not_an_agent"]) {
    const decision = check(id, "CREATE_REPORTS");
    assert.equal(decision.ok, false, id || "blank");
    const submitted = center.submit({
      action: "CREATE_REPORTS",
      requestedBy: id,
      risk: RISK.LOW,
      taskId: `unknown-reports-${id || "blank"}`,
    });
    assert.equal(submitted.auto, false, id || "blank");
    assert.equal(submitted.ok, false, id || "blank");
    assert.equal(Boolean(submitted.item && submitted.item.status === "APPROVED"), false, id || "blank");
  }
  const borrowed = center.submit({
    action: "CREATE_REPORTS",
    requestedBy: "esat_bey",
    originRequesterId: "finance_ai",
    delegationChain: ["stock_ai"],
    risk: RISK.LOW,
  });
  assert.equal(borrowed.auto, false);
  assert.equal(borrowed.ok, false);
  assert.equal(borrowed.permission.permissionIncreased, false);
  assert.equal(borrowed.permission.effective.includes("ASSIGN_TASK"), false);
  const origin = new Set(explicitPermissions("finance_ai"));
  for (const perm of borrowed.permission.effective) assert.equal(origin.has(perm), true, perm);
  center.close();

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-p0-deleg-"));
  const queue = createDurableTaskQueue({ dbPath: path.join(dir, "queue.sqlite") });
  const parent = queue.enqueue({ title: "parent", ownerId: "pusat", assigneeId: "stock_ai" });
  const nested = queue.enqueue({
    title: "nested",
    ownerId: "pusat",
    assigneeId: "sinan_bey",
    originRequesterId: "stock_ai",
    delegationChain: ["esat_bey", "banu_hanim"],
  });
  const direct = queue.enqueue({
    title: "direct",
    ownerId: "pusat",
    assigneeId: "sinan_bey",
    originRequesterId: "pusat",
    delegationChain: ["pusat"],
  });
  queue.close();
  assert.equal(parent.ok, true);
  assert.equal(parent.permission.code, "ALLOW");
  assert.equal(nested.ok, false);
  assert.equal(nested.assigned, false);
  assert.equal(nested.permission.permissionIncreased, false);
  assert.equal(nested.permission.effective.includes("ASSIGN_TASK"), false);
  const stockPerms = new Set(explicitPermissions("stock_ai"));
  for (const perm of nested.permission.effective) assert.equal(stockPerms.has(perm), true, perm);
  assert.equal(direct.ok, true);
  assert.equal(direct.permissionIncreased === false || direct.permission.permissionIncreased === false, true);

  const memory = createTaskQueue();
  const memoryNested = memory.enqueue({
    title: "memory-nested",
    ownerId: "pusat",
    assigneeId: "mira",
    originRequesterId: "category_ai",
    delegationChain: ["seo_ai"],
  });
  assert.equal(memoryNested.ok, false);
  assert.equal(memoryNested.assigned, false);
  assert.equal(memoryNested.permission.effective.includes("ASSIGN_TASK"), false);

  const router = createRouter();
  const routed = router.create({ title: "delegated", fromId: "pusat", originRequesterId: "zeynep_hanim", delegationChain: ["pricing_ai"] });
  const allowedRoute = router.create({ title: "pusat-chain", fromId: "pusat", originRequesterId: "pusat" });
  assert.equal(routed.ok, false);
  assert.equal(routed.assigned, false);
  assert.equal(allowedRoute.ok, true);
  const child = router.assign({
    taskId: allowedRoute.task.id,
    agentId: "sinan_bey",
    fromId: "pusat",
    originRequesterId: "sales_analysis_ai",
    delegationChain: ["nedim_bey", "tuncay_bey"],
  });
  assert.equal(child.ok, false);
  assert.equal(child.assigned, false);
  assert.equal(child.permission.permissionIncreased, false);

  const councilDenied = createTask({
    fromId: "pusat",
    title: "nested council",
    assigneeId: "sinan_bey",
    originRequesterId: "stock_ai",
    delegationChain: ["esat_bey"],
  });
  const councilAllowed = createTask({
    fromId: "pusat",
    title: "council parent",
    assigneeId: "sinan_bey",
    originRequesterId: "sinan_bey",
    classification: "public",
  });
  assert.equal(councilDenied.ok, false);
  assert.equal(councilDenied.assigned, false);
  assert.equal(councilDenied.permission.permissionIncreased, false);
  assert.equal(councilAllowed.ok, true);
  for (const id of Object.keys(SAFE)) {
    if (id !== "pusat") assert.equal(explicitPermissions(id).includes("ASSIGN_TASK"), false, id);
  }

  const paymentGrant = grantPermission({ grantorId: "pusat", granteeId: "stock_ai", perm: "PAYMENT_ACTIVATE" });
  const assignGrant = grantPermission({ grantorId: "pusat", granteeId: "stock_ai", perm: "ASSIGN_TASK" });
  assert.equal(paymentGrant.granted, false);
  assert.equal(paymentGrant.permissionIncreased, false);
  assert.equal(paymentGrant.code, "HUMAN_GATE_REQUIRED");
  assert.equal(assignGrant.granted, false);
  assert.equal(assignGrant.code, "GRANT_DOES_NOT_EXPAND");
  assert.equal(check("stock_ai", "ASSIGN_TASK").ok, false);
  assert.equal(check("stock_ai", "PAYMENT_ACTIVATE").code, "HUMAN_GATE_REQUIRED");

  assert.equal(check("esat_bey", "CREATE_REPORTS").code, "ALLOW");
  try {
    const revoked = revokePermission({ revokedBy: "human", agentId: "esat_bey", perm: "CREATE_REPORTS" });
    assert.equal(revoked.immediate, true);
    assert.equal(check("esat_bey", "CREATE_REPORTS").code, "PERMISSION_REVOKED");
    const peer = revokePermission({ revokedBy: "stock_ai", agentId: "pusat", perm: "ASSIGN_TASK" });
    assert.equal(peer.code, "REVOCATION_DENIED");
    assert.equal(check("pusat", "ASSIGN_TASK").code, "ALLOW");
    const nestedAfterRevoke = authorizeDelegated({
      actorId: "esat_bey",
      originRequesterId: "esat_bey",
      chain: ["pusat"],
      perm: "CREATE_REPORTS",
    });
    assert.equal(nestedAfterRevoke.ok, false);
    assert.equal(nestedAfterRevoke.code, "PERMISSION_REVOKED");
  } finally {
    const agentClear = clearRevocations({ clearedBy: "stock_ai" });
    assert.equal(agentClear.code, "REVOCATION_CLEAR_DENIED");
    assert.equal(check("esat_bey", "CREATE_REPORTS").code, "PERMISSION_REVOKED");
    const cleared = clearRevocations({ clearedBy: "human" });
    assert.equal(cleared.code, "REVOKED_SET_CLEARED");
  }
  assert.equal(check("esat_bey", "CREATE_REPORTS").code, "ALLOW");
  const audit = auditDecisions();
  assert.equal(audit.some((entry) => entry.op === "revoke" && entry.code === "REVOKED"), true);
  assert.equal(audit.some((entry) => entry.op === "grant" && entry.perm === "PAYMENT_ACTIVATE"), true);
  assert.equal(audit.some((entry) => entry.op === "check" && entry.code === "PERMISSION_REVOKED"), true);
});

test("human approval does not execute the held action", () => {
  const center = createApprovalCenter({ dbPath: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-p0-hold-")), "approvals.sqlite") });
  const held = center.submit({
    action: "STOCK_BUY",
    requestedBy: "stock_ai",
    reason: "synthetic",
    risk: RISK.LOW,
    taskId: "hold-stock",
  });
  const aiDecision = center.decide({ id: held.item.id, approved: true, actorId: "stock_ai" });
  const humanDecision = center.decide({ id: held.item.id, approved: true, actorId: "human" });
  center.close();
  assert.equal(held.auto, false);
  assert.equal(held.item.status, "WAITING_APPROVAL");
  assert.equal(aiDecision.code, "PERMISSION_DENIED");
  assert.equal(humanDecision.ok, true);
  assert.equal(humanDecision.item.status, "APPROVED");
  assert.equal(humanDecision.item.action, "STOCK_BUY");
  assert.equal(humanDecision.task, null);
  assert.equal(JSON.stringify(humanDecision).includes("purchased\":true"), false);
});

test("the default WhatsApp sandbox stays closed until a call", () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
  const probe = spawnSync(process.execPath, ["--input-type=commonjs", "-e", `
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const before = new Set(fs.readdirSync(os.tmpdir()));
    const fds = () => fs.readdirSync("/proc/self/fd").map((fd) => {
      try { return fs.readlinkSync("/proc/self/fd/" + fd); } catch { return ""; }
    });
    const sqliteFds = () => fds().filter((target) => /\\.(sqlite|db)(\\b|-)/.test(target) || target.includes("buzzard-wa"));
    require("./server/lib/platform/tenModuleProgram.js");
    const mod = require("./server/lib/comms/whatsappSandbox.js");
    const created = fs.readdirSync(os.tmpdir()).filter((name) => !before.has(name) && /sqlite|\\.db$/i.test(name));
    if (sqliteFds().length || created.length) {
      console.error(JSON.stringify({ sqliteFds: sqliteFds(), created }));
      process.exit(2);
    }
    const result = mod.send();
    if (result.sent !== false || result.live !== false || result.code !== "WHATSAPP_SEND_DENIED") {
      console.error(JSON.stringify(result));
      process.exit(3);
    }
    const sandbox = fs.readdirSync(os.tmpdir()).filter((name) => !before.has(name) && name.includes("buzzard-wa-default-"));
    const opened = sqliteFds();
    if (!opened.length || sandbox.length !== 1) {
      console.error(JSON.stringify({ opened, sandbox }));
      process.exit(4);
    }
    if (path.basename(sandbox[0]).includes("buzzard.db")) process.exit(5);
  `], { cwd: root });
  assert.equal(probe.status, 0, probe.stdout.toString() + probe.stderr.toString());
  assert.equal(send().sent, false);
  assert.equal(send().live, false);
});
