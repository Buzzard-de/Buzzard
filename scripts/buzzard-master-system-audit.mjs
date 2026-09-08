#!/usr/bin/env node
/**
 * Buzzard Master System Audit — READ-ONLY diagnostic report.
 * Does NOT activate any production gates or credentials.
 * Usage: node scripts/buzzard-master-system-audit.mjs
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, "..");

const report = {
  timestamp: new Date().toISOString(),
  git: {},
  architecture: {},
  duplicates: {},
  safety: {},
  infrastructure: {},
  sections: {},
  critical: [],
  warnings: [],
};

function status(label, value, details = {}) {
  report.sections[label] = { status: value, ...details };
}

function gitInfo() {
  try {
    report.git.branch = execSync("git branch --show-current", { cwd: ROOT }).toString().trim();
    report.git.commit = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
    report.git.clean = execSync("git status --porcelain", { cwd: ROOT }).toString().trim() === "";
    report.git.diffCheck = execSync("git diff --check", { cwd: ROOT, stdio: "pipe" }).toString().trim() || "PASS";
    status("GIT", report.git.clean ? "PASS" : "PARTIAL", report.git);
  } catch (err) {
    status("GIT", "FAIL", { error: err.message });
    report.critical.push("Git audit failed");
  }
}

function architectureAudit() {
  const { ENGINES, listDuplicateEngines } = require("../server/core/engineRegistry.js");
  report.duplicates = listDuplicateEngines();
  report.architecture.engines = ENGINES;

  const dupCount =
    report.duplicates.duplicateSearchEngines.length +
    report.duplicates.duplicateProductEngines.length +
    report.duplicates.duplicateOrderEngines.length;

  if (dupCount > 0) {
    status("ARCHITECTURE", "PARTIAL", { note: "Legacy engines marked DEPRECATED; PRIMARY engines wired" });
    report.warnings.push(`${dupCount} legacy engine paths remain (deprecated, not removed)`);
  } else {
    status("ARCHITECTURE", "PASS");
  }
}

function countryAudit() {
  try {
    const registry = require("../server/core/globalCountryRegistry.js");
    const count = registry.getCountryCount();
    status("35 COUNTRIES", count === 35 ? "PASS" : "FAIL", { count, expected: 35 });
    if (count !== 35) report.critical.push(`Country count ${count} !== 35`);
  } catch (err) {
    status("35 COUNTRIES", "FAIL", { error: err.message });
    report.critical.push("35-country registry missing");
  }
}

function languageAudit() {
  try {
    const lang = require("../server/core/globalLanguageRegistry.js");
    const ready = ["de", "en", "tr", "ar"].every((c) => lang.getReadinessStatus(c) === "READY");
    status("LANGUAGES", ready ? "PASS" : "PARTIAL");
  } catch {
    status("LANGUAGES", "PARTIAL");
  }
}

function safetyAudit() {
  const { GLOBAL_SAFETY_POLICY, assertGlobalSafetyPolicy } = require("../server/core/globalSafetyPolicy.js");
  const check = assertGlobalSafetyPolicy();
  report.safety = { policy: GLOBAL_SAFETY_POLICY, check };

  const gates = [
    ["SALES", process.env.BUZZARD_SALES_ENABLED === "1"],
    ["PAYMENTS", process.env.BUZZARD_PAYMENT_ENABLED === "1"],
    ["SUPPLIER LIVE", process.env.REAL_SUPPLIER_LIVE_IMPORT === "1"],
    ["LIVE IMPORT", process.env.REAL_SUPPLIER_LIVE_IMPORT === "1"],
    ["TECDOC LIVE", process.env.TECDOC_ENABLED === "1"],
    ["ORDER LIVE", process.env.ORDER_LIVE_ENABLED === "1"],
    ["PUBLISH", GLOBAL_SAFETY_POLICY.publishEnabled === true],
    ["AUTO ACTIVATION", GLOBAL_SAFETY_POLICY.autoActivate === true],
  ];

  for (const [name, active] of gates) {
    if (active) {
      report.critical.push(`CRITICAL: ${name} is ON`);
    }
  }

  status("SAFETY", report.critical.length === 0 && check.compliant ? "PASS" : "FAIL", report.safety);
}

function infrastructureAudit() {
  const checks = {
    BACKUP: fs.existsSync(path.join(ROOT, "scripts/backup-db.mjs")) ? "CONFIGURED" : "NOT_CONFIGURED",
    REDIS: process.env.REDIS_URL ? "CONFIGURED" : "NOT_CONFIGURED",
    SMTP: process.env.SMTP_HOST && process.env.SMTP_USER ? "CONFIGURED" : "NOT_CONFIGURED",
    MONITORING: process.env.ERROR_TRACKING_DSN ? "CONFIGURED" : "NOT_CONFIGURED",
    ANALYTICS: process.env.NEXT_PUBLIC_GA_ID || process.env.GA_MEASUREMENT_ID ? "CONFIGURED" : "NOT_CONFIGURED",
    LEGAL: process.env.NEXT_PUBLIC_COMPANY_VAT_ID && process.env.NEXT_PUBLIC_COMPANY_STREET ? "PASS" : "INCOMPLETE",
  };
  report.infrastructure = checks;
  for (const [k, v] of Object.entries(checks)) status(k, v);
}

function moduleAudit() {
  const modules = [
    ["PRODUCT", "../server/lib/pim/productCore.js"],
    ["PIM", "../server/core/pimWorkflowConstants.js"],
    ["SEARCH", "../server/lib/global/searchIntelligence.js"],
    ["AUTOMOTIVE", "../server/core/automotiveCore/index.js"],
    ["SUPPLIER", "../server/lib/supplier/supplierImportPipeline.js"],
    ["TECDOC", "../server/core/automotiveCore/tecdocAdapter.js"],
    ["PRICE", "../server/lib/operations/priceEngine.js"],
    ["STOCK", "../server/lib/operations/stockEngine.js"],
    ["ORDER", "../server/lib/commerce/orderService.js"],
    ["RETURN", "../server/core/returnRecovery/index.js"],
  ];
  for (const [label, mod] of modules) {
    try {
      require(mod);
      status(label, "PASS");
    } catch {
      status(label, "FAIL");
      report.critical.push(`${label} primary module missing`);
    }
  }
}

function secretsAudit() {
  const patterns = [/sk_live_[0-9a-zA-Z]{10,}/, /pk_live_[0-9a-zA-Z]{10,}/];
  let found = false;
  for (const dir of ["server", "lib"]) {
    walk(path.join(ROOT, dir), (file) => {
      if (!/\.(js|ts|tsx|mjs)$/.test(file)) return;
      const content = fs.readFileSync(file, "utf8");
      for (const re of patterns) {
        if (re.test(content)) found = true;
      }
    });
  }
  status("SECRETS", found ? "FAIL" : "PASS");
  if (found) report.critical.push("Live payment keys found in source");
  status("SECURITY", found ? "FAIL" : "PARTIAL");
}

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(p, fn);
    } else fn(p);
  }
}

// --- Run ---
gitInfo();
architectureAudit();
countryAudit();
languageAudit();
moduleAudit();
safetyAudit();
infrastructureAudit();
secretsAudit();

status("SEO", fs.existsSync(path.join(ROOT, "lib/seo/metadata.ts")) ? "PARTIAL" : "FAIL");
status("IMAGES", fs.existsSync(path.join(ROOT, "server/lib/global/imageLocalization.js")) ? "PARTIAL" : "FAIL");
status("ADMIN/RBAC", fs.existsSync(path.join(ROOT, "server/lib/rbac.js")) ? "PASS" : "FAIL");

const outJson = path.join(ROOT, "docs/audit/BUZZARD_MASTER_SYSTEM_AUDIT.json");
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

console.log("=== BUZZARD MASTER SYSTEM AUDIT ===");
console.log(JSON.stringify(report.sections, null, 2));
console.log("\nCritical:", report.critical.length ? report.critical : "NONE");
console.log("Warnings:", report.warnings.length ? report.warnings : "NONE");
console.log(`\nReport: ${outJson}`);

process.exit(report.critical.length ? 1 : 0);
