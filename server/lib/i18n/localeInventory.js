const fs = require("fs");
const path = require("path");

function inventory({ root = process.cwd() } = {}) {
  const listPath = path.join(root, "lib/i18n/supported-locales.json");
  const locales = JSON.parse(fs.readFileSync(listPath, "utf8"));
  const rtl = locales.filter((c) => c === "ar");
  return {
    listed: locales.length,
    locales,
    rtl,
    translationFilesVerified: false,
    machineTranslationAccepted: false,
    complete: false,
  };
}

module.exports = { inventory };
