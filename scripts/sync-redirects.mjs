import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const sourceFiles = [
  path.join(rootDir, "data", "buzzard_redirects.json"),
  path.join(rootDir, "data", "category_legacy_redirects.json"),
];
const targetFile = path.join(rootDir, "public", "_redirects");

const redirects = [];
for (const sourceFile of sourceFiles) {
  if (!fs.existsSync(sourceFile)) continue;
  redirects.push(...JSON.parse(fs.readFileSync(sourceFile, "utf8")));
}

if (redirects.length === 0) process.exit(0);
const lines = redirects.map((rule) => {
  const from = String(rule.from || "").replace(/\/$/, "");
  const to = String(rule.to || "");
  const code = rule.permanent === false ? "302" : "301";
  return `${from} ${to} ${code}`;
});

fs.writeFileSync(targetFile, `${lines.join("\n")}\n`, "utf8");
console.log(`sync-redirects: wrote ${lines.length} rule(s) to public/_redirects`);
