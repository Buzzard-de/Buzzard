import { createRequire } from "node:module";
import { chmodSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const { createCears } = require("../lib/security/cears/engine.js");
const { createLocker } = require("../lib/security/evidenceLocker.js");
const { executiveSize, ALLOWED_SIZES } = require("../lib/buzzardNative/core/councilConfig.js");
const { ENGINES, snapshot: engines, buyStock } = require("../lib/commerce/engineRegistry.js");
const { initiateTransfer, snapshot: banks } = require("../lib/finance/bankingAdapter.js");
const { send, migrateNumber, status: wa } = require("../lib/comms/whatsappSandbox.js");
const { analyze } = require("../lib/buzzardNative/sinan/repoAnalysis.js");
const { inventory: locales } = require("../lib/i18n/localeInventory.js");
const { createShipment, snapshot: carriers } = require("../lib/logistics/carrierAdapter.js");
const { screen } = require("../lib/compliance/sanctionsAdapter.js");
const { snapshot: streams } = require("../lib/workstreams/special16.js");
const { split } = require("../lib/finance/taxReserves.js");
const { calculate, applyCustomerRefund, MIN_NET } = require("../lib/finance/unifiedPricing.js");
const { reconcileSynthetic, restoreProduction } = require("../lib/survival/businessContinuity.js");
const { runIsolatedDisasterDrill } = require("../lib/survival/isolatedDisasterDrill.js");
const { openMeeting } = require("../lib/buzzardNative/core/councilSession.js");
const { getAgent, SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");
const { executeReadOnly } = require("../lib/pusat/runtime.js");
const { SHARED } = require("../lib/security/egressPolicy.js");

describe("autonomous continuation 2026-11-09", () => {
  it("CEARS forbids counterattack, AI ack, and live notify", () => {
    const cears = createCears();
    const opened = cears.open({ title: "probe", severity: "P1", indicators: { ip: "203.0.113.1" } });
    expect(opened.live).toBe(false);
    expect(cears.contain(opened.incident.incident_id, { action: "COUNTERATTACK" }).code).toBe("FORBIDDEN_RESPONSE");
    expect(cears.ack(opened.incident.incident_id, { by: "esat_bey" }).code).toBe("AI_ACK_INVALID");
    expect(cears.ack(opened.incident.incident_id, { by: "human" }).ok).toBe(true);
    expect(cears.notify().reachedNetwork).toBe(false);
    expect(cears.revoke({ target: "svc" }).revoked).toBe(false);
  });

  it("evidence locker keeps original immutable and HMAC is not a signature", () => {
    const locker = createLocker();
    const ing = locker.ingestOriginal({ bytes: "probe-bytes", source: "unit", method: "copy" });
    expect(ing.record.hmacIsSignature).toBe(false);
    expect(ing.record.worm).toBe(false);
    expect(locker.verify(ing.record.evidence_id).ok).toBe(true);
    expect(locker.exportPack(ing.record.evidence_id).code).toBe("HUMAN_EXPORT_APPROVED_REQUIRED");
    expect(() => chmodSync(ing.path, 0o644)).not.toThrow();
    const copy = locker.workingCopy(ing.record.evidence_id);
    expect(copy.record.class).toBe("WORKING_COPY");
    expect(copy.record.parent_id).toBe(ing.record.evidence_id);
  });

  it("executive size stays owner-configurable among 5, 7, 17", () => {
    expect(ALLOWED_SIZES).toEqual([5, 7, 17]);
    expect(executiveSize({ env: {} }).size).toBe(17);
    expect(executiveSize({ env: { BUZZARD_COUNCIL_EXECUTIVE_SIZE: "7" } }).size).toBe(7);
    expect(executiveSize({ env: { BUZZARD_COUNCIL_EXECUTIVE_SIZE: "9" } }).source).toBe("INVALID_FALLBACK_DEFAULT");
  });

  it("eleven engines stay fail-closed and stock buy is gated", () => {
    expect(ENGINES).toHaveLength(11);
    expect(engines().anyLive).toBe(false);
    expect(buyStock().code).toBe("HUMAN_GATE_REQUIRED");
  });

  it("banking adapter is Deutsche Bank AG candidate, not Bundesbank, no transfer", () => {
    const s = banks();
    expect(s.fiatOnly).toBe(true);
    expect(s.cryptoRails).toBe(false);
    expect(s.bundesbankIsNotCommercialCandidate).toBe(true);
    expect(initiateTransfer().sent).toBe(false);
  });

  it("WhatsApp sandbox cannot send or migrate", () => {
    expect(wa().personalNumberPreserved).toBe(true);
    expect(send().sent).toBe(false);
    expect(migrateNumber().code).toBe("NUMBER_MIGRATION_DENIED");
  });

  it("Sinan local analysis does not claim LLM or live", () => {
    const r = analyze({ root });
    expect(r.ok).toBe(true);
    expect(r.hasEgressPolicy).toBe(true);
    expect(r.llmCompleted).toBe(false);
    expect(r.cloneVoice).toBe(false);
  });

  it("locale inventory lists 30 codes and does not mark translations verified", () => {
    const inv = locales({ root });
    expect(inv.listed).toBe(30);
    expect(inv.translationFilesVerified).toBe(true);
    expect(inv.complete).toBe(false);
    expect(inv.verified).toBe(false);
    expect(inv.rtl).toContain("ar");
  });

  it("sanctions UNKNOWN is never CLEAR", () => {
    expect(screen({}).clear).toBe(false);
    expect(screen({ origin: "DE", destination: "FR", product: "pad", endUser: "retail" }).decision).toBe("UNKNOWN");
  });

  it("carriers and workstreams are not live", () => {
    expect(createShipment().liveShipment).toBe(false);
    expect(carriers().carriers.length).toBeGreaterThanOrEqual(8);
    expect(carriers().live).toBe(false);
    expect(streams().streams).toHaveLength(16);
    expect(streams().anyLive).toBe(false);
  });

  it("tax emergency reserve is 25% of net profit and DE is separate", () => {
    const fr = split({ netProfit: 100, taxEstimate: 19, country: "FR" });
    expect(fr.emergencyReserve).toBe(25);
    expect(fr.taxReserve).toBe(19);
    expect(fr.mixed).toBe(false);
    expect(split({ netProfit: 100, country: "DE" }).emergencyReserve).toBe(0);
    expect(fr.elsterLive).toBe(false);
  });

  it("unified pricing keeps min net and does not assume supplier reimbursement", () => {
    const q = calculate({
      actorId: "pricing_ai",
      supplierCost: 10,
      shipping: 2,
      marketplaceCommission: 1,
      vat: 2,
      returnReserve: 0.5,
      paymentFees: 0.4,
      category: "automotive",
    });
    expect(q.ok).toBe(true);
    expect(q.net).toBeGreaterThanOrEqual(MIN_NET);
    expect(q.supplierReimbursementAssumed).toBe(false);
    const after = applyCustomerRefund({ estimatedProfit: q.estimatedProfit, refund: 1 });
    expect(after.supplierReimbursementAssumed).toBe(false);
    expect(after.actualProfit).toBeLessThan(after.estimatedProfit);
  });

  it("synthetic recon is not production restore", () => {
    expect(reconcileSynthetic({ orders: 1, paid: 2 }).ok).toBe(false);
    expect(restoreProduction().code).toBe("HUMAN_RESTORE_APPROVED_REQUIRED");
    const drill = runIsolatedDisasterDrill();
    expect(drill.status).toBe("ISOLATED_RESTORE_TESTED");
    expect(drill.productionDrVerified).toBe(false);
    expect(drill.restoreProduction.productionTouched).toBe(false);
    expect(drill.recon.supplierReimbursementAssumed).toBe(false);
  });

  it("council aliases map into native attendance without merging identities", () => {
    expect(SEED_IDS).toHaveLength(17);
    expect(getAgent("customs_ai").agent_id).toBe("tuncay_bey");
    expect(getAgent("customs_ai").identitiesMerged).toBe(false);
    expect(getAgent("phone_ai").agent_id).toBe("zeynep_hanim");
    expect(getAgent("price_ai").agent_id).toBe("pricing_ai");
    expect(getAgent("customer_ai").agent_id).toBe("banu_hanim");
    const m = openMeeting({ present: ["pusat", "customs_ai"] });
    expect(m.attendance.tuncay_bey).toBe(true);
    expect(m.llmCouncil).toBe(false);
    expect(m.liveVoice).toBe(false);
  });

  it("Pusat continuation status is dry-run with DENY egress", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    expect(SHARED.default).toBe("DENY");
    const r = executeReadOnly("PLATFORM_CONTINUATION_STATUS", {}, { actorId: "pusat" });
    expect(r.ok).toBe(true);
    expect(r.data.live).toBe(false);
    expect(r.data.engines.count).toBe(11);
    expect(r.data.egressDefault).toBe("DENY");
  });

  it("network path classification file exists and does not add localhost allow", () => {
    const p = path.join(root, "data/security/network_path_classes.v1.json");
    expect(existsSync(p)).toBe(true);
    const doc = JSON.parse(readFileSync(p, "utf8"));
    expect(doc.policy).toBe("DENY");
    expect(JSON.stringify(doc)).not.toMatch(/localhost exception/i);
  });
});
