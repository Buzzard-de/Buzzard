/**
 * Training infrastructure only. No job starts a GPU or downloads weights.
 */
const FORBIDDEN = new Set(["customer", "order", "payment", "source_code", "finance", "ai_memory", "secret"]);

function validateDataset(records = []) {
  const rejected = [];
  const seen = new Set();
  const kept = [];
  for (const row of records) {
    const cls = row.classification || "unspecified";
    const license = row.license || "UNKNOWN";
    if (FORBIDDEN.has(cls)) {
      rejected.push({ reason: "CLASSIFIED_FORBIDDEN", cls });
      continue;
    }
    if (license === "UNKNOWN") {
      rejected.push({ reason: "LICENSE_UNKNOWN" });
      continue;
    }
    const sig = JSON.stringify(row.text || row);
    if (seen.has(sig)) {
      rejected.push({ reason: "DUPLICATE" });
      continue;
    }
    seen.add(sig);
    kept.push({ text: String(row.text || ""), classification: cls, license });
  }
  return { ok: rejected.length === 0, kept: kept.length, rejected, trained: false };
}

function createTrainingJob({ requestedBy } = {}) {
  return {
    ok: true,
    status: "WAITING_APPROVAL",
    gpuStarted: false,
    weightsDownloaded: false,
    requestedBy: requestedBy || "sinan_bey",
    stages: [
      "dataset_validation",
      "dedup",
      "tokenize_pipeline",
      "job_manager",
      "checkpoint",
      "eval_suite",
      "versioning",
      "registry",
    ],
    live: false,
  };
}

module.exports = { validateDataset, createTrainingJob, FORBIDDEN };
