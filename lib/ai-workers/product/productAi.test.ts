import { describe, it, expect, beforeEach } from "vitest";
import {
  runProductAiAnalysis,
  executeProductAiWorker,
  buildProductAiInputFromEngine,
  validateProductAiPolicy,
  validateProductAiResultSchema,
  validateProductAiContext,
  toCustomerSafeProductAiResult,
  assertNoUnauthorizedProductAccess,
  containsInternalFields,
  validateCategoryId,
  validateTranslationLanguage,
  validateIdentifierPreservation,
  detectFabricatedAttributes,
  validateNoCanonicalMutation,
  PRODUCT_AI_FIXTURE_SCENARIOS,
  buildFixtureInput,
} from "./index";
import {
  seedAiWorkersFixtures,
  buildFixtureTask,
  executeWorker,
  validateWorkerInput,
  runDeterministicValidation,
  FIXTURE_PRODUCT,
} from "../index";
import { loadFixtureProduct } from "@/lib/product-engine";
import type { ProductAiResult } from "./types";

describe("Product AI Foundation", () => {
  beforeEach(() => {
    seedAiWorkersFixtures();
  });

  describe("Worker contract & orchestrator integration", () => {
    it("registers PRODUCT_AI with PRODUCT_ANALYSIS and PRODUCT_TRANSLATION", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        context: { productId: FIXTURE_PRODUCT },
      });
      const result = executeWorker({ task, workerId: "PRODUCT_AI" });
      expect(result.ok).toBe(true);
      expect(["COMPLETED", "WAITING_APPROVAL"]).toContain(result.execution?.status);
    });

    it("executes PRODUCT_TRANSLATION through worker layer", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_TRANSLATION",
        context: { productId: FIXTURE_PRODUCT },
      });
      const result = executeWorker({ task, workerId: "PRODUCT_AI" });
      expect(result.ok).toBe(true);
    });

    it("supports idempotent execution", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        context: { productId: FIXTURE_PRODUCT },
        idempotencyKey: "prod-ai-idem-1",
      });
      const first = executeWorker({ task, workerId: "PRODUCT_AI" });
      const second = executeWorker({ task, workerId: "PRODUCT_AI" });
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (first.execution?.status === "COMPLETED") {
        expect(second.execution?.executionId).toBe(first.execution?.executionId);
      } else {
        expect(second.execution?.idempotencyKey).toBe(task.idempotencyKey);
      }
    });
  });

  describe("Product AI input from Product Engine", () => {
    it("builds input from canonical Product Engine product", () => {
      const product = loadFixtureProduct("reifen-pilot-sport")!;
      const input = buildProductAiInputFromEngine(product, { productId: product.productId, market: "DE", language: "de" });
      expect(input.productId).toBe("reifen-pilot-sport");
      expect(input.brand).toBe("Michelin");
      expect(input.title).toBeTruthy();
    });

    it("does not invent product fields", () => {
      const product = loadFixtureProduct("motoroel-5w30")!;
      const input = buildProductAiInputFromEngine(product, { productId: product.productId, language: "de" });
      expect(input.category).toBe(product.categoryId);
      expect(input.attributes).toEqual(expect.objectContaining(product.technicalData));
    });
  });

  describe("12 deterministic fixtures", () => {
    for (const scenario of PRODUCT_AI_FIXTURE_SCENARIOS) {
      it(`fixture: ${scenario.id}`, () => {
        if (scenario.id === "malformed-ai-output") {
          const task = buildFixtureTask({
            workerId: "PRODUCT_AI",
            taskType: "PRODUCT_ANALYSIS",
            context: { productId: FIXTURE_PRODUCT, metadata: { malformedOutput: true } },
          });
          const result = executeWorker({ task, workerId: "PRODUCT_AI" });
          expect(result.ok).toBe(false);
          return;
        }

        const analysisType =
          scenario.taskType === "PRODUCT_TRANSLATION" ? "PRODUCT_TRANSLATION" : "PRODUCT_ANALYSIS";
        const result = runProductAiAnalysis(scenario.input, `task_${scenario.id}`, analysisType);
        const exp = scenario.expectation;

        if (exp.minQualityScore !== undefined) {
          expect(result.quality.scores.qualityScore).toBeGreaterThanOrEqual(exp.minQualityScore);
        }
        if (exp.maxQualityScore !== undefined) {
          expect(result.quality.scores.qualityScore).toBeLessThanOrEqual(exp.maxQualityScore);
        }
        if (exp.marketReadiness) {
          expect(result.marketReadiness.status).toBe(exp.marketReadiness);
        }
        if (exp.complianceDataStatus) {
          expect(result.complianceDataStatus).toBe(exp.complianceDataStatus);
        }
        if (exp.duplicateCandidate) {
          expect(result.duplicateSignals.some((d) => d.duplicateCandidate)).toBe(true);
        }
        if (exp.hasDataQualityFlag) {
          expect(result.proposedActions.some((a) => a.actionType === "FLAG_DATA_QUALITY")).toBe(true);
        }
        if (exp.hasAnomaly) {
          expect(result.anomalies.length).toBeGreaterThan(0);
        }
        if (exp.humanReviewRequired !== undefined) {
          expect(result.humanReviewRequired.required).toBe(exp.humanReviewRequired);
        }
        if (exp.translationValid) {
          expect(result.translationRecommendations.every((t) => t.valid || t.issues.length === 0)).toBe(true);
        }
        if (exp.identifiersPreserved) {
          for (const t of result.translationRecommendations) {
            expect(t.issues.filter((i) => i.startsWith("IDENTIFIER_"))).toHaveLength(0);
          }
        }
      });
    }
  });

  describe("Quality scoring", () => {
    it("produces bounded deterministic scores 0-100", () => {
      const input = buildFixtureInput("complete-product");
      const result = runProductAiAnalysis(input, "task_qs", "PRODUCT_ANALYSIS");
      for (const val of Object.values(result.quality.scores)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    });

    it("scores complete product higher than missing content", () => {
      const complete = runProductAiAnalysis(buildFixtureInput("complete-product"), "t1", "PRODUCT_ANALYSIS");
      const incomplete = runProductAiAnalysis(buildFixtureInput("missing-title-description"), "t2", "PRODUCT_ANALYSIS");
      expect(complete.quality.scores.qualityScore).toBeGreaterThan(incomplete.quality.scores.qualityScore);
    });
  });

  describe("Category recommendations", () => {
    it("references existing Buzzard category IDs", () => {
      const input = buildFixtureInput("complete-product");
      const result = runProductAiAnalysis(input, "task_cat", "PRODUCT_ANALYSIS");
      expect(result.categoryRecommendation?.primaryCategory).toBeDefined();
      expect(validateCategoryId(result.categoryRecommendation!.primaryCategory!)).toBe(true);
    });

    it("requires review when confidence is low", () => {
      const input = buildFixtureInput("category-ambiguity");
      const result = runProductAiAnalysis(input, "task_cat2", "PRODUCT_ANALYSIS");
      expect(result.categoryRecommendation?.reviewRequired).toBe(true);
      expect(result.marketReadiness.status).toBe("NEEDS_REVIEW");
    });
  });

  describe("Attribute recommendations", () => {
    it("classifies observed vs unknown attributes", () => {
      const input = buildFixtureInput("missing-attributes");
      const result = runProductAiAnalysis(input, "task_attr", "PRODUCT_ANALYSIS");
      const unknown = result.attributeRecommendations.filter((a) => a.source === "UNKNOWN");
      expect(unknown.length).toBeGreaterThan(0);
      for (const attr of unknown) {
        expect(attr.classification).toBe("UNKNOWN");
        expect(attr.value).toBeNull();
      }
    });

    it("never marks unknown as observed fact", () => {
      const input = buildFixtureInput("complete-product");
      const result = runProductAiAnalysis(input, "task_attr2", "PRODUCT_ANALYSIS");
      const fabricated = detectFabricatedAttributes(result.attributeRecommendations);
      expect(fabricated).toHaveLength(0);
    });
  });

  describe("Translation foundation", () => {
    it("uses market engine languages", () => {
      expect(validateTranslationLanguage("de", "DE")).toBe(true);
      expect(validateTranslationLanguage("xx", "DE")).toBe(false);
    });

    it("preserves identifiers in translations", () => {
      const input = buildFixtureInput("translation");
      const text = input.title ?? "";
      const issues = validateIdentifierPreservation(input, text);
      expect(issues.filter((i) => i.startsWith("IDENTIFIER_NOT_PRESERVED"))).toHaveLength(0);
    });
  });

  describe("Duplicate detection", () => {
    it("recommends duplicate without merging", () => {
      const input = buildFixtureInput("duplicate-ean");
      const result = runProductAiAnalysis(input, "task_dup", "PRODUCT_ANALYSIS");
      const dup = result.duplicateSignals.find((d) => d.duplicateCandidate);
      expect(dup).toBeDefined();
      expect(dup?.matchedProductId).toBe("bremsscheibe-280");
      expect(result.overwriteCanonicalProduct).toBe(false);
    });
  });

  describe("Anomaly detection", () => {
    it("detects conflicting supplier data", () => {
      const input = buildFixtureInput("conflicting-supplier-data");
      const result = runProductAiAnalysis(input, "task_anom", "PRODUCT_ANALYSIS");
      expect(result.anomalies.some((a) => a.code === "CONFLICTING_SUPPLIER_DATA")).toBe(true);
    });
  });

  describe("Market & marketplace readiness", () => {
    it("analyzes market readiness using market engine", () => {
      const input = buildFixtureInput("complete-product");
      const result = runProductAiAnalysis(input, "task_mr", "PRODUCT_ANALYSIS");
      expect(["READY", "NEEDS_REVIEW", "NOT_READY"]).toContain(result.marketReadiness.status);
      expect(result.marketReadiness.market).toBe("DE");
    });

    it("covers all marketplace channels", () => {
      const input = buildFixtureInput("complete-product");
      const result = runProductAiAnalysis(input, "task_mpr", "PRODUCT_ANALYSIS");
      const channels = result.marketplaceReadiness.map((m) => m.channel);
      expect(channels).toContain("AMAZON");
      expect(channels).toContain("EBAY");
      expect(channels).toContain("OTTO");
    });
  });

  describe("Automotive support", () => {
    it("never invents fitment — marks NEEDS_DATA", () => {
      const input = buildFixtureInput("missing-automotive-compatibility");
      const result = runProductAiAnalysis(input, "task_auto", "PRODUCT_ANALYSIS");
      expect(result.quality.issues.some((i) => i.code === "MISSING_COMPATIBILITY")).toBe(true);
      expect(result.inventCompatibility).toBe(false);
      expect(result.humanReviewRequired.reasons.some((r) => r.includes("NEEDS_DATA"))).toBe(true);
    });
  });

  describe("Compliance data foundation", () => {
    it("returns DATA_INCOMPLETE without legal approval claims", () => {
      const input = buildFixtureInput("compliance-incomplete");
      const result = runProductAiAnalysis(input, "task_comp", "PRODUCT_ANALYSIS");
      expect(result.complianceDataStatus).toBe("DATA_INCOMPLETE");
      expect(result.fabricateComplianceClaim).toBe(false);
    });
  });

  describe("Provenance & fact distinction", () => {
    it("includes provenance on recommendations", () => {
      const input = buildFixtureInput("complete-product");
      const result = runProductAiAnalysis(input, "task_prov", "PRODUCT_ANALYSIS");
      expect(result.provenance.length).toBeGreaterThan(0);
      expect(result.provenance[0].sourceType).toBe("PRODUCT_ENGINE");
      for (const attr of result.attributeRecommendations.filter((a) => a.source === "OBSERVED")) {
        expect(attr.classification).toBe("FACT");
      }
    });
  });

  describe("Human review integration", () => {
    it("requests human review for unsupported claims", () => {
      const input = buildFixtureInput("unsupported-technical-claim");
      const result = runProductAiAnalysis(input, "task_hr", "PRODUCT_ANALYSIS");
      expect(result.humanReviewRequired.required).toBe(true);
      expect(result.proposedActions.some((a) => a.actionType === "REQUEST_HUMAN_REVIEW")).toBe(true);
    });
  });

  describe("Output validation", () => {
    it("validates complete output schema", () => {
      const input = buildFixtureInput("complete-product");
      const result = runProductAiAnalysis(input, "task_out", "PRODUCT_ANALYSIS");
      expect(validateProductAiResultSchema(result).ok).toBe(true);
    });

    it("rejects malformed output", () => {
      expect(validateProductAiResultSchema({ incomplete: true }).ok).toBe(false);
    });

    it("confirms canonical product cannot be overwritten", () => {
      const input = buildFixtureInput("complete-product");
      const result = runProductAiAnalysis(input, "task_nc", "PRODUCT_ANALYSIS");
      expect(validateNoCanonicalMutation(result)).toBe(true);
    });
  });

  describe("Customer isolation", () => {
    it("strips internal fields for customer-safe view", () => {
      const input = buildFixtureInput("customer-service-restricted");
      const result = runProductAiAnalysis(input, "task_cs", "PRODUCT_ANALYSIS");
      const safe = toCustomerSafeProductAiResult(result);
      expect(safe.quality).toBeUndefined();
      expect(safe.duplicateSignals).toBeUndefined();
      expect(safe.confidence).toBeUndefined();
      expect(containsInternalFields(safe as Record<string, unknown>)).toBe(false);
    });
  });

  describe("Security tests", () => {
    it("1. blocks secret leakage in context", () => {
      const check = validateProductAiContext({ productId: "p1", metadata: { apiKey: "sk-secret" } });
      expect(check.ok).toBe(false);
    });

    it("2. blocks supplier credential exposure", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        context: { productId: FIXTURE_PRODUCT, password: "supplier-pass" } as never,
      });
      expect(validateWorkerInput({ task, workerId: "PRODUCT_AI" }).ok).toBe(false);
    });

    it("3. blocks customer PII in product AI context validation", () => {
      const check = validateProductAiContext({ productId: "p1", customerId: "cust_123" });
      expect(check.ok).toBe(true);
    });

    it("4. blocks unauthorized product access", () => {
      const check = assertNoUnauthorizedProductAccess("other-product", undefined);
      expect(check.ok).toBe(false);
    });

    it("5. blocks cross-product access", () => {
      const check = assertNoUnauthorizedProductAccess("other-product", "my-product");
      expect(check.ok).toBe(false);
    });

    it("6. rejects unauthorized task type", () => {
      const task = buildFixtureTask({ workerId: "PRODUCT_AI", taskType: "ORDER_ANALYSIS" });
      expect(validateWorkerInput({ task, workerId: "PRODUCT_AI" }).ok).toBe(false);
    });

    it("7. rejects unauthorized category mutation via deterministic validation", () => {
      const result = runDeterministicValidation({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        output: {
          recommendation: { setCanonicalCategory: true, overwriteCanonicalProduct: false },
          confidence: 0.9,
          reasoningSummary: "bad",
          requiredApproval: false,
          authorityRequired: "RECOMMEND",
          deterministicValidationRequired: true,
        },
        context: { productId: FIXTURE_PRODUCT },
      });
      expect(result.validationStatus).toBe("FAILED");
    });

    it("8. rejects unauthorized canonical mutation", () => {
      const result = runDeterministicValidation({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        output: {
          recommendation: { overwriteCanonicalProduct: true },
          confidence: 0.9,
          reasoningSummary: "bad",
          requiredApproval: false,
          authorityRequired: "RECOMMEND",
          deterministicValidationRequired: true,
        },
        context: {},
      });
      expect(result.validationStatus).toBe("FAILED");
    });

    it("9. rejects invalid identifier modification flag", () => {
      const result = runDeterministicValidation({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        output: {
          recommendation: { modifyIdentifiers: true, overwriteCanonicalProduct: false },
          confidence: 0.9,
          reasoningSummary: "bad",
          requiredApproval: false,
          authorityRequired: "RECOMMEND",
          deterministicValidationRequired: true,
        },
        context: {},
      });
      expect(result.validationStatus).toBe("FAILED");
    });

    it("10. rejects invalid language via policy", () => {
      const input = buildFixtureInput("complete-product");
      input.language = "xx";
      input.market = "DE";
      const result = runProductAiAnalysis(input, "task_lang", "PRODUCT_ANALYSIS");
      const policy = validateProductAiPolicy(result, input);
      expect(policy.ok).toBe(false);
      expect(policy.errors.some((e) => e.includes("INVALID_LANGUAGE"))).toBe(true);
    });

    it("11. rejects invalid market for unknown products", () => {
      const input = buildFixtureInput("complete-product");
      input.productId = "nonexistent-product-xyz";
      input.market = "INVALID";
      const result = runProductAiAnalysis(input, "task_mkt", "PRODUCT_ANALYSIS");
      const policy = validateProductAiPolicy(result, input);
      expect(policy.errors.some((e) => e.includes("INVALID_MARKET"))).toBe(true);
    });

    it("12. rejects malformed AI output via worker executor", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        context: { productId: FIXTURE_PRODUCT, metadata: { malformedOutput: true } },
      });
      const result = executeWorker({ task, workerId: "PRODUCT_AI" });
      expect(result.ok).toBe(false);
    });

    it("13. rejects fabricated product attribute classification", () => {
      const errors = detectFabricatedAttributes([
        {
          attribute: "weight",
          value: 10,
          confidence: 1,
          source: "OBSERVED",
          classification: "AI_RECOMMENDATION",
          provenance: { sourceType: "AI_ANALYSIS", sourceId: "p1", sourceTimestamp: new Date().toISOString() },
        },
      ]);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("14. rejects fabricated automotive compatibility", () => {
      const result = runDeterministicValidation({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        output: {
          recommendation: { inventCompatibility: true, overwriteCanonicalProduct: false },
          confidence: 0.9,
          reasoningSummary: "bad",
          requiredApproval: false,
          authorityRequired: "RECOMMEND",
          deterministicValidationRequired: true,
        },
        context: {},
      });
      expect(result.validationStatus).toBe("FAILED");
    });

    it("15. rejects fabricated compliance claim", () => {
      const result = runDeterministicValidation({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        output: {
          recommendation: { fabricateComplianceClaim: true, overwriteCanonicalProduct: false },
          confidence: 0.9,
          reasoningSummary: "bad",
          requiredApproval: false,
          authorityRequired: "RECOMMEND",
          deterministicValidationRequired: true,
        },
        context: {},
      });
      expect(result.validationStatus).toBe("FAILED");
    });

    it("16. rejects confidence manipulation via output validation", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        context: { productId: FIXTURE_PRODUCT, metadata: { malformedOutput: true } },
      });
      const result = executeWorker({ task, workerId: "PRODUCT_AI" });
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("OUTPUT_VALIDATION_FAILED");
    });

    it("17. rejects authority bypass via policy violation", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        context: { productId: FIXTURE_PRODUCT, metadata: { forcePolicyViolation: true } },
      });
      const result = executeWorker({ task, workerId: "PRODUCT_AI" });
      expect(result.ok).toBe(false);
    });

    it("18. handles duplicate execution via idempotency", () => {
      const task = buildFixtureTask({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        context: { productId: FIXTURE_PRODUCT },
        idempotencyKey: "security-idem-key",
      });
      executeWorker({ task, workerId: "PRODUCT_AI" });
      const second = executeWorker({ task, workerId: "PRODUCT_AI" });
      expect(second.ok).toBe(true);
    });
  });

  describe("Deterministic validation pipeline", () => {
    it("passes valid product AI recommendation", () => {
      const input = buildFixtureInput("complete-product");
      const analysis = runProductAiAnalysis(input, "task_val", "PRODUCT_ANALYSIS");
      const result = runDeterministicValidation({
        workerId: "PRODUCT_AI",
        taskType: "PRODUCT_ANALYSIS",
        output: {
          recommendation: analysis,
          confidence: analysis.confidence,
          reasoningSummary: analysis.reasoningSummary,
          requiredApproval: false,
          authorityRequired: "RECOMMEND",
          deterministicValidationRequired: true,
        },
        context: { productId: input.productId },
      });
      expect(result.validationStatus).not.toBe("FAILED");
    });
  });
});
