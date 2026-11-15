/**
 * Buzzard-owned synthetic splits. No customer/supplier text.
 */
const META = Object.freeze({
  source: "buzzard_original_synthetic",
  license: "BUZZARD_ORIGINAL",
  classification: "public",
  sent_offsite: false,
});

function row(lang, text) {
  return { lang, text, ...META };
}

const TRAIN = Object.freeze([
  row("tr", "Buzzard kendi düşünme motorunu adım adım geliştirir."),
  row("tr", "Gizli müşteri verisi eğitime girmez."),
  row("tr", "Türkçe karakterler: çğıöşü ÇĞİÖŞÜ."),
  row("de", "Buzzard entwickelt die Denkmachine schrittweise selbst."),
  row("de", "Kundendaten gehören nicht in das Trainingsset."),
  row("de", "Deutsche Zeichen: äöüßÄÖÜ."),
  row("en", "Buzzard trains only on licensed public synthetic text."),
  row("en", "This is not a general purpose language model."),
  row("en", "Two plus two equals four."),
  row("tr", "İki artı iki dört eder."),
]);

const VAL = Object.freeze([
  row("en", "Buzzard keeps training data inside Buzzard."),
  row("tr", "Buzzard eğitim verisini içeride tutar."),
  row("de", "Buzzard behält die Trainingsdaten im eigenen Haus."),
]);

const HELDOUT = Object.freeze([
  row("en", "Unknown facts must stay unknown."),
  row("tr", "Bilinmeyen şey bilinmiyor denir."),
  row("de", "Unbekanntes bleibt unbekannt."),
]);

module.exports = { TRAIN, VAL, HELDOUT, META };
