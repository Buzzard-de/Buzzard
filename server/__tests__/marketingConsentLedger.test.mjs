import { createHash } from "node:crypto";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const ledger = require("../lib/commerce/marketingConsentLedger.js");

function openFixture(dbPath, options = {}) {
  return ledger.openConsentLedger(dbPath, { isolatedFixture: true, ...options });
}
const consent = require("../lib/commerce/marketingConsentGate.js");
const loyalty = require("../lib/marketingLoyalty.js");
const { db, getDatabaseHealth, migrateMarketingConsentLedger } = require("../lib/db.js");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-consent-ledger-"));
const keyDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-consent-key-"));

function fileIn(name) {
  return path.join(root, name);
}

function withdrawal(channel, idempotencyKey, observedAt) {
  return {
    customerId: "ledger-customer",
    channel,
    consentStatus: "WITHDRAWN",
    idempotencyKey,
    source: "customer-opt-out",
    observedAt,
  };
}

function runWorker(dbPath, input) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort, workerData } = require("node:worker_threads");
      const ledger = require(workerData.modulePath);
      const handle = ledger.openConsentLedger(workerData.dbPath, { isolatedFixture: true });
      const result = handle.record(workerData.input);
      parentPort.postMessage({
        persisted: result.persisted === true,
        stored: result.stored === true,
        granted: result.granted === true,
        duplicate: result.duplicate === true,
        code: result.code,
      });
      handle.close();
    `, {
      eval: true,
      workerData: {
        modulePath: path.join(__dirname, "..", "lib", "commerce", "marketingConsentLedger.js"),
        dbPath,
        input,
      },
    });
    worker.once("message", resolve);
    worker.once("error", reject);
  });
}

describe("FIN-M25 persistent consent ledger", () => {
  const handles = [];

  afterEach(() => {
    consent.unbindConsentLedger();
    consent.clearConsentMemory();
    while (handles.length) {
      const handle = handles.pop();
      try {
        handle.close();
      } catch {
        /* the assertion already recorded the failure */
      }
    }
  });

  it("keeps the production migration off the commerce database", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "lib", "db.js"), "utf8");
    const body = source.slice(source.indexOf("function applyMigrations"), source.indexOf("function publicPersistence"));
    expect(body.includes("migrateMarketingConsentLedger")).toBe(false);
    expect(() => migrateMarketingConsentLedger(db)).toThrow(/DATA_PATH_REFUSED/);
    expect(() => openFixture(path.join(__dirname, "..", "data", "buzzard.db"))).toThrow(/DATA_PATH_REFUSED/);
    expect(() => openFixture(path.join(os.tmpdir(), "do-not-create", "buzzard-pusat-orch.sqlite"))).toThrow(/DATA_PATH_REFUSED/);
    expect(getDatabaseHealth().initialized).toBe(false);
    expect(getDatabaseHealth().opened).toBe(false);
  });

  it("persists the first opt-out, reloads it, and leaves the other channels unknown", () => {
    const dbPath = fileIn("restart.sqlite");
    const first = openFixture(dbPath);
    handles.push(first);
    expect(first.journalMode()).toBe("wal");
    const saved = first.record(withdrawal("email", "first-email", "2099-01-01T00:00:00.000Z"));
    expect(saved.persisted).toBe(true);
    expect(saved.stored).toBe(true);
    expect(saved.granted).toBe(false);
    const laterClock = first.record(withdrawal("sms", "first-sms", "2000-01-01T00:00:00.000Z"));
    expect(laterClock.sequence).toBeGreaterThan(saved.sequence);
    const ordered = first.listDecisions();
    expect(ordered.map((row) => row.sequence)).toEqual([saved.sequence, laterClock.sequence]);
    expect(ordered[0].created_at).toBe("2099-01-01T00:00:00.000Z");
    expect(first.readCustomer("ledger-customer")).toMatchObject({ email: "WITHDRAWN", sms: "WITHDRAWN", push: "UNKNOWN" });
    first.close();
    handles.pop();

    consent.clearConsentMemory();
    const second = openFixture(dbPath);
    handles.push(second);
    consent.bindConsentLedger(second);
    const seen = consent.readMarketingConsent("ledger-customer");
    expect(seen.emailPermission).toBe("WITHDRAWN");
    expect(seen.smsPermission).toBe("WITHDRAWN");
    expect(seen.pushPermission).toBe("UNKNOWN");
    expect(seen.granted).toBe(false);
    expect(seen.marketingSendsOpen).toBe(false);
    expect(consent.marketingSendsOpen()).toBe(false);
  });

  it("rejects unknown rows, fake grants, and whatsapp aliases", () => {
    const handle = openFixture(fileIn("reject.sqlite"));
    handles.push(handle);
    const unknown = handle.record({ ...withdrawal("push", "unknown-row"), consentStatus: "UNKNOWN" });
    const fake = handle.record({
      ...withdrawal("email", "fake-grant"),
      consentStatus: "GRANTED",
      granted: true,
      explicitGrant: true,
      consentVerified: true,
      ok: true,
      status: 200,
    });
    const whatsapp = handle.record({ ...withdrawal("email", "whatsapp-alias"), channel: "whatsapp" });
    expect(unknown.persisted).toBe(false);
    expect(fake.persisted).toBe(false);
    expect(fake.code).toBe("GRANT_REFUSED");
    expect(whatsapp.code).toBe("CHANNEL_REJECTED");
    expect(handle.listDecisions()).toEqual([]);
    expect(handle.readCustomer("ledger-customer").push).toBe("UNKNOWN");

    consent.bindConsentLedger(handle);
    const loyaltyGrant = loyalty.updatePreferences("8800000000091", {
      emailOptIn: true,
      ok: true,
      granted: true,
      status: 200,
      consentSource: "account-settings",
      consentScope: "marketing-email",
      consentAt: "2026-11-15T00:00:00.000Z",
      idempotencyKey: "ledger-fake-loyalty",
    });
    expect(loyaltyGrant.stored).toBe(false);
    expect(loyaltyGrant.persisted).toBe(false);
    expect(loyaltyGrant.granted).toBe(false);
    expect(handle.readAll().some((row) => row.consent_status === "GRANTED")).toBe(false);
  });

  it("keeps channels independent and treats a repeated key as idempotent", () => {
    const handle = openFixture(fileIn("channels.sqlite"));
    handles.push(handle);
    consent.bindConsentLedger(handle);
    const email = loyalty.updatePreferences("8800000000092", { emailOptIn: false, idempotencyKey: "ledger-email" });
    expect(email.persisted).toBe(true);
    expect(email.status).toBe(200);
    expect(email.emailPermission).toBe("WITHDRAWN");
    expect(email.smsPermission).toBe("UNKNOWN");
    expect(email.pushPermission).toBe("UNKNOWN");
    const repeat = loyalty.updatePreferences("8800000000092", { emailOptIn: false, idempotencyKey: "ledger-email" });
    expect(repeat.duplicate).toBe(true);
    expect(repeat.persisted).toBe(true);
    expect(repeat.granted).toBe(false);
    const push = handle.record(withdrawal("push", "channel-push"));
    expect(push.persisted).toBe(true);
    const seen = handle.readCustomer("ledger-customer");
    expect(seen.push).toBe("WITHDRAWN");
    expect(seen.sms).toBe("UNKNOWN");
    const rows = handle.readAll();
    expect(rows.map((row) => row.channel).sort()).toEqual(["email", "push"]);
    expect(loyalty.getPreferences("8800000000092").emailPermission).toBe("WITHDRAWN");
    expect(loyalty.getPreferences("8800000000092").smsPermission).toBe("UNKNOWN");
    const conflict = handle.record({
      customerId: "8800000000092",
      channel: "sms",
      consentStatus: "WITHDRAWN",
      idempotencyKey: "ledger-email:email:withdraw",
      source: "crm-opt-out",
    });
    expect(conflict.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(conflict.persisted).toBe(false);
    expect(handle.readCustomer("8800000000092").sms).toBe("UNKNOWN");
  });

  it("serializes concurrent writers without granting permission", async () => {
    const dbPath = fileIn("concurrent.sqlite");
    const prepared = openFixture(dbPath);
    prepared.close();
    const input = withdrawal("email", "concurrent-email");
    const [left, right] = await Promise.all([runWorker(dbPath, input), runWorker(dbPath, input)]);
    const outcomes = [left, right];
    expect(outcomes.every((item) => item.granted === false)).toBe(true);
    expect(outcomes.filter((item) => item.persisted && !item.duplicate)).toHaveLength(1);
    expect(outcomes.filter((item) => item.duplicate && item.persisted)).toHaveLength(1);
    const push = runWorker(dbPath, withdrawal("push", "concurrent-push"));
    const sms = runWorker(dbPath, withdrawal("sms", "concurrent-sms"));
    const pair = await Promise.all([push, sms]);
    expect(pair.every((item) => item.persisted === true && item.granted === false)).toBe(true);
    const check = openFixture(dbPath);
    handles.push(check);
    expect(check.readCustomer("ledger-customer")).toMatchObject({ email: "WITHDRAWN", sms: "WITHDRAWN", push: "WITHDRAWN" });
    expect(check.listDecisions().filter((row) => row.idempotency_key === "concurrent-email")).toHaveLength(1);
  });

  it("reports a write failure without a durable success", () => {
    const dbPath = fileIn("readonly.sqlite");
    const handle = openFixture(dbPath);
    handle.close();
    fs.chmodSync(dbPath, 0o444);
    let unavailable = false;
    try {
      const again = openFixture(dbPath);
      handles.push(again);
      const result = again.record(withdrawal("email", "readonly-email"));
      unavailable = result.persisted === false && result.stored === false && result.granted === false;
    } catch {
      unavailable = true;
    }
    expect(unavailable).toBe(true);
    fs.chmodSync(dbPath, 0o600);
    consent.bindConsentLedger({
      readAll() {
        throw new Error("CONSENT_STORE_UNAVAILABLE");
      },
    });
    const closed = consent.readMarketingConsent("ledger-customer");
    expect(closed.storeStatus).toBe("UNAVAILABLE");
    expect(closed.emailPermission).toBe("CLOSED");
    expect(closed.smsPermission).toBe("CLOSED");
    expect(closed.pushPermission).toBe("CLOSED");
    expect(closed.marketingSendsOpen).toBe(false);
    expect(consent.marketingSendsOpen()).toBe(false);
  });

  it("encrypts backups and refuses an older backup that would erase a newer withdrawal", () => {
    const dbPath = fileIn("backup.sqlite");
    const backupPath = fileIn("ledger.bzc");
    const key = crypto.randomBytes(32);
    const handle = openFixture(dbPath);
    handles.push(handle);
    handle.record(withdrawal("email", "backup-email"));
    const beside = handle.backupEncrypted({ destination: fileIn("blocked.bzc"), key, keyPath: fileIn("key.bin") });
    expect(beside.code).toBe("KEY_BESIDE_STORE");
    expect(fs.existsSync(fileIn("key.bin"))).toBe(false);
    const written = handle.backupEncrypted({ destination: backupPath, key, keyPath: path.join(keyDirectory, "backup.key") });
    expect(written.ok).toBe(true);
    const bytes = fs.readFileSync(backupPath);
    expect(bytes.subarray(0, 4).toString()).toBe("BZC1");
    expect(bytes.includes(Buffer.from("ledger-customer"))).toBe(false);
    expect(bytes.includes(Buffer.from("WITHDRAWN"))).toBe(false);
    expect(fs.readdirSync(root).some((name) => name.toLowerCase().includes("key"))).toBe(false);
    handle.record(withdrawal("sms", "backup-sms"));
    const stale = handle.restoreEncrypted({ source: backupPath, key });
    expect(stale.restored).toBe(false);
    expect(stale.code).toBe("BACKUP_STALE");
    expect(handle.readCustomer("ledger-customer")).toMatchObject({ email: "WITHDRAWN", sms: "WITHDRAWN", push: "UNKNOWN" });

    const empty = openFixture(fileIn("restored.sqlite"));
    handles.push(empty);
    const restored = empty.restoreEncrypted({ source: backupPath, key });
    expect(restored.restored).toBe(true);
    expect(empty.readCustomer("ledger-customer")).toMatchObject({ email: "WITHDRAWN", sms: "UNKNOWN", push: "UNKNOWN" });
    expect(createHash("sha256").update(key).digest("hex")).toHaveLength(64);
  });

  it("refuses a production path in a temporary directory and does not create a missing ledger", () => {
    const temporary = path.join(os.tmpdir(), "buzzard-production-consent.sqlite");
    const missing = path.join("/opt/cursor/artifacts", "finm25-missing-consent", "consent.sqlite");
    const previous = process.env.BUZZARD_CONSENT_DB_PATH;
    try {
      process.env.BUZZARD_CONSENT_DB_PATH = temporary;
      const refused = ledger.resolveProductionConsentPath();
      expect(refused.ok).toBe(false);
      expect(refused.persisted).toBe(false);
      expect(refused.granted).toBe(false);
      expect(fs.existsSync(temporary)).toBe(false);
      expect(() => ledger.openConsentLedger(temporary)).toThrow(/DATA_PATH_REFUSED/);

      process.env.BUZZARD_CONSENT_DB_PATH = missing;
      const absent = ledger.openProductionConsentLedger();
      expect(absent.ok).toBe(false);
      expect(absent.persisted).toBe(false);
      expect(absent.granted).toBe(false);
      expect(fs.existsSync(missing)).toBe(false);
      const bound = consent.bindProductionConsentLedger();
      expect(bound.storeStatus).toBe("UNAVAILABLE");
      const seen = consent.readMarketingConsent("missing-customer");
      expect(seen.granted).toBe(false);
      expect(seen.emailPermission).toBe("CLOSED");
      expect(seen.marketingSendsOpen).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.BUZZARD_CONSENT_DB_PATH;
      else process.env.BUZZARD_CONSENT_DB_PATH = previous;
      consent.unbindConsentLedger();
    }
  });

  it("rejects a corrupt backup, a broken chain, and a backup that would grant a withdrawn channel", () => {
    const dbPath = fileIn("chain.sqlite");
    const key = crypto.randomBytes(32);
    const handle = openFixture(dbPath);
    handles.push(handle);
    fs.writeFileSync(fileIn("corrupt.bzc"), Buffer.from("not-a-backup"));
    expect(handle.restoreEncrypted({ source: fileIn("corrupt.bzc"), key }).code).toBe("BACKUP_INVALID");
    expect(handle.readAll()).toEqual([]);

    const broken = {
      maxSequence: 3,
      decisions: [
        { sequence: 1, decision_id: "d1", customer_id: "chain-customer", channel: "email", consent_status: "WITHDRAWN", idempotency_key: "k1", payload_hash: "x", source: "customer-opt-out", explicit_grant: 0, consent_verified: 0, created_at: "2026-11-15T00:00:00.000Z" },
        { sequence: 3, decision_id: "d3", customer_id: "chain-customer", channel: "sms", consent_status: "WITHDRAWN", idempotency_key: "k3", payload_hash: "y", source: "customer-opt-out", explicit_grant: 0, consent_verified: 0, created_at: "2026-11-15T00:00:01.000Z" },
      ],
      state: [],
    };
    fs.writeFileSync(fileIn("broken.bzc"), ledger.sealConsentBackup(broken, key));
    const brokenResult = handle.restoreEncrypted({ source: fileIn("broken.bzc"), key });
    expect(brokenResult.restored).toBe(false);
    expect(brokenResult.code).toBe("BACKUP_UNVERIFIED");
    expect(handle.readAll()).toEqual([]);

    const granted = {
      maxSequence: 1,
      decisions: [{
        sequence: 1,
        decision_id: "grant-1",
        customer_id: "chain-customer",
        channel: "email",
        consent_status: "GRANTED",
        idempotency_key: "grant-key",
        payload_hash: "unverified",
        source: "customer-opt-out",
        explicit_grant: 1,
        consent_verified: 1,
        created_at: "2026-11-15T00:00:00.000Z",
      }],
      state: [{
        customer_id: "chain-customer",
        channel: "email",
        consent_status: "GRANTED",
        decision_id: "grant-1",
        source: "customer-opt-out",
        sequence: 1,
        explicit_grant: 1,
        consent_verified: 1,
        created_at: "2026-11-15T00:00:00.000Z",
        updated_at: "2026-11-15T00:00:00.000Z",
      }],
    };
    fs.writeFileSync(fileIn("granted.bzc"), ledger.sealConsentBackup(granted, key));
    const grantedResult = handle.restoreEncrypted({ source: fileIn("granted.bzc"), key });
    expect(grantedResult.restored).toBe(false);
    expect(grantedResult.code).toBe("BACKUP_UNVERIFIED");
    expect(handle.readCustomer("chain-customer").email).toBe("UNKNOWN");

    handle.record({ ...withdrawal("email", "chain-email"), customerId: "chain-customer" });
    const forged = consent.persistGrant({ granted: true, consentVerified: true, code: "CONSENT_GRANTED", ok: true, status: 200 });
    expect(forged.persisted).toBe(false);
    expect(forged.granted).toBe(false);
    expect(forged.code).toBe("GRANT_REFUSED");
    expect(handle.readAll().some((row) => row.consent_status === "GRANTED")).toBe(false);
    expect(handle.readCustomer("chain-customer").email).toBe("WITHDRAWN");
  });

  it("fails closed when another connection holds the write lock", () => {
    const dbPath = fileIn("locked.sqlite");
    const prepared = openFixture(dbPath);
    prepared.close();
    const Database = require("better-sqlite3");
    const locker = new Database(dbPath);
    locker.pragma("busy_timeout = 50");
    locker.exec("BEGIN IMMEDIATE");
    const handle = openFixture(dbPath, { busyTimeout: 40 });
    handles.push(handle);
    try {
      const result = handle.record(withdrawal("push", "locked-push"));
      expect(result.persisted).toBe(false);
      expect(result.stored).toBe(false);
      expect(result.granted).toBe(false);
    } finally {
      locker.exec("ROLLBACK");
      locker.close();
    }
    expect(handle.readCustomer("ledger-customer").push).toBe("UNKNOWN");
  });

  it("keeps evidence columns null and refuses a populated grant", () => {
    const dbPath = fileIn("evidence.sqlite");
    const first = openFixture(dbPath);
    handles.push(first);
    const saved = first.record(withdrawal("email", "evidence-email"));
    expect(saved.persisted).toBe(true);
    expect(saved.granted).toBe(false);
    expect(saved.productionReady).toBe(false);
    const refused = first.record({ ...withdrawal("sms", "evidence-grant"), consentStatus: "GRANTED", explicitGrant: true, consentVerified: true });
    expect(refused.persisted).toBe(false);
    expect(refused.code).toBe("GRANT_REFUSED");
    first.close();
    handles.pop();

    const Database = require("better-sqlite3");
    const raw = new Database(dbPath);
    try {
      const decision = raw.prepare(
        `SELECT sequence, decision_id, payload_hash, purpose, consent_text_version, policy_version, locale,
                action_type, evidence_reference, evidence_hash
         FROM marketing_consent_decisions`
      ).get();
      expect(decision.sequence).toBe(saved.sequence);
      expect(decision.decision_id).toBe(saved.decisionId);
      expect(decision.purpose).toBeNull();
      expect(decision.consent_text_version).toBeNull();
      expect(decision.policy_version).toBeNull();
      expect(decision.locale).toBeNull();
      expect(decision.action_type).toBeNull();
      expect(decision.evidence_reference).toBeNull();
      expect(decision.evidence_hash).toBeNull();
      const again = openFixture(dbPath);
      handles.push(again);
      const reloaded = again.listDecisions();
      expect(reloaded).toHaveLength(1);
      expect(reloaded[0].sequence).toBe(saved.sequence);
      expect(reloaded[0].decision_id).toBe(saved.decisionId);
      expect(raw.prepare("SELECT COUNT(*) AS n FROM marketing_consent_decisions WHERE consent_status = 'GRANTED'").get().n).toBe(0);
      expect(raw.prepare("SELECT COUNT(*) AS n FROM marketing_consent_audit").get().n).toBe(0);
      expect(() => raw.prepare(
        `INSERT INTO marketing_consent_decisions(
           decision_id, customer_id, channel, consent_status, idempotency_key, payload_hash, source,
           explicit_grant, consent_verified, created_at, purpose, consent_text_version, policy_version,
           locale, action_type, evidence_reference, evidence_hash
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        "raw-grant", "ledger-customer", "email", "GRANTED", "raw-grant", "hash", "customer-opt-out",
        1, 1, "2026-11-16T00:00:00.000Z", "marketing", "text-1", "policy-1", "de", "grant", "evidence-1",
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      )).toThrow(/GRANT_REFUSED/);
      expect(again.readCustomer("ledger-customer").email).toBe("WITHDRAWN");
      expect(() => raw.prepare("UPDATE marketing_consent_decisions SET source = 'rewritten'").run()).toThrow(/HISTORY_IMMUTABLE/);
      expect(() => raw.prepare("DELETE FROM marketing_consent_decisions").run()).toThrow(/HISTORY_IMMUTABLE/);
      expect(() => raw.prepare(
        `INSERT INTO marketing_consent_audit(
           event_type, customer_id, channel, result_code, created_at
         ) VALUES ('GRANT_COMMIT', 'ledger-customer', 'email', 'GRANTED', '2026-11-16T00:00:00.000Z')`
      ).run()).toThrow(/AUDIT_WRITE_CLOSED/);
      expect(raw.prepare("SELECT COUNT(*) AS n FROM marketing_consent_audit").get().n).toBe(0);
      expect(raw.prepare("SELECT COUNT(*) AS n FROM marketing_consent_decisions").get().n).toBe(1);
    } finally {
      raw.close();
    }
    expect(fs.existsSync(path.join(__dirname, "..", "lib", "commerce", "consentGrantCore.js"))).toBe(false);
  });

  it("restores a version 1 withdrawal without evidence fields and rejects evidence on a withdrawal", () => {
    const key = crypto.randomBytes(32);
    const hash = createHash("sha256").update(JSON.stringify({
      customerId: "legacy-customer",
      channel: "email",
      status: "WITHDRAWN",
      source: "customer-opt-out",
      idempotencyKey: "legacy-email",
    })).digest("hex");
    const legacy = {
      maxSequence: 1,
      decisions: [{
        sequence: 1,
        decision_id: "legacy-decision",
        customer_id: "legacy-customer",
        channel: "email",
        consent_status: "WITHDRAWN",
        idempotency_key: "legacy-email",
        payload_hash: hash,
        source: "customer-opt-out",
        explicit_grant: 0,
        consent_verified: 0,
        created_at: "2026-11-15T00:00:00.000Z",
      }],
      state: [{
        customer_id: "legacy-customer",
        channel: "email",
        consent_status: "WITHDRAWN",
        decision_id: "legacy-decision",
        source: "customer-opt-out",
        sequence: 1,
        explicit_grant: 0,
        consent_verified: 0,
        created_at: "2026-11-15T00:00:00.000Z",
        updated_at: "2026-11-15T00:00:00.000Z",
      }],
    };
    fs.writeFileSync(fileIn("legacy.bzc"), ledger.sealConsentBackup(legacy, key));
    const restored = openFixture(fileIn("legacy.sqlite"));
    handles.push(restored);
    const result = restored.restoreEncrypted({ source: fileIn("legacy.bzc"), key });
    expect(result.restored).toBe(true);
    expect(restored.readCustomer("legacy-customer").email).toBe("WITHDRAWN");
    restored.close();
    handles.pop();
    const Database = require("better-sqlite3");
    const raw = new Database(fileIn("legacy.sqlite"));
    try {
      const row = raw.prepare("SELECT evidence_hash, purpose FROM marketing_consent_decisions").get();
      expect(row.evidence_hash).toBeNull();
      expect(row.purpose).toBeNull();
    } finally {
      raw.close();
    }

    const evidenced = {
      ...legacy,
      decisions: [{ ...legacy.decisions[0], evidence_hash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }],
    };
    fs.writeFileSync(fileIn("evidenced.bzc"), ledger.sealConsentBackup(evidenced, key));
    const blocked = openFixture(fileIn("evidenced.sqlite"));
    handles.push(blocked);
    const refused = blocked.restoreEncrypted({ source: fileIn("evidenced.bzc"), key });
    expect(refused.restored).toBe(false);
    expect(refused.code).toBe("BACKUP_UNVERIFIED");
    expect(blocked.readAll()).toEqual([]);
  });

  it("refuses a populated GRANTED update on the state row and leaves the withdrawal", () => {
    const dbPath = fileIn("state-grant-update.sqlite");
    const handle = openFixture(dbPath);
    handles.push(handle);
    const saved = handle.record(withdrawal("email", "state-withdraw"));
    expect(saved.persisted).toBe(true);
    expect(saved.code).toBe("WITHDRAWN");
    handle.close();
    handles.pop();

    const Database = require("better-sqlite3");
    const raw = new Database(dbPath);
    try {
      const before = raw.prepare(
        `SELECT consent_status, explicit_grant, consent_verified, purpose, consent_text_version, policy_version,
                locale, action_type, evidence_reference, evidence_hash
         FROM marketing_consent_state WHERE customer_id = ? AND channel = ?`
      ).get("ledger-customer", "email");
      expect(before.consent_status).toBe("WITHDRAWN");
      expect(before.explicit_grant).toBe(0);
      expect(before.consent_verified).toBe(0);
      expect(before.evidence_hash).toBeNull();
      expect(() => raw.prepare(
        `UPDATE marketing_consent_state
         SET consent_status = 'GRANTED', explicit_grant = 1, consent_verified = 1,
             purpose = ?, consent_text_version = ?, policy_version = ?, locale = ?,
             action_type = ?, evidence_reference = ?, evidence_hash = ?
         WHERE customer_id = ? AND channel = ?`
      ).run(
        "marketing", "text-1", "policy-1", "de", "grant", "evidence-1",
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "ledger-customer", "email"
      )).toThrow(/GRANT_REFUSED/);
      const after = raw.prepare(
        `SELECT consent_status, explicit_grant, consent_verified, purpose, evidence_hash
         FROM marketing_consent_state WHERE customer_id = ? AND channel = ?`
      ).get("ledger-customer", "email");
      expect(after).toEqual({
        consent_status: "WITHDRAWN",
        explicit_grant: 0,
        consent_verified: 0,
        purpose: null,
        evidence_hash: null,
      });
      expect(raw.prepare("SELECT COUNT(*) AS n FROM marketing_consent_state WHERE consent_status = 'GRANTED'").get().n).toBe(0);
      expect(raw.prepare("SELECT COUNT(*) AS n FROM marketing_consent_decisions WHERE consent_status = 'GRANTED'").get().n).toBe(0);
      expect(raw.prepare("SELECT COUNT(*) AS n FROM marketing_consent_decisions").get().n).toBe(1);
    } finally {
      raw.close();
    }
  });
});
