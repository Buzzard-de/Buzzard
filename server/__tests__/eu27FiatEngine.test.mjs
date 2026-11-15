import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const engine = require("../lib/banking/eu27");
const { EU_COUNTRY_CODES } = require("../core/marketEngineRegistry");
const { AGENT_KINDS } = require("../lib/buzzardNative/core/specialistDispatch");

const NO_QUOTED_REGISTER = ["CZ", "DK", "HU", "PL", "RO"];

function ledgerPath() {
  return path.join(os.tmpdir(), "buzzard-test-sqlite", `eu27-fiat-${process.pid}-${crypto.randomBytes(3).toString("hex")}.db`);
}

function fixture(id, overrides = {}) {
  return {
    id,
    fixture: true,
    live: false,
    licenseStatus: "LICENSE_VERIFIED",
    contractStatus: "CONTRACT_VERIFIED",
    connectorStatus: "SANDBOX_VERIFIED",
    countryCode: "DE",
    currencies: ["EUR"],
    methods: ["sepa_credit_transfer"],
    screening: "CLEAR_FIXTURE",
    costBps: 20,
    successBps: 9900,
    settlementSeconds: 3600,
    refundCostBps: 5,
    riskBps: 10,
    ...overrides,
  };
}

test("market engine supplies all 27 EU countries and no second list", () => {
  assert.equal(EU_COUNTRY_CODES.size, 27);
  const countries = engine.eu27Countries();
  assert.equal(countries.length, 27);
  assert.deepEqual(countries.map((row) => row.countryCode), [...EU_COUNTRY_CODES].sort());
  assert.equal(countries.every((row) => row.countryName && row.currency), true);
});

test("quoted inventory covers every SSM country in the extract and hides the rest", () => {
  const report = engine.coverage();
  assert.equal(report.countryCount, 27);
  assert.equal(report.complete, false);
  assert.equal(report.liveReady, false);
  assert.ok(report.quotedEntities > 100);
  for (const country of report.countries) {
    assert.ok(country.gaps.includes("EBA_PAYMENT_REGISTER_NOT_IMPORTED"));
    assert.ok(country.gaps.includes("LOCAL_PAYMENT_SYSTEM_NOT_VERIFIED"));
    assert.equal(country.liveConnectors, 0);
    assert.equal(country.ownershipVerified, 0);
    if (NO_QUOTED_REGISTER.includes(country.countryCode)) {
      assert.equal(country.quotedEntities, 0);
      assert.equal(country.ecbQuoted, 0);
      assert.ok(country.gaps.includes("NATIONAL_REGISTER_NOT_IMPORTED"));
      assert.ok(country.gaps.includes("NO_ENTITY_IN_ECB_PART_A_EXTRACT"));
    } else if (country.countryCode === "SE") {
      assert.ok(country.nationalQuoted > 0);
      assert.equal(country.ecbQuoted, 0);
      assert.ok(country.gaps.includes("NATIONAL_REGISTER_PARTIAL"));
    } else {
      assert.ok(country.ecbQuoted > 0);
    }
    assert.equal(country.registryComplete, false);
  }
  const registry = engine.registryComplete();
  assert.equal(registry.code, "EU27_REGISTRY_INCOMPLETE");
  assert.equal(registry.complete, false);
  const sweden = engine.entitiesByCountry("SE");
  assert.equal(sweden.filter((row) => row.institutionType === "Bankaktiebolag").length, 48);
  assert.equal(sweden.filter((row) => row.institutionType === "Sparbank").length, 40);
  assert.equal(sweden.filter((row) => row.institutionType === "Medlemsbank").length, 2);
  assert.equal(sweden.some((row) => row.officialName === "Avanza Bank AB"), true);
  assert.equal(sweden.some((row) => /Amagerbanken/i.test(row.officialName)), false);
  for (const row of engine.entities()) {
    assert.equal(row.verificationStatus, "SOURCE_QUOTED");
    assert.equal(row.connectorStatus, "DISCOVERED");
    assert.ok(row.ownershipClass === "NOT_STATED_IN_SOURCE" || row.ownershipClass === "UNKNOWN");
    assert.equal(row.endpoint, null);
    assert.ok(row.fees == null || row.fees === "UNKNOWN");
    assert.ok(row.website == null || row.website === "UNKNOWN");
    assert.equal(engine.assertNotVerified(row).ok, true);
    assert.equal(row.evidence.LIVE_VERIFIED, false);
    assert.equal(row.evidence.OWNERSHIP_VERIFIED, false);
    assert.equal(row.evidence.PAYMENT_CAPABILITY_VERIFIED, false);
    assert.equal(row.evidence.SEPA_MEMBERSHIP_VERIFIED, false);
    assert.equal(row.evidence.API_DOCUMENTATION_VERIFIED, false);
    assert.equal(row.evidence.SANDBOX_VERIFIED, false);
    assert.equal(row.evidence.REGISTRY_VERIFIED, true);
  }
});

test("connectors do not invent endpoints", () => {
  const entity = engine.entitiesByCountry("DE")[0];
  const connector = engine.connectorFor(entity);
  assert.equal(connector.endpoint, null);
  assert.equal(connector.status, "DISCOVERED");
  assert.equal(connector.entitySupport["pain.001"], "NOT_DOCUMENTED");
  const advanced = engine.advanceStatus(entity, "API_DOCUMENTED", { apiDocumentUrl: "https://example.invalid/docs" });
  assert.equal(advanced.applied, false);
  assert.equal(advanced.endpoint, null);
});

test("fiat policy rejects crypto, unknown assets, and policy edits", () => {
  for (const currency of ["BTC", "ETH", "USDT", "USDC"]) {
    assert.equal(engine.decideAsset({ currency, assetType: "fiat" }).code, "REJECTED_CRYPTO_POLICY");
  }
  for (const assetType of ["nft", "stablecoin", "token", "digital_asset"]) {
    assert.equal(engine.decideAsset({ currency: "EUR", assetType }).code, "REJECTED_CRYPTO_POLICY");
  }
  assert.equal(engine.decideAsset({ currency: "EUR", assetType: "cbdc" }).code, "REJECTED_CBDC_POLICY");
  assert.equal(engine.decideAsset({ currency: "EUR", assetType: "cbdc" }).assetClass, "cbdc");
  assert.equal(engine.POLICY.FIAT_ONLY, true);
  assert.equal(engine.POLICY.CRYPTO_PAYMENT_ALLOWED, false);
  assert.equal(engine.POLICY.CBDC_PAYMENT_ALLOWED, false);
  assert.equal(engine.decideAsset({ currency: "XYZ", assetType: "fiat" }).code, "REJECTED_UNKNOWN_ASSET");
  assert.equal(engine.decideAsset({ currency: "EUR", assetType: "fiat" }).code, "FIAT_ACCEPTED");
  assert.equal(engine.requestPolicyChange({ actorId: "pricing_ai", actorKind: "ai" }).code, "AI_POLICY_CHANGE_DENIED");
  assert.equal(engine.requestPolicyChange({ actorId: "operator", actorKind: "human", humanApproval: false }).code, "HUMAN_GATE_REQUIRED");
  const locked = engine.requestPolicyChange({ actorId: "operator", actorKind: "human", humanApproval: true });
  assert.equal(locked.code, "POLICY_IMMUTABLE");
  assert.equal(locked.applied, false);
  assert.equal(engine.POLICY.mutable, false);
});

test("payment methods stay unverified in every member state", () => {
  const catalogue = engine.catalogue();
  assert.equal(catalogue.length, 27);
  for (const country of catalogue) {
    assert.equal(country.methods.length, engine.METHOD_IDS.length);
    assert.equal(country.methods.every((method) => method.verificationStatus === "UNVERIFIED" && method.live === false), true);
    assert.equal(country.methods.find((method) => method.methodId === "licensed_local_provider").localSchemeName, null);
  }
  assert.equal(engine.isVerifiedMethod("DE", "sepa_credit_transfer").code, "METHOD_NOT_VERIFIED");
});

test("routing ignores quoted banks and can score only an explicit sandbox fixture", () => {
  const quoted = engine.entitiesByCountry("DE")[0];
  const blocked = engine.route({
    countryCode: "DE",
    currency: "EUR",
    methodId: "sepa_credit_transfer",
    candidates: [{ ...quoted, id: quoted.lei, fixture: false, live: false }],
  });
  assert.equal(blocked.code, "METHOD_NOT_VERIFIED");
  const cheap = fixture("cheap", { costBps: 5, successBps: 9800 });
  const costly = fixture("costly", { costBps: 80, successBps: 9700 });
  const chosen = engine.route({
    countryCode: "DE",
    currency: "EUR",
    methodId: "sepa_credit_transfer",
    sandboxMethodOverride: true,
    candidates: [costly, cheap],
  });
  assert.equal(chosen.code, "SANDBOX_ROUTE");
  assert.equal(chosen.provider.id, "cheap");
  assert.equal(chosen.live, false);
  const cryptoRoute = engine.route({ countryCode: "DE", currency: "BTC", methodId: "sepa_credit_transfer" });
  assert.equal(cryptoRoute.code, "REJECTED_CRYPTO_POLICY");
});

test("ledger stays off the dev database and does not charge the same key twice", () => {
  const dbPath = ledgerPath();
  const ledger = engine.openLedger(dbPath);
  const input = {
    idempotencyKey: "idem-1",
    countryCode: "DE",
    methodId: "sepa_credit_transfer",
    currency: "EUR",
    amountCents: 1000,
    candidates: [fixture("only")],
    subjectToken: "subject-token",
    sandboxMethodOverride: true,
  };
  const first = ledger.submitPayment(input);
  const second = ledger.submitPayment(input);
  const conflict = ledger.submitPayment({ ...input, amountCents: 2000 });
  const card = ledger.submitPayment({ ...input, idempotencyKey: "card", subjectToken: "4111111111111111" });
  const cryptoPayment = ledger.submitPayment({ ...input, idempotencyKey: "crypto", currency: "BTC", sandboxMethodOverride: true });
  const missingAmount = ledger.submitPayment({ ...input, idempotencyKey: "blank", amountCents: undefined });
  const secondPay = ledger.submitPayment({ ...input, idempotencyKey: "idem-2" });
  const refund = ledger.customerRefund({ paymentId: first.id, amountCents: 400 });
  const unknownAmount = ledger.customerRefund({ paymentId: secondPay.id });
  const repeated = ledger.customerRefund({ paymentId: first.id, amountCents: 400 });
  const missing = ledger.customerRefund({ paymentId: "missing-payment" });
  const invalid = ledger.customerRefund({ paymentId: first.id, amountCents: Number.NaN });
  const receivable = ledger.supplierReceivable({ supplierToken: "supplier-token", amountCents: 1000 });
  const dispute = ledger.chargeback({ paymentId: first.id });
  const snap = ledger.snapshot();
  const immutable = ledger.amendAudit();
  ledger.close();
  fs.rmSync(dbPath, { force: true });
  assert.equal(missingAmount.code, "AMOUNT_UNKNOWN");
  assert.equal(missingAmount.recorded, false);
  assert.equal(first.ok, true);
  assert.equal(first.moneyMoved, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.id, first.id);
  assert.equal(conflict.code, "IDEMPOTENCY_CONFLICT");
  assert.equal(card.code, "CARD_DATA_REJECTED");
  assert.equal(cryptoPayment.code, "REJECTED_CRYPTO_POLICY");
  assert.equal(refund.ok, false);
  assert.equal(refund.refunded, false);
  assert.equal(refund.status, "BLOCKED_EXTERNAL");
  assert.equal(refund.supplierAffected, false);
  assert.equal(refund.moneyMoved, false);
  assert.equal(repeated.duplicate, true);
  assert.equal(missing.code, "PAYMENT_NOT_FOUND");
  assert.equal(invalid.recorded, false);
  assert.equal(invalid.code, "INVALID_AMOUNT");
  assert.equal(receivable.assumedRefund, false);
  assert.equal(dispute.moneyMoved, false);
  assert.equal(unknownAmount.recorded, true);
  assert.equal(unknownAmount.refunded, false);
  assert.equal(snap.payments.length, 2);
  assert.equal(snap.payments[0].money_moved, 0);
  assert.equal(snap.payments[0].body_json.includes("subject-token"), false);
  assert.equal(snap.payments[0].body_json.includes("4111111111111111"), false);
  assert.equal(JSON.parse(snap.payments[0].body_json).subjectStored, false);
  assert.equal(snap.refunds.length, 2);
  assert.equal(snap.refunds.find((row) => row.payment_id === secondPay.id).amount_cents, null);
  assert.equal(snap.refunds.find((row) => row.payment_id === first.id).amount_cents, 400);
  assert.equal(snap.receivables[0].assumed_refund, 0);
  assert.equal(immutable.code, "AUDIT_IMMUTABLE");
  assert.equal(dbPath.endsWith(`${path.sep}buzzard.db`), false);
});

test("messages, payout, reconciliation, webhooks, and council stay sandboxed", () => {
  const pain = engine.buildPain001({
    debtorIban: "DE89370400440532013000",
    creditorIban: "FR1420041010050500013M02606",
    amount: "1.00",
    currency: "EUR",
  });
  assert.equal(pain.submitted, false);
  assert.equal(pain.transmitted, false);
  assert.equal(engine.buildPain001({
    debtorIban: "DE89370400440532013000",
    creditorIban: "FR1420041010050500013M02606",
    currency: "USDT",
  }).code, "REJECTED_CRYPTO_POLICY");
  const camt = engine.readCamt('<Stmt><Ntry><Amt Ccy="EUR">1.00</Amt></Ntry></Stmt>');
  assert.equal(camt.live, false);
  assert.equal(engine.ebicsReady().code, "CONTRACT_REQUIRED");
  const paid = engine.payout();
  assert.equal(paid.code, "HUMAN_GATE_REQUIRED");
  assert.equal(paid.moneyMoved, false);
  assert.equal(paid.salesLocked, true);
  const broken = engine.reconcile({
    ledgerLines: [{ amountCents: 100 }],
    statementLines: [{ amountCents: 90 }],
  });
  assert.equal(broken.code, "BREAK");
  assert.equal(engine.settlementPlan({ amountCents: 100, currency: "EUR" }).live, false);
  assert.equal(engine.treasury({ balances: [{ amountCents: 100 }] }).transfer, false);
  const secret = "sandbox-secret";
  const body = '{"event":"sandbox"}';
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(engine.verifyWebhook({ body, signature, secret }).code, "SIGNATURE_OK");
  assert.equal(engine.verifyWebhook({ body, signature: "00", secret }).code, "SIGNATURE_MISMATCH");
  assert.equal(engine.scaRequired({ methodId: "visa" }).acsUrl, null);
  assert.equal(engine.screenParty({}).clear, false);
  assert.equal(engine.kycBoundary().performsKyc, false);
  assert.equal(engine.act({ agentId: "dogu_bey", duty: "INSTITUTION_RESEARCH" }).complete, false);
  assert.equal(engine.act({ agentId: "pricing_ai", duty: "PAYMENT_COST" }).display, "Akın Bey");
  assert.equal(engine.act({ agentId: "sales_analysis_ai", duty: "FINANCIAL_PERFORMANCE" }).display, "Sencer Bey");
  assert.equal(engine.act({ agentId: "nedim_bey", duty: "TAX_AND_PAYMENT_RULES" }).code, "DUTY_ACKNOWLEDGED");
  assert.equal(engine.act({ agentId: "esat_bey", duty: "FINANCIAL_SYSTEM_SECURITY" }).code, "DUTY_ACKNOWLEDGED");
  assert.equal(engine.act({ agentId: "pusat", duty: "COORDINATE" }).code, "DUTY_ACKNOWLEDGED");
  assert.equal(engine.act({ agentId: "amelia", duty: "PAYMENT_COST" }).code, "OUT_OF_AUTHORITY");
  assert.equal(engine.act({ agentId: "nedim_bey", duty: "TAX_AND_PAYMENT_RULES", action: "TRANSFER" }).code, "AI_MONEY_MOVEMENT_DENIED");
  assert.equal(Object.keys(AGENT_KINDS).length, 17);
  const ready = engine.readiness();
  assert.equal(ready.countries, 27);
  assert.equal(ready.productionReady, false);
  assert.equal(ready.liveVerified, false);
  assert.equal(ready.salesEnabled, false);
  const egressPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "security", "egress_policy.v1.json");
  const egress = JSON.parse(fs.readFileSync(egressPath, "utf8"));
  assert.equal(egress.default, "DENY");
  assert.equal(engine.quoteRate({ base: "EUR", quote: "EUR" }).code, "IDENTITY_RATE");
  const cross = engine.quoteRate({ base: "EUR", quote: "SEK" });
  assert.equal(cross.code, "FX_RATE_UNKNOWN");
  assert.equal(cross.invented, false);
  assert.equal(cross.rate, null);
  assert.equal(engine.reviewPayment({ currency: "EUR", amount: 25000, country: "DE" }).code, "REVIEW");
  assert.equal(engine.reviewPayment({ currency: "USDT", amount: 1 }).code, "REJECTED_CRYPTO_POLICY");
  const isolated = engine.runTask({
    id: "RETRY_PROBE",
    priority: 99,
    dependencies: [],
    tests: [],
    run() {
      throw new Error("same-fault");
    },
  }, { maxAttempts: 2 });
  assert.equal(isolated.status, "ISOLATED");
  assert.equal(isolated.attempts, 2);
  const cycle = engine.runCycle({ checkpointPath: path.join(os.tmpdir(), `eu27-checkpoint-${process.pid}.json`) });
  assert.equal(cycle.cursorRunsContinuously, false);
  assert.equal(cycle.registry, "EU27_REGISTRY_INCOMPLETE");
  assert.equal(cycle.globalSoftwareCompletion, 1);
  assert.equal(cycle.autonomousSoftwareCompletion, 1);
  assert.ok(cycle.projectCompletionIncludingGates < 1);
  assert.equal(cycle.cursorRunsContinuously, false);
  assert.equal(cycle.independentWorker, false);
  const approvals = require("../lib/pusat/humanApproval");
  const approvalDb = path.join(os.tmpdir(), `eu27-approval-${process.pid}.db`);
  const center = approvals.createApprovalCenter({ dbPath: approvalDb });
  const held = center.submit({ action: "BANK_TRANSFER", requestedBy: "pricing_ai", risk: approvals.RISK.LOW });
  const cardPayload = center.submit({ action: "READ_REPORT", requestedBy: "pricing_ai", risk: approvals.RISK.LOW, payload: { pan: "4111111111111111" } });
  const denied = center.decide({ id: held.item.id, approved: true, actorId: "pricing_ai" });
  center.close();
  fs.rmSync(approvalDb, { force: true });
  assert.equal(held.item.status, "WAITING_APPROVAL");
  assert.equal(held.item.risk, "CRITICAL");
  assert.equal(cardPayload.code, "CARD_DATA_REJECTED");
  assert.equal(denied.code, "PERMISSION_DENIED");
  assert.equal(cycle.excludedFromCompletion.includes("EU27_REGISTRY_IMPORT"), true);
  assert.equal(cycle.excludedFromCompletion.includes("LIVE_BANK_CONNECTORS"), true);
  assert.equal(cycle.tasks.find((task) => task.id === "EU27_REGISTRY_IMPORT").status, "EXTERNAL_DEPENDENCY_BLOCKED");
  assert.equal(cycle.tasks.find((task) => task.id === "LIVE_BANK_CONNECTORS").status, "HUMAN_APPROVAL_REQUIRED");
});
