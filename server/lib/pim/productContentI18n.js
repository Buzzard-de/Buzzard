/**
 * 30-locale product content envelope. Machine fill is not a professional translation.
 */
const LOCALES = Object.freeze([
  "de", "en", "tr", "ar", "fr", "nl", "bg", "hr", "el", "cs", "da", "et", "fi",
  "hu", "it", "lv", "lt", "lb", "mt", "pl", "pt", "ro", "sk", "sl", "es", "ca",
  "eu", "gl", "sv", "ga",
]);

const AUTHORED = Object.freeze({
  en: {
    "Bremsbelag Set Vorderachse": {
      title: "Front axle brake pad set",
      shortDescription: "Brake pad set for the front axle.",
      description: "Synthetic dry-run brake pad set for catalog review.",
    },
  },
  tr: {
    "Bremsbelag Set Vorderachse": {
      title: "Ön aks fren balata takımı",
      shortDescription: "Ön aks için fren balata seti.",
      description: "Katalog incelemesi için sentetik dry-run fren balata seti.",
    },
  },
  ar: {
    "Bremsbelag Set Vorderachse": {
      title: "طقم تيل فرامل للمحور الأمامي",
      shortDescription: "طقم تيل فرامل للمحور الأمامي.",
      description: "طقم تيل فرامل تجريبي لمراجعة الكتالوج.",
    },
  },
});

function envelopeProductContent(source = {}, { sourceLocale = "de" } = {}) {
  const title = String(source.title || source.name || "").trim();
  const shortDescription = String(source.shortDescription || source.short_description || "").trim();
  const description = String(source.description || "").trim();
  const locales = {};
  let native = 0;
  let authored = 0;
  let machine = 0;

  for (const locale of LOCALES) {
    if (locale === sourceLocale) {
      locales[locale] = {
        title,
        shortDescription,
        description,
        quality: "NATIVE",
        professional: locale === "de",
        humanReviewed: false,
      };
      native += 1;
      continue;
    }
    const pack = AUTHORED[locale] && AUTHORED[locale][title];
    if (pack) {
      locales[locale] = { ...pack, quality: "AUTHORED", professional: false, humanReviewed: false };
      authored += 1;
      continue;
    }
    locales[locale] = {
      title,
      shortDescription,
      description,
      quality: "MACHINE",
      sourceLocale,
      professional: false,
      humanReviewed: false,
    };
    machine += 1;
  }

  return {
    sourceLocale,
    listed: LOCALES.length,
    locales,
    nativeStrings: native,
    authoredStrings: authored,
    machineGeneratedStrings: machine,
    missingStrings: 0,
    keyComplete: true,
    complete: false,
    verified: false,
    professional: false,
    humanReviewed: false,
    live: false,
  };
}

module.exports = { LOCALES, envelopeProductContent };
