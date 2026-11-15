/**
 * Persistent software queue for the EU-27 fiat engine.
 * External and human-gated work stays out of the software-completion ratio.
 * This process does not run when Cursor is closed.
 */
const fs = require("fs");
const { POLICY, decideAsset } = require("./fiatPolicy");
const inventory = require("./inventory");
const { quoteRate } = require("./fx");
const { reviewPayment } = require("./fraud");
const { evidenceOf } = require("./evidence");
const { classifySubject } = require("./cardInstrument");
const { REMAINING } = require("../../buzzardNative/platform/humanRemaining");

const BLOCKED_TASKS = Object.freeze([
  {
    id: "EU27_REGISTRY_IMPORT",
    priority: 1,
    dependencies: Object.freeze([]),
    status: "EXTERNAL_DEPENDENCY_BLOCKED",
    blocker: "EXTERNAL_DEPENDENCY_BLOCKED",
    tests: Object.freeze([]),
    evidence: null,
    next: "LIVE_BANK_CONNECTORS",
    reason: "EBA bulk registers and the remaining national registers were not available as structured current lists.",
  },
  {
    id: "LIVE_BANK_CONNECTORS",
    priority: 2,
    dependencies: Object.freeze(["EU27_REGISTRY_IMPORT"]),
    status: "HUMAN_APPROVAL_REQUIRED",
    blocker: "HUMAN_APPROVAL_REQUIRED",
    tests: Object.freeze([]),
    evidence: null,
    next: null,
    reason: "A live connector needs a reviewed API document, a contract, and an approval that this software does not grant.",
  },
]);

function softwareTasks() {
  return [
    {
      id: "FIAT_POLICY_SEPARATION",
      priority: 10,
      dependencies: [],
      tests: ["server/__tests__/eu27FiatEngine.test.mjs"],
      run() {
        if (POLICY.FIAT_ONLY !== true || POLICY.CRYPTO_PAYMENT_ALLOWED !== false || POLICY.CBDC_PAYMENT_ALLOWED !== false) {
          throw new Error("policy flags drifted");
        }
        const cbdc = decideAsset({ currency: "EUR", assetType: "cbdc" });
        const crypto = decideAsset({ currency: "BTC", assetType: "fiat" });
        const unknown = decideAsset({ currency: "XYZ", assetType: "fiat" });
        if (cbdc.code !== "REJECTED_CBDC_POLICY" || crypto.code !== "REJECTED_CRYPTO_POLICY" || unknown.code !== "REJECTED_UNKNOWN_ASSET") {
          throw new Error("asset decisions drifted");
        }
        return "FIAT_ONLY codes separated";
      },
    },
    {
      id: "FX_WITHOUT_INVENTED_RATE",
      priority: 20,
      dependencies: ["FIAT_POLICY_SEPARATION"],
      tests: ["server/__tests__/eu27FiatEngine.test.mjs"],
      run() {
        const same = quoteRate({ base: "EUR", quote: "EUR" });
        const cross = quoteRate({ base: "EUR", quote: "SEK" });
        if (same.code !== "IDENTITY_RATE" || same.invented !== false || cross.code !== "FX_RATE_UNKNOWN" || cross.rate !== null) {
          throw new Error("fx quote drifted");
        }
        return "identity rate only";
      },
    },
    {
      id: "FRAUD_REVIEW_BOUNDARY",
      priority: 30,
      dependencies: ["FIAT_POLICY_SEPARATION"],
      tests: ["server/__tests__/eu27FiatEngine.test.mjs"],
      run() {
        const review = reviewPayment({ currency: "EUR", amount: 1, country: "DE" });
        const rejected = reviewPayment({ currency: "ETH", amount: 1, country: "DE" });
        if (!review.reviewed || review.moneyMoved !== false || rejected.code !== "REJECTED_CRYPTO_POLICY") {
          throw new Error("fraud boundary drifted");
        }
        return review.code;
      },
    },
    {
      id: "REGISTRY_COMPLETENESS_GATE",
      priority: 40,
      dependencies: [],
      tests: ["server/__tests__/eu27FiatEngine.test.mjs"],
      run() {
        const status = inventory.registryComplete();
        if (status.complete || status.code === "EU27_REGISTRY_COMPLETE") throw new Error("registry marked complete");
        if (status.countries.length !== 27) throw new Error("country coverage missing");
        return status.code;
      },
    },
    {
      id: "EVIDENCE_DIMENSIONS",
      priority: 50,
      dependencies: ["REGISTRY_COMPLETENESS_GATE"],
      tests: ["server/__tests__/eu27FiatEngine.test.mjs"],
      run() {
        const row = inventory.entitiesByCountry("SE")[0];
        const flags = evidenceOf(row);
        if (!flags.REGISTRY_VERIFIED || flags.OWNERSHIP_VERIFIED || flags.LIVE_VERIFIED || flags.SEPA_MEMBERSHIP_VERIFIED) {
          throw new Error("evidence dimensions drifted");
        }
        if (inventory.registryComplete().complete) throw new Error("registry marked complete");
        return flags.basis;
      },
    },
    {
      id: "CARD_DATA_NOT_STORED",
      priority: 60,
      dependencies: ["FIAT_POLICY_SEPARATION"],
      tests: ["server/__tests__/eu27FiatEngine.test.mjs"],
      run() {
        const pan = classifySubject("4111111111111111");
        const token = classifySubject("subject-token");
        const wallet = classifySubject("0x52908400098527886e0f7030069857d2e4169ee7");
        if (pan.code !== "CARD_DATA_REJECTED" || pan.stored !== false || token.crypto !== false || token.stored !== false || wallet.code !== "REJECTED_CRYPTO_POLICY") {
          throw new Error("card classification drifted");
        }
        return token.assetClass;
      },
    },
  ];
}

function runTask(task, { maxAttempts = 2 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return {
        id: task.id,
        priority: task.priority,
        dependencies: task.dependencies,
        status: "TEST_COMPLETE",
        tests: task.tests,
        evidence: task.run(),
        attempts: attempt,
        blocker: null,
        next: null,
      };
    } catch (error) {
      lastError = error;
    }
  }
  return {
    id: task.id,
    priority: task.priority,
    dependencies: task.dependencies,
    status: "ISOLATED",
    tests: task.tests,
    evidence: null,
    attempts: maxAttempts,
    blocker: "REPEATED_FAILURE",
    error: lastError ? lastError.message : "UNKNOWN",
    next: null,
  };
}

function runCycle({ checkpointPath = null, maxAttempts = 2 } = {}) {
  const finished = [];
  for (const task of softwareTasks()) {
    const unmet = task.dependencies.filter((id) => !finished.some((row) => row.id === id && row.status === "TEST_COMPLETE"));
    if (unmet.length) {
      finished.push({
        id: task.id,
        priority: task.priority,
        dependencies: task.dependencies,
        status: "BLOCKED_ON_DEPENDENCY",
        tests: task.tests,
        evidence: null,
        blocker: unmet.join(","),
        next: unmet[0],
      });
      continue;
    }
    finished.push(runTask(task, { maxAttempts }));
  }
  const completed = finished.filter((row) => row.status === "TEST_COMPLETE").length;
  const gateCount = BLOCKED_TASKS.length + REMAINING.length;
  const autonomousSoftwareCompletion = finished.length ? completed / finished.length : 0;
  const report = {
    schema: "buzzard.eu27-continuation.v2",
    recordedAt: new Date().toISOString(),
    cursorRunsContinuously: false,
    independentWorker: false,
    registry: inventory.registryComplete().code,
    globalSoftwareCompletion: autonomousSoftwareCompletion,
    autonomousSoftwareCompletion,
    projectCompletionIncludingGates: (finished.length + gateCount) ? completed / (finished.length + gateCount) : 0,
    softwareTasks: finished.length,
    softwareCompleted: completed,
    humanAndExternalGates: gateCount,
    excludedFromCompletion: [...BLOCKED_TASKS.map((task) => task.id), ...REMAINING.map((task) => task.id)],
    tasks: [
      ...finished,
      ...BLOCKED_TASKS.map((task) => ({ ...task, dependencies: [...task.dependencies] })),
    ],
  };
  if (checkpointPath) fs.writeFileSync(checkpointPath, JSON.stringify(report, null, 2));
  return report;
}

module.exports = { BLOCKED_TASKS, softwareTasks, runTask, runCycle };
