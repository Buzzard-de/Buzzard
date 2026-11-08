/**
 * Extra Buzzard-original lines for Phase 6 diversity. Not customer data.
 * Held-out reasoning prompts must not appear here.
 */
const META = Object.freeze({
  source: "buzzard_original_synthetic_phase6",
  license: "BUZZARD_ORIGINAL",
  classification: "public",
  sent_offsite: false,
});

function row(lang, text) {
  return { lang, text, ...META };
}

const TRAIN_EXTRA = Object.freeze([
  row("tr", "Kural motoru ile öğrenilmiş model ayrı tutulur."),
  row("tr", "Bilinmeyen cevap uydurulmaz."),
  row("de", "Unbekannte Antworten werden nicht erfunden."),
  row("de", "Die Regelmaschine bleibt vom Lernmodell getrennt."),
  row("en", "Unknown answers must not be invented."),
  row("en", "The rule engine stays separate from the learned model."),
]);

const VAL_EXTRA = Object.freeze([
  row("en", "Held-out validation is not the training set."),
  row("tr", "Doğrulama kümesi eğitim kümesi değildir."),
]);

module.exports = { TRAIN_EXTRA, VAL_EXTRA, META };
