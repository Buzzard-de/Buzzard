#!/usr/bin/env node
/**
 * Deterministic Product SoT identity validator.
 * Consumes a real A–G export when provided. Does not invent production data.
 *
 * Usage:
 *   npm run product:sot:validate
 *   npm run product:sot:validate -- /path/to/export.json
 */
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { validateIdentityExport, validateMigration } = require("../server/lib/productSotValidator.js");

const exportPath = process.argv[2] || process.env.BUZZARD_PRODUCT_IDENTITY_EXPORT_PATH || "";
let doc = null;
if (exportPath && fs.existsSync(exportPath)) {
  doc = JSON.parse(fs.readFileSync(exportPath, "utf8"));
}

const report = exportPath ? validateIdentityExport(doc) : validateIdentityExport(null);
const local = validateMigration();

const out = {
  command: "product:sot:validate",
  exportPath: exportPath || null,
  exportLoaded: Boolean(doc),
  result: report.result,
  canActivateExclusive: false,
  productionAccess: doc ? "LOADED" : "BLOCKED_BY_PRODUCTION_ACCESS",
  report,
  localValidator: local,
};

console.log(JSON.stringify(out, null, 2));
process.exit(report.result === "PASS" ? 0 : 2);
