import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  check,
  explicitPermissions,
  authorizeDelegated,
  grantPermission,
  humanDeciderRole,
  SAFE,
  DANGEROUS,
} = require("../lib/buzzardNative/core/permissionEngine.js");
const { createApprovalCenter, RISK } = require("../lib/pusat/humanApproval.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

function notExecuted(result) {
  assert.equal(result.executed, false);
  assert.equal(result.paymentCreated, false);
  assert.equal(result.shipmentCreated, false);
  assert.equal(result.moneyMoved, false);
  assert.equal(result.orderCreated, false);
  assert.equal(result.task, null);
}

test("authorization denies unless the permission is explicit", () => {
  assert.equal(isSalesEnabled(), false);
  for (const id of ["", "ghost", "admin", "operator", "human", "ai_agent", { role: "admin" }]) {
    const decision = check(id, "CREATE_REPORTS");
    assert.equal(decision.ok, false, String(id));
    assert.notEqual(decision.code, "ALLOW");
  }
  for (const perm of ["LIVE_PAYMENT", "SHIPMENT_CREATE", "PAYMENT_ACTIVATE", "UNREGISTERED_ACTION", ""]) {
    const decision = check("pusat", perm);
    assert.equal(decision.ok, false, perm || "blank");
    assert.equal(explicitPermissions("pusat").includes(perm), false);
  }
  assert.equal(DANGEROUS.includes("LIVE_PAYMENT"), true);
  assert.equal(DANGEROUS.includes("SHIPMENT_CREATE"), true);
  assert.equal(check("pusat", "ASSIGN_TASK").code, "ALLOW");
  assert.equal(check("stock_ai", "ASSIGN_TASK").code, "PERMISSION_DENIED");
  for (const id of Object.keys(SAFE)) {
    for (const perm of explicitPermissions(id)) {
      assert.equal(SAFE[id].includes(perm), true, `${id}:${perm}`);
      assert.equal(DANGEROUS.includes(perm), false, perm);
    }
  }
});

test("delegation stays inside the intersection and ignores caller claims", () => {
  const widened = authorizeDelegated({
    actorId: "pusat",
    originRequesterId: "stock_ai",
    chain: ["esat_bey"],
    perm: "ASSIGN_TASK",
    permissions: ["ASSIGN_TASK", "LIVE_PAYMENT", "SHIPMENT_CREATE"],
    sessionRole: "administrator",
    humanApproved: true,
  });
  assert.equal(widened.ok, false);
  assert.equal(widened.permissionIncreased, false);
  assert.equal(widened.effective.includes("ASSIGN_TASK"), false);
  assert.equal(widened.effective.includes("LIVE_PAYMENT"), false);
  assert.equal(widened.effective.includes("SHIPMENT_CREATE"), false);
  const stock = new Set(explicitPermissions("stock_ai"));
  for (const perm of widened.effective) assert.equal(stock.has(perm), true, perm);

  const shared = authorizeDelegated({
    actorId: "amelia",
    originRequesterId: "adrian",
    chain: ["mira"],
    perm: "CREATE_REPORTS",
  });
  assert.equal(shared.ok, true);
  assert.equal(shared.code, "ALLOW");
  assert.equal(shared.permissionIncreased, false);
  const adrian = new Set(explicitPermissions("adrian"));
  for (const perm of shared.effective) assert.equal(adrian.has(perm), true, perm);

  for (const chain of ["pusat", { actorId: "admin" }, null]) {
    const denied = authorizeDelegated({ actorId: "pusat", originRequesterId: "pusat", chain, perm: "CREATE_REPORTS" });
    assert.equal(denied.ok, false);
    assert.equal(denied.code, "DELEGATION_DENIED");
    assert.deepEqual(denied.effective, []);
  }

  const grant = grantPermission({ grantorId: "pusat", granteeId: "stock_ai", perm: "LIVE_PAYMENT" });
  assert.equal(grant.granted, false);
  assert.equal(grant.permissionIncreased, false);
  assert.equal(check("stock_ai", "LIVE_PAYMENT").ok, false);
});

test("a caller role or actor id does not approve payment or shipment", () => {
  for (const role of ["ai_agent", "human", "operator", "staff", "pusat", "admin@example.com", "", null, ["admin"]]) {
    const decision = humanDeciderRole(role);
    assert.equal(decision.ok, false, String(role));
    assert.equal(decision.actorId, null);
    assert.equal(decision.paymentCreated, false);
    assert.equal(decision.shipmentCreated, false);
  }
  for (const role of ["admin", "administrator", "super_admin"]) {
    const decision = humanDeciderRole(role);
    assert.equal(decision.ok, true, role);
    assert.equal(decision.actorId, "operator");
    assert.equal(decision.paymentCreated, false);
    assert.equal(decision.shipmentCreated, false);
  }

  const center = createApprovalCenter({
    dbPath: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-p0-auth-")), "approvals.sqlite"),
  });
  try {
    for (const action of ["LIVE_PAYMENT", "SHIPMENT_CREATE"]) {
      const held = center.submit({
        action,
        requestedBy: "pusat",
        reason: "synthetic",
        risk: RISK.LOW,
        taskId: `hold-${action}`,
        payload: { actorId: "operator", sessionRole: "administrator", humanApproved: true, paid: true },
      });
      assert.equal(held.auto, false, action);
      assert.equal(held.item.status, "WAITING_APPROVAL", action);
      const impersonated = center.decide({
        id: held.item.id,
        approved: true,
        actorId: "client@example.com",
        sessionRole: "administrator",
      });
      assert.equal(impersonated.ok, false, action);
      assert.equal(impersonated.code, "PERMISSION_DENIED", action);
      const recorded = center.decide({ id: held.item.id, approved: true, actorId: "human" });
      assert.equal(recorded.ok, true, action);
      assert.equal(recorded.item.status, "APPROVED", action);
      assert.equal(recorded.item.action, action);
      notExecuted(recorded);
    }
    assert.equal(isSalesEnabled(), false);
  } finally {
    center.close();
  }
});

test("runtime and the approval route use the explicit decider role", () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
  const runtime = fs.readFileSync(path.join(root, "server/lib/pusat/runtime.js"), "utf8");
  const plugin = fs.readFileSync(path.join(root, "server/plugins/controlCenterPlugin.js"), "utf8");
  assert.equal(runtime.includes("humanDeciderRole"), true);
  assert.equal(runtime.includes("payload.deciderId"), false);
  assert.equal(runtime.includes("payload.sessionRole"), false);
  assert.equal(plugin.includes("humanDeciderRole"), true);
  assert.equal(plugin.includes("actorId: decider.actorId"), true);
  assert.equal(plugin.includes("req.body?.actorId"), false);
  assert.equal(plugin.includes("req.body.sessionRole"), false);
});
