#!/usr/bin/env node
/**
 * Publishes taxonomy artifacts from data/taxonomy/ to public/taxonomy/
 * so GitHub Pages can serve them at /taxonomy/*.json
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "data", "taxonomy");
const targetDir = path.join(rootDir, "public", "taxonomy");

const COPY_FILES = [
  "master_shop_l1_mapping.json",
  "taxonomy_auto_sync_report.json",
  "kfz_shop_bridge.json",
  "buzzard_master_48_main_categories_de.json",
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(filename) {
  const source = path.join(sourceDir, filename);
  const target = path.join(targetDir, filename);
  if (!fs.existsSync(source)) {
    console.warn(`publish-taxonomy-artifacts: skip missing ${filename}`);
    return false;
  }
  ensureDir(targetDir);
  fs.copyFileSync(source, target);
  console.log(`publish-taxonomy-artifacts: copied ${filename}`);
  return true;
}

function writePreflight() {
  const output = execSync(
    'python3 -c "import sys; sys.path.insert(0, \'intelligence\'); from buzzard_ai_complete.commands import complete_production_bridge_preflight; print(complete_production_bridge_preflight())"',
    { cwd: rootDir, encoding: "utf8" }
  ).trim();

  JSON.parse(output);
  const dataPath = path.join(sourceDir, "buzzard_production_preflight.json");
  const publicPath = path.join(targetDir, "buzzard_production_preflight.json");
  ensureDir(targetDir);
  fs.writeFileSync(dataPath, `${output}\n`, "utf8");
  fs.writeFileSync(publicPath, `${output}\n`, "utf8");
  console.log("publish-taxonomy-artifacts: wrote buzzard_production_preflight.json");
}

ensureDir(targetDir);

let copied = 0;
for (const filename of COPY_FILES) {
  if (copyIfExists(filename)) copied += 1;
}

try {
  writePreflight();
} catch (error) {
  console.warn(`publish-taxonomy-artifacts: preflight generation failed — ${error.message}`);
}

console.log(`publish-taxonomy-artifacts: complete (${copied} copied)`);
