import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const PHASE_EVALUATORS = [
  [6, "../lib/platform/phase6OrderManagement.js", "evaluatePhase6OrderManagement"],
  [7, "../lib/platform/phase7PaymentFinance.js", "evaluatePhase7PaymentFinance"],
  [8, "../lib/platform/phase8Logistics.js", "evaluatePhase8Logistics"],
  [9, "../lib/platform/phase9TextileAi.js", "evaluatePhase9TextileAi"],
  [10, "../lib/platform/phase10Marketplace.js", "evaluatePhase10Marketplace"],
  [11, "../lib/platform/phase11PimSot.js", "evaluatePhase11PimSot"],
  [12, "../lib/platform/phase12CustomerSupport.js", "evaluatePhase12CustomerSupport"],
  [13, "../lib/platform/phase13Pusat.js", "evaluatePhase13Pusat"],
  [14, "../lib/platform/phase14AiSpecialists.js", "evaluatePhase14AiSpecialists"],
  [15, "../lib/platform/phase15Storefront.js", "evaluatePhase15Storefront"],
  [16, "../lib/platform/phase16TaxCompliance.js", "evaluatePhase16TaxCompliance"],
  [17, "../lib/platform/phase17Security.js", "evaluatePhase17Security"],
  [18, "../lib/platform/phase18Marketing.js", "evaluatePhase18Marketing"],
  [19, "../lib/platform/phase19AdminReporting.js", "evaluatePhase19AdminReporting"],
  [20, "../lib/platform/phase20Performance.js", "evaluatePhase20Performance"],
  [21, "../lib/platform/phase21E2eAutomation.js", "evaluatePhase21E2eAutomation"],
];

beforeEach(() => {
  process.env.BUZZARD_SALES_ENABLED = "0";
  process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
  process.env.BUZZARD_STRIPE_ENABLED = "0";
  process.env.BUZZARD_PAYPAL_ENABLED = "0";
  process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  process.env.REAL_SUPPLIER_DRY_RUN = "1";
});

describe("Buzzard ordered master phases 6–21", () => {
  for (const [n, modPath, exportName] of PHASE_EVALUATORS) {
    it(`phase ${n} software scope is 100%`, () => {
      const mod = require(modPath);
      const result = mod[exportName]();
      if (result.percentComplete !== 100) {
        const failed = result.checks.filter((c) => c.ok !== true && c.status !== "BLOCKED_EXTERNAL");
        console.error(`phase ${n} failed`, failed);
      }
      if (n === 7) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.captured).toBe(false);
        expect(result.evidence.captureAccepted).toBe(false);
        expect(result.evidence.coupon).toBe("coupon_tampering");
        expect(result.evidence.refundIssued).toBe(false);
        expect(result.evidence.filingEnabled).toBe(false);
        expect(result.blockedExternal).toEqual(expect.arrayContaining(["PAY_LIVE_CAPTURE", "PAY_LIVE_REFUND", "PAY_TAX_CONNECT_LIVE"]));
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 6) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.tracked).toBe(true);
        expect(result.evidence.cancelled).toBe(true);
        expect(result.evidence.missingCancel).toBe("MISSING_ORDER_ID");
        expect(result.evidence.unknownCancel).toBe("ORDER_NOT_FOUND");
        expect(result.checks.find((check) => check.id === "ORD_CANCEL_RULE").ok).toBe(true);
        expect(result.checks.find((check) => check.id === "ORD_LIVE_SUBMIT").ok).toBe(false);
        expect(result.blockedExternal).toContain("ORD_LIVE_SUBMIT");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        expect(result.percentComplete).toBe(100);
        return;
      }
      if (n === 15) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.hubs).toBe(50);
        expect(result.evidence.locales).toBeGreaterThanOrEqual(30);
        expect(result.evidence.rtl).toBe("rtl");
        expect(result.evidence.checkout).toBe("sales_disabled");
        expect(result.evidence.deTax).toBe(19);
        expect(result.evidence.frTax).toBe(20);
        expect(result.evidence.browserVerified).toBe(true);
        expect(result.evidence.browserLocales).toBe(30);
        expect(result.checks.find((check) => check.id === "SF_BROWSER").ok).toBe(true);
        expect(result.checks.find((check) => check.id === "SF_BROWSER").status).toBe("PASS");
        expect(result.blockedExternal).toContain("SF_LIVE_CDN");
        expect(result.blockedExternal).not.toContain("SF_BROWSER");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 20) {
        expect(result.measurement.search.samples).toBe(20);
        expect(result.measurement.search.p95Ms).toBeLessThan(500);
        expect(result.measurement.quote.samples).toBe(20);
        expect(result.measurement.query.p95Ms).toBeLessThan(100);
        expect(result.measurement.productionVerification).toBe(false);
        expect(result.checks.find((check) => check.id === "PERF_QUEUE").ok).toBe(true);
        expect(result.blockedExternal).toContain("PERF_LOAD_TEST");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 9) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.workwear).toBe("workwear");
        expect(result.evidence.missing).toBe("NO_MEASUREMENTS");
        expect(result.evidence.tryOn).toBe(false);
        expect(result.evidence.image).toBe("BLOCKED");
        expect(result.blockedExternal).toContain("TEX_LIVE_TRYON");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 8) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.carriers.brands).toEqual(["DHL", "DPD", "GLS", "Hermes", "UPS"]);
        expect(result.evidence.carriers.folded).toBe("FAILED");
        expect(result.evidence.country.quote).toBe("UNKNOWN");
        expect(result.evidence.country.returnState).toBe("RETURN_REQUESTED");
        expect(result.blockedExternal).toContain("LOG_LIVE_RATES");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 11) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.active).toBe(false);
        expect(result.evidence.identity.flagOnlyActivates).toBe(false);
        expect(result.evidence.validation.duplicate).toBe("duplicate_ean");
        expect(result.evidence.record.collision).toBe("CONFLICT");
        expect(result.evidence.record.activation).not.toBe("ACTIVATED");
        expect(result.evidence.record.publish).not.toBe("PUBLISHED");
        expect(result.checks.map((check) => check.id)).not.toContain("PIM_SOT_PHASE3");
        expect(result.blockedExternal).toContain("PIM_LIVE_PUBLISH");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 17) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.failed).toEqual([]);
        expect(result.evidence.egress.ai).toBe("EXTERNAL_AI_EGRESS_DENIED");
        expect(result.evidence.egress.payment).toBe("PAYMENT_EGRESS_LOCKED");
        expect(result.evidence.secrets.missingClosed).toBe(true);
        expect(result.evidence.secrets.placeholderRejected).toBe(true);
        expect(result.evidence.secrets.sales).toBe("LOCKED");
        expect(result.evidence.authz.unknown).toBe("UNKNOWN_IDENTITY");
        expect(result.evidence.memory.crossCode).toBe("MEMORY_ISOLATION_DENIED");
        expect(result.evidence.approval.denied).toBe("PERMISSION_DENIED");
        expect(result.evidence.approval.replay).toBe("ALREADY_DECIDED");
        expect(result.evidence.expiry.code).toBe("EXPIRED");
        expect(result.evidence.audit.persisted).toBe(true);
        expect(result.evidence.audit.redacted).toBe(true);
        expect(result.evidence.input.traversal).toBe("PATH_TRAVERSAL");
        expect(result.evidence.input.csrfDenied).toBe(true);
        expect(result.evidence.input.rateLimited).toBe(true);
        expect(result.checks.find((check) => check.id === "SEC_EGRESS").ok).toBe(true);
        expect(result.blockedExternal).toContain("SEC_LIVE_RESTART");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 10) {
        expect(result.evidence.registry.ok).toBe(true);
        expect(result.evidence.registry.count).toBe(10);
        expect(result.evidence.registry.anyLive).toBe(false);
        expect(result.evidence.account.ok).toBe(true);
        expect(result.evidence.listing.ok).toBe(true);
        expect(result.evidence.listing.invalidAccepted).toBe(false);
        expect(result.evidence.listing.publishCode).toBe("LIVE_CONNECTION_BLOCKED");
        expect(result.evidence.price.ok).toBe(true);
        expect(result.evidence.price.amazonFee).toBe(15);
        expect(result.evidence.price.ebayFee).toBe(12);
        expect(result.evidence.price.deRate).toBe(19);
        expect(result.evidence.price.frRate).toBe(20);
        expect(result.evidence.stock.ok).toBe(true);
        expect(result.evidence.stock.unavailable).toBe(true);
        expect(result.evidence.orders.ok).toBe(true);
        expect(result.evidence.orders.count).toBe(1);
        expect(result.evidence.rejection.ok).toBe(true);
        expect(result.evidence.retry.ok).toBe(true);
        expect(result.evidence.retry.attempts).toBe(2);
        expect(result.evidence.locale.ok).toBe(true);
        expect(result.evidence.credentials.liveSuccess).toBe(false);
        expect(result.evidence.credentials.armedCode).toBe("HUMAN_APPROVAL_REQUIRED");
        expect(result.checks.map((check) => check.id)).not.toContain("MKT_PREFLIGHT");
        expect(result.checks.map((check) => check.id)).not.toContain("MKT_VALIDATION");
        expect(result.blockedExternal).toContain("MKT_LIVE_PUBLISH");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 21) {
        expect(result.evidence.workflow.ok).toBe(true);
        expect(result.evidence.workflow.missing).toEqual([]);
        expect(result.evidence.payment.captured).toBe(false);
        expect(result.evidence.payment.moneyMoved).toBe(false);
        expect(result.evidence.refund.issued).toBe(false);
        expect(result.evidence.notification.sent).toBe(false);
        expect(result.evidence.automation.executed).toBe(true);
        expect(result.evidence.automation.recovered).toBe(true);
        expect(result.evidence.automation.persisted).toBe(true);
        expect(result.evidence.automation.denied).toBe(true);
        expect(result.evidence.cross.ok).toBe(true);
        expect(result.checks.find((check) => check.id === "E2E_ORDER_AUTO")).toBeUndefined();
        expect(result.blockedExternal).toContain("E2E_PRODUCTION_RUN");
        return;
      }
      if (n === 12) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.orderIntent).toBe("order_status");
        expect(result.evidence.wrongIntent).not.toBe("order_status");
        expect(result.evidence.deskSent).toBe(false);
        expect(result.evidence.missingOrder).toBe("UNVERIFIED_ORDER");
        expect(result.evidence.emptyDesk).toBe("EMPTY_INPUT");
        expect(result.evidence.inboundIntent).toBe("return_status");
        expect(result.evidence.emptyInbound).toBe("EMPTY_INPUT");
        expect(result.blockedExternal).toContain("CS_LIVE_INBOX");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 13) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.seed).toBe(17);
        expect(result.evidence.missingSinanFails).toBe(true);
        expect(result.evidence.missingPusatFails).toBe(true);
        expect(result.evidence.scoreLive).toBe(false);
        expect(result.evidence.scoreClaim).toBe(false);
        expect(result.blockedExternal).toContain("PUSAT_LIVE_VOICE");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 14) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.count).toBe(17);
        expect(result.evidence.refundOk).toBe(false);
        expect(result.evidence.refundCode).toBe("HUMAN_GATE_REQUIRED");
        expect(result.evidence.live).toBe(false);
        expect(result.blockedExternal).toContain("SPEC_LIVE_COUNCIL");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 16) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.listed).toBe("LISTED_PARTY");
        expect(result.evidence.unknown).toBe("HUMAN_REVIEW");
        expect(result.evidence.elster).toBe("ELSTER_BLOCKED");
        expect(result.evidence.elsterFiled).toBe(false);
        expect(result.evidence.elsterLive).toBe(false);
        expect(result.blockedExternal).toContain("TAX_CONNECT_LIVE");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 18) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.publishAllowed).toBe(false);
        expect(result.evidence.publishCode).toBe("PUBLISH_BLOCKED");
        expect(result.evidence.published).toBe(false);
        expect(result.evidence.unknown).toBe("UNKNOWN_IDENTITY");
        expect(result.blockedExternal).toContain("MKT_LIVE_ADS");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      if (n === 19) {
        expect(result.evidence.ok).toBe(true);
        expect(result.evidence.salesEnabled).toBe(false);
        expect(result.evidence.live).toBe(false);
        expect(result.evidence.channels).toBe(10);
        expect(result.evidence.filingLive).toBe(false);
        expect(result.evidence.hubs).toBe(50);
        expect(result.blockedExternal).toContain("ADM_LIVE_BI");
        expect(result.completeClaim).toBe(false);
        expect(result.live).toBe(false);
        return;
      }
      expect(result.percentComplete).toBe(100);
      expect(result.ok).toBe(true);
    });
  }
});