/**
 * Gaps found outside the six-task EU-27 queue.
 * Locked speech, model, and live-bank work stays blocked.
 * This process does not keep running after the Cursor session closes.
 */
const fs = require("fs");
const path = require("path");
const { checkSchema, draft } = require("../buzzardNative/core/specialists/seoEngine");

const BLOCKED = Object.freeze([
  { id: "HEARING_HUMAN_STT", module: "hearing", status: "EXTERNAL_DEPENDENCY_BLOCKED", blocker: "EXTERNAL_DEPENDENCY_BLOCKED", reason: "Human STT needs a licensed speech dataset. Egress stays DENY." },
  { id: "SPEECH_OFFICIAL_TTS", module: "speech", status: "HUMAN_APPROVAL_REQUIRED", blocker: "HUMAN_APPROVAL_REQUIRED", reason: "Official voice cloneAuthorized is false." },
  { id: "PRODUCTION_TRANSFORMER", module: "thinking", status: "EXTERNAL_DEPENDENCY_BLOCKED", blocker: "EXTERNAL_DEPENDENCY_BLOCKED", reason: "No local model weights. A transformer is not marked implemented." },
  { id: "VISION_SCENE_UNDERSTAND", module: "vision", status: "EXTERNAL_DEPENDENCY_BLOCKED", blocker: "EXTERNAL_DEPENDENCY_BLOCKED", reason: "Bitmap OCR is not scene understanding." },
  { id: "LIPSYNC_AUDIO", module: "motion", status: "EXTERNAL_DEPENDENCY_BLOCKED", blocker: "EXTERNAL_DEPENDENCY_BLOCKED", reason: "Viseme timeline is not audio-aligned lip sync." },
  { id: "BODY_3D", module: "digital_body", status: "EXTERNAL_DEPENDENCY_BLOCKED", blocker: "EXTERNAL_DEPENDENCY_BLOCKED", reason: "No 3D body asset is in the repository." },
  { id: "ALWAYS_ON_HOST", module: "platform", status: "HUMAN_APPROVAL_REQUIRED", blocker: "HUMAN_APPROVAL_REQUIRED", reason: "A 24/7 host is hardware and an approval, not a local function." },
  { id: "OFFSITE_BACKUP", module: "survival", status: "HUMAN_APPROVAL_REQUIRED", blocker: "HUMAN_APPROVAL_REQUIRED", reason: "Offsite location is a human decision." },
  { id: "LIVE_CARRIER_TRACK", module: "logistics", status: "EXTERNAL_DEPENDENCY_BLOCKED", blocker: "EXTERNAL_DEPENDENCY_BLOCKED", reason: "Carrier credentials and a live track call are not available." },
  { id: "EU27_REGISTRY_IMPORT", module: "banking", status: "EXTERNAL_DEPENDENCY_BLOCKED", blocker: "EXTERNAL_DEPENDENCY_BLOCKED", reason: "No new institution row without a fetched official table." },
  { id: "LIVE_BANK_CONNECTORS", module: "banking", status: "HUMAN_APPROVAL_REQUIRED", blocker: "HUMAN_APPROVAL_REQUIRED", reason: "A live connector needs a contract and approval." },
]);

function softwareTasks() {
  return [
    {
      id: "SEO_SCHEMA_LOCAL_CHECK",
      module: "seo",
      dependencies: [],
      tests: ["server/__tests__/repositoryGaps.test.mjs"],
      run() {
        const missing = checkSchema(null);
        const priced = checkSchema({ "@context": "https://schema.org", "@type": "Product", name: "Pad", sku: "SKU-1", offers: { price: 10 } });
        const ready = checkSchema({ "@context": "https://schema.org", "@type": "Product", name: "Pad", sku: "SKU-1" });
        const drafted = draft({ titleFacts: ["Pad"], structuredData: { "@context": "https://schema.org", "@type": "Product", name: "Pad", sku: "SKU-1" } });
        if (missing.status !== "MISSING_STRUCTURED_DATA" || priced.salesPriceBlocked !== true || ready.ok !== true || drafted.schemaCheck.live !== false || drafted.livePublish !== false) {
          throw new Error("schema check drifted");
        }
        return ready.status;
      },
    },
    {
      id: "SEO_IN_LANGUAGE_30",
      module: "seo",
      dependencies: ["SEO_SCHEMA_LOCAL_CHECK"],
      tests: ["server/__tests__/repositoryGaps.test.mjs"],
      run() {
        const file = path.join(__dirname, "..", "..", "..", "lib", "seo", "structured-data.ts");
        const source = fs.readFileSync(file, "utf8");
        const uses = source.split("inLanguage: [...SUPPORTED_LOCALES]").length - 1;
        if (uses < 2 || source.includes('inLanguage: ["de-DE"')) throw new Error("locale schema drifted");
        if (draft({ lang: "de" }).localeCount !== 30 || draft({ lang: "xx" }).localeKnown !== false) throw new Error("locale gate drifted");
        return "30 locales";
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
        module: task.module,
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
    module: task.module,
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

function runDiscovered({ checkpointPath = null, maxAttempts = 2 } = {}) {
  const finished = [];
  for (const task of softwareTasks()) {
    const unmet = task.dependencies.filter((id) => !finished.some((row) => row.id === id && row.status === "TEST_COMPLETE"));
    if (unmet.length) {
      finished.push({ id: task.id, module: task.module, dependencies: task.dependencies, status: "BLOCKED_ON_DEPENDENCY", blocker: unmet.join(","), evidence: null, next: unmet[0] });
      continue;
    }
    const result = runTask(task, { maxAttempts });
    const later = softwareTasks().find((row) => row.dependencies.includes(task.id));
    result.next = later ? later.id : BLOCKED[0].id;
    finished.push(result);
  }
  const completed = finished.filter((row) => row.status === "TEST_COMPLETE").length;
  const report = {
    schema: "buzzard.repository-gaps.v1",
    recordedAt: new Date().toISOString(),
    cursorRunsContinuously: false,
    independentWorker: false,
    discoveredSoftware: finished.length,
    discoveredBlocked: BLOCKED.length,
    softwareCompleted: completed,
    autonomousSoftwareCompletion: finished.length ? completed / finished.length : 0,
    projectCompletionIncludingGates: (finished.length + BLOCKED.length) ? completed / (finished.length + BLOCKED.length) : 0,
    tasks: [...finished, ...BLOCKED.map((task) => ({ ...task, evidence: null, next: null }))],
  };
  if (checkpointPath) {
    fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
    fs.writeFileSync(checkpointPath, JSON.stringify(report, null, 2));
  }
  return report;
}

module.exports = { BLOCKED, softwareTasks, runDiscovered };
