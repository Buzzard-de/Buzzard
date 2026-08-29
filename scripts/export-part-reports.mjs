#!/usr/bin/env node
/**
 * Bundle all Part 1–14 reports into exports/buzzard-part1-part14-berichte-YYYY-MM-DD/
 * and create a ZIP alongside.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const date = new Date().toISOString().slice(0, 10);
const dirName = `buzzard-part1-part14-berichte-${date}`;
const exportDir = path.join(root, "exports", dirName);
const zipPath = path.join(root, "exports", `${dirName}.zip`);

const copies = [
  ["exports/buzzard-part1-part2-bericht/01-PART1-CORE-FOUNDATION-BERICHT.md", "01-PART1-CORE-FOUNDATION-BERICHT.md"],
  ["docs/PART2_FINAL_REPORT.md", "02-PART2-FINAL-REPORT.md"],
  ["docs/PART2_CONTROL_CENTER.md", "02-PART2-CONTROL-CENTER.md"],
  ["exports/buzzard-part1-part2-bericht/02-PART2-CONTROL-CENTER-BERICHT.md", "02-PART2-CONTROL-CENTER-BERICHT-DE.md"],
  ["docs/PART3_FINAL_REPORT.md", "03-PART3-FINAL-REPORT.md"],
  ["docs/PART4_FINAL_REPORT.md", "04-PART4-FINAL-REPORT.md"],
  ["docs/PART4_DEPLOY_CHECKLIST.md", "04-PART4-DEPLOY-CHECKLIST.md"],
  ["docs/PART5_FINAL_REPORT.md", "05-PART5-FINAL-REPORT.md"],
  ["docs/PART6_FINAL_REPORT.md", "06-PART6-FINAL-REPORT.md"],
  ["docs/PART7_FINAL_REPORT.md", "07-PART7-FINAL-REPORT.md"],
  ["docs/PART8_FINAL_REPORT.md", "08-PART8-FINAL-REPORT.md"],
  ["docs/PART9_FINAL_REPORT.md", "09-PART9-FINAL-REPORT.md"],
  ["docs/PART10_FINAL_REPORT.md", "10-PART10-FINAL-REPORT.md"],
  ["docs/PART11_FINAL_REPORT.md", "11-PART11-FINAL-REPORT.md"],
  ["docs/PART12_FINAL_REPORT.md", "12-PART12-FINAL-REPORT.md"],
  ["docs/PART12_DEPLOY_CHECKLIST.md", "12-PART12-DEPLOY-CHECKLIST.md"],
  ["docs/PART13_FINAL_REPORT.md", "13-PART13-FINAL-REPORT.md"],
  ["docs/PART14_FINAL_REPORT.md", "14-PART14-FINAL-REPORT.md"],
  ["docs/PART14_LIVE_CLOSEOUT_REPORT.md", "14-PART14-LIVE-CLOSEOUT-REPORT.md"],
  ["exports/buzzard-part1-part2-bericht/04-GESAMTZUSAMMENFASSUNG.md", "00-GESAMTZUSAMMENFASSUNG-PART1-2.md"],
  ["docs/WAS_NOCH_ZU_TUN.md", "15-WAS-NOCH-ZU-TUN.md"],
  ["docs/SETUP_REMAINING_DE.md", "15-SETUP-REMAINING-DE.md"],
];

function copyFile(relSrc, destName) {
  const src = path.join(root, relSrc);
  if (!fs.existsSync(src)) {
    console.warn(`Skip missing: ${relSrc}`);
    return false;
  }
  fs.copyFileSync(src, path.join(exportDir, destName));
  return true;
}

fs.rmSync(exportDir, { recursive: true, force: true });
fs.mkdirSync(exportDir, { recursive: true });

const manifest = { exportedAt: new Date().toISOString(), files: [] };
for (const [src, dest] of copies) {
  if (copyFile(src, dest)) {
    manifest.files.push(dest);
  }
}

const indexSrc = path.join(root, "exports", "buzzard-part1-part14-berichte-2026-08-29", "00-INDEX.md");
if (fs.existsSync(indexSrc) && date !== "2026-08-29") {
  fs.copyFileSync(indexSrc, path.join(exportDir, "00-INDEX.md"));
} else if (fs.existsSync(path.join(exportDir, "..", "buzzard-part1-part14-berichte-2026-08-29", "00-INDEX.md"))) {
  let index = fs.readFileSync(
    path.join(exportDir, "..", "buzzard-part1-part14-berichte-2026-08-29", "00-INDEX.md"),
    "utf8"
  );
  index = index.replace(/2026-08-29/g, date).replace(/buzzard-part1-part14-berichte-2026-08-29/g, dirName);
  fs.writeFileSync(path.join(exportDir, "00-INDEX.md"), index);
}

manifest.files.unshift("00-INDEX.md");
fs.writeFileSync(path.join(exportDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2));

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
execSync(`cd "${path.join(root, "exports")}" && zip -r "${dirName}.zip" "${dirName}"`, { stdio: "inherit" });

console.log(`Exported ${manifest.files.length} files → exports/${dirName}/`);
console.log(`ZIP → exports/${dirName}.zip`);
