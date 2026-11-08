const { TRAIN, VAL, HELDOUT, META } = require("./phase5Corpus");
const { TRAIN_EXTRA, VAL_EXTRA } = require("./phase6Corpus");
const { validateDataset } = require("../trainingPipeline");

function texts(rows) {
  return new Set(rows.map((r) => r.text));
}

function leakCheck(train, held) {
  const t = texts(train);
  const leaks = held.filter((r) => t.has(r.text));
  return { leaked: leaks.length > 0, count: leaks.length, samples: leaks.map((r) => r.lang) };
}

function registry() {
  const train = [...TRAIN, ...TRAIN_EXTRA];
  const val = [...VAL, ...VAL_EXTRA];
  const test = [...HELDOUT];
  const byLang = { tr: 0, de: 0, en: 0 };
  for (const r of [...train, ...val, ...test]) byLang[r.lang] = (byLang[r.lang] || 0) + 1;
  const dups = validateDataset(train);
  const leak = leakCheck(train, test);
  return {
    license: META.license,
    source: META.source,
    classification: META.classification,
    train: train.length,
    val: val.length,
    test: test.length,
    byLang,
    leak,
    duplicateCheck: { ok: dups.ok, rejected: dups.rejected.length },
    synthetic: true,
    generalIntelligenceClaim: false,
    cost: "UNKNOWN",
  };
}

module.exports = { registry, leakCheck };
