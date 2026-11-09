const fs = require("fs");
const path = require("path");

function inventory({ root = process.cwd() } = {}) {
  const listPath = path.join(root, "lib/i18n/supported-locales.json");
  const locales = JSON.parse(fs.readFileSync(listPath, "utf8"));
  const dir = path.join(root, "lib/i18n/locales");
  const files = locales.filter((c) => fs.existsSync(path.join(dir, `${c}.ts`)));
  const rtl = locales.filter((c) => c === "ar");
  return {
    listed: locales.length,
    filesOnDisk: files.length,
    locales,
    rtl,
    translationFilesVerified: files.length === locales.length,
    machineTranslationAccepted: false,
    complete: false,
    verified: false,
  };
}

module.exports = { inventory };
