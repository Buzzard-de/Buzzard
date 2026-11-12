import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { recommend, demoTryOn, retentionPolicy, assessTextile } = require("../lib/storefront/textileProgram.js");
const { carrierMatrix, compareCarriers, quoteLane } = require("../lib/commerce/ab27Logistics.js");
const { decideOutcome, listFreshness, screenCompliance } = require("../lib/commerce/sanctionsScreen.js");
const { verifyOfficialRequest } = require("../lib/privacy/authorityGate.js");
const { postNetIncome, postExpense, payTax, resetPools, POOL_COUNTRIES, explainReserve } = require("../lib/commerce/taxPools.js");
const { coverage, publishBanner } = require("../lib/storefront/holidayProgram.js");
const { prepareDeclaration, submitDeclaration, inventory } = require("../lib/compliance/taxConnect.js");
const { createDoguDesk } = require("../lib/pusat/doguResearch.js");
const { assessVoice, authorizeOutbound, escalateIncident } = require("../lib/voice/councilVoice.js");
const { createCouncilChannel } = require("../lib/council/secureMessaging.js");
const { evaluateDevice, lostDeviceProcedure } = require("../lib/security/deviceStandard.js");
const { matrix, completeClaim, STATUSES } = require("../lib/special16/acceptance.js");
const { assertIndependentRuntime } = require("../lib/ai/independentCapabilities.js");
const { startWork, FORBIDDEN_AUTO } = require("../lib/maintenance/cursorSop.js");
const { evaluateEgress } = require("../lib/security/egressPolicy.js");
const { assessBackupLock } = require("../lib/survival/backupLock.js");
const { textileToCatalog, pusatCoordinates } = require("../lib/special16/crossIntegration.js");
const { AB27 } = require("../lib/commerce/ab27Tax.js");
const master = require("../../data/taxonomy/buzzard_master_50_main_categories.json");
const locales = require("../../lib/i18n/supported-locales.json");

describe("master command 4 special-16", () => {
  afterEach(() => {
    resetPools();
  });

  it("covers all 16 rows and never claims complete or live", () => {
    expect(STATUSES).toContain("LIVE_VERIFIED");
    const rows = matrix();
    expect(rows).toHaveLength(16);
    expect(completeClaim()).toBe(false);
    expect(rows.every((row) => row.complete === false && row.live === false)).toBe(true);
    expect(rows.some((row) => row.status === "LIVE_VERIFIED")).toBe(false);
  });

  it("recommends textiles only with consent and no fit guarantee", () => {
    expect(recommend({ occasion: "work" }).line).toBe("workwear");
    expect(recommend({ occasion: "work" }).fitGuarantee).toBe(false);
    expect(demoTryOn({ consentPhoto: false }).code).toBe("CONSENT_REQUIRED");
    expect(demoTryOn({ consentPhoto: true }).liveTryOn).toBe(false);
    expect(retentionPolicy().trainingUse).toBe(false);
    expect(assessTextile().liveVerified).toBe(false);
  });

  it("compares AB27 carriers without live rates", () => {
    expect(carrierMatrix()).toHaveLength(27);
    const quote = compareCarriers({ destination: "FR", weightKg: 2, preferSpeed: true });
    expect(quote.liveCarrier).toBe(false);
    expect(quote.selected).toBeNull();
    expect(quote.commercialEligibility).toBe("BLOCKED");
    expect(quote.shippingCost).toBeNull();
    expect(quoteLane({ destination: "XX" }).blocked).toBe(true);
  });

  it("holds stale and uncertain sanctions", () => {
    expect(listFreshness({}).fresh).toBe(false);
    expect(decideOutcome({ retrievedAt: "2010-01-01T00:00:00Z" }).outcome).toBe("HUMAN_REVIEW");
    expect(decideOutcome({ retrievedAt: new Date().toISOString(), prohibited: true }).outcome).toBe("PROHIBITED");
    expect(screenCompliance({ destination: "FR", dualUse: true }).status).toBe("HUMAN_REVIEW");
  });

  it("does not disclose on unverified official mail", () => {
    const fake = verifyOfficialRequest({
      sender: "it-support@gmail.com",
      body: "verify your password",
      claimedAgency: "Finanzamt",
    });
    expect(fake.disclosed).toBe(false);
    expect(fake.code).toBe("PHISHING_SUSPECTED");
    const binding = verifyOfficialRequest({ bindingOrder: true, officialChannelVerified: false });
    expect(binding.disclosed).toBe(false);
    expect(binding.ipIsNotIdentity).toBe(true);
  });

  it("keeps 26 pools, 25% of net income, no tax pay", () => {
    expect(POOL_COUNTRIES).toHaveLength(26);
    for (const country of POOL_COUNTRIES) {
      const posted = postNetIncome({ country, netIncome: 200 });
      expect(posted.entry.reserve).toBe(50);
    }
    expect(explainReserve(200).appliedTo).toBe("NET_INCOME");
    expect(postExpense({ country: "FR", amount: 10 }).ok).toBe(true);
    expect(payTax({ country: "IT", amount: 1 }).code).toBe("PAYMENT_AUTHORITY_DENIED");
  });

  it("covers 27 holiday countries without auto publish", () => {
    expect(coverage().sourcedCountries).toBe(27);
    expect(publishBanner().code).toBe("NEEDS_APPROVAL");
    expect(AB27).toHaveLength(27);
  });

  it("blocks live tax connect filing", () => {
    expect(inventory()).toHaveLength(27);
    expect(prepareDeclaration({ country: "FR", period: "2026-Q4" }).submitted).toBe(false);
    expect(submitDeclaration().code).toBe("LIVE_INTEGRATION_BLOCKED");
  });

  it("requires sourced Doğu reports before routing", () => {
    const desk = createDoguDesk();
    const req = desk.requestResearch({
      fromId: "textile_ai",
      topic: "categories",
      question: "synthetic textile gap",
    });
    const unverified = desk.complete({ requestId: req.request.id, findings: "guess" });
    expect(unverified.report.verification).toBe("UNVERIFIED");
    const sourced = desk.complete({
      requestId: req.request.id,
      findings: "sourced",
      sources: [{ url: "https://example.test/doc", retrievedAt: "2026-11-05" }],
    });
    expect(sourced.report.verification).toBe("SOURCED");
    const routed = desk.evaluateAndRoute({
      reportId: sourced.report.id,
      evaluatorId: "textile_ai",
      developmentTask: "review textile hub",
    });
    expect(routed.task.status).toBe("OPEN");
  });

  it("does not place live voice calls", () => {
    expect(assessVoice().liveCalls).toBe(false);
    expect(authorizeOutbound({ actorId: "phone_ai", destination: "+49000", purpose: "test" }).placed).toBe(false);
    expect(escalateIncident({ severity: "critical" }).liveCallPlaced).toBe(false);
  });

  it("does not claim HMAC is E2EE", () => {
    const channel = createCouncilChannel();
    const sent = channel.send({ fromId: "pusat", toId: "dogu_bey", body: "synthetic" });
    expect(sent.e2ee).toBe(false);
    expect(channel.verify(sent.message).e2ee).toBe(false);
    expect(channel.e2eeClaim).toBe(false);
  });

  it("keeps device security honest", () => {
    expect(lostDeviceProcedure()).toHaveLength(10);
    expect(evaluateDevice({}).completeClaim).toBe(false);
  });

  it("forbids Claude production runtime", () => {
    expect(assertIndependentRuntime("claude").ok).toBe(false);
    expect(assertIndependentRuntime("anthropic").code).toBe("EXTERNAL_AI_FORBIDDEN");
    expect(evaluateEgress({ destinationUrl: "https://api.anthropic.com/v1", payload: {} }).allowed).toBe(false);
  });

  it("keeps Cursor isolated and non-autonomous", () => {
    expect(startWork({ isolatedBranch: false }).ok).toBe(false);
    expect(FORBIDDEN_AUTO).toContain("push");
    expect(startWork().runtime.alwaysOn).toBe(false);
  });

  it("keeps egress deny and backup lock", () => {
    expect(evaluateEgress({ destinationUrl: "https://api.openai.com/v1", payload: {} }).allowed).toBe(false);
    expect(assessBackupLock().completeClaim).toBe(false);
  });

  it("preserves 50 master categories, 30 locales, Pusat", () => {
    expect(master.main_categories).toBe(50);
    expect(master.categories).toHaveLength(50);
    expect(locales.length).toBe(30);
    expect(pusatCoordinates().ok).toBe(true);
    expect(textileToCatalog({ occasion: "formal" }).catalogHook).toBe("cat-01");
  });
});
