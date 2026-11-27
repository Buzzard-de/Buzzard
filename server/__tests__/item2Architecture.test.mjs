import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const tempRoot = mkdtempSync(path.join(os.tmpdir(), "buzzard-item2-"));
process.env.BUZZARD_DB_PATH = path.join(tempRoot, "app.sqlite");
process.env.BUZZARD_DATA_DIR = path.join(tempRoot, "data");
process.env.BUZZARD_SALES_ENABLED = "0";
delete process.env.PUSAT_RUNTIME_ENABLED;

const require = createRequire(import.meta.url);
const controlCenter = require("../lib/controlCenter");
const productCore = require("../lib/pim/productCore");
const { updateAdminProduct } = require("../plugins/databasePlugin");
const localizationFeeds = require("../lib/localizationFeeds");
const dbOrders = require("../lib/dbOrders");
const { createDurableTaskQueue } = require("../lib/pusat/durableTaskQueue");
const { executeReadOnly } = require("../lib/pusat/runtime");
const { isSalesEnabled } = require("../lib/salesMode");
const { capturePayment } = require("../lib/commerce/paymentService");
const { InterCarsAdapter } = require("../lib/adapters/interCarsAdapter");
const { db } = require("../lib/db");

const child = path.join(__dirname, "support", "item2ApprovalRace.cjs");

function decideInChild(dbPath, id, actorId) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [child, dbPath, id, actorId], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    proc.stdout.on("data", (chunk) => {
      out += chunk;
    });
    proc.stderr.on("data", (chunk) => {
      err += chunk;
    });
    proc.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(err || out || `child ${code}`));
        return;
      }
      resolve(JSON.parse(out.trim().split("\n").pop()));
    });
  });
}

describe("item 2 architecture boundaries", () => {
  it("keeps one human decision on the admin approval record and rejects an AI decider", () => {
    const task = controlCenter.createAiTask({
      title: "item2 review",
      taskType: "review",
      payload: { requiresApproval: false },
    });
    const first = controlCenter.createApproval({
      taskId: task.id,
      resourceType: "ai_task",
      reason: "review",
      riskLevel: "HIGH",
    });
    const second = controlCenter.createApproval({
      taskId: task.id,
      resourceType: "ai_task",
      reason: "review again",
      riskLevel: "HIGH",
    });
    expect(second.id).toBe(first.id);
    expect(db.prepare("SELECT COUNT(*) n FROM core_approvals WHERE task_id = ?").get(task.id).n).toBe(1);
    expect(controlCenter.decideApproval(first.id, "approve", "pricing_ai")).toBeNull();
    expect(controlCenter.listApprovals("PENDING").find((row) => row.id === first.id).status).toBe("PENDING");
    const decided = controlCenter.decideApproval(first.id, "approve", "operator@example.test");
    expect(decided.status).toBe("APPROVED");
    expect(decided.decidedBy).toBe("operator@example.test");
    expect(controlCenter.decideApproval(first.id, "reject", "operator@example.test")).toBeNull();
    expect(controlCenter.listApprovals("APPROVED").find((row) => row.id === first.id).status).toBe("APPROVED");
  });

  it("routes a Pusat decision only through the isolated queue", async () => {
    const orchPath = path.join(tempRoot, "orch.sqlite");
    const queue = createDurableTaskQueue({ dbPath: orchPath });
    const held = queue.enqueue({ title: "item2 gate", needsApproval: true, assigneeId: "pricing_ai" });
    const approval = queue.submitApproval({
      taskId: held.task.id,
      action: "THINK",
      requestedBy: "pricing_ai",
      risk: "HIGH",
    });
    const duplicate = queue.submitApproval({
      taskId: held.task.id,
      action: "THINK",
      requestedBy: "pricing_ai",
      risk: "HIGH",
    });
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.item.id).toBe(approval.item.id);
    expect(queue.decideApproval({ id: approval.item.id, approved: true, actorId: "pricing_ai" }).code).toBe(
      "PERMISSION_DENIED"
    );
    const before = db.prepare("SELECT COUNT(*) n FROM core_approvals").get().n;
    queue.close();

    const [left, right] = await Promise.all([
      decideInChild(orchPath, approval.item.id, "human"),
      decideInChild(orchPath, approval.item.id, "human"),
    ]);
    const oks = [left, right].filter((row) => row.ok);
    const denied = [left, right].filter((row) => row.code === "ALREADY_DECIDED");
    expect(oks).toHaveLength(1);
    expect(denied).toHaveLength(1);

    const reopened = createDurableTaskQueue({ dbPath: orchPath });
    const row = reopened.getApproval(approval.item.id);
    expect(row.status).toBe("APPROVED");
    expect(row.decided_by).toBe("human");
    expect(reopened.listApprovals({ status: "APPROVED" }).filter((item) => item.id === approval.item.id)).toHaveLength(1);
    reopened.close();
    expect(db.prepare("SELECT COUNT(*) n FROM core_approvals").get().n).toBe(before);

    const disabled = executeReadOnly("ORCHESTRATE_APPROVE", { approvalId: approval.item.id, dbPath: orchPath }, { actorId: "human" });
    expect(disabled.code).toBe("PUSAT_DISABLED");
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    try {
      const price = executeReadOnly("SET_PRICE", { amount: 10 }, { actorId: "pricing_ai" });
      expect(price.code).toBe("PERMISSION_DENIED");
    } finally {
      delete process.env.PUSAT_RUNTIME_ENABLED;
    }
  });

  it("sends product, price, and stock writes through the existing projection gate", () => {
    expect(() => productCore.createProduct({ sku: `item2-ai-${Date.now()}`, title: "AI product" }, { actorId: "mira", actorType: "AI" })).toThrow(
      /AI_WRITE_DENIED/
    );
    const created = productCore.createProduct(
      { sku: `item2-human-${Date.now()}`, title: "Human product", price: 5 },
      { actorId: "operator@example.test", actorType: "HUMAN" }
    );
    expect(created.sku).toContain("item2-human-");

    const legacyId = db.prepare("INSERT INTO products (sku, name, price_eur, stock, active) VALUES (?, ?, ?, ?, ?)").run(
      `item2-legacy-${Date.now()}`,
      "Legacy",
      3,
      4,
      1
    ).lastInsertRowid;
    const unguarded = updateAdminProduct(legacyId, { price_eur: 99, stock: 1 });
    expect(unguarded.code).toBe("ACTOR_REQUIRED");
    expect(db.prepare("SELECT price_eur FROM products WHERE id = ?").get(legacyId).price_eur).toBe(3);
    const aiPrice = updateAdminProduct(legacyId, { price_eur: 99 }, { actorId: "mira", actorType: "AI" });
    expect(aiPrice.code).toBe("AI_WRITE_DENIED");
    const humanPrice = updateAdminProduct(legacyId, { price_eur: 8, stock: 2 }, { actorId: "operator@example.test", actorType: "HUMAN" });
    expect(humanPrice.ok).toBe(true);
    expect(humanPrice.product.price_eur).toBe(8);

    const localePrice = localizationFeeds.upsertPriceOverride(legacyId, { locale: "de-DE", price: 11 }, { actorId: "mira", actorType: "AI" });
    expect(localePrice.code).toBe("AI_WRITE_DENIED");
    expect(db.prepare("SELECT COUNT(*) n FROM price_overrides WHERE product_id = ?").get(legacyId).n).toBe(0);

    const order = dbOrders.createOrderFromCart("item2-user", { countryCode: "DE" });
    expect(order.code || order.error).toBeTruthy();
    expect(isSalesEnabled()).toBe(false);
    expect(capturePayment({ amount: 1, actorId: "item2" }).code).toBe("PAYMENT_NOT_LIVE");
    expect(new InterCarsAdapter().placeOrder({ actorId: "item2" }).code).toBe("LIVE_ORDER_FORBIDDEN");
  });
});
