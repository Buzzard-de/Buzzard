import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  sizeAdvice,
  deletePersonalData,
  imageModelAdapter,
  videoLicenseAdapter,
  recordMeasurement,
} = require("../lib/storefront/textileProgram.js");
const { inventory, dryRun, NETWORKS, NATIONAL_POST } = require("../lib/commerce/carrierAdapters.js");
const { compareCarriers } = require("../lib/commerce/ab27Logistics.js");
const { classifyGoods, rescreen, SOURCE_ADAPTERS, RESCREEN_STAGES } = require("../lib/commerce/sanctionsScreen.js");
const { verifyOfficialRequest, nationalProcedure, retentionForSignals } = require("../lib/privacy/authorityGate.js");
const { periodReport, payTax, postNetIncome, resetPools, POOL_COUNTRIES } = require("../lib/commerce/taxPools.js");
const { previewPack, publishBanner } = require("../lib/storefront/holidayProgram.js");
const { submitDeclaration } = require("../lib/compliance/taxConnect.js");
const { createDoguDesk } = require("../lib/pusat/doguResearch.js");
const { authorizeOutbound, providerAdapters } = require("../lib/voice/councilVoice.js");
const { assessMessaging } = require("../lib/council/e2eeAssessment.js");
const { coverage } = require("../lib/survival/backupCoverage.js");
const { healthPayload, GATE_STATUSES, completeClaim } = require("../lib/special16/acceptance.js");
const { scan } = require("../lib/security/claudeScan.js");
const { startWork } = require("../lib/maintenance/cursorSop.js");
const { AB27 } = require("../lib/commerce/ab27Tax.js");

describe("master command 4 continuation", () => {
  afterEach(() => {
    resetPools();
  });

  it("keeps textile demo distinct from a live model", () => {
    expect(recordMeasurement({ consentMeasurements: false, values: { chest: 90 } }).stored).toBe(false);
    expect(sizeAdvice({ chest: 90 }).fitGuarantee).toBe(false);
    expect(sizeAdvice({ chest: 90 }).uncertainty).toBe("HIGH");
    expect(deletePersonalData().trainingUse).toBe(false);
    expect(imageModelAdapter().live).toBe(false);
    expect(videoLicenseAdapter().licensed).toBe(false);
  });

  it("inventories 27 countries x networks and blocks live labels", () => {
    expect(Object.keys(NATIONAL_POST)).toHaveLength(27);
    expect(inventory().length).toBe(AB27.length * (NETWORKS.length + 1));
    expect(inventory().every((row) => row.live === false && row.status === "BLOCKED")).toBe(true);
    expect(dryRun({ destination: "FR", action: "label" }).code).toBe("LIVE_SHIPMENT_BLOCKED");
    expect(compareCarriers({ destination: "DE" }).sandbox).toBe(false);
    expect(compareCarriers({ destination: "DE" }).mock).toBe(true);
  });

  it("refuses auto-approve and incomplete binding classification", () => {
    expect(SOURCE_ADAPTERS.every((s) => s.live === false)).toBe(true);
    expect(RESCREEN_STAGES).toHaveLength(6);
    expect(classifyGoods({ description: "x" }).binding).toBe(false);
    expect(classifyGoods({ description: "x" }).incomplete).toBe(true);
    const held = rescreen({ destination: "FR", dualUse: true, autoApprove: true, stage: "BEFORE_SHIPMENT" });
    expect(held.autoApproved).toBe(false);
    expect(held.outcome).toBe("HUMAN_REVIEW");
    expect(held.stage).toBe("BEFORE_SHIPMENT");
  });

  it("quarantines unverified requests and does not require DE approval for every EU request", () => {
    const mail = verifyOfficialRequest({ sender: "office@example.com", body: "please send data" });
    expect(mail.disclosed).toBe(false);
    expect(mail.steps).toHaveLength(9);
    expect(nationalProcedure({ originCountry: "DE", requestCountry: "FR" }).germanyFederalApprovalAlwaysRequired).toBe(
      false
    );
    expect(retentionForSignals().asnIsIdentity).toBe(false);
  });

  it("reports 26-country periods without payment authority", () => {
    expect(POOL_COUNTRIES).toHaveLength(26);
    postNetIncome({ country: "ES", netIncome: 400 });
    const report = periodReport({ country: "ES" });
    expect(report.reserve).toBe(100);
    expect(report.liveBooks).toBe(false);
    expect(payTax({ country: "ES", amount: 10 }).code).toBe("PAYMENT_AUTHORITY_DENIED");
    expect(periodReport({ country: "DE" }).code).toBe("DE_SEPARATE");
  });

  it("previews national days without production publish", () => {
    const pack = previewPack({ country: "DE", today: "2026-10-03" });
    expect(pack.hit.name).toContain("Einheit");
    expect(pack.productionPublish).toBe(false);
    expect(publishBanner().code).toBe("NEEDS_APPROVAL");
  });

  it("blocks tax filing and live voice", () => {
    expect(submitDeclaration().code).toBe("LIVE_INTEGRATION_BLOCKED");
    expect(providerAdapters().some((a) => a.id === "twilio" && a.status === "BLOCKED")).toBe(true);
    expect(authorizeOutbound({ actorId: "phone_ai", destination: "+49", purpose: "x", userAuthorized: true }).placed).toBe(
      false
    );
  });

  it("does not let Doğu authorize purchase", () => {
    const desk = createDoguDesk();
    const req = desk.requestResearch({ fromId: "textile_ai", topic: "markets", question: "synthetic" });
    const done = desk.complete({
      requestId: req.request.id,
      findings: "sourced",
      sources: [{ url: "https://example.test", retrievedAt: "2026-11-05" }],
    });
    const routed = desk.evaluateAndRoute({
      reportId: done.report.id,
      evaluatorId: "textile_ai",
      developmentTask: "review only",
    });
    expect(routed.task.purchaseAuthorized).toBe(false);
    expect(routed.task.paymentAuthorized).toBe(false);
  });

  it("keeps HMAC out of E2EE claims and backup lock honest", () => {
    expect(assessMessaging().hmacIsE2ee).toBe(false);
    expect(assessMessaging({ boxUsed: true }).e2eeClaimAllowed).toBe(false);
    expect(assessMessaging().confidentialUseApproved).toBe(false);
    const backup = coverage();
    expect(backup.wormIsChmod444).toBe(false);
    expect(backup.productionRestore).toBe(false);
    expect(backup.rpoRto.measured).toBe(false);
  });

  it("health endpoint does not report live success", () => {
    expect(GATE_STATUSES).toContain("HUMAN_APPROVAL_REQUIRED");
    const health = healthPayload();
    expect(health.success).toBe(false);
    expect(health.liveVerifiedCount).toBe(0);
    expect(completeClaim()).toBe(false);
    expect(health.requirements).toHaveLength(16);
    expect(health.requirements.every((r) => r.status !== "LIVE_VERIFIED" && r.status !== "SANDBOX_VERIFIED")).toBe(true);
    expect(scan().integrated).toBe(false);
    expect(scan().egress.every((row) => row.allowed === false)).toBe(true);
    expect(startWork().runtime.alwaysOn).toBe(false);
  });
});
