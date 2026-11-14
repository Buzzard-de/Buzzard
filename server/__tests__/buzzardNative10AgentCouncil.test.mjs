import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const {
  ids,
  getAgent,
  registerAgent,
  unregisterAgent,
  assignVoice,
  SEED_IDS,
  ORIGINAL_10_IDS,
} = require("../lib/buzzardNative/core/identityRegistry.js");
const { createMultiMemory } = require("../lib/buzzardNative/core/multiMemory.js");
const { calculateVat, netIncomeReport, payTax, fileReturn } = require("../lib/buzzardNative/core/tax/vatEngine.js");
const { classify, duty, screen, fileDeclaration, release } = require("../lib/buzzardNative/core/customs/engine.js");
const { runImportToEuCustomer } = require("../lib/buzzardNative/core/tradeFlow.js");
const { runCouncil10 } = require("../lib/buzzardNative/core/council10.js");
const { check, selfElevate } = require("../lib/buzzardNative/core/permissionEngine.js");
const { MEMBERS } = require("../lib/pusat/council.js");
const { EXPECTED_SHA } = require("../lib/buzzardNative/speech/officialVoiceGuard.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");

describe("Buzzard 10-agent council", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
    unregisterAgent("probe_ai");
  });

  it("A identity: ten seed agents, Nedim/Tuncay roles, dynamic register, no MEMBERS rewrite", () => {
    expect(ORIGINAL_10_IDS).toHaveLength(10);
    expect(ORIGINAL_10_IDS.every((id) => ids().includes(id))).toBe(true);
    expect(ids()).toHaveLength(17);
    expect(SEED_IDS).toHaveLength(17);
    expect(getAgent("nedim_bey").role).toBe("global_tax_and_finance_compliance_specialist");
    expect(getAgent("nedim_bey").display_name).toBe("Nedim Bey");
    expect(getAgent("nedim_bey").officialDuty).toBe("VERGI_AI");
    expect(getAgent("tuncay_bey").role).toBe("global_customs_and_trade_compliance_specialist");
    expect(getAgent("tuncay_bey").display_name).toBe("Tuncay Bey");
    expect(getAgent("tuncay_bey").officialDuty).toBe("GUMRUK_AI");
    expect(getAgent("sinan_bey").agent_id).toBe("sinan_bey");
    expect(assignVoice({ fromId: "sinan_bey", toId: "nedim_bey" }).code).toBe("VOICE_IDENTITY_NOT_COPYABLE");
    expect(MEMBERS.some((m) => m.id === "nedim_bey")).toBe(false);
    expect(MEMBERS.some((m) => m.id === "customs_ai")).toBe(true);
    const add = registerAgent({ agent_id: "probe_ai", display_name: "Probe AI", role: "probe" });
    expect(add.ok).toBe(true);
    expect(ids()).toHaveLength(18);
    expect(registerAgent({ agent_id: "probe_ai", display_name: "X", role: "y" }).code).toBe("AGENT_ID_CONFLICT");
    expect(unregisterAgent("nedim_bey").code).toBe("SEED_IDENTITY_LOCKED");
    expect(unregisterAgent("probe_ai").ok).toBe(true);
  });

  it("B memory isolation between Nedim, Tuncay, others", () => {
    const mem = createMultiMemory();
    expect(mem.put({ actorId: "nedim_bey", ownerId: "nedim_bey", type: "tax_knowledge", key: "k", value: 1 }).ok).toBe(true);
    expect(mem.put({ actorId: "tuncay_bey", ownerId: "tuncay_bey", type: "hs_cn_taric", key: "k", value: 1 }).ok).toBe(true);
    expect(mem.get({ actorId: "nedim_bey", ownerId: "tuncay_bey", type: "hs_cn_taric", key: "k" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
    expect(mem.get({ actorId: "tuncay_bey", ownerId: "nedim_bey", type: "tax_knowledge", key: "k" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
    expect(mem.get({ actorId: "amelia", ownerId: "nedim_bey", type: "tax_knowledge", key: "k" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
    expect(mem.get({ actorId: "pusat", ownerId: "tuncay_bey", type: "hs_cn_taric", key: "k" }).code).toBe(
      "MEMORY_ISOLATION_DENIED",
    );
    expect(mem.put({ actorId: "tuncay_bey", ownerId: "tuncay_bey", type: "tax_knowledge", key: "x", value: 1 }).code).toBe(
      "TAX_MEMORY_SPECIALIST_ONLY",
    );
  });

  it("C tax: VAT, OSS candidate, reserve 25%, missing and expired", () => {
    const vat = calculateVat({
      actorId: "nedim_bey",
      sellerCountry: "DE",
      customerCountry: "FR",
      deliveryCountry: "FR",
      goodsNet: 100,
      kind: "B2C",
    });
    expect(vat.ok).toBe(true);
    expect(vat.rate).toBe(20);
    expect(vat.liveLegal).toBe(false);
    expect(vat.filingReady).toBe(false);
    expect(vat.definitive).toBe(false);
    expect(vat.ossCandidate).toBe(true);
    expect(vat.liveOss).toBe(false);
    expect(calculateVat({ actorId: "nedim_bey", deliveryCountry: "FR" }).status).toBe("UNKNOWN");
    expect(calculateVat({ actorId: "nedim_bey", deliveryCountry: "XX", goodsNet: 1 }).status).toBe("UNKNOWN");
    expect(calculateVat({ actorId: "nedim_bey", deliveryCountry: "DE", goodsNet: 1, forceExpired: true }).status).toBe(
      "EXPIRED_SOURCE",
    );
    const fr = netIncomeReport({
      actorId: "nedim_bey",
      incomeCountry: "FR",
      gross: 100,
      vat: 20,
      refund: 0,
      commission: 0,
      logistics: 0,
      supplierCost: 20,
    });
    expect(fr.reserveRate).toBe(0.25);
    expect(fr.emergencyReserve).toBe((100 - 20 - 20) * 0.25);
    expect(fr.reserveIsNotTax).toBe(true);
    expect(fr.autoTransfer).toBe(false);
    const de = netIncomeReport({
      actorId: "nedim_bey",
      incomeCountry: "DE",
      gross: 100,
      vat: 19,
      refund: 0,
      commission: 0,
      logistics: 0,
      supplierCost: 0,
    });
    expect(de.reserveRate).toBe(0);
    expect(netIncomeReport({ actorId: "nedim_bey", incomeCountry: "FR", gross: null }).status).toBe("UNKNOWN");
  });

  it("D customs: HS unknown, sanctions block, missing duty inputs", () => {
    expect(classify({ actorId: "tuncay_bey", sku: "mystery_widget" }).status).toBe("UNKNOWN");
    expect(classify({ actorId: "tuncay_bey", sku: "brake_pad" }).status).toBe("REVIEW_REQUIRED");
    expect(classify({ actorId: "tuncay_bey", sku: "brake_pad" }).legalClassification).toBe(false);
    expect(duty({ actorId: "tuncay_bey", goodsValue: 10, origin: "TR" }).status).toBe("UNKNOWN");
    const blocked = screen({ actorId: "tuncay_bey", sku: "cotton_tshirt", origin: "DE", destination: "KP" });
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.autoClear).toBe(false);
    expect(blocked.liveSanctions).toBe(false);
    const dual = classify({ actorId: "tuncay_bey", sku: "encryption_module" });
    expect(dual.dualUse).toBe(true);
    expect(dual.status).toBe("REVIEW_REQUIRED");
  });

  it("E cross-agent tax/customs with Pusat merge and human gates", () => {
    const t = runImportToEuCustomer({ sku: "cotton_tshirt", origin: "TR", destination: "FR", net: 80 });
    expect(t.completed).toBe(false);
    expect(t.task.state).toBe("APPROVAL_REQUIRED");
    expect(t.nedimApprovesCustoms.code).toBe("CROSS_SPECIALIST_APPROVAL_DENIED");
    expect(t.tuncayApprovesTax.code).toBe("CROSS_SPECIALIST_APPROVAL_DENIED");
    expect(t.thinking.nedim[0]).toBe("vat");
    expect(t.thinking.tuncay[0]).toBe("hs_cn_taric");
    expect(t.fileReturn.code).toBe("HUMAN_GATE_REQUIRED");
    expect(t.fileDeclaration.code).toBe("HUMAN_GATE_REQUIRED");
  });

  it("F security denials", () => {
    expect(payTax().code).toBe("HUMAN_GATE_REQUIRED");
    expect(fileReturn().code).toBe("HUMAN_GATE_REQUIRED");
    expect(fileDeclaration().code).toBe("HUMAN_GATE_REQUIRED");
    expect(release().code).toBe("HUMAN_GATE_REQUIRED");
    expect(check("pusat", "PAYMENT_ACTIVATE").ok).toBe(false);
    expect(check("esat_bey", "SECURITY_POLICY_CHANGE").ok).toBe(false);
    expect(selfElevate("nedim_bey", "TAX_PAY").code).toBe("SELF_ELEVATION_DENIED");
    expect(check("tuncay_bey", "DATA_EXPORT").ok).toBe(false);
    expect(check("nedim_bey", "CUSTOMS_HOLD").ok).toBe(false);
    expect(check("tuncay_bey", "TAX_CALCULATE").ok).toBe(false);
  });

  it("G council10 runner, clone, egress, load honesty", () => {
    const r = runCouncil10({ actorId: "sinan_bey" });
    expect(r.registered).toBe(17);
    expect(ORIGINAL_10_IDS.every((id) => r.identities.includes(id))).toBe(true);
    expect(r.voiceNedim).toBe("NOT_CONFIGURED");
    expect(r.voiceTuncay).toBe("NOT_CONFIGURED");
    expect(r.meeting.attendance.amelia).toBe(false);
    expect(r.meeting.liveVoice).toBe(false);
    expect(r.clone.code).toBe("CLONE_DENIED");
    expect(r.egress).toBe(false);
    expect(r.load.sufficientForTenLlm).toBe(false);
    expect(r.official.unchanged).toBe(true);
    expect(r.blocked.status).toBe("BLOCKED");
    expect(createHash("sha256").update(readFileSync("public/council/sinan-bey-official-voice-v1.m4a")).digest("hex")).toBe(
      EXPECTED_SHA,
    );
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed).toBe(false);
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    expect(pusat.executeReadOnly("TEN_AGENT_COUNCIL", {}, { actorId: "pusat" }).data.registered).toBe(17);
  });
});
